import { EditorState } from '../../../../editor_state';
import { CharacterShortcutEvent, CharacterShortcutEventHandler } from '../character_shortcut_event';

/**
 * Insert a new line block
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const insertNewLine = new CharacterShortcutEvent({
  key: 'insert a new line',
  character: '\n',
  handler: insertNewLineHandler,
});

const insertNewLineHandler: CharacterShortcutEventHandler = async (editorState: EditorState) => {
  // On desktop or web, shift + enter to insert a '\n' character to the same line.
  // So, we should return false to let the system handle it.
  if (isNotMobile() && isShiftPressed()) {
    return false;
  }

  const selection = editorState.selection?.normalized;
  if (!selection) {
    return false;
  }

  // Delete the selection
  await editorState.deleteSelection(selection);
  // Insert a new line
  await editorState.insertNewLine({ position: selection.start });

  return true;
};

function isNotMobile(): boolean {
  return !(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
}

function isShiftPressed(): boolean {
  // Check if shift key is currently pressed
  return document.querySelector(':focus')?.matches('input, textarea') ? false : 
    (window.event as KeyboardEvent)?.shiftKey || false;
}