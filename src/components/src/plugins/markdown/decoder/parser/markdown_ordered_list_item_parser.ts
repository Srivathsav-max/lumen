// Markdown ordered list item parser for converting ordered list item elements
import { CustomMarkdownParser, Node, MdNode, MarkdownListType } from './custom_markdown_node_parser';
import { parseElementChildren } from './markdown_parser_extension';

export interface MdElement extends MdNode {
  tag: string;
  children?: MdNode[];
  attributes: Record<string, string>;
}

export interface Delta {
  // Define delta interface
}

export interface DeltaMarkdownDecoder {
  convertNodes(nodes?: MdNode[]): Delta;
}

class DeltaMarkdownDecoderImpl implements DeltaMarkdownDecoder {
  convertNodes(nodes?: MdNode[]): Delta {
    if (!nodes || nodes.length === 0) {
      return { ops: [] };
    }

    const ops: any[] = [];
    
    for (const node of nodes) {
      if ('text' in node && typeof (node as any).text === 'string') {
        ops.push({ insert: (node as any).text });
      } else if (node.textContent) {
        ops.push({ insert: node.textContent });
      }
    }

    return { ops };
  }
}

function numberedListNode(options: {
  number?: number | null;
  delta: Delta;
  children: Node[];
}): Node {
  return {
    type: 'numbered_list',
    children: options.children,
    attributes: {
      number: options.number,
      delta: options.delta
    }
  };
}

export class MarkdownOrderedListItemParserV2 extends CustomMarkdownParser {
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
    const { listType = MarkdownListType.unknown, startNumber } = options;

    if (!this.isElement(element)) {
      return [];
    }

    if (element.tag !== 'li' ||
        Object.keys(element.attributes).length > 0 ||
        listType !== MarkdownListType.ordered) {
      return [];
    }

    const ec: MdNode[] = [];
    let sliceIndex = -1;
    
    if (element.children) {
      // Process children in reverse to find nested lists
      for (let i = element.children.length - 1; i >= 0; i--) {
        const child = element.children[i];
        if (this.isElement(child) && (child.tag === 'ol' || child.tag === 'ul')) {
          ec.unshift(child); // Add to beginning to maintain order
        } else {
          break;
        }
      }

      sliceIndex = element.children.length - ec.length;
    }

    const deltaDecoder = new DeltaMarkdownDecoderImpl();
    const deltaNodes = sliceIndex === -1
      ? element.children
      : element.children?.slice(0, sliceIndex);

    return [
      numberedListNode({
        number: startNumber,
        delta: deltaDecoder.convertNodes(deltaNodes),
        children: parseElementChildren(
          ec,
          parsers,
          {
            listType: MarkdownListType.ordered,
            startNumber
          }
        )
      })
    ];
  }

  private isElement(node: MdNode): node is MdElement {
    return 'tag' in node && typeof node.tag === 'string';
  }
}