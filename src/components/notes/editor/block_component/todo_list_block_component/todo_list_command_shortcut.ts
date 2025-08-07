import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../../service/shortcuts/command_shortcut_event';
import { EditorState } from '../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../l10n/l10n';
import { PlatformExtension } from '../../../core/platform_extension';
import { TodoListBlockKeys } from './todo_list_block_component';

/// Toggle the todo list
///
/// - support
///   - desktop
///   - web
///
export const toggleTodoListCommand: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'toggle the todo list',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleTodoList,
  command: 'ctrl+enter',
  macOSCommand: 'cmd+enter',
  handler: _toggleTodoListCommandHandler,
});

const _toggleTodoListCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  if (PlatformExtension.isMobile) {
    console.error('enter key is not supported on mobile platform.');
    return KeyEventResult.ignored;
  }

  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  const nodes = editorState.getNodesInSelection(selection);
  const todoNodes = nodes.filter((element) => element.type === 'todo_list');
  if (todoNodes.length === 0) {
    return KeyEventResult.ignored;
  }

  const areAllTodoListChecked = todoNodes
      .every((node) => node.attributes[TodoListBlockKeys.checked] === true);

  const transaction = editorState.transaction;
  for (const node of todoNodes) {
    transaction.updateNode(node, {
      [TodoListBlockKeys.checked]: !areAllTodoListChecked,
    });
  }
  transaction.afterSelection = selection;
  editorState.apply(transaction);
  return KeyEventResult.handled;
};