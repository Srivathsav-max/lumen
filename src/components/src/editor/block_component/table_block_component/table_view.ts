import { EditorState } from '../../../core/editor_state';
import { TableNode, TableStyle, TableBlockComponentMenuBuilder } from './table_node';
import { TableAddButton } from './table_add_button';
import { TableCol } from './table_col';
import { TableActions, TableDirection } from './table_action';
import { Component, ComponentChild } from '../../../core/component';

interface TableViewProps {
  editorState: EditorState;
  tableNode: TableNode;
  menuBuilder?: TableBlockComponentMenuBuilder;
  tableStyle: TableStyle;
}

export class TableView extends Component<TableViewProps> {
  render(): ComponentChild {
    return {
      tag: 'div',
      style: { display: 'flex', minWidth: 'min-content' },
      children: [
        {
          tag: 'div',
          style: { display: 'flex', flexDirection: 'column' },
          children: [
            {
              tag: 'div',
              style: { display: 'flex', flexDirection: 'row' },
              children: [
                ...this.buildColumns(),
                new TableAddButton({
                  padding: { left: 0 },
                  icon: this.props.tableStyle.addIcon,
                  width: 28,
                  height: this.props.tableNode.colsHeight,
                  onPressed: () => {
                    TableActions.add(
                      this.props.tableNode.node,
                      this.props.tableNode.colsLen,
                      this.props.editorState,
                      TableDirection.col,
                    );
                  },
                }),
              ],
            },
            new TableAddButton({
              padding: { top: 1, right: 30 },
              icon: this.props.tableStyle.addIcon,
              height: 28,
              width: this.props.tableNode.tableWidth,
              onPressed: () => {
                TableActions.add(
                  this.props.tableNode.node,
                  this.props.tableNode.rowsLen,
                  this.props.editorState,
                  TableDirection.row,
                );
              },
            }),
          ],
        },
      ],
    };
  }

  private buildColumns(): ComponentChild[] {
    const columns: ComponentChild[] = [];
    for (let i = 0; i < this.props.tableNode.colsLen; i++) {
      columns.push(
        new TableCol({
          colIdx: i,
          editorState: this.props.editorState,
          tableNode: this.props.tableNode,
          menuBuilder: this.props.menuBuilder,
          tableStyle: this.props.tableStyle,
        }),
      );
    }
    return columns;
  }
}