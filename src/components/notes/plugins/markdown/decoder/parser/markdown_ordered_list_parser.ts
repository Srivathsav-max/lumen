// Markdown ordered list parser for converting ordered list elements
import { CustomMarkdownParser, Node, MdNode, MarkdownListType } from './custom_markdown_node_parser';

export interface MdElement extends MdNode {
  tag: string;
  children?: MdNode[];
  attributes?: Record<string, string>;
}

// Mock implementation for parseElementChildren
function parseElementChildren(
  children: MdNode[] | undefined,
  parsers: CustomMarkdownParser[],
  options: {
    listType?: MarkdownListType;
    startNumber?: number;
  } = {}
): Node[] {
  if (!children) return [];
  
  const nodes: Node[] = [];
  for (const child of children) {
    for (const parser of parsers) {
      const result = parser.transform(child, parsers, options);
      if (result.length > 0) {
        nodes.push(...result);
        break;
      }
    }
  }
  return nodes;
}

export class MarkdownOrderedListParserV2 extends CustomMarkdownParser {
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

    if (element.tag !== 'ol') {
      return [];
    }

    const startAttribute = element.attributes?.['start'];
    const startNumber = startAttribute ? parseInt(startAttribute, 10) : null;

    // Flatten the list
    return parseElementChildren(
      element.children,
      parsers,
      {
        listType: MarkdownListType.ordered,
        startNumber: startNumber || undefined
      }
    );
  }

  private isElement(node: MdNode): node is MdElement {
    return 'tag' in node && typeof node.tag === 'string';
  }
}