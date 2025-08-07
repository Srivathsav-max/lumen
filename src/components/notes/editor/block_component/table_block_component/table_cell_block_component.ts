import { EditorState, Node, Selection } from '../../../core/editor_state';
import { BlockComponentBuilder, BlockComponentContext, BlockComponentWidget, BlockComponentConfiguration } from '../../../core/block_component';
import { paragraphNode } from '../../../core/node_factory';
import { TableActionHandler, TableDirection } from './table_action_handler';
import { getCellNode } from './util';
import { TableDefaults } from './table_config';
import { Component, ComponentChild } from '../../../core/component';
import { tryToColor } from '../../../core/color_utils';

export class TableCellBlockKeys {
  static readonly type = 'table/cell';
  static readonly rowPosition = 'rowPosition';
  static readonly colPosition = 'colPosition';
  static readonly height = 'height';
  static readonly width = 'width';
  static readonly rowBackgroundColor = 'rowBackgroundColor';
  static readonly colBackgroundColor = 'colBackgroundColor';
}

export type TableBlockCellComponentColorBuilder = (
  context: any,
  node: Node,
) => string | null;

export function tableCellNode(text: string, rowPosition: number, colPosition: number): Node {
  return new Node({
    type: TableCellBlockKeys.type,
    attributes: {
      [TableCellBlockKeys.rowPosition]: rowPosition,
      [TableCellBlockKeys.colPosition]: colPosition,
    },
    children: [
      paragraphNode({ text }),
    ],
  });
}

interface TableBlockComponentMenuBuilder {
  // Define menu builder interface
}

export class TableCellBlockComponentBuilder extends BlockComponentBuilder {
  constructor(
    configuration?: BlockComponentConfiguration,
    private menuBuilder?: TableBlockComponentMenuBuilder,
    private colorBuilder?: TableBlockCellComponentColorBuilder,
  ) {
    super(configuration);
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    return new TableCellBlockWidget({
      key: node.key,
      node,
      configuration: this.configuration,
      menuBuilder: this.menuBuilder,
      colorBuilder: this.colorBuilder,
      showActions: this.showActions(node),
      actionBuilder: (context, state) => this.actionBuilder(blockComponentContext, state),
      actionTrailingBuilder: (context, state) => this.actionTrailingBuilder(blockComponentContext, state),
    });
  }

  validate = (node: Node): boolean => {
    return Object.keys(node.attributes).length > 0 &&
      node.attributes.hasOwnProperty(TableCellBlockKeys.rowPosition) &&
      node.attributes.hasOwnProperty(TableCellBlockKeys.colPosition);
  };
}

interface TableCellBlockWidgetProps {
  key?: string;
  node: Node;
  menuBuilder?: TableBlockComponentMenuBuilder;
  colorBuilder?: TableBlockCellComponentColorBuilder;
  showActions?: boolean;
  actionBuilder?: (context: any, state: any) => ComponentChild;
  actionTrailingBuilder?: (context: any, state: any) => ComponentChild;
  configuration?: BlockComponentConfiguration;
}

interface TableCellBlockWidgetState {
  rowActionVisibility: boolean;
}

export class TableCellBlockWidget extends Component<TableCellBlockWidgetProps, TableCellBlockWidgetState> {
  private editorState: EditorState;

  constructor(props: TableCellBlockWidgetProps) {
    super(props);
    this.state = {
      rowActionVisibility: false,
    };
    // In a real implementation, this would be injected via context
    this.editorState = {} as EditorState;
  }

  render(): ComponentChild {
    const cellHeight = this.props.node.cellHeight;
    const backgroundColor = this.getBackgroundColor();

    return {
      tag: 'div',
      style: { position: 'relative' },
      children: [
        {
          tag: 'div',
          onMouseEnter: () => this.setState({ rowActionVisibility: true }),
          onMouseLeave: () => this.setState({ rowActionVisibility: false }),
          children: [
            {
              tag: 'div',
              style: {
                minHeight: `${cellHeight}px`,
                backgroundColor,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
              },
              children: [
                {
                  tag: 'div',
                  style: { padding: '0 4px' },
                  children: [
                    this.editorState.renderer.build(this.props.node.children[0]),
                  ],
                },
              ],
            },
          ],
        },
        new TableActionHandler({
          visible: this.state.rowActionVisibility,
          node: this.props.node.parent!,
          editorState: this.editorState,
          position: this.props.node.attributes[TableCellBlockKeys.rowPosition],
          transform: this.calculateTransform(),
          alignment: 'center-left',
          height: cellHeight,
          menuBuilder: this.props.menuBuilder,
          dir: TableDirection.row,
        }),
      ],
    };
  }

  private getBackgroundColor(): string | undefined {
    if (this.props.colorBuilder) {
      const color = this.props.colorBuilder({}, this.props.node);
      if (color) return color;
    }

    const colBackgroundColor = this.props.node.attributes[TableCellBlockKeys.colBackgroundColor] as string;
    if (colBackgroundColor) {
      return tryToColor(colBackgroundColor) || undefined;
    }

    const rowBackgroundColor = this.props.node.attributes[TableCellBlockKeys.rowBackgroundColor] as string;
    if (rowBackgroundColor) {
      return tryToColor(rowBackgroundColor) || undefined;
    }

    return undefined;
  }

  private calculateTransform(): string {
    const col = this.props.node.attributes[TableCellBlockKeys.colPosition] as number;
    let left = -12;
    
    for (let i = 0; i < col; i++) {
      left -= getCellNode(this.props.node.parent!, i, 0)?.cellWidth ?? TableDefaults.colWidth;
      left -= this.props.node.parent!.attributes['borderWidth'] ?? TableDefaults.borderWidth;
    }

    return `translate(${left}px, 0)`;
  }
}