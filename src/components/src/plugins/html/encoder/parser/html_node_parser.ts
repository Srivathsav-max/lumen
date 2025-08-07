// Abstract base class for HTML node parsers
export interface Node {
  type: string;
  children: Node[];
  attributes: Record<string, any>;
}

export interface DomNode {
  nodeType: number;
  textContent?: string;
  outerHTML?: string;
}

export interface DomElement extends DomNode {
  tagName: string;
  appendChild(child: DomNode): void;
  setAttribute(name: string, value: string): void;
  outerHTML: string;
}

export interface DomText extends DomNode {
  text: string;
}

// Mock DOM implementation for server-side rendering
class MockDomElement implements DomElement {
  nodeType = 1; // ELEMENT_NODE
  tagName: string;
  children: DomNode[] = [];
  attributes: Record<string, string> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toLowerCase();
  }

  appendChild(child: DomNode): void {
    this.children.push(child);
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  get outerHTML(): string {
    const attrs = Object.entries(this.attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    const attrsStr = attrs ? ` ${attrs}` : '';
    
    if (this.children.length === 0) {
      return `<${this.tagName}${attrsStr}/>`;
    }
    
    const childrenHTML = this.children
      .map(child => stringify(child))
      .join('');
    
    return `<${this.tagName}${attrsStr}>${childrenHTML}</${this.tagName}>`;
  }
}

class MockDomText implements DomText {
  nodeType = 3; // TEXT_NODE
  text: string;

  constructor(text: string) {
    this.text = text;
  }

  get textContent(): string {
    return this.text;
  }
}

export function createElement(tagName: string): DomElement {
  return new MockDomElement(tagName);
}

export function createTextNode(text: string): DomText {
  return new MockDomText(text);
}

export function stringify(node: DomNode): string {
  if ('outerHTML' in node && node.outerHTML) {
    return node.outerHTML;
  }

  if ('text' in node) {
    return (node as DomText).text;
  }

  if (node.textContent) {
    return node.textContent;
  }

  return '';
}

export abstract class HTMLNodeParser {
  constructor() {}

  /**
   * The id of the node parser.
   * Basically, it's the type of the node.
   */
  abstract get id(): string;

  /**
   * Transform the node to HTML string.
   */
  abstract transformNodeToHTMLString(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): string;

  /**
   * Convert the node to DOM nodes.
   */
  abstract transformNodeToDomNodes(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): DomNode[];

  protected wrapChildrenNodesWithTagName(
    tagName: string,
    options: { childNodes: DomNode[] }
  ): DomElement {
    const element = createElement(tagName);
    for (const node of options.childNodes) {
      element.appendChild(node);
    }
    return element;
  }

  // Iterate over children if they exist
  protected processChildrenNodes(
    nodes: Node[],
    options: { encodeParsers: HTMLNodeParser[] }
  ): DomNode[] {
    const result: DomNode[] = [];
    
    for (const node of nodes) {
      const parser = options.encodeParsers.find(
        element => element.id === node.type
      );
      
      if (parser) {
        result.push(
          ...parser.transformNodeToDomNodes(node, options)
        );
      }
    }
    
    return result;
  }

  protected toHTMLString(nodes: DomNode[]): string {
    return nodes
      .map(node => stringify(node))
      .join('')
      .replace(/\n/g, '');
  }
}