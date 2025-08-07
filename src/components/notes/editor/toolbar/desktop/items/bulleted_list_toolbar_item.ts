import { ToolbarItem } from '../../../../render/toolbar/toolbar_item';
import { onlyShowInTextType } from '../../../block_component/base_component/block_component_configuration';
import { SVGIconItemWidget } from './icon_item_widget';
import { AppFlowyEditorL10n } from '../../../../l10n/l10n';

const kBulletedListItemId = 'editor.bulleted_list';

export const bulletedListItem = new ToolbarItem({
  id: kBulletedListItemId,
  group: 3,
  isActive: onlyShowInTextType,
  builder: (context, editorState, highlightColor, iconColor, tooltipBuilder) => {
    const selection = editorState.selection!;
    const node = editorState.getNodeAtPath(selection.start.path)!;
    const isHighlight = node.type === 'bulleted_list';
    
    const child = new SVGIconItemWidget({
      iconName: 'toolbar/bulleted_list',
      isHighlight,
      highlightColor,
      iconColor,
      onPressed: () => editorState.formatNode(
        selection,
        (node) => node.copyWith({
          type: isHighlight ? 'paragraph' : 'bulleted_list'
        })
      )
    });

    if (tooltipBuilder) {
      return tooltipBuilder(
        context,
        kBulletedListItemId,
        AppFlowyEditorL10n.current.bulletedList,
        child.render()
      );
    }

    return child.render();
  }
});