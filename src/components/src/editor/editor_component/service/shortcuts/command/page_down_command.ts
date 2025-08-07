import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { EditorState } from '../../../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';

/// Page down key event.
///
/// - support
///   - desktop
///   - web
///
export const pageDownCommand: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'scroll one page down',
  getDescription: () => AppFlowyEditorL10n.current.cmdScrollPageDown,
  command: 'page down',
  handler: _pageDownCommandHandler,
});

const _pageDownCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const scrollService = editorState.service.scrollService;
  if (!scrollService) {
    return KeyEventResult.ignored;
  }

  const scrollHeight = scrollService.onePageHeight;
  const dy = Math.max(0, scrollService.dy);
  if (!scrollHeight) {
    return KeyEventResult.ignored;
  }
  scrollService.scrollTo(
    dy + scrollHeight,
    { duration: 150 },
  );
  return KeyEventResult.handled;
};