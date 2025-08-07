import { ToolbarItem } from '../../../../core/toolbar';
import { onlyShowInTextType } from '../../../../core/toolbar_utils';
import { SVGIconItemWidget } from './icon_item_widget';
import { AppFlowyEditorL10n } from '../../../../l10n/l10n';

const _kNumberedListItemId = 'editor.numbered_list';

export const numberedListItem: ToolbarItem = new ToolbarItem({
  id: _kNumberedListItemId,
  group: 3,
  isActive: onlyShowInTextType,
  builder: (context, editorState, highlightColor, iconColor, tooltipBuilder) => {
    const selection = editorState.selection!;
    const node = editorState.getNodeAtPath(selection.start.path)!;
    const isHighlight = node.type === 'numbered_list';
    
    const child = new SVGIconItemWidget({
      iconName: 'toolbar/numbered_list',
      isHighlight,
      highlightColor,
      iconColor,
      onPressed: () => editorState.formatNode(
        selection,
        (node) => node.copyWith({
          type: isHighlight ? 'paragraph' : 'numbered_list',
        }),
      ),
    });

    if (tooltipBuilder) {
      return tooltipBuilder(
        context,
        _kNumberedListItemId,
        AppFlowyEditorL10n.current.numberedList,
        child,
      );
    }

    return child;
  },
});