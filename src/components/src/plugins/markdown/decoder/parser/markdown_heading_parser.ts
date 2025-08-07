// Markdown heading parser for converting heading elements
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

function headingNode(options: { level: number; delta: Delta }): Node {
  return {
    type: 'heading',
    children: [],
    attributes: {
      level: options.level,
      delta: options.delta
    }
  };
}

const _headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

export class MarkdownHeadingParserV2 extends CustomMarkdownParser {
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

    if (!_headingTags.includes(element.tag)) {
      return [];
    }

    const level = _headingTags.indexOf(element.tag) + 1;

    const deltaDecoder = new DeltaMarkdownDecoderImpl();
    return [
      headingNode({
        level,
        delta: deltaDecoder.convertNodes(element.children)
      })
    ];
  }

  private isElement(node: MdNode): node is MdElement {
    return 'tag' in node && typeof node.tag === 'string';
  }
}