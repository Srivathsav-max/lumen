// HTML document encoder for converting document structures to HTML
export interface Document {
  root: Node;
}

export interface Node {
  type: string;
  children: Node[];
  attributes: Record<string, any>;
}

export interface HTMLNodeParser {
  readonly id: string;
  transformNodeToHTMLString(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): string;
}

export class DocumentHTMLEncoder {
  private encodeParsers: HTMLNodeParser[];

  constructor(options: { encodeParsers?: HTMLNodeParser[] } = {}) {
    this.encodeParsers = options.encodeParsers ?? [];
  }

  convert(input: Document): string {
    const buffer: string[] = [];
    
    for (const node of input.root.children) {
      const parser = this.encodeParsers.find(
        element => element.id === node.type
      );
      
      if (parser) {
        buffer.push(
          parser.transformNodeToHTMLString(node, {
            encodeParsers: this.encodeParsers
          })
        );
      }
    }
    
    return buffer.join('');
  }

  /**
   * Add a parser to the encoder
   */
  addParser(parser: HTMLNodeParser): void {
    this.encodeParsers.push(parser);
  }

  /**
   * Remove a parser from the encoder
   */
  removeParser(parserId: string): void {
    this.encodeParsers = this.encodeParsers.filter(parser => parser.id !== parserId);
  }

  /**
   * Get all registered parsers
   */
  getParsers(): HTMLNodeParser[] {
    return [...this.encodeParsers];
  }

  /**
   * Check if a parser exists for a given node type
   */
  hasParser(nodeType: string): boolean {
    return this.encodeParsers.some(parser => parser.id === nodeType);
  }
}