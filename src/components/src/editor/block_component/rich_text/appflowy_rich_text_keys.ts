export class AppFlowyRichTextKeys {
  static readonly bold = 'bold';
  static readonly italic = 'italic';
  static readonly underline = 'underline';
  static readonly strikethrough = 'strikethrough';
  static readonly textColor = 'font_color';
  static readonly backgroundColor = 'bg_color';
  static readonly findBackgroundColor = 'find_bg_color';
  static readonly code = 'code';
  static readonly href = 'href';
  static readonly fontFamily = 'font_family';
  static readonly fontSize = 'font_size';
  static readonly autoComplete = 'auto_complete';
  static readonly transparent = 'transparent';

  /// The attributes supported sliced.
  static readonly supportSliced = [
    AppFlowyRichTextKeys.bold,
    AppFlowyRichTextKeys.italic,
    AppFlowyRichTextKeys.underline,
    AppFlowyRichTextKeys.strikethrough,
    AppFlowyRichTextKeys.textColor,
    AppFlowyRichTextKeys.backgroundColor,
    AppFlowyRichTextKeys.code,
  ];

  /// The attributes is partially supported sliced.
  ///
  /// For the code and href attributes, the slice attributes function will only work if the index is in the range of the code or href.
  static readonly partialSliced = [
    AppFlowyRichTextKeys.code,
    AppFlowyRichTextKeys.href,
  ];

  // The values supported toggled even if the selection is collapsed.
  static readonly supportToggled = [
    AppFlowyRichTextKeys.bold,
    AppFlowyRichTextKeys.italic,
    AppFlowyRichTextKeys.underline,
    AppFlowyRichTextKeys.strikethrough,
    AppFlowyRichTextKeys.code,
    AppFlowyRichTextKeys.fontFamily,
    AppFlowyRichTextKeys.textColor,
    AppFlowyRichTextKeys.backgroundColor,
  ];
}