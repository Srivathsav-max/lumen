import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { EditorState } from '../../../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';

/// End key event.
///
/// - support
///   - desktop
///   - web
///
export const endCommand: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'scroll to the bottom of the document',
  getDescription: () => AppFlowyEditorL10n.current.cmdScrollToBottom,
  command: 'ctrl+end',
  macOSCommand: 'end',
  handler: _endCommandHandler,
});

const _endCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const scrollService = editorState.service.scrollService;
  if (!scrollService) {
    return KeyEventResult.ignored;
  }
  // scroll the document to the bottom
  scrollService.scrollTo(
    scrollService.maxScrollExtent,
    { duration: 150 },
  );
  return KeyEventResult.handled;
};