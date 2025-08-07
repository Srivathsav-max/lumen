import { ToolbarItem } from '../../../../core/toolbar';
import { onlyShowInSingleSelectionAndTextType } from '../../../../core/toolbar_utils';
import { SVGIconItemWidget } from './icon_item_widget';
import { AppFlowyEditorL10n } from '../../../../l10n/l10n';
import { ParagraphBlockKeys } from '../../../../core/block_keys';
import { blockComponentDelta, blockComponentBackgroundColor, blockComponentTextDirection } from '../../../../core/constants';
import { Delta } from '../../../../core/delta';

const _kParagraphItemId = 'editor.paragraph';

export const paragraphItem: ToolbarItem = new ToolbarItem({
  id: _kParagraphItemId,
  group: 1,
  isActive: onlyShowInSingleSelectionAndTextType,
  builder: (context, editorState, highlightColor, iconColor, tooltipBuilder) => {
    const selection = editorState.selection!;
    const node = editorState.getNodeAtPath(selection.start.path)!;
    const isHighlight = node.type === 'paragraph';
    const delta = (node.delta || new Delta()).toJson();
    
    const child = new SVGIconItemWidget({
      iconName: 'toolbar/text',
      isHighlight,
      highlightColor,
      iconColor,
      onPressed: () => editorState.formatNode(
        selection,
        (node) => node.copyWith({
          type: ParagraphBlockKeys.type,
          attributes: {
            [blockComponentDelta]: delta,
            [blockComponentBackgroundColor]: node.attributes[blockComponentBackgroundColor],
            [blockComponentTextDirection]: node.attributes[blockComponentTextDirection],
          },
        }),
      ),
    });

    if (tooltipBuilder) {
      return tooltipBuilder(
        context,
        _kParagraphItemId,
        AppFlowyEditorL10n.current.text,
        child,
      );
    }

    return child;
  },
});