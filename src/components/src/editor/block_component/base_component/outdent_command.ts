import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../../service/shortcuts/command_shortcut_event';
import { EditorState, Selection, Node } from '../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../l10n/l10n';
import { indentableBlockTypes } from './indent_command';

/// Outdent the current block
///
/// - support
///   - desktop
///   - web
///
export const outdentCommand: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'outdent',
  getDescription: () => AppFlowyEditorL10n.current.cmdOutdent,
  command: 'shift+tab',
  handler: _outdentCommandHandler,
});

export function isOutdentable(editorState: EditorState): boolean {
  const selection = editorState.selection;
  if (!selection) {
    return false;
  }

  let nodes = editorState.getNodesInSelection(selection).normalized;
  if (nodes.length === 0) {
    return false;
  }

  const parent = nodes[0]?.parent;
  if (!parent || !indentableBlockTypes.has(parent.type)) {
    return false;
  }

  if (nodes.some((node) => node.path.length === 1)) {
    //  if the any nodes is having a path which is of size 1.
    //  for example [0], then that means, it is not indented
    //  thus we ignore this event.
    return false;
  }

  // keep only immediate children nodes of parent
  // since we are keeping only immediate children nodes, all nodes will be on same level
  nodes = nodes.filter((node) => node.path.length === parent.path.length + 1);

  const isAllIndentable = nodes.every((node) => indentableBlockTypes.has(node.type));
  if (!isAllIndentable) {
    return false;
  }

  return true;
}

const _outdentCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection?.normalized;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  if (!isOutdentable(editorState)) {
    // ignore the system default tab behavior
    return KeyEventResult.handled;
  }

  let nodes = editorState.getNodesInSelection(selection).normalized;
  const parent = nodes[0]?.parent;

  if (!parent) {
    return KeyEventResult.ignored;
  }

  // keep the nodes of the immediate children of parent node
  nodes = nodes.filter((node) => node.path.length === parent.path.length + 1);

  const startPath = [...nodes[0].path.slice(0, nodes[0].path.length - 1)];
  startPath[startPath.length - 1] += 1;
  
  const endPath = [...nodes[nodes.length - 1].path.slice(0, nodes[nodes.length - 1].path.length - 1)];
  endPath[endPath.length - 1] += nodes.length;

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