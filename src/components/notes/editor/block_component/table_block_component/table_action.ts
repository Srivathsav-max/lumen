import { Node } from '../../node';
import { EditorState } from '../../editor_state';
import { TableDirection, TableBlockKeys } from './table_block_component';
import { getCellNode } from './util';
import { TableCellBlockKeys } from './table_cell_block_keys';
import { paragraphNode } from '../../node/paragraph_node';
import { AppFlowyEditorLog } from '../../log';
import { Path } from '../../node/path';

export class TableActions {
  static add(
    node: Node,
    position: number,
    editorState: EditorState,
    dir: TableDirection,
  ): void {
    if (dir === TableDirection.col) {
      _addCol(node, position, editorState);
    } else {
      _addRow(node, position, editorState);
    }
  }

  static delete(
    node: Node,
    position: number,
    editorState: EditorState,
    dir: TableDirection,
  ): void {
    if (dir === TableDirection.col) {
      _deleteCol(node, position, editorState);
    } else {
      _deleteRow(node, position, editorState);
    }
  }

  static duplicate(
    node: Node,
    position: number,
    editorState: EditorState,
    dir: TableDirection,
  ): void {
    if (dir === TableDirection.col) {
      _duplicateCol(node, position, editorState);
    } else {
      _duplicateRow(node, position, editorState);
    }
  }

  static clear(
    node: Node,
    position: number,
    editorState: EditorState,
    dir: TableDirection,
  ): void {
    if (dir === TableDirection.col) {
      _clearCol(node, position, editorState);
    } else {
      _clearRow(node, position, editorState);
    }
  }

  static setBgColor(
    node: Node,
    position: number,
    editorState: EditorState,
    color: string | undefined,
    dir: TableDirection,
  ): void {
    if (dir === TableDirection.col) {
      _setColBgColor(node, position, editorState, color);
    } else {
      _setRowBgColor(node, position, editorState, color);
    }
  }
}

function _addCol(tableNode: Node, position: number, editorState: EditorState): void {
  console.assert(position >= 0);

  const transaction = editorState.transaction;

  const cellNodes: Node[] = [];
  const rowsLen = tableNode.attributes[TableBlockKeys.rowsLen] as number;
  const colsLen = tableNode.attributes[TableBlockKeys.colsLen] as number;

  if (position !== colsLen) {
    for (let i = position; i < colsLen; i++) {
      for (let j = 0; j < rowsLen; j++) {
        const node = getCellNode(tableNode, i, j)!;
        transaction.updateNode(node, { [TableCellBlockKeys.colPosition]: i + 1 });
      }
    }
  }

  for (let i = 0; i < rowsLen; i++) {
    const node = new Node({
      type: TableCellBlockKeys.type,
      attributes: {
        [TableCellBlockKeys.colPosition]: position,
        [TableCellBlockKeys.rowPosition]: i,
      },
    });
    node.insert(paragraphNode());
    const firstCellInRow = getCellNode(tableNode, 0, i);
    if (firstCellInRow?.attributes.hasOwnProperty(TableCellBlockKeys.rowBackgroundColor)) {
      node.updateAttributes({
        [TableCellBlockKeys.rowBackgroundColor]:
          firstCellInRow.attributes[TableCellBlockKeys.rowBackgroundColor],
      });
    }

    cellNodes.push(newCellNode(tableNode, node));
  }

  let insertPath: Path;
  if (position === 0) {
    insertPath = getCellNode(tableNode, 0, 0)!.path;
  } else {
    insertPath = getCellNode(tableNode, position - 1, rowsLen - 1)!.path.next;
  }
  
  transaction.insertNodes(insertPath, cellNodes);
  transaction.updateNode(tableNode, { [TableBlockKeys.colsLen]: colsLen + 1 });

  editorState.apply(transaction, { withUpdateSelection: false });
}

async function _addRow(tableNode: Node, position: number, editorState: EditorState): Promise<void> {
  console.assert(position >= 0);

  const rowsLen = tableNode.attributes[TableBlockKeys.rowsLen] as number;
  const colsLen = tableNode.attributes[TableBlockKeys.colsLen] as number;

  let error = false;

  // generate new table cell nodes & update node attributes
  for (let i = 0; i < colsLen; i++) {
    const firstCellInCol = getCellNode(tableNode, i, 0);
    const colBgColor = firstCellInCol?.attributes[TableCellBlockKeys.colBackgroundColor];
    const containsColBgColor = colBgColor !== undefined;

    const node = new Node({
      type: TableCellBlockKeys.type,
      attributes: {
        [TableCellBlockKeys.colPosition]: i,
        [TableCellBlockKeys.rowPosition]: position,
        ...(containsColBgColor && {
          [TableCellBlockKeys.colBackgroundColor]: colBgColor,
        }),
      },
      children: [paragraphNode()],
    });

    let insertPath: Path;
    if (position === 0) {
      const firstCellInCol = getCellNode(tableNode, i, 0);
      if (!firstCellInCol) {
        error = true;
        break;
      }
      insertPath = firstCellInCol.path;
    } else {
      const cellInPrevRow = getCellNode(tableNode, i, position - 1);
      if (!cellInPrevRow) {
        error = true;
        break;
      }
      insertPath = cellInPrevRow.path.next;
    }

    const transaction = editorState.transaction;

    if (position !== rowsLen) {
      for (let j = position; j < rowsLen; j++) {
        const cellNode = getCellNode(tableNode, i, j);
        if (!cellNode) {
          error = true;
          break;
        }
        transaction.updateNode(cellNode, {
          [TableCellBlockKeys.rowPosition]: j + 1,
        });
      }
    }

    transaction.insertNode(insertPath, node);

    await editorState.apply(transaction, { withUpdateSelection: false });
  }

  if (error) {
    AppFlowyEditorLog.editor.debug('unable to insert row');
    return;
  }

  const transaction = editorState.transaction;

  // update the row length
  transaction.updateNode(tableNode, {
    [TableBlockKeys.rowsLen]: rowsLen + 1,
  });

  await editorState.apply(transaction, { withUpdateSelection: false });
}

function _deleteCol(tableNode: Node, col: number, editorState: EditorState): void {
  const transaction = editorState.transaction;

  const rowsLen = tableNode.attributes[TableBlockKeys.rowsLen] as number;
  const colsLen = tableNode.attributes[TableBlockKeys.colsLen] as number;

  if (colsLen === 1) {
    if (editorState.document.root.children.length === 1) {
      const emptyParagraph = paragraphNode();
      transaction.insertNode(tableNode.path, emptyParagraph);
    }
    transaction.deleteNode(tableNode);
    tableNode.dispose();
  } else {
    const nodes: Node[] = [];
    for (let i = 0; i < rowsLen; i++) {
      nodes.push(getCellNode(tableNode, col, i)!);
    }
    transaction.deleteNodes(nodes);

    _updateCellPositions(tableNode, editorState, col + 1, 0, -1, 0);

    transaction.updateNode(tableNode, { [TableBlockKeys.colsLen]: colsLen - 1 });
  }

  editorState.apply(transaction, { withUpdateSelection: false });
}

function _deleteRow(tableNode: Node, row: number, editorState: EditorState): void {
  const transaction = editorState.transaction;

  const rowsLen = tableNode.attributes[TableBlockKeys.rowsLen] as number;
  const colsLen = tableNode.attributes[TableBlockKeys.colsLen] as number;

  if (rowsLen === 1) {
    if (editorState.document.root.children.length === 1) {
      const emptyParagraph = paragraphNode();
      transaction.insertNode(tableNode.path, emptyParagraph);
    }
    transaction.deleteNode(tableNode);
    tableNode.dispose();
  } else {
    const nodes: Node[] = [];
    for (let i = 0; i < colsLen; i++) {
      nodes.push(getCellNode(tableNode, i, row)!);
    }
    transaction.deleteNodes(nodes);

    _updateCellPositions(tableNode, editorState, 0, row + 1, 0, -1);

    transaction.updateNode(tableNode, { [TableBlockKeys.rowsLen]: rowsLen - 1 });
  }

  editorState.apply(transaction, { withUpdateSelection: false });
}

function _duplicateCol(tableNode: Node, col: number, editorState: EditorState): void {
  const transaction = editorState.transaction;

  const rowsLen = tableNode.attributes[TableBlockKeys.rowsLen] as number;
  const colsLen = tableNode.attributes[TableBlockKeys.colsLen] as number;
  const nodes: Node[] = [];
  
  for (let i = 0; i < rowsLen; i++) {
    const node = getCellNode(tableNode, col, i)!;
    nodes.push(
      node.copyWith({
        attributes: {
          ...node.attributes,
          [TableCellBlockKeys.colPosition]: col + 1,
          [TableCellBlockKeys.rowPosition]: i,
        },
      })
    );
  }
  
  transaction.insertNodes(
    getCellNode(tableNode, col, rowsLen - 1)!.path.next,
    nodes,
  );

  _updateCellPositions(tableNode, editorState, col + 1, 0, 1, 0);

  transaction.updateNode(tableNode, { [TableBlockKeys.colsLen]: colsLen + 1 });

  editorState.apply(transaction, { withUpdateSelection: false });
}

async function _duplicateRow(tableNode: Node, row: number, editorState: EditorState): Promise<void> {
  let transaction = editorState.transaction;
  _updateCellPositions(tableNode, editorState, 0, row + 1, 0, 1);
  await editorState.apply(transaction, { withUpdateSelection: false });

  const rowsLen = tableNode.attributes[TableBlockKeys.rowsLen] as number;
  const colsLen = tableNode.attributes[TableBlockKeys.colsLen] as number;
  
  for (let i = 0; i < colsLen; i++) {
    const node = getCellNode(tableNode, i, row)!;
    transaction = editorState.transaction;
    transaction.insertNode(
      node.path.next,
      node.copyWith({
        attributes: {
          ...node.attributes,
          [TableCellBlockKeys.rowPosition]: row + 1,
          [TableCellBlockKeys.colPosition]: i,
        },
      })
    );
    await editorState.apply(transaction, { withUpdateSelection: false });
  }

  transaction = editorState.transaction;
  transaction.updateNode(tableNode, { [TableBlockKeys.rowsLen]: rowsLen + 1 });
  editorState.apply(transaction, { withUpdateSelection: false });
}

function _setColBgColor(
  tableNode: Node,
  col: number,
  editorState: EditorState,
  color: string | undefined,
): void {
  const transaction = editorState.transaction;

  const rowsLen = tableNode.attributes[TableBlockKeys.rowsLen] as number;
  for (let i = 0; i < rowsLen; i++) {
    const node = getCellNode(tableNode, col, i)!;
    transaction.updateNode(node, {
      [TableCellBlockKeys.colBackgroundColor]: color,
    });
  }

  editorState.apply(transaction, { withUpdateSelection: false });
}

function _setRowBgColor(
  tableNode: Node,
  row: number,
  editorState: EditorState,
  color: string | undefined,
): void {
  const transaction = editorState.transaction;

  const colsLen = tableNode.attributes[TableBlockKeys.colsLen] as number;
  for (let i = 0; i < colsLen; i++) {
    const node = getCellNode(tableNode, i, row)!;
    transaction.updateNode(node, {
      [TableCellBlockKeys.rowBackgroundColor]: color,
    });
  }

  editorState.apply(transaction, { withUpdateSelection: false });
}

function _clearCol(
  tableNode: Node,
  col: number,
  editorState: EditorState,
): void {
  const transaction = editorState.transaction;

  const rowsLen = tableNode.attributes[TableBlockKeys.rowsLen] as number;
  for (let i = 0; i < rowsLen; i++) {
    const node = getCellNode(tableNode, col, i)!;
    transaction.insertNode(
      node.children[0].path,
      paragraphNode({ text: '' }),
    );
  }

  editorState.apply(transaction, { withUpdateSelection: false });
}

function _clearRow(
  tableNode: Node,
  row: number,
  editorState: EditorState,
): void {
  const transaction = editorState.transaction;

  const colsLen = tableNode.attributes[TableBlockKeys.colsLen] as number;
  for (let i = 0; i < colsLen; i++) {
    const node = getCellNode(tableNode, i, row)!;
    transaction.insertNode(
      node.children[0].path,
      paragraphNode({ text: '' }),
    );
  }

  editorState.apply(transaction, { withUpdateSelection: false });
}

export function newCellNode(tableNode: Node, n: Node): Node {
  const row = n.attributes[TableCellBlockKeys.rowPosition] as number;
  const col = n.attributes[TableCellBlockKeys.colPosition] as number;
  const rowsLen = tableNode.attributes[TableBlockKeys.rowsLen] as number;
  const colsLen = tableNode.attributes[TableBlockKeys.colsLen] as number;

  if (!n.attributes.hasOwnProperty(TableCellBlockKeys.height)) {
    let nodeHeight = parseFloat(
      tableNode.attributes[TableBlockKeys.rowDefaultHeight]?.toString() ?? '0'
    );
    if (row < rowsLen) {
      const cellHeight = parseFloat(
        getCellNode(tableNode, 0, row)!
          .attributes[TableCellBlockKeys.height]
          ?.toString() ?? '0'
      );
      if (!isNaN(cellHeight)) {
        nodeHeight = cellHeight;
      }
    }
    n.updateAttributes({ [TableCellBlockKeys.height]: nodeHeight });
  }

  if (!n.attributes.hasOwnProperty(TableCellBlockKeys.width)) {
    let nodeWidth = parseFloat(
      tableNode.attributes[TableBlockKeys.colDefaultWidth]?.toString() ?? '0'
    );
    if (col < colsLen) {
      const cellWidth = parseFloat(
        getCellNode(tableNode, col, 0)!
          .attributes[TableCellBlockKeys.width]
          ?.toString() ?? '0'
      );
      if (!isNaN(cellWidth)) {
        nodeWidth = cellWidth;
      }
    }
    n.updateAttributes({ [TableCellBlockKeys.width]: nodeWidth });
  }

  return n;
}

function _updateCellPositions(
  tableNode: Node,
  editorState: EditorState,
  fromCol: number,
  fromRow: number,
  addToCol: number,
  addToRow: number,
): void {
  const transaction = editorState.transaction;

  const rowsLen = tableNode.attributes[TableBlockKeys.rowsLen] as number;
  const colsLen = tableNode.attributes[TableBlockKeys.colsLen] as number;

  for (let i = fromCol; i < colsLen; i++) {
    for (let j = fromRow; j < rowsLen; j++) {
      transaction.updateNode(getCellNode(tableNode, i, j)!, {
        [TableCellBlockKeys.colPosition]: i + addToCol,
        [TableCellBlockKeys.rowPosition]: j + addToRow,
      });
    }
  }

  editorState.apply(transaction, { withUpdateSelection: false });
}