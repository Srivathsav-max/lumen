import { EditorState } from '../../editor/editor_state';
import { ShortcutEventHandler, KeyEventResult } from '../shortcut_event/shortcut_event_handler';

export const redoEventHandler: ShortcutEventHandler = (editorState: EditorState, event: KeyboardEvent) => {
  editorState.undoManager.redo();
  return KeyEventResult.handled;
};

export const undoEventHandler: ShortcutEventHandler = (editorState: EditorState, event: KeyboardEvent) => {
  editorState.undoManager.undo();
  return KeyEventResult.handled;
};