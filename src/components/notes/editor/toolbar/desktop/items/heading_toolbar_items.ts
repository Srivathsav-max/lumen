import React from 'react';
import { ToolbarItem, EditorState, Delta } from '../../../../core';
import { SVGIconItemWidget } from './icon_item_widget';
import { onlyShowInSingleSelectionAndTextType } from './utils/toolbar_item_utils';

const HeadingBlockKeys = {
  type: 'heading',
  level: 'level',
};

const ParagraphBlockKeys = {
  type: 'paragraph',
};

const blockComponentBackgroundColor = 'backgroundColor';
const blockComponentTextDirection = 'textDirection';
const blockComponentDelta = 'delta';

const createHeadingToolbarItem = (level: number): ToolbarItem => ({
  id: `editor.h${level}`,
  group: 1,
  isActive: onlyShowInSingleSelectionAndTextType,
  builder: (
    context,
    editorState,
    highlightColor,
    iconColor,
    tooltipBuilder
  ) => {
    const selection = editorState.selection;
    if (!selection) return null;

    const node = editorState.getNodeAtPath(selection.start.path);
    if (!node) return null;

    const isHighlight = node.type === 'heading' && node.attributes['level'] === level;
    const delta = (node.delta || new Delta()).toJSON();

    const handlePress = () => {
      editorState.formatNode(
        selection,
        (node) => ({
          ...node,
          type: isHighlight ? ParagraphBlockKeys.type : HeadingBlockKeys.type,
          attributes: {
            [HeadingBlockKeys.level]: level,
            [blockComponentBackgroundColor]: node.attributes[blockComponentBackgroundColor],
            [blockComponentTextDirection]: node.attributes[blockComponentTextDirection],
            [blockComponentDelta]: delta,
          },
        })
      );
    };

    const child = (
      <SVGIconItemWidget
        iconName={`toolbar/h${level}`}
        isHighlight={isHighlight}
        highlightColor={highlightColor}
        iconColor={iconColor}
        onPressed={handlePress}
      />
    );

    if (tooltipBuilder) {
      return tooltipBuilder(
        context,
        `editor.h${level}`,
        levelToTooltips(level),
        child
      );
    }

    return child;
  },
});

const levelToTooltips = (level: number): string => {
  switch (level) {
    case 1:
      return 'Heading 1';
    case 2:
      return 'Heading 2';
    case 3:
      return 'Heading 3';
    default:
      return '';
  }
};

export const headingItems: ToolbarItem[] = [1, 2, 3]
  .map(level => createHeadingToolbarItem(level));