// Markdown unordered list parser for converting unordered list elements
import { CustomMarkdownParser, Node, MdNode, MarkdownListType } from './custom_markdown_node_parser';
import { parseElementChildren } from './markdown_parser_extension';

export interface MdElement extends MdNode {
  tag: string;
  children?: MdNode[];
}

export class MarkdownUnorderedListParserV2 extends CustomMarkdownParser {
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

    if (element.tag !== 'ul') {
      return [];
    }

    // Flatten the list
    return parseElementChildren(
      element.children,
      parsers,
      { listType: MarkdownListType.unordered }
    );
  }

  private isElement(node: MdNode): node is MdElement {
    return 'tag' in node && typeof node.tag === 'string';
  }
}