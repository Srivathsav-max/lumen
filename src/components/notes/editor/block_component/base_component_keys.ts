/// the delta of the block component
///
/// its value is a string of json format, e.g. '{"insert":"Hello World"}'
/// for more information, please refer to https://quilljs.com/docs/delta/
export const blockComponentDelta = 'delta';

/// the background of the block component
///
/// its value is a string of hex code, e.g. '#00000000'
export const blockComponentBackgroundColor = 'bgColor';

/// the text direction of the block component
///
/// its value must be one of the following:
///   - [blockComponentTextDirectionLTR] or 'ltr': left to right
///   - [blockComponentTextDirectionRTL] or 'rtl': right to left
///   - [blockComponentTextDirectionAuto] or auto: depends on the text
///
/// only works for the block with text,
///   e.g. paragraph, heading, quote, to-do list, bulleted list, numbered list
export const blockComponentTextDirection = 'textDirection';
export const blockComponentTextDirectionAuto = 'auto';
export const blockComponentTextDirectionLTR = 'ltr';
export const blockComponentTextDirectionRTL = 'rtl';

/// text align
///
/// its value must be one of the following:
///  - left, right, center.
export const blockComponentAlign = 'align';