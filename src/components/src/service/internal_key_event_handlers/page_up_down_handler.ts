import { EditorState } from '../../editor/editor_state';
import { ShortcutEventHandler, KeyEventResult } from '../shortcut_event/shortcut_event_handler';

export const pageUpHandler: ShortcutEventHandler = (editorState: EditorState, _: KeyboardEvent) => {
  const scrollHeight = editorState.service.scrollService?.onePageHeight;
  const scrollService = editorState.service.scrollService;
  if (scrollHeight !== undefined && scrollService) {
    scrollService.scrollTo(scrollService.dy - scrollHeight);
  }
  return KeyEventResult.handled;
};

export const pageDownHandler: ShortcutEventHandler = (editorState: EditorState, _: KeyboardEvent) => {
  const scrollHeight = editorState.service.scrollService?.onePageHeight;
  const scrollService = editorState.service.scrollService;
  if (scrollHeight !== undefined && scrollService) {
    scrollService.scrollTo(scrollService.dy + scrollHeight);
  }
  return KeyEventResult.handled;
};