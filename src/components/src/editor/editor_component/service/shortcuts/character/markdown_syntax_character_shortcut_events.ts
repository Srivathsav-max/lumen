import { CharacterShortcutEvent } from '../character_shortcut_event';
import { formatBackquoteToCode } from './format_single_character/format_code';
import { formatUnderscoreToItalic, formatAsteriskToItalic } from './format_single_character/format_italic';
import { formatTildeToStrikethrough } from './format_single_character/format_strikethrough';
import { formatDoubleTilesToStrikethrough } from './format_double_character/format_strikethrough';
import { formatDoubleAsterisksToBold, formatDoubleUnderscoresToBold } from './format_double_character/format_bold';
import { formatDoubleHyphenEmDash } from './format_double_character/format_double_hyphen';
import { formatMarkdownLinkToLink } from './markdown_link_shortcut_event';

// Include all the shortcut(formatting) events triggered by wrapping text with double characters.
// 1. double asterisk to bold -> **abc**
// 2. double underscore to bold -> __abc__

// Include all the shortcut(formatting) events triggered by wrapping text with a single character.
// 1. backquote to code -> `abc`
// 2. underscore to italic -> _abc_
// 3. asterisk to italic -> *abc*
// 4. tilde to strikethrough -> ~abc~

export const markdownSyntaxShortcutEvents: CharacterShortcutEvent[] = [
  // format code, `code`
  formatBackquoteToCode,

  // format italic,
  // _italic_
  // *italic*
  formatUnderscoreToItalic,
  formatAsteriskToItalic,

  // format strikethrough,
  // ~strikethrough~
  // ~~strikethrough~~
  formatTildeToStrikethrough,
  formatDoubleTilesToStrikethrough,

  // format bold, **bold** or __bold__
  formatDoubleAsterisksToBold,
  formatDoubleUnderscoresToBold,

  // format -- into em dash
  formatDoubleHyphenEmDash,

  // format [*](*) to link
  formatMarkdownLinkToLink,
];