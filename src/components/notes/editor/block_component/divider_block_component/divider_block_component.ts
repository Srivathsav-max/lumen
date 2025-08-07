import { EditorState, Node, Selection, Position } from '../../../core/editor_state';
import { BlockComponentBuilder, BlockComponentContext, BlockComponentWidget, BlockComponentConfiguration } from '../../../core/block_component';
import { Component, ComponentChild } from '../../../core/component';
import { BlockSelectionContainer, BlockSelectionType } from '../base_component/selection/block_selection_container';
import { BlockComponentActionWrapper } from '../base_component/block_component_action_wrapper';
import { SelectableMixin, BlockComponentConfigurable } from '../base_component/mixins';

export class DividerBlockKeys {
  static readonly type = 'divider';
}

// creating a new divider node
export function dividerNode(): Node {
  return new Node({
    type: DividerBlockKeys.type,
  });
}

export type DividerBlockWrapper = (
  context: any,
  node: Node,
  child: ComponentChild,
) => ComponentChild;

export class DividerBlockComponentBuilder extends BlockComponentBuilder {
  constructor(
    configuration?: BlockComponentConfiguration,
    private lineColor: string = '#9CA3AF', // Colors.grey equivalent
    private height: number = 10,
    private wrapper?: DividerBlockWrapper,
  ) {
    super(configuration);
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    return new DividerBlockComponentWidget({
      key: node.key,
      node,
      configuration: this.configuration,
      lineColor: this.lineColor,
      height: this.height,
      wrapper: this.wrapper,
      showActions: this.showActions(node),
      actionBuilder: (context, state) => this.actionBuilder(blockComponentContext, state),
      actionTrailingBuilder: (context, state) => this.actionTrailingBuilder(blockComponentContext, state),
    });
  }

  validate = (node: Node): boolean => node.children.length === 0;
}

interface DividerBlockComponentWidgetProps {
  key?: string;
  node: Node;
  showActions?: boolean;
  actionBuilder?: (context: any, state: any) => ComponentChild;
  actionTrailingBuilder?: (context: any, state: any) => ComponentChild;
  configuration?: BlockComponentConfiguration;
  lineColor?: string;
  height?: number;
  wrapper?: DividerBlockWrapper;
}

export class DividerBlockComponentWidget extends Component<DividerBlockComponentWidgetProps>
  implements SelectableMixin, BlockComponentConfigurable {
  
  private dividerKey = 'divider-key';
  private editorState: EditorState;

  constructor(props: DividerBlockComponentWidgetProps) {
    super(props);
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
    let child: ComponentChild = {
      tag: 'div',
      style: {
        height: `${this.props.height || 10}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      children: [
        {
          tag: 'hr',
          style: {
            width: '100%',
            height: '1px',
            backgroundColor: this.props.lineColor || '#9CA3AF',
            border: 'none',
            margin: 0,
          },
        },
      ],
    };

    child = {
      tag: 'div',
      key: this.dividerKey,
      style: {
        padding: this.padding,
      },
      children: [child],
    };

    child = new BlockSelectionContainer({
      node: this.node,
      delegate: this,
      listenable: this.editorState.selectionNotifier,
      remoteSelection: this.editorState.remoteSelections,
      blockColor: this.editorState.editorStyle.selectionColor,
      cursorColor: this.editorState.editorStyle.cursorColor,
      selectionColor: this.editorState.editorStyle.selectionColor,
      supportTypes: [
        BlockSelectionType.block,
        BlockSelectionType.cursor,
        BlockSelectionType.selection,
      ],
      children: [child],
    });

    if (this.props.showActions && this.props.actionBuilder) {
      child = new BlockComponentActionWrapper({
        node: this.node,
        actionBuilder: this.props.actionBuilder,
        actionTrailingBuilder: this.props.actionTrailingBuilder,
        children: [child],
      });
    }

    if (this.props.wrapper) {
      child = this.props.wrapper({}, this.node, child);
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
    return this.getRectsInSelection(Selection.invalid())[0];
  }

  getCursorRectInPosition(
    position: Position,
    options?: { shiftWithBaseOffset?: boolean }
  ): DOMRect | null {
    return this.getRectsInSelection(
      Selection.collapsed(position),
      options,
    )[0] || null;
  }

  getRectsInSelection(
    selection: Selection,
    options?: { shiftWithBaseOffset?: boolean }
  ): DOMRect[] {
    const dividerElement = document.querySelector(`[key="${this.dividerKey}"]`);
    if (dividerElement) {
      const rect = dividerElement.getBoundingClientRect();
      return [rect];
    }
    return [new DOMRect(0, 0, 0, 0)];
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

  textDirection(): 'ltr' | 'rtl' {
    return 'ltr';
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