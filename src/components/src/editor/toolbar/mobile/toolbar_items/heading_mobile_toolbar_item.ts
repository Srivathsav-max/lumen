import React, { useState } from 'react';
import { EditorState, Selection, Delta } from '../../../../core';
import { createMobileToolbarMenuItem } from '../mobile_toolbar_item';
import { useMobileToolbarTheme } from '../mobile_toolbar_style';
import { MobileToolbarItemMenuBtn } from '../utils/mobile_toolbar_item_menu_btn';

interface HeadingUnit {
  icon: string;
  label: string;
  level: number;
}

const headings: HeadingUnit[] = [
  {
    icon: 'H1',
    label: 'Heading 1',
    level: 1,
  },
  {
    icon: 'H2',
    label: 'Heading 2',
    level: 2,
  },
  {
    icon: 'H3',
    label: 'Heading 3',
    level: 3,
  },
];

const HeadingBlockKeys = {
  type: 'heading',
  level: 'level',
  backgroundColor: 'backgroundColor',
};

const ParagraphBlockKeys = {
  type: 'paragraph',
  delta: 'delta',
};

const blockComponentBackgroundColor = 'backgroundColor';
const selectionExtraInfoDoNotAttachTextService = 'doNotAttachTextService';

export const headingMobileToolbarItem = createMobileToolbarMenuItem(
  (context, editorState, service) => (
    <span style={{ color: useMobileToolbarTheme().iconColor }}>
      H
    </span>
  ),
  (context, editorState, service) => {
    const selection = editorState.selection;
    if (!selection) {
      return null;
    }
    return <HeadingMenu selection={selection} editorState={editorState} />;
  }
);

interface HeadingMenuProps {
  selection: Selection;
  editorState: EditorState;
}

const HeadingMenu: React.FC<HeadingMenuProps> = ({
  selection,
  editorState,
}) => {
  const [, forceUpdate] = useState({});
  const theme = useMobileToolbarTheme();

  const handleHeadingToggle = (level: number) => {
    const node = editorState.getNodeAtPath(selection.start.path);
    if (!node) return;

    const isSelected = node.type === HeadingBlockKeys.type &&
                      node.attributes[HeadingBlockKeys.level] === level;

    editorState.formatNode(
      selection,
      (node) => ({
        ...node,
        type: isSelected ? ParagraphBlockKeys.type : HeadingBlockKeys.type,
        attributes: {
          [HeadingBlockKeys.level]: level,
          [HeadingBlockKeys.backgroundColor]: node.attributes[blockComponentBackgroundColor],
          [ParagraphBlockKeys.delta]: (node.delta || new Delta()).toJSON(),
        },
      }),
      {
        selectionExtraInfo: {
          [selectionExtraInfoDoNotAttachTextService]: true,
        },
      }
    );
    
    forceUpdate({});
  };

  const isHeadingSelected = (level: number): boolean => {
    const node = editorState.getNodeAtPath(selection.start.path);
    if (!node) return false;
    
    return node.type === HeadingBlockKeys.type &&
           node.attributes[HeadingBlockKeys.level] === level;
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        padding: theme.buttonSpacing,
      }}
    >
      {headings.map((heading, index) => (
        <div
          key={index}
          style={{
            width: `calc((100% - ${2 * theme.buttonSpacing}px) / 3)`,
          }}
        >
          <MobileToolbarItemMenuBtn
            icon={
              <span 
                style={{ 
                  color: theme.iconColor, 
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                {heading.icon}
              </span>
            }
            label={heading.label}
            isSelected={isHeadingSelected(heading.level)}
            onPressed={() => handleHeadingToggle(heading.level)}
          />
        </div>
      ))}
    </div>
  );
};