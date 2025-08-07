import { CharacterShortcutEvent } from '../../character_shortcut_event';
import { handleDoubleCharacterReplacement } from '../character_shortcut_events/format_double_characters/utils';

const hyphen = '-';
const emDash = '—'; // This is an em dash — not a single dash - !!

/**
 * Format two hyphens into an em dash
 * 
 * - support
 *   - desktop
 *   - mobile
 *   - web
 */
export const formatDoubleHyphenEmDash = new CharacterShortcutEvent({
  key: 'format double hyphen into an em dash',
  character: hyphen,
  handler: async (editorState) => handleDoubleCharacterReplacement({
    editorState,
    character: hyphen,
    replacement: emDash,
  }),
});