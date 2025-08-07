// HTML bulleted list node parser for converting bulleted list nodes to HTML
import { HTMLNodeParser, Node, DomNode } from './html_node_parser';

export class BulletedListBlockKeys {
  static readonly type = 'bulleted_list';
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

// Mock implementation
class MockDeltaHTMLEncoder implements DeltaHTMLEncoder {
  convert(delta: Delta): DomNode[] {
    // This would need actual implementation
    return [];
  }
}

const deltaHTMLEncoder = new MockDeltaHTMLEncoder();

export class HTMLBulletedListNodeParser extends HTMLNodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return BulletedListBlockKeys.type;
  }

  transformNodeToHTMLString(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): string {
    if (node.type !== BulletedListBlockKeys.type) {
      throw new Error(`Expected node type '${BulletedListBlockKeys.type}', got '${node.type}'`);
    }

    const html = this.toHTMLString(
      this.transformNodeToDomNodes(node, options)
    );

    const start = '<ul>';
    const end = '</ul>';
    
    const prevIsList = node.attributes?.previous?.type === BulletedListBlockKeys.type;
    const nextIsList = node.attributes?.next?.type === BulletedListBlockKeys.type;

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