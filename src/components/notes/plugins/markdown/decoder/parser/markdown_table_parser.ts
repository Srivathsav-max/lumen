// Markdown table parser for converting table elements
import { CustomMarkdownParser, Node, MdNode, MarkdownListType } from './custom_markdown_node_parser';

export interface MdElement extends MdNode {
  tag: string;
  children?: MdNode[];
}

export interface Delta {
  // Define delta interface
}

export interface DeltaMarkdownDecoder {
  convertNodes(nodes?: MdNode[]): Delta;
}

// Mock implementation
class MockDeltaMarkdownDecoder implements DeltaMarkdownDecoder {
  convertNodes(nodes?: MdNode[]): Delta {
    // This would need actual implementation
    return {} as Delta;
  }
}

function paragraphNode(options: { delta: Delta }): Node {
  return {
    type: 'paragraph',
    children: [],
    attributes: {
      delta: options.delta
    }
  };
}

// Mock TableNode implementation
class TableNode {
  node: Node;

  constructor(node: Node) {
    this.node = node;
  }

  static fromList(cells: Node[][]): TableNode {
    return new TableNode({
      type: 'table',
      children: [],
      attributes: {
        cells,
        rowsLen: cells[0]?.length || 0,
        colsLen: cells.length
      }
    });
  }
}

export class MarkdownTableListParserV2 extends CustomMarkdownParser {
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

    if (element.tag !== 'table') {
      return [];
    }

    const ec = element.children;
    if (!ec || ec.length === 0) {
      return [];
    }

    const cells: Node[][] = [];

    const thead = ec
      .filter(this.isElement)
      .find(e => e.tag === 'thead');
    
    const tbody = ec
      .filter(this.isElement)
      .find(e => e.tag === 'tbody');

    if (!thead || !tbody) {
      return [];
    }

    const th = thead.children
      ?.filter(this.isElement)
      .filter(e => e.tag === 'tr')
      .flatMap(e => e.children?.filter(this.isElement) || [])
      .filter(e => e.tag === 'th') || [];

    const td = tbody.children
      ?.filter(this.isElement)
      .filter(e => e.tag === 'tr')
      .flatMap(e => e.children?.filter(this.isElement) || [])
      .filter(e => e.tag === 'td') || [];

    if (th.length === 0 || td.length === 0) {
      return [];
    }

    for (let i = 0; i < th.length; i++) {
      const row: Node[] = [];

      row.push(
        paragraphNode({
          delta: new MockDeltaMarkdownDecoder().convertNodes(th[i].children)
        })
      );

      for (let j = i; j < td.length; j += th.length) {
        row.push(
          paragraphNode({
            delta: new MockDeltaMarkdownDecoder().convertNodes(td[j].children)
          })
        );
      }

      cells.push(row);
    }

    const tableNode = TableNode.fromList(cells);

    return [tableNode.node];
  }

  private isElement(node: MdNode): node is MdElement {
    return 'tag' in node && typeof node.tag === 'string';
  }
}