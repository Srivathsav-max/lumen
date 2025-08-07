import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';

/**
 * Remove Line to the Left.
 * 
 * - support
 *   - desktop
 *   - web
 *   - mobile
 */
export const deleteLeftSentenceCommand = new CommandShortcutEvent({
  key: 'delete the left line',
  getDescription: () => AppFlowyEditorL10n.current.cmdDeleteLineLeft,
  command: 'ctrl+alt+backspace',
  macOSCommand: 'cmd+backspace',
  handler: deleteLeftSentenceCommandHandler,
});

const deleteLeftSentenceCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) {
    return KeyEventResult.ignored;
  }

  const node = editorState.getNodeAtPath(selection.end.path);
  const delta = node?.delta;
  if (!node || !delta) {
    return KeyEventResult.ignored;
  }

  const transaction = editorState.transaction;
  transaction.deleteText(
    node,
    0,
    selection.endIndex,
  );
  editorState.apply(transaction);
  return KeyEventResult.handled;
};