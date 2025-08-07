import { ToolbarItem } from '../../../../render/toolbar/toolbar_item';
import { onlyShowInSingleSelectionAndTextType } from '../../../block_component/base_component/block_component_configuration';
import { SVGIconItemWidget } from './icon_item_widget';
import { AppFlowyEditorL10n } from '../../../../l10n/l10n';

const kQuoteItemId = 'editor.quote';

export const quoteItem = new ToolbarItem({
  id: kQuoteItemId,
  group: 3,
  isActive: onlyShowInSingleSelectionAndTextType,
  builder: (context, editorState, highlightColor, iconColor, tooltipBuilder) => {
    const selection = editorState.selection!;
    const node = editorState.getNodeAtPath(selection.start.path)!;
    const isHighlight = node.type === 'quote';
    
    const child = new SVGIconItemWidget({
      iconName: 'toolbar/quote',
      isHighlight,
      highlightColor,
      iconColor,
      onPressed: () => editorState.formatNode(
        selection,
        (node) => node.copyWith({
          type: isHighlight ? 'paragraph' : 'quote'
        })
      )
    });

    if (tooltipBuilder) {
      return tooltipBuilder(
        context,
        kQuoteItemId,
        AppFlowyEditorL10n.current.quote,
        child.render()
      );
    }

    return child.render();
  }
});