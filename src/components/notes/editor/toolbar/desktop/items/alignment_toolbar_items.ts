import { ToolbarItem } from '../../../../render/toolbar/toolbar_item';
import { onlyShowInTextType } from '../../../block_component/base_component/block_component_configuration';
import { blockComponentAlign } from '../../../block_component/base_component/align_mixin';
import { SVGIconItemWidget } from './icon_item_widget';
import { getTooltipText } from './utils/tooltip_util';
import { EditorState } from '../../../../editor_state';

export const alignmentItems: ToolbarItem[] = [
  new AlignmentToolbarItem({
    id: 'align_left',
    name: 'left',
    align: 'left'
  }),
  new AlignmentToolbarItem({
    id: 'align_center',
    name: 'center',
    align: 'center'
  }),
  new AlignmentToolbarItem({
    id: 'align_right',
    name: 'right',
    align: 'right'
  })
];

class AlignmentToolbarItem extends ToolbarItem {
  constructor(options: {
    id: string;
    name: string;
    align: string;
  }) {
    const { id, name, align } = options;
    
    super({
      id: `editor.${id}`,
      group: 6,
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
          node => node.attributes[blockComponentAlign] === align
        );

        const child = new SVGIconItemWidget({
          iconName: `toolbar/${name}`,
          isHighlight,
          highlightColor,
          iconColor,
          onPressed: () => editorState.updateNode(
            selection,
            (node) => node.copyWith({
              attributes: {
                ...node.attributes,
                [blockComponentAlign]: align
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