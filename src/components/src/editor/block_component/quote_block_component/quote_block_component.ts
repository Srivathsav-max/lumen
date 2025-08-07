import { EditorState, Node } from '../../../core/editor_state';
import { BlockComponentBuilder, BlockComponentContext, BlockComponentWidget, BlockComponentConfiguration } from '../../../core/block_component';
import { Delta } from '../../../core/delta';
import { Attributes } from '../../../core/attributes';
import { blockComponentDelta, blockComponentBackgroundColor, blockComponentTextDirection } from '../../../core/constants';
import { Component, ComponentChild } from '../../../core/component';
import { AppFlowyRichText } from '../../../render/rich_text/rich_text';
import { BlockSelectionContainer, BlockSelectionType } from '../../../render/selection/block_selection';
import { BlockComponentActionWrapper } from '../base_component/block_component_action_wrapper';
import { BlockIconBuilder } from '../base_component/block_icon_builder';
import { tryToColor } from '../../../core/color_utils';
import { 
  SelectableMixin, 
  DefaultSelectableMixin, 
  BlockComponentConfigurable, 
  BlockComponentBackgroundColorMixin,
  BlockComponentTextDirectionMixin,
  BlockComponentAlignMixin 
} from '../base_component/mixins';

export class QuoteBlockKeys {
  static readonly type = 'quote';
  static readonly delta = blockComponentDelta;
  static readonly backgroundColor = blockComponentBackgroundColor;
  static readonly textDirection = blockComponentTextDirection;
}

export function quoteNode(options: {
  delta?: Delta;
  textDirection?: string;
  attributes?: Attributes;
  children?: Node[];
}): Node {
  const { delta, textDirection, attributes, children } = options;
  const nodeAttributes = attributes || { delta: (delta || new Delta()).toJson() };
  
  return new Node({
    type: QuoteBlockKeys.type,
    attributes: {
      ...nodeAttributes,
      ...(textDirection && { [QuoteBlockKeys.textDirection]: textDirection }),
    },
    children: children || [],
  });
}

export class QuoteBlockComponentBuilder extends BlockComponentBuilder {
  constructor(
    configuration?: BlockComponentConfiguration,
    private iconBuilder?: BlockIconBuilder,
  ) {
    super(configuration);
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    return new QuoteBlockComponentWidget({
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

interface QuoteBlockComponentWidgetProps {
  key?: string;
  node: Node;
  showActions?: boolean;
  actionBuilder?: (context: any, state: any) => ComponentChild;
  actionTrailingBuilder?: (context: any, state: any) => ComponentChild;
  configuration?: BlockComponentConfiguration;
  iconBuilder?: BlockIconBuilder;
}

export class QuoteBlockComponentWidget extends Component<QuoteBlockComponentWidgetProps>
  implements 
    SelectableMixin,
    DefaultSelectableMixin,
    BlockComponentConfigurable,
    BlockComponentBackgroundColorMixin,
    BlockComponentTextDirectionMixin,
    BlockComponentAlignMixin {

  forwardKey = 'flowy_rich_text';
  blockComponentKey = QuoteBlockKeys.type;
  
  get containerKey(): string { return this.props.node.key; }
  get configuration(): BlockComponentConfiguration { return this.props.configuration || new BlockComponentConfiguration(); }
  get node(): Node { return this.props.node; }

  render(): ComponentChild {
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
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            minWidth: 'min-content',
            direction: textDirection,
            minHeight: 'intrinsic',
          },
          children: [
            this.props.iconBuilder
              ? this.props.iconBuilder({}, this.node)
              : new QuoteIcon(),
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
                    this.textStyleWithTextSpan(textSpan),
                  ),
                  placeholderTextSpanDecorator: (textSpan) => textSpan.updateTextStyle(
                    this.placeholderTextStyleWithTextSpan(textSpan),
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
        backgroundColor: this.backgroundColor,
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

class QuoteIcon extends Component {
  render(): ComponentChild {
    const textScaleFactor = 1; // this.editorState.editorStyle.textScaleFactor;
    
    return {
      tag: 'div',
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: `${26 * textScaleFactor}px`,
        minHeight: `${22 * textScaleFactor}px`,
        paddingRight: '4px',
      },
      children: [
        {
          tag: 'div',
          style: {
            width: `${4 * textScaleFactor}px`,
            height: '100%',
            backgroundColor: tryToColor('#00BCF0') || '#00BCF0',
          },
        },
      ],
    };
  }
}