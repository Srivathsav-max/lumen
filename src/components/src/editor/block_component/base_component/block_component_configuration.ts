import { Node } from '../../../core/document/node';

export interface BlockComponentContext {
  node: Node;
  editorState: any;
}

export type PlaceholderTextBuilder = (node: Node) => string;
export type PaddingBuilder = (node: Node) => { vertical?: number; horizontal?: number };

export class BlockComponentConfiguration {
  public readonly placeholderText?: PlaceholderTextBuilder;
  public readonly padding?: PaddingBuilder;
  public readonly textStyle?: any;
  public readonly placeholderTextStyle?: any;

  constructor(options: {
    placeholderText?: PlaceholderTextBuilder;
    padding?: PaddingBuilder;
    textStyle?: any;
    placeholderTextStyle?: any;
  } = {}) {
    this.placeholderText = options.placeholderText;
    this.padding = options.padding;
    this.textStyle = options.textStyle;
    this.placeholderTextStyle = options.placeholderTextStyle;
  }

  copyWith(options: {
    placeholderText?: PlaceholderTextBuilder;
    padding?: PaddingBuilder;
    textStyle?: any;
    placeholderTextStyle?: any;
  } = {}): BlockComponentConfiguration {
    return new BlockComponentConfiguration({
      placeholderText: options.placeholderText ?? this.placeholderText,
      padding: options.padding ?? this.padding,
      textStyle: options.textStyle ?? this.textStyle,
      placeholderTextStyle: options.placeholderTextStyle ?? this.placeholderTextStyle,
    });
  }
}

export type BlockComponentValidate = (node: Node) => boolean;

export abstract class BlockComponentBuilder {
  protected configuration: BlockComponentConfiguration;

  constructor(configuration?: BlockComponentConfiguration) {
    this.configuration = configuration || new BlockComponentConfiguration();
  }

  abstract build(blockComponentContext: BlockComponentContext): any;

  abstract get validate(): BlockComponentValidate;

  protected showActions(node: Node): boolean {
    // Default implementation
    return true;
  }

  protected actionBuilder(blockComponentContext: BlockComponentContext, state: any): any {
    // Default implementation
    return null;
  }

  protected actionTrailingBuilder(blockComponentContext: BlockComponentContext, state: any): any {
    // Default implementation
    return null;
  }
}