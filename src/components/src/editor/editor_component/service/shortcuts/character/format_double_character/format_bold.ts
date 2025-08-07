import { CharacterShortcutEvent } from '../../character_shortcut_event';
import { handleFormatByWrappingWithDoubleCharacter, DoubleCharacterFormatStyle } from './format_double_characters';

const asterisk = '*';
const underscore = '_';

/**
 * Format the text surrounded by double asterisks to bold
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const formatDoubleAsterisksToBold = new CharacterShortcutEvent({
  key: 'format the text surrounded by double asterisks to bold',
  character: asterisk,
  handler: async (editorState) => handleFormatByWrappingWithDoubleCharacter({
    editorState,
    character: asterisk,
    formatStyle: DoubleCharacterFormatStyle.bold,
  }),
});

/**
 * Format the text surrounded by double underscores to bold
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const formatDoubleUnderscoresToBold = new CharacterShortcutEvent({
  key: 'format the text surrounded by double underscores to bold',
  character: underscore,
  handler: async (editorState) => handleFormatByWrappingWithDoubleCharacter({
    editorState,
    character: underscore,
    formatStyle: DoubleCharacterFormatStyle.bold,
  }),
});