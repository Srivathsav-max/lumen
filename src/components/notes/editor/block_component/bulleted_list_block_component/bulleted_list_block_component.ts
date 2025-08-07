import { EditorState, Node } from '../../../core/editor_state';
import { BlockComponentBuilder, BlockComponentContext, BlockComponentWidget, BlockComponentConfiguration } from '../../../core/block_component';
import { Delta } from '../../../core/delta';
import { Attributes } from '../../../core/attributes';
import { blockComponentDelta, blockComponentBackgroundColor, blockComponentTextDirection } from '../../../core/constants';
import { Component, ComponentChild } from '../../../core/component';
import { AppFlowyRichText } from '../../../render/rich_text/rich_text';
import { BlockSelectionContainer, BlockSelectionType } from '../base_component/selection/block_selection_container';
import { BlockComponentActionWrapper } from '../base_component/block_component_action_wrapper';
import { BlockIconBuilder } from '../base_component/block_icon_builder';
import { 
  SelectableMixin, 
  DefaultSelectableMixin, 
  BlockComponentConfigurable, 
  BlockComponentBackgroundColorMixin,
  NestedBlockComponentStatefulWidgetMixin,
  BlockComponentTextDirectionMixin,
  BlockComponentAlignMixin 
} from '../base_component/mixins';

export class BulletedListBlockKeys {
  static readonly type = 'bulleted_list';
  static readonly delta = blockComponentDelta;
  static readonly backgroundColor = blockComponentBackgroundColor;
  static readonly textDirection = blockComponentTextDirection;
}

export function bulletedListNode(options: {
  text?: string;
  delta?: Delta;
  textDirection?: string;
  attributes?: Attributes;
  children?: Node[];
}): Node {
  const { text, delta, textDirection, attributes, children } = options;
  
  return new Node({
    type: BulletedListBlockKeys.type,
    attributes: {
      [BulletedListBlockKeys.delta]: (delta || new Delta().insert(text || '')).toJson(),
      ...(attributes || {}),
      ...(textDirection && { [BulletedListBlockKeys.textDirection]: textDirection }),
    },
    children: children || [],
  });
}

export class BulletedListBlockComponentBuilder extends BlockComponentBuilder {
  constructor(
    configuration?: BlockComponentConfiguration,
    private iconBuilder?: BlockIconBuilder,
  ) {
    super(configuration);
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    return new BulletedListBlockComponentWidget({
      key: node.key,
      node,
      configuration: this.configuration,
      iconBuilder: this.iconBuilder,
      showActions: this.showActions(node),
      actionBuilder: (context, state) => this.actionBuilder(blockComponentContext, state),
      actionTrailingBuilder: (context, state) => this.actionTrailingBuilder(blockComponentContext, state),
    });
  }

  validate = (node: Node): boolean => node.delta !== null;
}

interface BulletedListBlockComponentWidgetProps {
  key?: string;
  node: Node;
  showActions?: boolean;
  actionBuilder?: (context: any, state: any) => ComponentChild;
  actionTrailingBuilder?: (context: any, state: any) => ComponentChild;
  configuration?: BlockComponentConfiguration;
  iconBuilder?: BlockIconBuilder;
}

export class BulletedListBlockComponentWidget extends Component<BulletedListBlockComponentWidgetProps>
  implements 
    SelectableMixin,
    DefaultSelectableMixin,
    BlockComponentConfigurable,
    BlockComponentBackgroundColorMixin,
    NestedBlockComponentStatefulWidgetMixin,
    BlockComponentTextDirectionMixin,
    BlockComponentAlignMixin {

  forwardKey = 'flowy_rich_text';
  blockComponentKey = BulletedListBlockKeys.type;
  
  get containerKey(): string { return this.props.node.key; }
  get configuration(): BlockComponentConfiguration { return this.props.configuration || new BlockComponentConfiguration(); }
  get node(): Node { return this.props.node; }

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
              ? this.props.iconBuilder(context, this.node)
              : new BulletedListIcon({
                  node: this.props.node,
                  textStyle: this.textStyleWithTextSpan(),
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
                  textSpanDecorator: (textSpan) => textSpan.updateTextStyle(
                    this.textStyleWithTextSpan({ textSpan }),
                  ),
                  placeholderTextSpanDecorator: (textSpan) => textSpan.updateTextStyle(
                    this.placeholderTextStyleWithTextSpan({ textSpan }),
                  ),
                  textDirection,
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

  // Mixin implementations
  calculateTextDirection(): 'ltr' | 'rtl' { return 'ltr'; }
  get editorState(): EditorState { return {} as EditorState; }
  get alignment(): any { return null; }
  get textAlign(): string { return 'left'; }
  get placeholderText(): string { return ''; }
  get backgroundColor(): string | undefined { return undefined; }
  get padding(): string { return '0'; }
  textStyleWithTextSpan(options?: any): any { return {}; }
  placeholderTextStyleWithTextSpan(options?: any): any { return {}; }
}

interface BulletedListIconProps {
  node: Node;
  textStyle: any;
}

class BulletedListIcon extends Component<BulletedListIconProps> {
  private static readonly bulletedListIcons = ['●', '◯', '□'];

  get level(): number {
    let level = 0;
    let parent = this.props.node.parent;
    while (parent) {
      if (parent.type === 'bulleted_list') {
        level++;
      }
      parent = parent.parent;
    }
    return level;
  }

  get icon(): string {
    return BulletedListIcon.bulletedListIcons[this.level % BulletedListIcon.bulletedListIcons.length];
  }

  render(): ComponentChild {
    const textScaleFactor = 1; // this.editorState.editorStyle.textScaleFactor;
    
    return {
      tag: 'div',
      style: {
        minWidth: `${26 * textScaleFactor}px`,
        minHeight: `${22 * textScaleFactor}px`,
        paddingRight: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      children: [
        {
          tag: 'span',
          style: {
            ...this.props.textStyle,
            fontSize: `${0.5 * textScaleFactor}em`,
          },
          textContent: this.icon,
        },
      ],
    };
  }
}