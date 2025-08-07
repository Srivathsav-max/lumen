import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { EditorState, SelectionType } from '../../../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';
import { TableBlockKeys } from '../../../../../core/block_keys';

/// Delete key event.
///
/// - support
///   - desktop
///   - web
///
export const deleteCommand: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'Delete Key',
  getDescription: () => AppFlowyEditorL10n.current.cmdDeleteRight,
  command: 'delete, shift+delete',
  handler: _deleteCommandHandler,
});

const _deleteCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  const selectionType = editorState.selectionType;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  if (selectionType === SelectionType.block) {
    return _deleteInBlockSelection(editorState);
  } else if (selection.isCollapsed) {
    return _deleteInCollapsedSelection(editorState);
  } else {
    return _deleteInNotCollapsedSelection(editorState);
  }
};

/// Handle delete key event when selection is collapsed.
const _deleteInCollapsedSelection: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) {
    return KeyEventResult.ignored;
  }

  const position = selection.start;
  const node = editorState.getNodeAtPath(position.path);
  const delta = node?.delta;
  if (!node || !delta) {
    return KeyEventResult.ignored;
  }

  const transaction = editorState.transaction;

  if (position.offset === delta.length) {
    const tableParent = node.findParent((element) => element.type === TableBlockKeys.type);
    let nextTableParent = null;
    const next = node.findDownward((element) => {
      nextTableParent = element.findParent((element) => element.type === TableBlockKeys.type);
      // break if only one is in a table or they're in different tables
      return tableParent !== nextTableParent ||
          // merge the next node with delta
          element.delta != null;
    });
    // table nodes should be deleted using the table menu
    // in-table paragraphs should only be deleted inside the table
    if (next && tableParent === nextTableParent) {
      if (next.children.length > 0) {
        const path = [...node.path, node.children.length];
        transaction.insertNodes(path, next.children);
      }
      transaction.deleteNode(next);
      transaction.mergeText(node, next);
      editorState.apply(transaction);
      return KeyEventResult.handled;
    }
  } else {
    const nextIndex = delta.nextRunePosition(position.offset);
    if (nextIndex <= delta.length) {
      transaction.deleteText(
        node,
        position.offset,
        nextIndex - position.offset,
      );
      editorState.apply(transaction);
      return KeyEventResult.handled;
    }
  }

  return KeyEventResult.ignored;
};

/// Handle delete key event when selection is not collapsed.
const _deleteInNotCollapsedSelection: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection || selection.isCollapsed) {
    return KeyEventResult.ignored;
  }
  editorState.deleteSelection(selection);
  return KeyEventResult.handled;
};

const _deleteInBlockSelection: CommandShortcutEventHandler = (editorState: EditorState) => {
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
};