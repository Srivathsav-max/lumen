import { EditorState, Node } from '../../../core/editor_state';
import { BlockComponentBuilder, BlockComponentContext, BlockComponentWidget, BlockComponentConfiguration } from '../../../core/block_component';
import { Delta } from '../../../core/delta';
import { Attributes } from '../../../core/attributes';
import { blockComponentDelta, blockComponentBackgroundColor, blockComponentTextDirection } from '../../../core/constants';
import { Component, ComponentChild } from '../../../core/component';
import { AppFlowyRichText } from '../../../render/rich_text/rich_text';
import { BlockSelectionContainer, BlockSelectionType } from '../../../render/selection/block_selection';
import { BlockComponentActionWrapper } from '../base_component/block_component_action_wrapper';
import { 
  SelectableMixin, 
  DefaultSelectableMixin, 
  BlockComponentConfigurable, 
  BlockComponentBackgroundColorMixin,
  NestedBlockComponentStatefulWidgetMixin,
  BlockComponentTextDirectionMixin,
  BlockComponentAlignMixin 
} from '../base_component/mixins';

export class NumberedListBlockKeys {
  static readonly type = 'numbered_list';
  static readonly number = 'number';
  static readonly delta = blockComponentDelta;
  static readonly backgroundColor = blockComponentBackgroundColor;
  static readonly textDirection = blockComponentTextDirection;
}

export function numberedListNode(options: {
  delta?: Delta;
  attributes?: Attributes;
  number?: number;
  textDirection?: string;
  children?: Node[];
}): Node {
  const { delta, attributes, number, textDirection, children } = options;
  const nodeAttributes = attributes || {
    delta: (delta || new Delta()).toJson(),
    [NumberedListBlockKeys.number]: number,
  };
  
  return new Node({
    type: NumberedListBlockKeys.type,
    attributes: {
      ...nodeAttributes,
      ...(textDirection && { [NumberedListBlockKeys.textDirection]: textDirection }),
    },
    children: children || [],
  });
}

export type NumberedListIconBuilder = (
  context: any,
  node: Node,
  direction: 'ltr' | 'rtl',
) => ComponentChild;

export class NumberedListBlockComponentBuilder extends BlockComponentBuilder {
  constructor(
    configuration?: BlockComponentConfiguration,
    private iconBuilder?: NumberedListIconBuilder,
  ) {
    super(configuration);
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    return new NumberedListBlockComponentWidget({
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

interface NumberedListBlockComponentWidgetProps {
  key?: string;
  node: Node;
  showActions?: boolean;
  actionBuilder?: (context: any, state: any) => ComponentChild;
  actionTrailingBuilder?: (context: any, state: any) => ComponentChild;
  configuration?: BlockComponentConfiguration;
  iconBuilder?: NumberedListIconBuilder;
}

export class NumberedListBlockComponentWidget extends Component<NumberedListBlockComponentWidgetProps>
  implements 
    SelectableMixin,
    DefaultSelectableMixin,
    BlockComponentConfigurable,
    BlockComponentBackgroundColorMixin,
    NestedBlockComponentStatefulWidgetMixin,
    BlockComponentTextDirectionMixin,
    BlockComponentAlignMixin {

  forwardKey = 'flowy_rich_text';
  blockComponentKey = NumberedListBlockKeys.type;
  
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
              ? this.props.iconBuilder(context, this.node, textDirection)
              : new NumberedListIcon({
                  node: this.node,
                  textStyle: this.textStyleWithTextSpan(),
                  direction: textDirection,
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
  textStyleWithTextSpan(textSpan?: any): any { return {}; }
  placeholderTextStyleWithTextSpan(textSpan?: any): any { return {}; }
}

interface NumberedListIconProps {
  node: Node;
  textStyle: any;
  direction: 'ltr' | 'rtl';
}

class NumberedListIcon extends Component<NumberedListIconProps> {
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
            direction: this.props.direction,
            ...this.props.textStyle,
          },
          textContent: this.props.node.levelString,
        },
      ],
    };
  }
}

// Extension methods for Node
declare module '../../../core/editor_state' {
  interface Node {
    get levelString(): string;
  }
}

Object.defineProperty(Node.prototype, 'levelString', {
  get: function(this: Node): string {
    const builder = new NumberedListIconBuilder(this);
    const indexInRootLevel = builder.indexInRootLevel;
    const indexInSameLevel = builder.indexInSameLevel;
    const level = indexInRootLevel % 3;
    let levelString: string;
    
    switch (level) {
      case 1:
        levelString = indexInSameLevel.toString().toLatin();
        break;
      case 2:
        levelString = indexInSameLevel.toString().toRoman();
        break;
      default:
        levelString = indexInSameLevel.toString();
    }
    
    return `${levelString}.`;
  },
});

class NumberedListIconBuilder {
  constructor(private node: Node) {}

  // the level of the current node
  get indexInRootLevel(): number {
    let level = 0;
    let parent = this.node.parent;
    while (parent) {
      if (parent.type === NumberedListBlockKeys.type) {
        level++;
      }
      parent = parent.parent;
    }
    return level;
  }

  // the index of the current level
  get indexInSameLevel(): number {
    let level = 1;
    let previous = this.node.previous;

    // if the previous one is not a numbered list, then it is the first one
    if (!previous || previous.type !== NumberedListBlockKeys.type) {
      return this.node.attributes[NumberedListBlockKeys.number] as number || level;
    }

    let startNumber: number | null = null;
    while (previous && previous.type === NumberedListBlockKeys.type) {
      startNumber = previous.attributes[NumberedListBlockKeys.number] as number;
      level++;
      previous = previous.previous;
    }
    if (startNumber !== null) {
      return startNumber + level - 1;
    }
    return level;
  }
}

// String extensions
declare global {
  interface String {
    toLatin(): string;
    toRoman(): string;
  }
}

String.prototype.toLatin = function(): string {
  let result = '';
  let number = parseInt(this.toString(), 10);
  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(remainder + 65) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result.toLowerCase();
};

String.prototype.toRoman = function(): string {
  const number = parseInt(this.toString(), 10);
  const romanNumerals = [
    { value: 1000, symbol: 'M' },
    { value: 900, symbol: 'CM' },
    { value: 500, symbol: 'D' },
    { value: 400, symbol: 'CD' },
    { value: 100, symbol: 'C' },
    { value: 90, symbol: 'XC' },
    { value: 50, symbol: 'L' },
    { value: 40, symbol: 'XL' },
    { value: 10, symbol: 'X' },
    { value: 9, symbol: 'IX' },
    { value: 5, symbol: 'V' },
    { value: 4, symbol: 'IV' },
    { value: 1, symbol: 'I' },
  ];

  let result = '';
  let num = number;

  for (const { value, symbol } of romanNumerals) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }

  return result.toLowerCase() || this.toString();
};