import { CharacterShortcutEvent } from '../../character_shortcut_event';
import { handleFormatByWrappingWithSingleCharacter, FormatStyleByWrappingWithSingleChar } from './format_single_character';

const underscore = '_';
const asterisk = '*';
type EditorState = any;
/**
 * Format the text surrounded by single underscore to italic
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const formatUnderscoreToItalic = new CharacterShortcutEvent({
  key: 'format the text surrounded by single underscore to italic',
  character: underscore,
  handler: async (editorState: EditorState) => handleFormatByWrappingWithSingleCharacter({
    editorState,
    character: underscore,
    formatStyle: FormatStyleByWrappingWithSingleChar.italic,
  }),
});

/**
 * Format the text surrounded by single asterisk to italic
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const formatAsteriskToItalic = new CharacterShortcutEvent({
  key: 'format the text surrounded by single asterisk to italic',
  character: asterisk,
  handler: async (editorState: EditorState) => handleFormatByWrappingWithSingleCharacter({
    editorState,
    character: asterisk,
    formatStyle: FormatStyleByWrappingWithSingleChar.italic,
  }),
});