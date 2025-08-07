import { Node } from '../../../core/editor_state';
import { TextStyle, TextSpan } from '../../../core/text_style';

export type BlockComponentTextStyleBuilder = (
  node: Node,
  options?: { textSpan?: TextSpan }
) => TextStyle;

export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export enum TextAlign {
  start = 'start',
  center = 'center',
  end = 'end',
  left = 'left',
  right = 'right',
  justify = 'justify',
}

export enum TextDirection {
  ltr = 'ltr',
  rtl = 'rtl',
}

/// only for the common config of block component
export class BlockComponentConfiguration {
  constructor(options: {
    padding?: (node: Node) => EdgeInsets;
    indentPadding?: (node: Node, textDirection: TextDirection) => EdgeInsets;
    placeholderText?: (node: Node) => string;
    textStyle?: BlockComponentTextStyleBuilder;
    placeholderTextStyle?: BlockComponentTextStyleBuilder;
    blockSelectionAreaMargin?: (node: Node) => EdgeInsets;
    textAlign?: (node: Node) => TextAlign;
  } = {}) {
    this.padding = options.padding || _padding;
    this.indentPadding = options.indentPadding || _indentPadding;
    this.placeholderText = options.placeholderText || _placeholderText;
    this.textStyle = options.textStyle || _textStyle;
    this.placeholderTextStyle = options.placeholderTextStyle || _placeholderTextStyle;
    this.blockSelectionAreaMargin = options.blockSelectionAreaMargin || _blockSelectionAreaPadding;
    this.textAlign = options.textAlign || _textAlign;
  }

  /// The padding of a block component.
  ///
  /// It works only for the block component itself, not for the children.
  readonly padding: (node: Node) => EdgeInsets;

  /// The padding of a block component.
  ///
  /// It works only for the block that needs to be indented.
  readonly indentPadding: (node: Node, textDirection: TextDirection) => EdgeInsets;

  /// The text style of a block component.
  readonly textStyle: BlockComponentTextStyleBuilder;

  /// The placeholder text of a block component.
  readonly placeholderText: (node: Node) => string;

  /// The placeholder text style of a block component.
  ///
  /// It inherits the style from [textStyle].
  readonly placeholderTextStyle: BlockComponentTextStyleBuilder;

  /// The padding of a block selection area.
  readonly blockSelectionAreaMargin: (node: Node) => EdgeInsets;

  /// The text align of a block component.
  ///
  /// This value is only available for the block with text,
  /// e.g. paragraph, heading, quote, to-do list, bulleted list, numbered list
  readonly textAlign: (node: Node) => TextAlign;

  copyWith(options: {
    padding?: (node: Node) => EdgeInsets;
    textStyle?: BlockComponentTextStyleBuilder;
    placeholderText?: (node: Node) => string;
    placeholderTextStyle?: BlockComponentTextStyleBuilder;
    blockSelectionAreaMargin?: (node: Node) => EdgeInsets;
    textAlign?: (node: Node) => TextAlign;
    indentPadding?: (node: Node, textDirection: TextDirection) => EdgeInsets;
  }): BlockComponentConfiguration {
    return new BlockComponentConfiguration({
      padding: options.padding || this.padding,
      textStyle: options.textStyle || this.textStyle,
      placeholderText: options.placeholderText || this.placeholderText,
      placeholderTextStyle: options.placeholderTextStyle || this.placeholderTextStyle,
      blockSelectionAreaMargin: options.blockSelectionAreaMargin || this.blockSelectionAreaMargin,
      textAlign: options.textAlign || this.textAlign,
      indentPadding: options.indentPadding || this.indentPadding,
    });
  }
}

export interface BlockComponentConfigurable {
  configuration: BlockComponentConfiguration;
  node: Node;
  
  get padding(): EdgeInsets;
  textStyleWithTextSpan(options?: { textSpan?: TextSpan }): TextStyle;
  placeholderTextStyleWithTextSpan(options?: { textSpan?: TextSpan }): TextStyle;
  get placeholderText(): string;
  get textAlign(): TextAlign;
}

export class BlockComponentConfigurableMixin implements BlockComponentConfigurable {
  constructor(
    public configuration: BlockComponentConfiguration,
    public node: Node
  ) {}

  get padding(): EdgeInsets {
    return this.configuration.padding(this.node);
  }

  textStyleWithTextSpan(options?: { textSpan?: TextSpan }): TextStyle {
    return this.configuration.textStyle(this.node, options);
  }

  placeholderTextStyleWithTextSpan(options?: { textSpan?: TextSpan }): TextStyle {
    return this.configuration.placeholderTextStyle(this.node, options);
  }

  get placeholderText(): string {
    return this.configuration.placeholderText(this.node);
  }

  get textAlign(): TextAlign {
    return this.configuration.textAlign(this.node);
  }
}

function _padding(node: Node): EdgeInsets {
  return { top: 4.0, right: 0, bottom: 4.0, left: 0 };
}

function _indentPadding(node: Node, textDirection: TextDirection): EdgeInsets {
  switch (textDirection) {
    case TextDirection.ltr:
      return { top: 0, right: 0, bottom: 0, left: 24.0 };
    case TextDirection.rtl:
      return { top: 0, right: 24.0, bottom: 0, left: 0 };
  }
}

function _textStyle(node: Node, options?: { textSpan?: TextSpan }): TextStyle {
  return new TextStyle({});
}

function _placeholderText(node: Node): string {
  return ' ';
}

function _placeholderTextStyle(node: Node, options?: { textSpan?: TextSpan }): TextStyle {
  return new TextStyle({
    color: '#9CA3AF', // Colors.grey equivalent
  });
}

function _blockSelectionAreaPadding(node: Node): EdgeInsets {
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

function _textAlign(node: Node): TextAlign {
  return TextAlign.start;
}