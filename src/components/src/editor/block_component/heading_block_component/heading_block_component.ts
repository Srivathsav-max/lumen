import { EditorState, Node } from '../../../core/editor_state';
import { BlockComponentBuilder, BlockComponentContext, BlockComponentWidget, BlockComponentConfiguration } from '../../../core/block_component';
import { Delta } from '../../../core/delta';
import { Attributes } from '../../../core/attributes';
import { blockComponentDelta, blockComponentBackgroundColor, blockComponentTextDirection } from '../../../core/constants';
import { Component, ComponentChild } from '../../../core/component';
import { AppFlowyRichText } from '../../../render/rich_text/rich_text';
import { BlockSelectionContainer, BlockSelectionType } from '../base_component/selection/block_selection_container';
import { BlockComponentActionWrapper } from '../base_component/block_component_action_wrapper';
import { 
  SelectableMixin, 
  DefaultSelectableMixin, 
  BlockComponentConfigurable, 
  BlockComponentBackgroundColorMixin,
  BlockComponentTextDirectionMixin,
  BlockComponentAlignMixin 
} from '../base_component/mixins';

export class HeadingBlockKeys {
  static readonly type = 'heading';

  /// The level data of a heading block.
  ///
  /// The value is a int.
  static readonly level = 'level';

  static readonly delta = blockComponentDelta;
  static readonly backgroundColor = blockComponentBackgroundColor;
  static readonly textDirection = blockComponentTextDirection;
}

export function headingNode(options: {
  level: number;
  text?: string;
  delta?: Delta;
  textDirection?: string;
  attributes?: Attributes;
}): Node {
  const { level, text, delta, textDirection, attributes } = options;
  
  if (level < 1 || level > 6) {
    throw new Error('Heading level must be between 1 and 6');
  }
  
  return new Node({
    type: HeadingBlockKeys.type,
    attributes: {
      [HeadingBlockKeys.delta]: (delta || new Delta().insert(text || '')).toJson(),
      [HeadingBlockKeys.level]: Math.max(1, Math.min(6, level)),
      ...(attributes || {}),
      ...(textDirection && { [HeadingBlockKeys.textDirection]: textDirection }),
    },
  });
}

export class HeadingBlockComponentBuilder extends BlockComponentBuilder {
  constructor(
    configuration?: BlockComponentConfiguration,
    private textStyleBuilder?: (level: number) => any,
  ) {
    super(configuration);
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    return new HeadingBlockComponentWidget({
      key: node.key,
      node,
      configuration: this.configuration,
      textStyleBuilder: this.textStyleBuilder,
      showActions: this.showActions(node),
      actionBuilder: (context, state) => this.actionBuilder(blockComponentContext, state),
      actionTrailingBuilder: (context, state) => this.actionTrailingBuilder(blockComponentContext, state),
    });
  }
}

interface HeadingBlockComponentWidgetProps {
  key?: string;
  node: Node;
  showActions?: boolean;
  actionBuilder?: (context: any, state: any) => ComponentChild;
  actionTrailingBuilder?: (context: any, state: any) => ComponentChild;
  configuration?: BlockComponentConfiguration;
  textStyleBuilder?: (level: number) => any;
}

export class HeadingBlockComponentWidget extends Component<HeadingBlockComponentWidgetProps>
  implements 
    SelectableMixin,
    DefaultSelectableMixin,
    BlockComponentConfigurable,
    BlockComponentBackgroundColorMixin,
    BlockComponentTextDirectionMixin,
    BlockComponentAlignMixin {

  forwardKey = 'flowy_rich_text';
  blockComponentKey = HeadingBlockKeys.type;
  
  get containerKey(): string { return this.props.node.key; }
  get configuration(): BlockComponentConfiguration { return this.props.configuration || new BlockComponentConfiguration(); }
  get node(): Node { return this.props.node; }

  get level(): number {
    return this.props.node.attributes[HeadingBlockKeys.level] as number || 1;
  }

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
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            minWidth: 'min-content',
            direction: textDirection,
          },
          children: [
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
                  textSpanDecorator: (textSpan) => {
                    let result = textSpan.updateTextStyle(
                      this.textStyleWithTextSpan({ textSpan }),
                    );
                    result = result.updateTextStyle(
                      this.props.textStyleBuilder?.(this.level) ||
                          this.defaultTextStyle(this.level),
                    );
                    return result;
                  },
                  placeholderText: this.placeholderText,
                  placeholderTextSpanDecorator: (textSpan) => textSpan
                      .updateTextStyle(
                        this.props.textStyleBuilder?.(this.level) ||
                            this.defaultTextStyle(this.level),
                      )
                      .updateTextStyle(
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

    child = new BlockSelectionContainer({
      node: this.node,
      key: this.blockComponentKey,
      delegate: this,
      listenable: this.editorState.selectionNotifier,
      remoteSelection: this.editorState.remoteSelections,
      blockColor: this.editorState.editorStyle.selectionColor,
      supportTypes: [BlockSelectionType.block],
      children: [child],
    });

    child = {
      tag: 'div',
      style: {
        padding: this.padding,
        backgroundColor: this.backgroundColor,
      },
      children: [child],
    };

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

  defaultTextStyle(level: number): any {
    const fontSizes = [32.0, 28.0, 24.0, 18.0, 18.0, 18.0];
    const fontSize = fontSizes[level - 1] || 18.0;
    return {
      fontSize: `${fontSize}px`,
      fontWeight: 'bold',
    };
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