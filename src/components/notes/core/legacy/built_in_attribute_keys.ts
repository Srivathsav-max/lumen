///
/// Supported partial rendering types:
///   bold, italic,
///   underline, strikethrough,
///   textColor, highlightColor,
///   href
///
/// Supported global rendering types:
///   heading: h1, h2, h3, h4, h5, h6, ...
///   block quote,
///   list: ordered list, bulleted list,
///   code block
///
export class BuiltInAttributeKey {
  static readonly bold = 'bold';
  static readonly italic = 'italic';
  static readonly underline = 'underline';
  static readonly strikethrough = 'strikethrough';
  static readonly textColor = 'textColor';
  static readonly highlightColor = 'highlightColor';
  static readonly code = 'code';
  static readonly href = 'href';

  static readonly subtype = 'subtype';
  static readonly heading = 'heading';
  static readonly h1 = 'h1';
  static readonly h2 = 'h2';
  static readonly h3 = 'h3';
  static readonly h4 = 'h4';
  static readonly h5 = 'h5';
  static readonly h6 = 'h6';

  static readonly checkbox = 'checkbox';
  static readonly bulletedList = 'bulleted-list';
  static readonly numberList = 'number-list';
  static readonly quote = 'quote';
  static readonly number = 'number';

  static readonly partialStyleKeys = [
    BuiltInAttributeKey.bold,
    BuiltInAttributeKey.italic,
    BuiltInAttributeKey.underline,
    BuiltInAttributeKey.strikethrough,
    BuiltInAttributeKey.highlightColor,
    BuiltInAttributeKey.textColor,
    BuiltInAttributeKey.href,
    BuiltInAttributeKey.code,
  ];

  static readonly globalStyleKeys = [
    BuiltInAttributeKey.subtype,
    BuiltInAttributeKey.heading,
    BuiltInAttributeKey.checkbox,
    BuiltInAttributeKey.bulletedList,
    BuiltInAttributeKey.numberList,
    BuiltInAttributeKey.quote,
  ];
}