// Text direction utilities for RTL/LTR detection
export enum TextDirection {
  ltr = 'ltr',
  rtl = 'rtl'
}

/**
 * Regular expression that matches either a single character from specific RTL (right-to-left) 
 * script categories or a digit or character from various other script categories.
 * Useful for identifying or manipulating text with mixed directional properties.
 */
const _regex = new RegExp(
  "(?:([\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\u0590-\\u05FF\\u0700-\\u074F\\u0780-\\u07BF])|([0-9\\u0530-\\u058F\\u0980-\\u09FF\\u3100-\\u312F\\u2800-\\u28FF\\u1400-\\u167F\\u13A0-\\u13FF\\u0400-\\u04FF\\u0900-\\u097F\\u1200-\\u137F\\u10A0-\\u10FF\\u0370-\\u03FF\\u0A80-\\u0AFF\\u0A00-\\u0A7F\\u4E00-\\u9FFF\\uAC00-\\uD7AF\\u1720-\\u173F\\u3040-\\u309F\\u0C80-\\u0CFF\\u30A0-\\u30FF\\u1A00-\\u1A1F\\u0D00-\\u0D7F\\u1800-\\u18AF\\u1000-\\u109F\\u1680-\\u169F\\u0B00-\\u0B7F\\u16A0-\\u16FF\\u0D80-\\u0DFF\\u1700-\\u171F\\u1760-\\u177F\\u0B80-\\u0BFF\\u0C00-\\u0C7F\\u0E00-\\u0E7F\\u0F00-\\u0FFF\\uA000-\\uA48F]))",
  "u"
);

/**
 * Determines the text direction of a given string based on the first directional character found.
 * @param text The text to analyze
 * @returns TextDirection.rtl for RTL scripts, TextDirection.ltr for LTR scripts, or null if no directional character is found
 */
export function determineTextDirection(text: string): TextDirection | null {
  const matches = _regex.exec(text);
  if (matches) {
    if (matches[1] != null) {
      return TextDirection.rtl;
    } else if (matches[2] != null) {
      return TextDirection.ltr;
    }
  }
  return null;
}