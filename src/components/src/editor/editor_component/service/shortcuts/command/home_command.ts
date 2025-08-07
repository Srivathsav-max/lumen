import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';

/**
 * Home key event.
 * 
 * - support
 *   - desktop
 *   - web
 */
export const homeCommand = new CommandShortcutEvent({
  key: 'scroll to the top of the document',
  getDescription: () => AppFlowyEditorL10n.current.cmdScrollToTop,
  command: 'ctrl+home',
  macOSCommand: 'home',
  handler: homeCommandHandler,
});

const homeCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const scrollService = editorState.service.scrollService;
  if (!scrollService) {
    return KeyEventResult.ignored;
  }
  
  // scroll the document to the top
  scrollService.scrollTo(
    scrollService.minScrollExtent,
    { duration: 150 }
  );
  
  return KeyEventResult.handled;
};