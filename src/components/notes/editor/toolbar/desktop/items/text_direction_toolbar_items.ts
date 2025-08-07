import { ToolbarItem } from '../../../../render/toolbar/toolbar_item';
import { EditorState } from '../../../../editor_state';
import { onlyShowInTextType } from '../../../block_component/base_component/block_component_configuration';
import { 
  blockComponentTextDirectionAuto,
  blockComponentTextDirectionLTR,
  blockComponentTextDirectionRTL,
  blockComponentTextDirection
} from '../../../block_component/base_component/text_direction_mixin';
import { SVGIconItemWidget } from './icon_item_widget';
import { getTooltipText } from './utils/tooltip_util';

export const textDirectionItems: ToolbarItem[] = [
  new TextDirectionToolbarItem({
    id: 'text_direction_auto',
    name: blockComponentTextDirectionAuto,
    iconName: 'text_direction_auto'
  }),
  new TextDirectionToolbarItem({
    id: 'text_direction_ltr',
    name: blockComponentTextDirectionLTR,
    iconName: 'text_direction_ltr'
  }),
  new TextDirectionToolbarItem({
    id: 'text_direction_rtl',
    name: blockComponentTextDirectionRTL,
    iconName: 'text_direction_rtl'
  })
];

class TextDirectionToolbarItem extends ToolbarItem {
  constructor(options: {
    id: string;
    name: string;
    iconName: string;
  }) {
    const { id, name, iconName } = options;
    
    super({
      id: `editor.${id}`,
      group: 7,
      isActive: onlyShowInTextType,
      builder: (
        context: HTMLElement,
        editorState: EditorState,
        highlightColor: string,
        iconColor: string,
        tooltipBuilder?: (context: HTMLElement, id: string, tooltip: string, child: HTMLElement) => HTMLElement
      ) => {
        const selection = editorState.selection!;
        const nodes = editorState.getNodesInSelection(selection);
        const isHighlight = nodes.every(
          node => node.attributes[blockComponentTextDirection] === name
        );
        
        const child = new SVGIconItemWidget({
          iconName: `toolbar/${iconName}`,
          isHighlight,
          highlightColor,
          iconColor,
          onPressed: () => editorState.updateNode(
            selection,
            (node) => node.copyWith({
              attributes: {
                ...node.attributes,
                [blockComponentTextDirection]: isHighlight ? null : name
              }
            })
          )
        });

        if (tooltipBuilder) {
          return tooltipBuilder(
            context,
            id,
            getTooltipText(id),
            child.render()
          );
        }

        return child.render();
      }
    });
  }
}