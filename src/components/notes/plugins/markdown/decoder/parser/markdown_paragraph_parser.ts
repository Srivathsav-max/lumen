// Markdown paragraph parser for converting paragraph elements
import { CustomMarkdownParser, Node, MdNode, MarkdownListType } from './custom_markdown_node_parser';

export interface MdElement extends MdNode {
  tag: string;
  children?: MdNode[];
}

export interface Delta {
  // Define delta interface
}

export interface DeltaMarkdownDecoder {
  convertNodes(nodes: MdNode[]): Delta;
}

// Mock implementation
class MockDeltaMarkdownDecoder implements DeltaMarkdownDecoder {
  convertNodes(nodes: MdNode[]): Delta {
    // This would need actual implementation
    return {} as Delta;
  }
}

function paragraphNode(options: { delta?: Delta } = {}): Node {
  return {
    type: 'paragraph',
    children: [],
    attributes: {
      delta: options.delta
    }
  };
}

export class MarkdownParagraphParserV2 extends CustomMarkdownParser {
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

    if (element.tag !== 'p') {
      return [];
    }

    // Exclude the img tag
    const ec = element.children;
    if (ec && ec.length === 1 && this.isElement(ec[0])) {
      const e = ec[0] as MdElement;
      if (e.tag === 'img') {
        return [];
      }
    }

    if (!ec || ec.length === 0) {
      // Return empty paragraph node if there are no children
      return [paragraphNode()];
    }

    // Split the paragraph node by <br> tag
    const splitContent = this._splitByBrTag(ec);

    // Transform each split content into a paragraph node
    return splitContent.map((content) => {
      const deltaDecoder = new MockDeltaMarkdownDecoder();
      const delta = deltaDecoder.convertNodes(content);
      return paragraphNode({ delta });
    });
  }

  private isElement(node: MdNode): node is MdElement {
    return 'tag' in node && typeof node.tag === 'string';
  }

  // Split the <p> children by <br> tag, mostly used for handling soft line breaks
  // For example:
  // ```html
  // <p>
  // Hello<br>World
  // </p>
  // ```
  // will be split into:
  // ```document
  // Hello
  //
  // World
  // ```
  private _splitByBrTag(nodes: MdNode[]): MdNode[][] {
    return nodes
      .reduce<MdNode[][]>(
        (acc, node) => {
          if (this.isElement(node) && node.tag === 'br') {
            acc.push([]);
          } else {
            acc[acc.length - 1].push(node);
          }
          return acc;
        },
        [[]]
      )
      .filter(group => group.length > 0);
  }
}