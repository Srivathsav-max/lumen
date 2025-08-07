import { EditorState, Node, Selection, Position } from '../../../core/editor_state';
import { BlockComponentBuilder, BlockComponentContext, BlockComponentWidget, BlockComponentConfiguration } from '../../../core/block_component';
import { Component, ComponentChild } from '../../../core/component';
import { BlockSelectionContainer, BlockSelectionType } from '../base_component/selection/block_selection_container';
import { BlockComponentActionWrapper } from '../base_component/block_component_action_wrapper';
import { SelectableMixin } from '../base_component/mixins';
import { BlockComponentConfigurable } from './block_component_configuration';
import { ResizableImage } from './resizable_image';

export class ImageBlockKeys {
  static readonly type = 'image';

  /// The align data of a image block.
  ///
  /// The value is a String.
  /// left, center, right
  static readonly align = 'align';

  /// The image src of a image block.
  ///
  /// The value is a String.
  /// It can be a url or a base64 string(web).
  static readonly url = 'url';

  /// The height of a image block.
  ///
  /// The value is a double.
  static readonly width = 'width';

  /// The width of a image block.
  ///
  /// The value is a double.
  static readonly height = 'height';
}

export function imageNode(options: {
  url: string;
  align?: string;
  height?: number;
  width?: number;
}): Node {
  const { url, align = 'center', height, width } = options;
  
  return new Node({
    type: ImageBlockKeys.type,
    attributes: {
      [ImageBlockKeys.url]: url,
      [ImageBlockKeys.align]: align,
      [ImageBlockKeys.height]: height,
      [ImageBlockKeys.width]: width,
    },
  });
}

export type ImageBlockComponentMenuBuilder = (
  node: Node,
  state: ImageBlockComponentWidgetState,
) => ComponentChild;

export class ImageBlockComponentBuilder extends BlockComponentBuilder {
  constructor(
    configuration?: BlockComponentConfiguration,
    private showMenu: boolean = false,
    private menuBuilder?: ImageBlockComponentMenuBuilder,
  ) {
    super(configuration);
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    return new ImageBlockComponentWidget({
      key: node.key,
      node,
      showActions: this.showActions(node),
      configuration: this.configuration,
      actionBuilder: (context, state) => this.actionBuilder(blockComponentContext, state),
      actionTrailingBuilder: (context, state) => this.actionTrailingBuilder(blockComponentContext, state),
      showMenu: this.showMenu,
      menuBuilder: this.menuBuilder,
    });
  }

  validate = (node: Node): boolean => 
    node.delta === null && node.children.length === 0;
}

interface ImageBlockComponentWidgetProps {
  key?: string;
  node: Node;
  showActions?: boolean;
  actionBuilder?: (context: any, state: any) => ComponentChild;
  actionTrailingBuilder?: (context: any, state: any) => ComponentChild;
  configuration?: BlockComponentConfiguration;
  showMenu?: boolean;
  menuBuilder?: ImageBlockComponentMenuBuilder;
}

interface ImageBlockComponentWidgetState {
  showActionsNotifier: boolean;
  alwaysShowMenu: boolean;
}

export class ImageBlockComponentWidget extends Component<ImageBlockComponentWidgetProps, ImageBlockComponentWidgetState>
  implements SelectableMixin, BlockComponentConfigurable {
  
  private imageKey = 'image-key';
  private editorState: EditorState;

  constructor(props: ImageBlockComponentWidgetProps) {
    super(props);
    this.state = {
      showActionsNotifier: false,
      alwaysShowMenu: false,
    };
    // In a real implementation, this would be injected via context
    this.editorState = {} as EditorState;
  }

  get configuration(): BlockComponentConfiguration {
    return this.props.configuration || new BlockComponentConfiguration();
  }

  get node(): Node {
    return this.props.node;
  }

  render(): ComponentChild {
    const node = this.props.node;
    const attributes = node.attributes;
    const src = attributes[ImageBlockKeys.url] as string;

    const alignment = AlignmentExtension.fromString(
      attributes[ImageBlockKeys.align] as string || 'center',
    );
    const width = (attributes[ImageBlockKeys.width] as number) || window.innerWidth;
    const height = attributes[ImageBlockKeys.height] as number;

    let child: ComponentChild = new ResizableImage({
      src,
      width,
      height,
      editable: this.editorState.editable,
      alignment,
      onResize: (newWidth: number) => {
        const transaction = this.editorState.transaction;
        transaction.updateNode(node, {
          [ImageBlockKeys.width]: newWidth,
        });
        this.editorState.apply(transaction);
      },
    });

    child = {
      tag: 'div',
      key: this.imageKey,
      style: {
        padding: this.padding,
      },
      children: [child],
    };

    child = new BlockSelectionContainer({
      node,
      delegate: this,
      listenable: this.editorState.selectionNotifier,
      remoteSelection: this.editorState.remoteSelections,
      blockColor: this.editorState.editorStyle.selectionColor,
      supportTypes: [BlockSelectionType.block],
      children: [child],
    });

    if (this.props.showActions && this.props.actionBuilder) {
      child = new BlockComponentActionWrapper({
        node,
        actionBuilder: this.props.actionBuilder,
        actionTrailingBuilder: this.props.actionTrailingBuilder,
        children: [child],
      });
    }

    if (this.props.showMenu && this.props.menuBuilder) {
      child = {
        tag: 'div',
        onMouseEnter: () => this.setState({ showActionsNotifier: true }),
        onMouseLeave: () => {
          if (!this.state.alwaysShowMenu) {
            this.setState({ showActionsNotifier: false });
          }
        },
        style: { position: 'relative' },
        children: [
          new BlockSelectionContainer({
            node,
            delegate: this,
            listenable: this.editorState.selectionNotifier,
            remoteSelection: this.editorState.remoteSelections,
            cursorColor: this.editorState.editorStyle.cursorColor,
            selectionColor: this.editorState.editorStyle.selectionColor,
            children: [child],
          }),
          ...(this.state.showActionsNotifier ? [this.props.menuBuilder(this.props.node, this)] : []),
        ],
      };
    }

    return child;
  }

  // SelectableMixin implementation
  start(): Position {
    return new Position(this.props.node.path, 0);
  }

  end(): Position {
    return new Position(this.props.node.path, 1);
  }

  getPositionInOffset(start: { x: number; y: number }): Position {
    return this.end();
  }

  get shouldCursorBlink(): boolean {
    return false;
  }

  get cursorStyle(): string {
    return 'cover';
  }

  getBlockRect(options?: { shiftWithBaseOffset?: boolean }): DOMRect {
    const imageElement = document.querySelector(`[key="${this.imageKey}"]`);
    if (imageElement) {
      return imageElement.getBoundingClientRect();
    }
    return new DOMRect(0, 0, 0, 0);
  }

  getCursorRectInPosition(
    position: Position,
    options?: { shiftWithBaseOffset?: boolean }
  ): DOMRect | null {
    const rect = this.getBlockRect();
    return new DOMRect(-rect.width / 2.0, 0, rect.width, rect.height);
  }

  getRectsInSelection(
    selection: Selection,
    options?: { shiftWithBaseOffset?: boolean }
  ): DOMRect[] {
    const rect = this.getBlockRect();
    return [rect];
  }

  getSelectionInRange(start: { x: number; y: number }, end: { x: number; y: number }): Selection {
    return Selection.single(this.props.node.path, 0, 1);
  }

  localToGlobal(
    offset: { x: number; y: number },
    options?: { shiftWithBaseOffset?: boolean }
  ): { x: number; y: number } {
    const rect = this.getBlockRect();
    return { x: rect.left + offset.x, y: rect.top + offset.y };
  }

  // BlockComponentConfigurable implementation
  get padding(): string {
    return this.configuration.padding(this.node).toString();
  }

  textStyleWithTextSpan(options?: any): any {
    return this.configuration.textStyle(this.node, options);
  }

  placeholderTextStyleWithTextSpan(options?: any): any {
    return this.configuration.placeholderTextStyle(this.node, options);
  }

  get placeholderText(): string {
    return this.configuration.placeholderText(this.node);
  }

  get textAlign(): any {
    return this.configuration.textAlign(this.node);
  }
}

export class AlignmentExtension {
  static fromString(name: string): string {
    switch (name) {
      case 'left':
        return 'flex-start';
      case 'right':
        return 'flex-end';
      default:
        return 'center';
    }
  }
}