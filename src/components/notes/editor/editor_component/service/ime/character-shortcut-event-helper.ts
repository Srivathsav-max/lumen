import { EditorState } from '../../../editor_state';
import { CharacterShortcutEvent } from '../../../shortcut_event/shortcut_event';

/**
 * Execute a character shortcut event
 */
export const executeCharacterShortcutEvent = async (
  shortcutEvent: CharacterShortcutEvent,
  editorState: EditorState
): Promise<boolean> => {
  try {
    const result = await shortcutEvent.handler(editorState);
    return result === 'handled' || result === 'skipRemainingHandlers';
  } catch (error) {
    console.error('Error executing character shortcut event:', error);
    return false;
  }
};