import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../../service/shortcuts/command_shortcut_event';
import { EditorState, Selection, Node } from '../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../l10n/l10n';
import { BulletedListBlockKeys, NumberedListBlockKeys, TodoListBlockKeys, ParagraphBlockKeys } from '../../../core/block_keys';

export const indentableBlockTypes = new Set([
  BulletedListBlockKeys.type,
  NumberedListBlockKeys.type,
  TodoListBlockKeys.type,
  ParagraphBlockKeys.type,
]);

export function isIndentable(editorState: EditorState): boolean {
  const selection = editorState.selection;
  if (!selection) {
    return false;
  }

  let nodes = editorState.getNodesInSelection(selection).normalized;
  if (nodes.length === 0) {
    return false;
  }

  const previous = nodes[0]?.previous;
  if (!previous || !indentableBlockTypes.has(previous.type)) {
    return false;
  }

  // there's no need to consider the child nodes
  // since we are ignoring child nodes, all nodes will be on same level
  nodes = nodes.filter((node) => node.path.length === previous.path.length);

  const isAllIndentable = nodes.every(
    (node) => indentableBlockTypes.has(node.type),
  );
  if (!isAllIndentable) {
    return false;
  }

  return true;
}

// Handler function declared before it's used
const _indentCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection?.normalized;

  if (!selection) {
    return KeyEventResult.ignored;
  }

  if (!isIndentable(editorState)) {
    // ignore the system default tab behavior
    return KeyEventResult.handled;
  }

  let nodes = editorState.getNodesInSelection(selection).normalized;
  const previous = nodes[0]?.previous;

  if (!previous) {
    return KeyEventResult.ignored;
  }

  // keep the nodes in the same level as the previous block
  nodes = nodes.filter((node) => node.path.length === previous.path.length);

  const startPath = [...previous.path, previous.children.length];
  const endPath = [...previous.path, previous.children.length + nodes.length - 1];

  const afterSelection = new Selection(
    selection.start.copyWith({ path: startPath }),
    selection.end.copyWith({ path: endPath }),
  );

  const transaction = editorState.transaction;
  transaction.deleteNodes(nodes);
  transaction.insertNodes(startPath, nodes, { deepCopy: true });
  transaction.afterSelection = afterSelection;
  editorState.apply(transaction);

  return KeyEventResult.handled;
};

/// Indent the current block
///
/// - support
///   - desktop
///   - web
///
export const indentCommand: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'indent',
  getDescription: () => AppFlowyEditorL10n.current.cmdIndent,
  command: 'tab',
  handler: _indentCommandHandler,
});