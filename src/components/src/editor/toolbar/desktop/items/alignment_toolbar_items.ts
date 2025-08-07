import React from 'react';
import { ToolbarItem, EditorState } from '../../../../core';
import { SVGIconItemWidget } from './icon_item_widget';
import { onlyShowInTextType } from './utils/toolbar_item_utils';

const blockComponentAlign = 'align';

const createAlignmentToolbarItem = (
  id: string,
  name: string,
  align: string
): ToolbarItem => ({
  id: `editor.${id}`,
  group: 6,
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
    const isHighlight = nodes.every(
      (n) => n.attributes[blockComponentAlign] === align
    );

    const handlePress = () => {
      editorState.updateNode(
        selection,
        (node) => ({
          ...node,
          attributes: {
            ...node.attributes,
            [blockComponentAlign]: align,
          },
        })
      );
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
    case 'align_left':
      return 'Align Left';
    case 'align_center':
      return 'Align Center';
    case 'align_right':
      return 'Align Right';
    default:
      return '';
  }
};

export const alignmentItems: ToolbarItem[] = [
  createAlignmentToolbarItem('align_left', 'left', 'left'),
  createAlignmentToolbarItem('align_center', 'center', 'center'),
  createAlignmentToolbarItem('align_right', 'right', 'right'),
];