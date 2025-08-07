// HTML todo list node parser for converting todo list nodes to HTML
import { HTMLNodeParser, Node, DomNode, createElement } from './html_node_parser';

export class TodoListBlockKeys {
  static readonly type = 'todo_list';
  static readonly checked = 'checked';
}

export class HTMLTags {
  static readonly div = 'div';
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

export class HTMLTodoListNodeParser extends HTMLNodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return TodoListBlockKeys.type;
  }

  transformNodeToHTMLString(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): string {
    if (node.type !== TodoListBlockKeys.type) {
      throw new Error(`Expected node type '${TodoListBlockKeys.type}', got '${node.type}'`);
    }

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

    const elementNode = createElement('input');
    elementNode.setAttribute('type', 'checkbox');
    
    if (node.attributes[TodoListBlockKeys.checked] === true) {
      elementNode.setAttribute('checked', '');
    }
    
    domNodes.unshift(elementNode);
    domNodes.push(
      ...this.processChildrenNodes(node.children, options)
    );

    const element = this.wrapChildrenNodesWithTagName(
      HTMLTags.div,
      { childNodes: domNodes }
    );
    
    return [element];
  }
}