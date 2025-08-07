import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';

/**
 * Undo key event.
 * 
 * - support
 *   - desktop
 *   - web
 */
export const undoCommand = new CommandShortcutEvent({
  key: 'undo',
  getDescription: () => AppFlowyEditorL10n.current.cmdUndo,
  command: 'ctrl+z',
  macOSCommand: 'cmd+z',
  handler: undoCommandHandler,
});

const undoCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  editorState.undoManager.undo();
  return KeyEventResult.handled;
};

/**
 * Redo key event.
 * 
 * - support
 *   - desktop
 *   - web
 */
export const redoCommand = new CommandShortcutEvent({
  key: 'redo',
  getDescription: () => AppFlowyEditorL10n.current.cmdRedo,
  command: 'ctrl+y,ctrl+shift+z',
  macOSCommand: 'cmd+shift+z',
  handler: redoCommandHandler,
});

const redoCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  editorState.undoManager.redo();
  return KeyEventResult.handled;
};