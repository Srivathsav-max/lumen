// Markdown divider parser for converting horizontal rule elements
import { CustomMarkdownParser, Node, MdNode, MarkdownListType } from './custom_markdown_node_parser';

export interface MdElement extends MdNode {
  tag: string;
  children?: MdNode[];
}

function dividerNode(): Node {
  return {
    type: 'divider',
    children: [],
    attributes: {}
  };
}

export class MarkdownDividerParserV2 extends CustomMarkdownParser {
  constructor() {
    super();
  }

  transform(
    element: MdNode,
    parsers: CustomMarkdownParser[],
    options: {
      listType?: MarkdownListType;
      startNumber?: number;
    } = {}
  ): Node[] {
    if (!this.isElement(element)) {
      return [];
    }

    if (element.tag !== 'hr') {
      return [];
    }

    return [dividerNode()];
  }

  private isElement(node: MdNode): node is MdElement {
    return 'tag' in node && typeof node.tag === 'string';
  }
}