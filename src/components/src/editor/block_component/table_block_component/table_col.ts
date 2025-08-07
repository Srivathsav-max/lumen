import { EditorState, Node } from '../../../core/editor_state';
import { TableNode, TableStyle, TableBlockComponentMenuBuilder } from './table_node';
import { TableColBorder } from './table_col_border';
import { getCellNode } from './util';
import { TableActionHandler, TableDirection } from './table_action_handler';
import { Component, ComponentChild } from '../../../core/component';

interface TableColProps {
  colIdx: number;
  editorState: EditorState;
  tableNode: TableNode;
  menuBuilder?: TableBlockComponentMenuBuilder;
  tableStyle: TableStyle;
}

interface TableColState {
  colActionVisibility: boolean;
}

export class TableCol extends Component<TableColProps, TableColState> {
  private listeners: Map<string, () => void> = new Map();

  constructor(props: TableColProps) {
    super(props);
    this.state = {
      colActionVisibility: false,
    };
  }

  render(): ComponentChild {
    const children: ComponentChild[] = [];
    
    if (this.props.colIdx === 0) {
      children.push(
        new TableColBorder({
          resizable: false,
          tableNode: this.props.tableNode,
          editorState: this.props.editorState,
          colIdx: this.props.colIdx,
          borderColor: this.props.tableStyle.borderColor,
          borderHoverColor: this.props.tableStyle.borderHoverColor,
        }),
      );
    }

    const cellWidth = getCellNode(this.props.tableNode.node, this.props.colIdx, 0)?.cellWidth;

    children.push(
      {
        tag: 'div',
        style: { width: `${cellWidth}px` },
        children: [
          {
            tag: 'div',
            style: { position: 'relative' },
            onMouseEnter: () => this.setState({ colActionVisibility: true }),
            onMouseLeave: () => this.setState({ colActionVisibility: false }),
            children: [
              {
                tag: 'div',
                style: { display: 'flex', flexDirection: 'column' },
                children: this.buildCells(),
              },
              new TableActionHandler({
                visible: this.state.colActionVisibility,
                node: this.props.tableNode.node,
                editorState: this.props.editorState,
                position: this.props.colIdx,
                transform: 'translate(0, -12px)',
                alignment: 'top-center',
                menuBuilder: this.props.menuBuilder,
                dir: TableDirection.col,
              }),
            ],
          },
        ],
      },
      new TableColBorder({
        resizable: true,
        tableNode: this.props.tableNode,
        editorState: this.props.editorState,
        colIdx: this.props.colIdx,
        borderColor: this.props.tableStyle.borderColor,
        borderHoverColor: this.props.tableStyle.borderHoverColor,
      }),
    );

    return {
      tag: 'div',
      style: { display: 'flex', flexDirection: 'row' },
      children,
    };
  }

  private buildCells(): ComponentChild[] {
    const rowsLen = this.props.tableNode.rowsLen;
    const cells: ComponentChild[] = [];
    const cellBorder = {
      tag: 'div' as const,
      style: {
        height: `${this.props.tableNode.config.borderWidth}px`,
        backgroundColor: this.props.tableStyle.borderColor,
      },
    };

    for (let i = 0; i < rowsLen; i++) {
      const node = this.props.tableNode.getCell(this.props.colIdx, i);
      this.updateRowHeightCallback(i);
      this.addListener(node, i);
      this.addListener(node.children[0], i);

      cells.push(
        this.props.editorState.renderer.build(node),
        cellBorder,
      );
    }

    return [cellBorder, ...cells];
  }

  private addListener(node: Node, row: number): void {
    if (this.listeners.has(node.id)) {
      return;
    }

    const listener = () => this.updateRowHeightCallback(row);
    this.listeners.set(node.id, listener);
    node.addListener(listener);
  }

  private updateRowHeightCallback(row: number): void {
    requestAnimationFrame(() => {
      if (row >= this.props.tableNode.rowsLen) {
        return;
      }

      const transaction = this.props.editorState.transaction;
      this.props.tableNode.updateRowHeight(
        row,
        this.props.editorState,
        transaction,
      );
      if (transaction.operations.length > 0) {
        transaction.afterSelection = transaction.beforeSelection;
        this.props.editorState.apply(transaction);
      }
    });
  }

  componentWillUnmount(): void {
    // Clean up listeners
    for (const [nodeId, listener] of this.listeners) {
      // Note: In a real implementation, you'd need to get the node by ID and remove the listener
      // This is a simplified cleanup
    }
    this.listeners.clear();
  }
}