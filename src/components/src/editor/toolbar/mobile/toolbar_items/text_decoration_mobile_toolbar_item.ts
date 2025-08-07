import React, { useState } from 'react';
import { EditorState, Selection } from '../../../../core';
import { AppFlowyRichTextKeys } from '../../../block_component/rich_text/appflowy_rich_text_keys';
import { createMobileToolbarMenuItem, MobileToolbarWidgetService } from '../mobile_toolbar_item';
import { useMobileToolbarTheme } from '../mobile_toolbar_style';
import { MobileToolbarItemMenuBtn } from '../utils/mobile_toolbar_item_menu_btn';

interface TextDecorationUnit {
  icon: string;
  label: string;
  name: string;
}

const textDecorations: TextDecorationUnit[] = [
  {
    icon: 'B',
    label: 'Bold',
    name: AppFlowyRichTextKeys.bold,
  },
  {
    icon: 'I',
    label: 'Italic',
    name: AppFlowyRichTextKeys.italic,
  },
  {
    icon: 'U',
    label: 'Underline',
    name: AppFlowyRichTextKeys.underline,
  },
  {
    icon: 'S',
    label: 'Strikethrough',
    name: AppFlowyRichTextKeys.strikethrough,
  },
];

export const textDecorationMobileToolbarItem = createMobileToolbarMenuItem(
  (context, editorState, service) => (
    <span style={{ color: useMobileToolbarTheme().iconColor }}>
      A
    </span>
  ),
  (context, editorState, service) => {
    const selection = editorState.selection;
    if (!selection) {
      return null;
    }
    return <TextDecorationMenu editorState={editorState} selection={selection} />;
  }
);

interface TextDecorationMenuProps {
  editorState: EditorState;
  selection: Selection;
}

const TextDecorationMenu: React.FC<TextDecorationMenuProps> = ({
  editorState,
  selection,
}) => {
  const [, forceUpdate] = useState({});
  const theme = useMobileToolbarTheme();

  const handleDecorationToggle = (decorationName: string) => {
    editorState.toggleAttribute(decorationName);
    forceUpdate({});
  };

  const isDecorationSelected = (decorationName: string): boolean => {
    const nodes = editorState.getNodesInSelection(selection);
    
    if (selection.isCollapsed) {
      return editorState.toggledStyle.hasOwnProperty(decorationName);
    } else {
      return nodes.every(node => {
        const delta = node.delta;
        if (!delta) return false;
        
        return delta.every(op => {
          if (op.attributes) {
            return op.attributes[decorationName] === true;
          }
          return false;
        });
      });
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: theme.buttonSpacing,
        padding: theme.buttonSpacing,
      }}
    >
      {textDecorations.map((decoration, index) => (
        <MobileToolbarItemMenuBtn
          key={index}
          icon={
            <span style={{ color: theme.iconColor, fontWeight: 'bold' }}>
              {decoration.icon}
            </span>
          }
          label={decoration.label}
          isSelected={isDecorationSelected(decoration.name)}
          onPressed={() => handleDecorationToggle(decoration.name)}
        />
      ))}
    </div>
  );
};