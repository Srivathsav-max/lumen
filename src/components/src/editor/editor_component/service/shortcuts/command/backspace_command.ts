import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { Selection, Position } from '../../../../selection';
import { SelectionType } from '../../../../selection/selection_type';
import { SelectionUpdateReason } from '../../../../selection/selection_update_reason';
import { TableCellBlockKeys, TableBlockKeys } from '../../../../block_component/table/table_keys';
import { paragraphNode } from '../../../../node/paragraph_node';

/**
 * Backspace key event.
 * 
 * - support
 *   - desktop
 *   - web
 *   - mobile
 */
export const backspaceCommand = new CommandShortcutEvent({
  key: 'backspace',
  getDescription: () => AppFlowyEditorL10n.current.cmdDeleteLeft,
  command: 'backspace, shift+backspace',
  handler: backspaceCommandHandler,
});

const backspaceCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  const selectionType = editorState.selectionType;

  if (!selection) {
    return KeyEventResult.ignored;
  }

  const reason = editorState.selectionUpdateReason;

  if (selectionType === SelectionType.block) {
    return backspaceInBlockSelection(editorState);
  } else if (selection.isCollapsed) {
    return backspaceInCollapsedSelection(editorState);
  } else if (reason === SelectionUpdateReason.selectAll) {
    return backspaceInSelectAll(editorState);
  } else {
    return backspaceInNotCollapsedSelection(editorState);
  }
};

/**
 * Handle backspace key event when selection is collapsed.
 */
function backspaceInCollapsedSelection(editorState: EditorState): KeyEventResult {
  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) {
    return KeyEventResult.ignored;
  }

  const position = selection.start;
  const node = editorState.getNodeAtPath(position.path);
  if (!node) {
    return KeyEventResult.ignored;
  }

  const transaction = editorState.transaction;

  // Delete the entire node if the delta is empty
  if (!node.delta) {
    transaction.deleteNode(node);
    transaction.afterSelection = Selection.collapsed(
      new Position(position.path, 0)
    );
    editorState.apply(transaction);
    return KeyEventResult.handled;
  }

  // Get the previous character position (handling multi-byte characters)
  const index = node.delta.prevRunePosition(position.offset);

  if (index < 0) {
    // Move this node to its parent in below case:
    // - the node's next is null
    // - and the node's children is empty
    if (!node.next && 
        node.children.length === 0 && 
        node.parent?.parent && 
        node.parent?.delta) {
      const path = node.parent.path.next;
      transaction.deleteNode(node);
      transaction.insertNode(path, node);
      transaction.afterSelection = Selection.collapsed(
        new Position(path, 0)
      );
    } else {
      // If the deletion crosses columns and starts from the beginning position
      // skip the node deletion process
      if (node.parent?.type === TableCellBlockKeys.type && position.offset === 0) {
        return KeyEventResult.handled;
      }

      const tableParent = node.findParent((element) => element.type === TableBlockKeys.type);
      let prevTableParent: any;
      const prev = node.previousNodeWhere((element) => {
        prevTableParent = element.findParent((element) => element.type === TableBlockKeys.type);
        // Break if only one is in a table or they're in different tables
        return tableParent !== prevTableParent || element.delta !== null;
      });

      // Table nodes should be deleted using the table menu
      // In-table paragraphs should only be deleted inside the table
      if (prev && tableParent === prevTableParent) {
        if (!prev.delta) {
          throw new Error('Previous node should have delta');
        }
        transaction.mergeText(prev, node);
        transaction.insertNodes(
          prev.path.next,
          node.children.slice()
        );
        transaction.deleteNode(node);
        transaction.afterSelection = Selection.collapsed(
          new Position(prev.path, prev.delta.length)
        );
      } else {
        // Do nothing if there is no previous node contains delta
        return KeyEventResult.ignored;
      }
    }
  } else {
    // Although the selection may be collapsed,
    // its length may not always be equal to 1 because some characters have a length greater than 1.
    transaction.deleteText(
      node,
      index,
      position.offset - index,
    );
  }

  editorState.apply(transaction);
  return KeyEventResult.handled;
}

/**
 * Handle backspace key event when selection is not collapsed.
 */
function backspaceInNotCollapsedSelection(editorState: EditorState): KeyEventResult {
  const selection = editorState.selection;
  if (!selection || selection.isCollapsed) {
    return KeyEventResult.ignored;
  }
  editorState.deleteSelection(selection);
  return KeyEventResult.handled;
}

function backspaceInBlockSelection(editorState: EditorState): KeyEventResult {
  const selection = editorState.selection;
  if (!selection || editorState.selectionType !== SelectionType.block) {
    return KeyEventResult.ignored;
  }
  const transaction = editorState.transaction;
  transaction.deleteNodesAtPath(selection.start.path);
  editorState
    .apply(transaction)
    .then(() => editorState.selectionType = null);

  return KeyEventResult.handled;
}

function backspaceInSelectAll(editorState: EditorState): KeyEventResult {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  const transaction = editorState.transaction;
  const nodes = editorState.getNodesInSelection(selection);
  transaction.deleteNodes(nodes);

  // Insert a new paragraph node to avoid locking the editor
  transaction.insertNode(
    editorState.document.root.children[0].path,
    paragraphNode()
  );
  transaction.afterSelection = Selection.collapsed(new Position([0], 0));

  editorState.apply(transaction);

  return KeyEventResult.handled;
}