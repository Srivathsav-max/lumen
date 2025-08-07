import { CharacterShortcutEvent } from '../../character_shortcut_event';
import { handleFormatByWrappingWithDoubleCharacter, DoubleCharacterFormatStyle } from './format_double_characters';

const tilde = '~';

/**
 * Format the text surrounded by double tildes to strikethrough
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const formatDoubleTilesToStrikethrough = new CharacterShortcutEvent({
  key: 'format the text surrounded by double tildes to strikethrough',
  character: tilde,
  handler: async (editorState) => handleFormatByWrappingWithDoubleCharacter({
    editorState,
    character: tilde,
    formatStyle: DoubleCharacterFormatStyle.strikethrough,
  }),
});