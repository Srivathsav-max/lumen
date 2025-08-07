import React from 'react';
import { ToolbarItem, EditorState } from '../../../../core';
import { SVGIconItemWidget } from './icon_item_widget';
import { onlyShowInTextType } from './utils/toolbar_item_utils';

const createFormatToolbarItem = (
  id: string,
  name: string
): ToolbarItem => ({
  id: `editor.${id}`,
  group: 2,
  isActive: onlyShowInTextType,
  builder: (
    context,
    editorState,
    highlightColor,
    iconColor,
    tooltipBuilder
  ) => {
    const selection = editorState.selection;
    if (!selection) return null;

    const nodes = editorState.getNodesInSelection(selection);
    const isHighlight = nodes.every(node => {
      const delta = node.delta;
      if (!delta || delta.length === 0) return false;
      
      return delta.every(op => {
        if (op.attributes) {
          return op.attributes[name] === true;
        }
        return false;
      });
    });

    const handlePress = () => {
      editorState.toggleAttribute(name);
    };

    const child = (
      <SVGIconItemWidget
        iconName={`toolbar/${name}`}
        isHighlight={isHighlight}
        highlightColor={highlightColor}
        iconColor={iconColor}
        onPressed={handlePress}
      />
    );

    if (tooltipBuilder) {
      return tooltipBuilder(
        context,
        id,
        getTooltipText(id),
        child
      );
    }

    return child;
  },
});

const getTooltipText = (id: string): string => {
  switch (id) {
    case 'underline':
      return 'Underline';
    case 'bold':
      return 'Bold';
    case 'italic':
      return 'Italic';
    case 'strikethrough':
      return 'Strikethrough';
    case 'code':
      return 'Code';
    default:
      return '';
  }
};

export const markdownFormatItems: ToolbarItem[] = [
  createFormatToolbarItem('underline', 'underline'),
  createFormatToolbarItem('bold', 'bold'),
  createFormatToolbarItem('italic', 'italic'),
  createFormatToolbarItem('strikethrough', 'strikethrough'),
  createFormatToolbarItem('code', 'code'),
];