import { CharacterShortcutEvent } from '../../character_shortcut_event';
import { handleDoubleCharacterReplacement } from '../character_shortcut_events/format_double_characters/utils';

const greater = '>';
const equals = '=';
const arrow = '⇒';

/**
 * Format '=' + '>' into an ⇒
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const formatGreaterEqual = new CharacterShortcutEvent({
  key: 'format = + > into ⇒',
  character: greater,
  handler: async (editorState) => handleDoubleCharacterReplacement({
    editorState,
    character: greater,
    replacement: arrow,
    prefixCharacter: equals,
  }),
});

const hyphen = '-';
const singleArrow = '→';

/**
 * Format '-' + '>' into an →
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const formatGreaterHyphen = new CharacterShortcutEvent({
  key: 'format - + > into →',
  character: greater,
  handler: async (editorState) => handleDoubleCharacterReplacement({
    editorState,
    character: greater,
    replacement: singleArrow,
    prefixCharacter: hyphen,
  }),
});