import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { handleCut } from '../../../internal_key_event_handlers/copy_paste_handler';

/**
 * Cut command
 * 
 * - support
 *   - desktop
 *   - web
 */
export const cutCommand = new CommandShortcutEvent({
  key: 'cut the selected content',
  getDescription: () => AppFlowyEditorL10n.current.cmdCutSelection,
  command: 'ctrl+x',
  macOSCommand: 'cmd+x',
  handler: cutCommandHandler,
});

const cutCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  if (!editorState.selection) {
    return KeyEventResult.ignored;
  }
  
  // Plain text cut
  handleCut(editorState);
  return KeyEventResult.handled;
};