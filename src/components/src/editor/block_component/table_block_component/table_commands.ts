import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../../service/shortcuts/command_shortcut_event';
import { EditorState, Selection, SelectionType } from '../../../core/editor_state';
import { Node } from '../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../l10n/l10n';
import { TableBlockKeys } from '../../../core/block_keys';
import { TableCellBlockKeys } from './table_cell_block_component';
import { getCellNode } from './util';
import { paragraphNode } from '../../../core/node_factory';

export const tableCommands: CommandShortcutEvent[] = [
  enterInTableCell,
  leftInTableCell,
  rightInTableCell,
  upInTableCell,
  downInTableCell,
  tabInTableCell,
  shiftTabInTableCell,
  backSpaceInTableCell,
];

export const enterInTableCell: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'Don\'t add new line in table cell',
  getDescription: () => AppFlowyEditorL10n.current.cmdTableLineBreak,
  command: 'enter',
  handler: _enterInTableCellHandler,
});

export const leftInTableCell: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'Move to left cell if its at start of current cell',
  getDescription: () => AppFlowyEditorL10n.current.cmdTableMoveToLeftCellIfItsAtStartOfCurrentCell,
  command: 'arrow left',
  handler: _leftInTableCellHandler,
});

export const rightInTableCell: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'Move to right cell if its at the end of current cell',
  getDescription: () => AppFlowyEditorL10n.current.cmdTableMoveToRightCellIfItsAtTheEndOfCurrentCell,
  command: 'arrow right',
  handler: _rightInTableCellHandler,
});

export const upInTableCell: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'Move to up cell at same offset',
  getDescription: () => AppFlowyEditorL10n.current.cmdTableMoveToUpCellAtSameOffset,
  command: 'arrow up',
  handler: _upInTableCellHandler,
});

export const downInTableCell: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'Move to down cell at same offset',
  getDescription: () => AppFlowyEditorL10n.current.cmdTableMoveToDownCellAtSameOffset,
  command: 'arrow down',
  handler: _downInTableCellHandler,
});

export const tabInTableCell: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'Navigate around the cells at same offset',
  getDescription: () => AppFlowyEditorL10n.current.cmdTableNavigateCells,
  command: 'tab',
  handler: _tabInTableCellHandler,
});

export const shiftTabInTableCell: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'Navigate around the cells at same offset in reverse',
  getDescription: () => AppFlowyEditorL10n.current.cmdTableNavigateCellsReverse,
  command: 'shift+tab',
  handler: _shiftTabInTableCellHandler,
});

export const backSpaceInTableCell: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'Stop at the beginning of the cell',
  getDescription: () => AppFlowyEditorL10n.current.cmdTableStopAtTheBeginningOfTheCell,
  command: 'backspace',
  handler: _backspaceInTableCellHandler,
});

const _enterInTableCellHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const inTableNodes = _inTableNodes(editorState);
  if (inTableNodes.length === 0) {
    return KeyEventResult.ignored;
  }

  const selection = editorState.selection;
  if (_hasSelectionAndTableCell(inTableNodes, selection)) {
    const cell = inTableNodes[0].parent!;
    const nextNode = _getNextNode(inTableNodes, 0, 1);
    if (!nextNode) {
      const transaction = editorState.transaction;
      const nextPath = [...cell.parent!.path];
      nextPath[nextPath.length - 1]++;
      transaction.insertNode(nextPath, paragraphNode());
      transaction.afterSelection = Selection.single(nextPath, 0);
      editorState.apply(transaction);
    } else if (_nodeHasTextChild(nextNode)) {
      editorState.selectionService.updateSelection(
        Selection.single(nextNode.children[0].path, 0),
      );
    }
  }
  return KeyEventResult.handled;
};

const _leftInTableCellHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const inTableNodes = _inTableNodes(editorState);
  const selection = editorState.selection;
  if (_hasSelectionAndTableCell(inTableNodes, selection) && selection!.start.offset === 0) {
    const nextNode = _getPreviousNode(inTableNodes, 1, 0);
    if (_nodeHasTextChild(nextNode)) {
      const target = nextNode!.children[0];
      editorState.selectionService.updateSelection(
        Selection.single(target.path, target.delta!.length),
      );
    }
    return KeyEventResult.handled;
  }
  return KeyEventResult.ignored;
};

const _rightInTableCellHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const inTableNodes = _inTableNodes(editorState);
  const selection = editorState.selection;
  if (_hasSelectionAndTableCell(inTableNodes, selection) &&
      selection!.start.offset === inTableNodes[0].delta!.length) {
    const nextNode = _getNextNode(inTableNodes, 1, 0);
    if (_nodeHasTextChild(nextNode)) {
      editorState.selectionService.updateSelection(
        Selection.single(nextNode!.children[0].path, 0),
      );
    }
    return KeyEventResult.handled;
  }
  return KeyEventResult.ignored;
};

const _upInTableCellHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const inTableNodes = _inTableNodes(editorState);
  const selection = editorState.selection;
  if (_hasSelectionAndTableCell(inTableNodes, selection)) {
    const nextNode = _getNextNode(inTableNodes, 0, -1);
    if (_nodeHasTextChild(nextNode)) {
      const target = nextNode!.children[0];
      const offset = target.delta!.length > selection!.start.offset
          ? selection!.start.offset
          : target.delta!.length;
      editorState.selectionService.updateSelection(
        Selection.single(target.path, offset),
      );
    }
    return KeyEventResult.handled;
  }
  return KeyEventResult.ignored;
};

const _downInTableCellHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const inTableNodes = _inTableNodes(editorState);
  const selection = editorState.selection;
  if (_hasSelectionAndTableCell(inTableNodes, selection)) {
    const nextNode = _getNextNode(inTableNodes, 0, 1);
    if (_nodeHasTextChild(nextNode)) {
      const target = nextNode!.children[0];
      const offset = target.delta!.length > selection!.start.offset
          ? selection!.start.offset
          : target.delta!.length;
      editorState.selectionService.updateSelection(
        Selection.single(target.path, offset),
      );
    }
    return KeyEventResult.handled;
  }
  return KeyEventResult.ignored;
};

const _tabInTableCellHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const inTableNodes = _inTableNodes(editorState);
  const selection = editorState.selection;
  if (_hasSelectionAndTableCell(inTableNodes, selection)) {
    const nextNode = _getNextNode(inTableNodes, 1, 0);
    if (nextNode && _nodeHasTextChild(nextNode)) {
      const firstChild = nextNode.children[0];
      if (firstChild) {
        editorState.selection = Selection.single(firstChild.path, 0);
      }
    }
    return KeyEventResult.handled;
  }
  return KeyEventResult.ignored;
};

const _shiftTabInTableCellHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const inTableNodes = _inTableNodes(editorState);
  const selection = editorState.selection;
  if (_hasSelectionAndTableCell(inTableNodes, selection)) {
    const previousNode = _getPreviousNode(inTableNodes, 1, 0);
    if (previousNode && _nodeHasTextChild(previousNode)) {
      const firstChild = previousNode.children[0];
      if (firstChild) {
        editorState.selection = Selection.single(firstChild.path, 0);
      }
    }
    return KeyEventResult.handled;
  }
  return KeyEventResult.ignored;
};

const _backspaceInTableCellHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) {
    return KeyEventResult.ignored;
  }

  const position = selection.start;
  const node = editorState.getNodeAtPath(position.path);
  if (!node || !node.delta) {
    return KeyEventResult.ignored;
  }

  if (node.parent?.type === TableCellBlockKeys.type && position.offset === 0) {
    return KeyEventResult.handled;
  }

  return KeyEventResult.ignored;
};

function _inTableNodes(editorState: EditorState): Node[] {
  const selection = editorState.selection;
  if (!selection) {
    return [];
  }
  const nodes = editorState.getNodesInSelection(selection);
  return nodes.filter(
    (node) => node.parent?.type.includes(TableBlockKeys.type) ?? false,
  );
}

function _hasSelectionAndTableCell(
  nodes: Node[],
  selection: Selection | null,
): boolean {
  return nodes.length === 1 &&
    selection !== null &&
    selection.isCollapsed &&
    nodes[0].parent?.type === TableCellBlockKeys.type;
}

function _getNextNode(nodes: Node[], colDiff: number, rowDiff: number): Node | null {
  const cell = nodes[0].parent!;
  const col = cell.attributes[TableCellBlockKeys.colPosition] as number;
  const row = cell.attributes[TableCellBlockKeys.rowPosition] as number;
  const table = cell.parent;
  if (!table) {
    return null;
  }

  const lastCell = table.children[table.children.length - 1];
  const numCols = (lastCell.attributes[TableCellBlockKeys.colPosition] as number) + 1;
  const numRows = (lastCell.attributes[TableCellBlockKeys.rowPosition] as number) + 1;

  // Calculate the next column index, considering the column difference and wrapping around with modulo.
  const nextCol = (col + colDiff) % numCols;

  // Calculate the next row index, taking into account the row difference and adjusting for additional rows due to column change.
  const nextRow = row + rowDiff + Math.floor((col + colDiff) / numCols);

  return isValidPosition(nextCol, nextRow, numCols, numRows)
      ? getCellNode(table, nextCol, nextRow)
      : null;
}

function _getPreviousNode(nodes: Node[], colDiff: number, rowDiff: number): Node | null {
  const cell = nodes[0].parent!;
  const col = cell.attributes[TableCellBlockKeys.colPosition] as number;
  const row = cell.attributes[TableCellBlockKeys.rowPosition] as number;
  const table = cell.parent;
  if (!table) {
    return null;
  }

  const lastCell = table.children[table.children.length - 1];
  const numCols = (lastCell.attributes[TableCellBlockKeys.colPosition] as number) + 1;
  const numRows = (lastCell.attributes[TableCellBlockKeys.rowPosition] as number) + 1;

  // Calculate the previous column index, ensuring it wraps within the table boundaries using modulo.
  const prevCol = (col - colDiff + numCols) % numCols;

  // Calculate the previous row index, considering table boundaries and adjusting for potential column underflow.
  const prevRow = row - rowDiff - ((col - colDiff) < 0 ? 1 : 0);

  return isValidPosition(prevCol, prevRow, numCols, numRows)
      ? getCellNode(table, prevCol, prevRow)
      : null;
}

function isValidPosition(col: number, row: number, numCols: number, numRows: number): boolean {
  return col >= 0 && col < numCols && row >= 0 && row < numRows;
}

function _nodeHasTextChild(node: Node | null): boolean {
  return node !== null &&
    node.children.length > 0 &&
    node.children[0].delta !== null;
}