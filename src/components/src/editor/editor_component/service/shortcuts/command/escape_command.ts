import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';

/**
 * Escape key event.
 * 
 * - support
 *   - desktop
 *   - web
 */
export const exitEditingCommand = new CommandShortcutEvent({
  key: 'exit the editing mode',
  getDescription: () => AppFlowyEditorL10n.current.cmdExitEditing,
  command: 'escape',
  handler: exitEditingCommandHandler,
});

const exitEditingCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  editorState.selection = null;
  editorState.service.keyboardService?.closeKeyboard();
  return KeyEventResult.handled;
};