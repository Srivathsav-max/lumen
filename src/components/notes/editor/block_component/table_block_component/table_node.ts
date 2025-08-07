import { Node } from '../../node';
import { TableConfig } from './table_config';
import { TableBlockKeys } from './table_block_component';
import { TableCellBlockKeys } from './table_cell_block_keys';
import { AppFlowyEditorLog } from '../../log';
import { newCellNode } from './table_cell_block_component';
import { paragraphNode } from '../../node/paragraph_node';
import { Delta } from '../../delta';
import { Transaction } from '../../transaction';
import { EditorState } from '../../editor_state';

export class TableNode {
  private readonly _config: TableConfig;
  readonly node: Node;
  private readonly _cells: Node[][] = [];

  constructor(options: { node: Node }) {
    this.node = options.node;
    this._config = TableConfig.fromJson(options.node.attributes);

    if (options.node.type !== TableBlockKeys.type) {
      AppFlowyEditorLog.editor.debug('TableNode: node is not a table');
      return;
    }

    const attributes = options.node.attributes;
    const colsLen = attributes[TableBlockKeys.colsLen];
    const rowsLen = attributes[TableBlockKeys.rowsLen];

    if (colsLen === undefined ||
        rowsLen === undefined ||
        typeof colsLen !== 'number' ||
        typeof rowsLen !== 'number') {
      AppFlowyEditorLog.editor.debug(
        'TableNode: colsLen or rowsLen is not an integer or null',
      );
      return;
    }

    if (options.node.children.length !== colsLen * rowsLen) {
      AppFlowyEditorLog.editor.debug(
        'TableNode: the number of children is not equal to the number of cells',
      );
      return;
    }

    // every cell should has rowPosition and colPosition to indicate its position in the table
    for (const child of options.node.children) {
      if (!child.attributes.hasOwnProperty(TableCellBlockKeys.rowPosition) ||
          !child.attributes.hasOwnProperty(TableCellBlockKeys.colPosition)) {
        AppFlowyEditorLog.editor.debug('TableNode: cell has no rowPosition or colPosition');
        return;
      }
    }

    for (let i = 0; i < colsLen; i++) {
      this._cells.push([]);
      for (let j = 0; j < rowsLen; j++) {
        const cell = options.node.children.find(
          (n) =>
            n.attributes[TableCellBlockKeys.colPosition] === i &&
            n.attributes[TableCellBlockKeys.rowPosition] === j,
        );

        if (!cell) {
          AppFlowyEditorLog.editor.debug('TableNode: cell is empty');
          this._cells.length = 0;
          return;
        }

        this._cells[i].push(newCellNode(options.node, cell));
      }
    }
  }

  static fromJson(json: Record<string, any>): TableNode {
    return new TableNode({ node: Node.fromJson(json) });
  }

  static fromList<T>(cols: T[][], options: { config?: TableConfig } = {}): TableNode {
    // Assert T is string or Node with delta
    console.assert(cols.length > 0);
    console.assert(cols[0].length > 0);
    console.assert(cols.every((col) => col.length === cols[0].length));

    const config = options.config ?? new TableConfig();

    const node = new Node({
      type: TableBlockKeys.type,
      attributes: {
        ...{
          [TableBlockKeys.colsLen]: cols.length,
          [TableBlockKeys.rowsLen]: cols[0].length,
        },
        ...config.toJson(),
      },
    });

    for (let i = 0; i < cols.length; i++) {
      for (let j = 0; j < cols[0].length; j++) {
        const cell = new Node({
          type: TableCellBlockKeys.type,
          attributes: {
            [TableCellBlockKeys.colPosition]: i,
            [TableCellBlockKeys.rowPosition]: j,
          },
        });

        let cellChild: Node;
        if (typeof cols[i][j] === 'string') {
          cellChild = paragraphNode({
            delta: new Delta().insert(cols[i][j] as string),
          });
        } else {
          cellChild = cols[i][j] as Node;
        }
        cell.insert(cellChild);

        node.insert(cell);
      }
    }

    return new TableNode({ node });
  }

  getCell(col: number, row: number): Node {
    return this._cells[col][row];
  }

  get config(): TableConfig {
    return this._config;
  }

  get colsLen(): number {
    return this._cells.length;
  }

  get rowsLen(): number {
    return this._cells.length > 0 ? this._cells[0].length : 0;
  }

  getRowHeight(row: number): number {
    const height = parseFloat(
      this._cells[0][row].attributes[TableCellBlockKeys.height]?.toString() ?? '0'
    );
    return isNaN(height) ? this._config.rowDefaultHeight : height;
  }

  get colsHeight(): number {
    let total = 0;
    for (let idx = 0; idx < this.rowsLen; idx++) {
      total += this.getRowHeight(idx) + this._config.borderWidth;
    }
    return total + this._config.borderWidth;
  }

  getColWidth(col: number): number {
    const width = parseFloat(
      this._cells[col][0].attributes[TableCellBlockKeys.width]?.toString() ?? '0'
    );
    return isNaN(width) ? this._config.colDefaultWidth : width;
  }

  get tableWidth(): number {
    let total = 0;
    for (let idx = 0; idx < this.colsLen; idx++) {
      total += this.getColWidth(idx) + this._config.borderWidth;
    }
    return total + this._config.borderWidth;
  }

  setColWidth(
    col: number,
    w: number,
    options: {
      transaction?: Transaction;
      force?: boolean;
    } = {}
  ): void {
    const { transaction, force = false } = options;
    w = w < this._config.colMinimumWidth ? this._config.colMinimumWidth : w;
    
    if (this.getColWidth(col) !== w || force) {
      for (let i = 0; i < this.rowsLen; i++) {
        if (transaction) {
          transaction.updateNode(this._cells[col][i], { [TableCellBlockKeys.width]: w });
        } else {
          this._cells[col][i].updateAttributes({ [TableCellBlockKeys.width]: w });
        }
        this.updateRowHeight(i, { transaction });
      }
      if (transaction) {
        transaction.updateNode(this.node, this.node.attributes);
      } else {
        this.node.updateAttributes(this.node.attributes);
      }
    }
  }

  updateRowHeight(
    row: number,
    options: {
      editorState?: EditorState;
      transaction?: Transaction;
    } = {}
  ): void {
    const { editorState, transaction } = options;
    
    // The extra 8 is because of paragraph padding
    const maxHeight = Math.max(
      ...this._cells.map((c) => c[row].children[0].rect.height + 8)
    );

    if (this._cells[0][row].attributes[TableCellBlockKeys.height] !== maxHeight &&
        !isNaN(maxHeight)) {
      for (let i = 0; i < this.colsLen; i++) {
        const currHeight = this._cells[i][row].attributes[TableCellBlockKeys.height];
        if (currHeight === maxHeight) {
          continue;
        }

        if (transaction) {
          transaction.updateNode(
            this._cells[i][row],
            { [TableCellBlockKeys.height]: maxHeight },
          );
        } else {
          this._cells[i][row].updateAttributes(
            { [TableCellBlockKeys.height]: maxHeight },
          );
        }
      }
    }

    if (this.node.attributes[TableBlockKeys.colsHeight] !== this.colsHeight &&
        !isNaN(this.colsHeight)) {
      if (transaction) {
        transaction.updateNode(this.node, { [TableBlockKeys.colsHeight]: this.colsHeight });
        if (editorState && editorState.editable !== true) {
          this.node.updateAttributes({ [TableBlockKeys.colsHeight]: this.colsHeight });
        }
      } else {
        this.node.updateAttributes({ [TableBlockKeys.colsHeight]: this.colsHeight });
      }
    }
  }
}