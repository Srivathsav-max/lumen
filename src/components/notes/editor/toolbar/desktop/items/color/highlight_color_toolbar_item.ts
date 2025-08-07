import { ToolbarItem } from '../../../../../render/toolbar/toolbar_item';
import { onlyShowInTextType } from '../../../../block_component/base_component/block_component_configuration';
import { SVGIconItemWidget } from '../icon_item_widget';
import { AppFlowyRichTextKeys } from '../../../../block_component/rich_text/appflowy_rich_text_keys';
import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';
import { showColorMenu } from './color_menu';
import { ColorOption } from './color_picker';
import { TextInsert } from '../../../../core/document/text_delta';

const kHighlightColorItemId = 'editor.highlightColor';

export function buildHighlightColorItem(options: {
  colorOptions?: ColorOption[];
} = {}): ToolbarItem {
  const { colorOptions } = options;
  
  return new ToolbarItem({
    id: kHighlightColorItemId,
    group: 4,
    isActive: onlyShowInTextType,
    builder: (context, editorState, highlightColor, iconColor, tooltipBuilder) => {
      let highlightColorHex: string | undefined;
      const selection = editorState.selection!;
      const nodes = editorState.getNodesInSelection(selection);
      
      const isHighlight = nodes.allSatisfyInSelection(selection, (delta) => {
        if (delta.everyAttributes((attr) => Object.keys(attr).length === 0)) {
          return false;
        }

        return delta.everyAttributes((attributes) => {
          highlightColorHex = attributes[AppFlowyRichTextKeys.backgroundColor];
          return highlightColorHex != null;
        });
      });

      const child = new SVGIconItemWidget({
        iconName: 'toolbar/highlight_color',
        isHighlight,
        highlightColor,
        iconColor,
        onPressed: () => {
          let showClearButton = false;
          
          nodes.allSatisfyInSelection(selection, (delta) => {
            if (!showClearButton) {
              showClearButton = delta.operations
                .filter((op): op is TextInsert => op.type === 'insert')
                .some((element) => {
                  return element.attributes?.[AppFlowyRichTextKeys.backgroundColor] != null;
                });
            }
            return true;
          });
          
          showColorMenu({
            context,
            editorState,
            selection,
            currentColorHex: highlightColorHex,
            isTextColor: false,
            highlightColorOptions: colorOptions,
            showClearButton
          });
        }
      });

      if (tooltipBuilder) {
        return tooltipBuilder(
          context,
          kHighlightColorItemId,
          AppFlowyEditorL10n.current.highlightColor,
          child.render()
        );
      }

      return child.render();
    }
  });
}