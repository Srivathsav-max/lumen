import { CharacterShortcutEvent } from '../../character_shortcut_event';
import { handleFormatByWrappingWithSingleCharacter, FormatStyleByWrappingWithSingleChar } from './format_single_character';

const backquote = '`';

/**
 * Format the text surrounded by single backquote to code
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const formatBackquoteToCode = new CharacterShortcutEvent({
  key: 'format the text surrounded by single backquote to code',
  character: backquote,
  handler: async (editorState) => handleFormatByWrappingWithSingleCharacter({
    editorState,
    character: backquote,
    formatStyle: FormatStyleByWrappingWithSingleChar.code,
  }),
});