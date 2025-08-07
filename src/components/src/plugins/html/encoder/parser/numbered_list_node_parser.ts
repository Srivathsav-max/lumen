// HTML numbered list node parser for converting numbered list nodes to HTML
import { HTMLNodeParser, Node, DomNode } from './html_node_parser';

export class NumberedListBlockKeys {
  static readonly type = 'numbered_list';
  static readonly number = 'number';
}

export class HTMLTags {
  static readonly list = 'li';
}

export interface Delta {
  // Define delta interface
}

export interface DeltaHTMLEncoder {
  convert(delta: Delta): DomNode[];
}

class DeltaHTMLEncoderImpl implements DeltaHTMLEncoder {
  convert(delta: Delta): DomNode[] {
    if (!delta || !delta.ops || delta.ops.length === 0) {
      return [];
    }

    const nodes: DomNode[] = [];
    
    for (const op of delta.ops) {
      if (op.insert && typeof op.insert === 'string') {
        const textNode = document.createTextNode ? 
          document.createTextNode(op.insert) : 
          { nodeType: 3, textContent: op.insert } as DomNode;
        nodes.push(textNode);
      }
    }

    return nodes;
  }
}

const deltaHTMLEncoder = new DeltaHTMLEncoderImpl();

export class HTMLNumberedListNodeParser extends HTMLNodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return NumberedListBlockKeys.type;
  }

  transformNodeToHTMLString(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): string {
    if (node.type !== NumberedListBlockKeys.type) {
      throw new Error(`Expected node type '${NumberedListBlockKeys.type}', got '${node.type}'`);
    }

    const html = this.toHTMLString(
      this.transformNodeToDomNodes(node, options)
    );

    const number = node.attributes[NumberedListBlockKeys.number];
    const start = number != null ? `<ol start="${number}">` : '<ol>';
    const end = '</ol>';
    
    const prevIsList = node.attributes?.previous?.type === NumberedListBlockKeys.type;
    const nextIsList = node.attributes?.next?.type === NumberedListBlockKeys.type;

    if (!prevIsList && !nextIsList) {
      return `${start}${html}${end}`;
    } else if (!prevIsList) {
      return `${start}${html}`;
    } else if (!nextIsList) {
      return `${html}${end}`;
    } else {
      return html;
    }
  }

  transformNodeToDomNodes(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): DomNode[] {
    const delta = node.attributes?.delta || ({} as Delta);
    const domNodes = deltaHTMLEncoder.convert(delta);
    
    domNodes.push(
      ...this.processChildrenNodes(node.children, options)
    );
    
    const element = this.wrapChildrenNodesWithTagName(
      HTMLTags.list,
      { childNodes: domNodes }
    );
    
    return [element];
  }
}