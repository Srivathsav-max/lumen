import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';

/**
 * Page up key event.
 * 
 * - support
 *   - desktop
 *   - web
 */
export const pageUpCommand = new CommandShortcutEvent({
  key: 'scroll one page up',
  getDescription: () => AppFlowyEditorL10n.current.cmdScrollPageUp,
  command: 'page up',
  handler: pageUpCommandHandler,
});

const pageUpCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  if (isMobile()) {
    console.assert(false, 'pageUpCommand is not supported on mobile platform.');
    return KeyEventResult.ignored;
  }
  
  const scrollService = editorState.service.scrollService;
  if (!scrollService) {
    return KeyEventResult.ignored;
  }

  const scrollHeight = scrollService.onePageHeight;
  const dy = scrollService.dy;
  
  if (dy <= 0 || scrollHeight == null) {
    return KeyEventResult.ignored;
  }
  
  scrollService.scrollTo(dy - scrollHeight, { duration: 150 });
  return KeyEventResult.handled;
};

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}