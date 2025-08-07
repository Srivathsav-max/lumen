// Document to Markdown encoder for converting document structures to markdown
import { NodeParser, Node, DocumentMarkdownEncoder as IDocumentMarkdownEncoder } from '../encoder/parser/node_parser';

export interface Document {
  root: Node;
}

function pageNode(options: { children?: Node[] } = {}): Node {
  return {
    type: 'page',
    path: [],
    children: options.children ?? [],
    attributes: {}
  };
}

export class DocumentMarkdownEncoder implements IDocumentMarkdownEncoder {
  private parsers: NodeParser[];
  private lineBreak: string;

  constructor(options: {
    parsers?: NodeParser[];
    lineBreak?: string;
  } = {}) {
    this.parsers = options.parsers ?? [];
    this.lineBreak = options.lineBreak ?? '';
  }

  convert(input: Document): string {
    const buffer: string[] = [];
    
    for (const node of input.root.children) {
      const parser = this.parsers.find(element => element.id === node.type);
      
      if (parser) {
        buffer.push(parser.transform(node, this));
        
        if (this.lineBreak.length > 0 && node.id !== input.root.children[input.root.children.length - 1].id) {
          buffer.push(this.lineBreak);
        }
      }
    }
    
    return buffer.join('');
  }

  convertNodes(
    nodes: Node[],
    options: { withIndent?: boolean } = {}
  ): string | null {
    const { withIndent = false } = options;
    
    const document: Document = {
      root: pageNode({ children: nodes })
    };
    
    const result = this.convert(document);
    
    if (result.length > 0 && withIndent) {
      return result
        .split('\n')
        .map(line => line.length > 0 ? `\t${line}` : line)
        .join('\n');
    }
    
    return result.length > 0 ? result : null;
  }

  /**
   * Add a parser to the encoder
   */
  addParser(parser: NodeParser): void {
    this.parsers.push(parser);
  }

  /**
   * Remove a parser from the encoder
   */
  removeParser(parserId: string): void {
    this.parsers = this.parsers.filter(parser => parser.id !== parserId);
  }

  /**
   * Get all registered parsers
   */
  getParsers(): NodeParser[] {
    return [...this.parsers];
  }

  /**
   * Check if a parser exists for a given node type
   */
  hasParser(nodeType: string): boolean {
    return this.parsers.some(parser => parser.id === nodeType);
  }
}