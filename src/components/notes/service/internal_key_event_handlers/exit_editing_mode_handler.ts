import { EditorState } from '../../editor/editor_state';
import { ShortcutEventHandler, KeyEventResult } from '../shortcut_event/shortcut_event_handler';

export const exitEditingModeEventHandler: ShortcutEventHandler = (editorState: EditorState, event: KeyboardEvent) => {
  editorState.service.selectionService.clearSelection();
  return KeyEventResult.handled;
};