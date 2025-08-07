// Document markdown decoder for converting markdown strings to document structures
import { UnderlineInlineSyntax } from './custom_syntaxes/underline_syntax';

export interface Document {
  root: Node;
  insert(path: number[], nodes: Node[]): void;
  static blank(): Document;
}

export interface Node {
  type: string;
  children: Node[];
  attributes: Record<string, any>;
  textContent?: string;
}

export interface MdNode {
  textContent: string;
  tag?: string;
  children?: MdNode[];
}

export interface MdElement extends MdNode {
  tag: string;
  children?: MdNode[];
}

export interface MdDocument {
  parse(markdown: string): MdNode[];
}

export interface CustomMarkdownParser {
  transform(
    element: MdNode,
    parsers: CustomMarkdownParser[],
    options?: {
      listType?: MarkdownListType;
      startNumber?: number;
    }
  ): Node[];
}

export enum MarkdownListType {
  unknown = 'unknown',
  ordered = 'ordered',
  unordered = 'unordered'
}

export interface InlineSyntax {
  // Define interface for inline syntax
}

// Mock implementation for logging
class AppFlowyEditorLog {
  static editor = {
    debug: (message: string) => console.debug(message)
  };
}

// Mock implementation for Document.blank()
function createBlankDocument(): Document {
  return {
    root: {
      type: 'document',
      children: [],
      attributes: {}
    },
    insert: function(path: number[], nodes: Node[]) {
      if (path.length === 1 && path[0] === 0) {
        this.root.children.push(...nodes);
      }
    }
  };
}

export class DocumentMarkdownDecoder {
  private markdownElementParsers: CustomMarkdownParser[];
  private inlineSyntaxes: InlineSyntax[];

  constructor(options: {
    markdownElementParsers?: CustomMarkdownParser[];
    inlineSyntaxes?: InlineSyntax[];
  } = {}) {
    this.markdownElementParsers = options.markdownElementParsers ?? [];
    this.inlineSyntaxes = options.inlineSyntaxes ?? [];
  }

  convert(input: string): Document {
    const formattedMarkdown = this._formatMarkdown(input);
    
    // Mock markdown parsing - would need actual markdown parser implementation
    const mdNodes = this.parseMarkdown(formattedMarkdown);

    const document = createBlankDocument();
    const nodes = mdNodes
      .map(node => this._parseNode(node))
      .filter(nodeList => nodeList.length > 0)
      .flat();

    if (nodes.length > 0) {
      document.insert([0], nodes);
    }

    return document;
  }

  private parseMarkdown(markdown: string): MdNode[] {
    // This would need to be implemented with an actual markdown parser
    // For now, returning empty array
    return [];
  }

  // Handle node itself and its children
  private _parseNode(mdNode: MdNode): Node[] {
    let nodes: Node[] = [];

    for (const parser of this.markdownElementParsers) {
      nodes = parser.transform(mdNode, this.markdownElementParsers);

      if (nodes.length > 0) {
        break;
      }
    }

    if (nodes.length === 0) {
      AppFlowyEditorLog.editor.debug(
        `empty result from node: ${JSON.stringify(mdNode)}, text: ${mdNode.textContent}`
      );
    }

    return nodes;
  }

  private _formatMarkdown(markdown: string): string {
    // Rule 1: single '\n' between text and image, add double '\n'
    let result = markdown.replace(
      /([^\n])\n!\[([^\]]*)\]\(([^)]+)\)/gm,
      (match, text, altText, url) => {
        return `${text}\n\n![${altText}](${url})`;
      }
    );

    // Rule 2: without '\n' between text and image, add double '\n'
    result = result.replace(
      /([^\n])!\[([^\]]*)\]\(([^)]+)\)/g,
      (match, text, altText, url) => `${text}\n\n![${altText}](${url})`
    );

    // Add other rules here as needed

    return result;
  }
}