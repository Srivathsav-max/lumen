// HTML text node parser for converting paragraph nodes to HTML
import { HTMLNodeParser, Node, DomNode, createElement } from './html_node_parser';

export class ParagraphBlockKeys {
  static readonly type = 'paragraph';
}

export class HTMLTags {
  static readonly paragraph = 'p';
  static readonly br = 'br';
}

export interface Delta {
  // Define delta interface
}

export interface DeltaHTMLEncoder {
  convert(delta: Delta): DomNode[];
}

// Mock implementation
class MockDeltaHTMLEncoder implements DeltaHTMLEncoder {
  convert(delta: Delta): DomNode[] {
    // This would need actual implementation
    return [];
  }
}

const deltaHTMLEncoder = new MockDeltaHTMLEncoder();

export class HTMLTextNodeParser extends HTMLNodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return ParagraphBlockKeys.type;
  }

  transformNodeToHTMLString(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): string {
    return this.toHTMLString(
      this.transformNodeToDomNodes(node, options)
    );
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
    
    if (domNodes.length === 0) {
      return [createElement(HTMLTags.br)];
    }
    
    const element = this.wrapChildrenNodesWithTagName(
      HTMLTags.paragraph,
      { childNodes: domNodes }
    );
    
    return [element];
  }
}