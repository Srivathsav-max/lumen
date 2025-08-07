/// Only for the common config of text style
export interface TextStyle {
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
  backgroundColor?: string;
}

export enum TextLeadingDistribution {
  even = 'even',
  proportional = 'proportional',
}

export class TextStyleConfiguration {
  /// default text style
  readonly text: TextStyle;
  /// bold text style
  readonly bold: TextStyle;
  /// italic text style
  readonly italic: TextStyle;
  /// underline text style
  readonly underline: TextStyle;
  /// strikethrough text style
  readonly strikethrough: TextStyle;
  /// href text style
  readonly href: TextStyle;
  /// code text style
  readonly code: TextStyle;
  /// auto complete text style
  readonly autoComplete: TextStyle;
  /// apply line height to the first or the last ascent
  readonly applyHeightToFirstAscent: boolean;
  readonly applyHeightToLastDescent: boolean;
  readonly lineHeight: number;
  readonly leadingDistribution: TextLeadingDistribution;

  constructor(options: {
    text?: TextStyle;
    bold?: TextStyle;
    italic?: TextStyle;
    underline?: TextStyle;
    strikethrough?: TextStyle;
    href?: TextStyle;
    code?: TextStyle;
    autoComplete?: TextStyle;
    applyHeightToFirstAscent?: boolean;
    applyHeightToLastDescent?: boolean;
    lineHeight?: number;
    leadingDistribution?: TextLeadingDistribution;
  } = {}) {
    this.text = options.text || { fontSize: 16.0 };
    this.bold = options.bold || { fontWeight: 'bold' };
    this.italic = options.italic || { fontStyle: 'italic' };
    this.underline = options.underline || { textDecoration: 'underline' };
    this.strikethrough = options.strikethrough || { textDecoration: 'line-through' };
    this.href = options.href || {
      color: '#2196F3', // Colors.lightBlue
      textDecoration: 'underline',
    };
    this.code = options.code || {
      color: '#F44336', // Colors.red
      backgroundColor: 'rgba(0, 195, 255, 0.38)', // Color.fromARGB(98, 0, 195, 255)
    };
    this.autoComplete = options.autoComplete || {
      color: '#9E9E9E', // Colors.grey
    };
    this.applyHeightToFirstAscent = options.applyHeightToFirstAscent ?? false;
    this.applyHeightToLastDescent = options.applyHeightToLastDescent ?? false;
    this.lineHeight = options.lineHeight ?? 1.5;
    this.leadingDistribution = options.leadingDistribution ?? TextLeadingDistribution.even;
  }

  copyWith(options: {
    text?: TextStyle;
    bold?: TextStyle;
    italic?: TextStyle;
    underline?: TextStyle;
    strikethrough?: TextStyle;
    href?: TextStyle;
    code?: TextStyle;
    autoComplete?: TextStyle;
    applyHeightToFirstAscent?: boolean;
    applyHeightToLastDescent?: boolean;
    lineHeight?: number;
    leadingDistribution?: TextLeadingDistribution;
  }): TextStyleConfiguration {
    return new TextStyleConfiguration({
      text: options.text ?? this.text,
      bold: options.bold ?? this.bold,
      italic: options.italic ?? this.italic,
      underline: options.underline ?? this.underline,
      strikethrough: options.strikethrough ?? this.strikethrough,
      href: options.href ?? this.href,
      code: options.code ?? this.code,
      autoComplete: options.autoComplete ?? this.autoComplete,
      applyHeightToFirstAscent: options.applyHeightToFirstAscent ?? this.applyHeightToFirstAscent,
      applyHeightToLastDescent: options.applyHeightToLastDescent ?? this.applyHeightToLastDescent,
      lineHeight: options.lineHeight ?? this.lineHeight,
      leadingDistribution: options.leadingDistribution ?? this.leadingDistribution,
    });
  }
}