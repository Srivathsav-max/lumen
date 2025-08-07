import { CharacterShortcutEvent } from '../../character_shortcut_event';
import { handleFormatByWrappingWithSingleCharacter, FormatStyleByWrappingWithSingleChar } from './format_single_character';

const tilde = '~';

/**
 * Format the text surrounded by single tilde to strikethrough
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const formatTildeToStrikethrough = new CharacterShortcutEvent({
  key: 'format the text surrounded by single tilde to strikethrough',
  character: tilde,
  handler: async (editorState) => handleFormatByWrappingWithSingleCharacter({
    editorState,
    character: tilde,
    formatStyle: FormatStyleByWrappingWithSingleChar.strikethrough,
  }),
});