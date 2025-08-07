import { EditorState, Node } from '../../../core/editor_state';
import { BlockComponentBuilder, BlockComponentContext, BlockComponentWidget, BlockComponentConfiguration } from '../../../core/block_component';
import { Delta } from '../../../core/delta';
import { Attributes } from '../../../core/attributes';
import { blockComponentDelta, blockComponentBackgroundColor, blockComponentTextDirection } from '../../../core/constants';
import { Component, ComponentChild } from '../../../core/component';
import { AppFlowyRichText } from '../../../render/rich_text/rich_text';
import { BlockSelectionContainer, BlockSelectionType } from '../../../render/selection/block_selection';
import { BlockComponentActionWrapper } from '../base_component/block_component_action_wrapper';
import { EditorSvg } from '../../../render/svg/editor_svg';
import { 
  SelectableMixin, 
  DefaultSelectableMixin, 
  BlockComponentConfigurable, 
  BlockComponentBackgroundColorMixin,
  NestedBlockComponentStatefulWidgetMixin,
  BlockComponentTextDirectionMixin,
  BlockComponentAlignMixin 
} from '../base_component/mixins';

export class TodoListBlockKeys {
  static readonly type = 'todo_list';
  /// The checked data of a todo list block.
  /// The value is a boolean.
  static readonly checked = 'checked';
  static readonly delta = blockComponentDelta;
  static readonly backgroundColor = blockComponentBackgroundColor;
  static readonly textDirection = blockComponentTextDirection;
}

export function todoListNode(options: {
  checked: boolean;
  text?: string;
  delta?: Delta;
  textDirection?: string;
  attributes?: Attributes;
  children?: Node[];
}): Node {
  const { checked, text, delta, textDirection, attributes, children } = options;
  
  return new Node({
    type: TodoListBlockKeys.type,
    attributes: {
      [TodoListBlockKeys.checked]: checked,
      [TodoListBlockKeys.delta]: (delta || new Delta().insert(text || '')).toJson(),
      ...(attributes || {}),
      ...(textDirection && { [TodoListBlockKeys.textDirection]: textDirection }),
    },
    children: children || [],
  });
}

export type TodoListIconBuilder = (
  context: any,
  node: Node,
  onCheck: () => void,
) => ComponentChild;

export class TodoListBlockComponentBuilder extends BlockComponentBuilder {
  constructor(
    configuration?: BlockComponentConfiguration,
    private textStyleBuilder?: (checked: boolean) => any,
    private iconBuilder?: TodoListIconBuilder,
    private toggleChildrenTriggers?: string[],
  ) {
    super(configuration);
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    return new TodoListBlockComponentWidget({
      key: node.key,
      node,
      configuration: this.configuration,
      textStyleBuilder: this.textStyleBuilder,
      iconBuilder: this.iconBuilder,
      showActions: this.showActions(node),
      actionBuilder: (context, state) => this.actionBuilder(blockComponentContext, state),
      actionTrailingBuilder: (context, state) => this.actionTrailingBuilder(blockComponentContext, state),
      toggleChildrenTriggers: this.toggleChildrenTriggers,
    });
  }

  validate = (node: Node): boolean => node.delta !== null;
}

interface TodoListBlockComponentWidgetProps {
  key?: string;
  node: Node;
  showActions?: boolean;
  actionBuilder?: (context: any, state: any) => ComponentChild;
  actionTrailingBuilder?: (context: any, state: any) => ComponentChild;
  configuration?: BlockComponentConfiguration;
  textStyleBuilder?: (checked: boolean) => any;
  iconBuilder?: TodoListIconBuilder;
  toggleChildrenTriggers?: string[];
}

interface TodoListBlockComponentWidgetState {
  // Add any state properties if needed
}

export class TodoListBlockComponentWidget extends Component<TodoListBlockComponentWidgetProps, TodoListBlockComponentWidgetState>
  implements 
    SelectableMixin,
    DefaultSelectableMixin,
    BlockComponentConfigurable,
    BlockComponentBackgroundColorMixin,
    NestedBlockComponentStatefulWidgetMixin,
    BlockComponentTextDirectionMixin,
    BlockComponentAlignMixin {

  forwardKey = 'flowy_rich_text';
  blockComponentKey = TodoListBlockKeys.type;
  
  get containerKey(): string { return this.props.node.key; }
  get configuration(): BlockComponentConfiguration { return this.props.configuration || new BlockComponentConfiguration(); }
  get node(): Node { return this.props.node; }

  get checked(): boolean {
    return this.props.node.attributes[TodoListBlockKeys.checked] ?? false;
  }

  buildComponent(context: any, withBackgroundColor: boolean = true): ComponentChild {
    const textDirection = this.calculateTextDirection();

    let child: ComponentChild = {
      tag: 'div',
      style: {
        width: '100%',
        display: 'flex',
        alignItems: this.alignment,
      },
      children: [
        {
          tag: 'div',
          style: {
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            minWidth: 'min-content',
            direction: textDirection,
          },
          children: [
            this.props.iconBuilder
              ? this.props.iconBuilder(context, this.node, () => this.checkOrUncheck())
              : new TodoListIcon({
                  checked: this.checked,
                  onTap: () => this.checkOrUncheck(),
                }),
            {
              tag: 'div',
              style: { flex: '1' },
              children: [
                new AppFlowyRichText({
                  key: this.forwardKey,
                  delegate: this,
                  node: this.props.node,
                  editorState: this.editorState,
                  textAlign: this.alignment?.toTextAlign || this.textAlign,
                  placeholderText: this.placeholderText,
                  textDirection,
                  textSpanDecorator: (textSpan) => textSpan
                      .updateTextStyle(this.textStyleWithTextSpan())
                      .updateTextStyle(
                        this.props.textStyleBuilder?.(this.checked) ||
                            this.defaultTextStyle(),
                      ),
                  placeholderTextSpanDecorator: (textSpan) => textSpan.updateTextStyle(
                    this.placeholderTextStyleWithTextSpan(textSpan),
                  ),
                  cursorColor: this.editorState.editorStyle.cursorColor,
                  selectionColor: this.editorState.editorStyle.selectionColor,
                  cursorWidth: this.editorState.editorStyle.cursorWidth,
                }),
              ],
            },
          ],
        },
      ],
    };

    child = {
      tag: 'div',
      style: {
        backgroundColor: withBackgroundColor ? this.backgroundColor : undefined,
        padding: this.padding,
      },
      key: this.blockComponentKey,
      children: [child],
    };

    child = new BlockSelectionContainer({
      node: this.node,
      delegate: this,
      listenable: this.editorState.selectionNotifier,
      remoteSelection: this.editorState.remoteSelections,
      blockColor: this.editorState.editorStyle.selectionColor,
      supportTypes: [BlockSelectionType.block],
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

    return child;
  }

  render(): ComponentChild {
    return this.buildComponent({});
  }

  checkOrUncheck(): void {
    const transaction = this.editorState.transaction;
    transaction.updateNode(this.props.node, {
      [TodoListBlockKeys.checked]: !this.checked,
    });

    if (this.props.toggleChildrenTriggers && this.isToggleChildrenKeyPressed()) {
      this.checkOrUncheckChildren(!this.checked, this.props.node);
    }

    this.editorState.apply(transaction, { withUpdateSelection: false });
  }

  checkOrUncheckChildren(checked: boolean, node: Node): void {
    for (const child of node.children) {
      if (child.children.length > 0) {
        this.checkOrUncheckChildren(checked, child);
      }

      if (child.type === TodoListBlockKeys.type) {
        const transaction = this.editorState.transaction;
        transaction.updateNode(child, {
          [TodoListBlockKeys.checked]: checked,
        });

        this.editorState.apply(transaction);
      }
    }
  }

  defaultTextStyle(): any {
    if (!this.checked) {
      return null;
    }
    return {
      textDecoration: 'line-through',
      color: '#9CA3AF', // Colors.grey.shade400 equivalent
    };
  }

  private isToggleChildrenKeyPressed(): boolean {
    // In a real implementation, this would check the current keyboard state
    // For now, return false as a placeholder
    return false;
  }

  // Mixin implementations
  calculateTextDirection(): 'ltr' | 'rtl' { return 'ltr'; }
  get editorState(): EditorState { return {} as EditorState; }
  get alignment(): any { return null; }
  get textAlign(): string { return 'left'; }
  get placeholderText(): string { return ''; }
  get backgroundColor(): string | undefined { return undefined; }
  get padding(): string { return '0'; }
  textStyleWithTextSpan(textSpan?: any): any { return {}; }
  placeholderTextStyleWithTextSpan(textSpan?: any): any { return {}; }
}

interface TodoListIconProps {
  onTap: () => void;
  checked: boolean;
}

class TodoListIcon extends Component<TodoListIconProps> {
  render(): ComponentChild {
    const textScaleFactor = 1; // this.editorState.editorStyle.textScaleFactor;
    
    return {
      tag: 'div',
      style: {
        cursor: 'pointer',
        minWidth: `${26 * textScaleFactor}px`,
        minHeight: `${22 * textScaleFactor}px`,
        paddingRight: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      onClick: this.props.onTap,
      children: [
        new EditorSvg({
          width: 22,
          height: 22,
          name: this.props.checked ? 'check' : 'uncheck',
        }),
      ],
    };
  }
}