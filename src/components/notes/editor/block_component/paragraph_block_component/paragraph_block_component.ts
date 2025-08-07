import { Node } from '../../../core/document/node';
import { Delta } from '../../../core/document/text_delta';
import { Attributes } from '../../../core/document/attributes';
import { blockComponentDelta, blockComponentBackgroundColor, blockComponentTextDirection } from '../base_component_keys';
import { BlockComponentBuilder, BlockComponentConfiguration } from '../base_component/block_component_configuration';

export class ParagraphBlockKeys {
  static readonly type = 'paragraph';
  static readonly delta = blockComponentDelta;
  static readonly backgroundColor = blockComponentBackgroundColor;
  static readonly textDirection = blockComponentTextDirection;
}

export function paragraphNode(options: {
  text?: string;
  delta?: Delta;
  textDirection?: string;
  attributes?: Attributes;
  children?: Node[];
} = {}): Node {
  const { text, delta, textDirection, attributes, children = [] } = options;
  
  const nodeAttributes: Attributes = {
    [ParagraphBlockKeys.delta]: (delta ?? new Delta().insert(text ?? '')).toJson(),
    ...(attributes || {}),
  };
  
  if (textDirection) {
    nodeAttributes[ParagraphBlockKeys.textDirection] = textDirection;
  }
  
  return new Node({
    type: ParagraphBlockKeys.type,
    attributes: nodeAttributes,
    children,
  });
}

export type ShowPlaceholder = (editorState: any, node: Node) => boolean;

export class ParagraphBlockComponentBuilder extends BlockComponentBuilder {
  private showPlaceholder?: ShowPlaceholder;

  constructor(options: {
    configuration?: BlockComponentConfiguration;
    showPlaceholder?: ShowPlaceholder;
  } = {}) {
    super(options.configuration);
    this.showPlaceholder = options.showPlaceholder;
  }

  build(blockComponentContext: any): ParagraphBlockComponentWidget {
    const node = blockComponentContext.node;
    return new ParagraphBlockComponentWidget({
      node,
      key: node.key,
      configuration: this.configuration,
      showActions: this.showActions(node),
      showPlaceholder: this.showPlaceholder,
      actionBuilder: (context, state) => this.actionBuilder(blockComponentContext, state),
      actionTrailingBuilder: (context, state) => this.actionTrailingBuilder(blockComponentContext, state),
    });
  }

  get validate() {
    return (node: Node) => node.delta != null;
  }
}

export class ParagraphBlockComponentWidget {
  public readonly node: Node;
  public readonly key: string;
  public readonly configuration: BlockComponentConfiguration;
  public readonly showActions: boolean;
  public readonly showPlaceholder?: ShowPlaceholder;
  public readonly actionBuilder?: (context: any, state: any) => any;
  public readonly actionTrailingBuilder?: (context: any, state: any) => any;

  private _showPlaceholder = false;

  constructor(options: {
    node: Node;
    key: string;
    configuration: BlockComponentConfiguration;
    showActions: boolean;
    showPlaceholder?: ShowPlaceholder;
    actionBuilder?: (context: any, state: any) => any;
    actionTrailingBuilder?: (context: any, state: any) => any;
  }) {
    this.node = options.node;
    this.key = options.key;
    this.configuration = options.configuration;
    this.showActions = options.showActions;
    this.showPlaceholder = options.showPlaceholder;
    this.actionBuilder = options.actionBuilder;
    this.actionTrailingBuilder = options.actionTrailingBuilder;
  }

  // Lifecycle methods
  initState(editorState: any): void {
    editorState.selectionNotifier?.addListener(() => this.onSelectionChange(editorState));
    this.onSelectionChange(editorState);
  }

  dispose(editorState: any): void {
    editorState.selectionNotifier?.removeListener(() => this.onSelectionChange(editorState));
  }

  private onSelectionChange(editorState: any): void {
    const selection = editorState.selection;

    if (this.showPlaceholder) {
      this._showPlaceholder = this.showPlaceholder(editorState, this.node);
    } else {
      const showPlaceholder = selection != null &&
        (selection.isSingle && this.pathEquals(selection.start.path, this.node.path));
      this._showPlaceholder = showPlaceholder;
    }
  }

  private pathEquals(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  buildComponent(context: any, options: { withBackgroundColor?: boolean } = {}): any {
    const { withBackgroundColor = true } = options;
    
    // This would return the actual rendered component
    // For now, returning a placeholder structure
    return {
      type: 'paragraph',
      node: this.node,
      showPlaceholder: this._showPlaceholder,
      configuration: this.configuration,
      withBackgroundColor,
    };
  }
}