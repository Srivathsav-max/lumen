// HTML document conversion utilities
import { DocumentHTMLEncoder, HTMLNodeParser } from './html_document_encoder';

export interface Document {
  root: Node;
}

export interface Node {
  type: string;
  children: Node[];
  attributes: Record<string, any>;
}

export interface DocumentHTMLDecoder {
  // Define interface for HTML decoder
}

// Mock implementation for DocumentHTMLDecoder
class MockDocumentHTMLDecoder implements DocumentHTMLDecoder {
  // This would need actual implementation
}

/**
 * Converts HTML string to Document.
 * @param html The HTML string to convert
 * @returns Document object
 */
export function htmlToDocument(html: string): Document {
  const codec = new AppFlowyEditorHTMLCodec();
  return codec.decode(html);
}

/**
 * Converts a Document to HTML string.
 * @param document The document to convert
 * @param customParsers Custom HTML node parsers
 * @returns HTML string
 */
export function documentToHTML(
  document: Document,
  options: {
    customParsers?: HTMLNodeParser[];
  } = {}
): string {
  const { customParsers = [] } = options;
  
  const codec = new AppFlowyEditorHTMLCodec({
    encodeParsers: [
      ...customParsers,
      // Add default parsers here when implemented
      // new HTMLTextNodeParser(),
      // new HTMLBulletedListNodeParser(),
      // new HTMLNumberedListNodeParser(),
      // new HTMLTodoListNodeParser(),
      // new HTMLQuoteNodeParser(),
      // new HTMLHeadingNodeParser(),
      // new HTMLImageNodeParser(),
      // new HtmlTableNodeParser(),
      // new HTMLDividerNodeParser(),
    ]
  });
  
  return codec.encode(document);
}

export class AppFlowyEditorHTMLCodec {
  private encodeParsers: HTMLNodeParser[];

  constructor(options: {
    encodeParsers?: HTMLNodeParser[];
  } = {}) {
    this.encodeParsers = options.encodeParsers ?? [];
  }

  get decoder(): DocumentHTMLDecoder {
    return new MockDocumentHTMLDecoder();
  }

  get encoder(): DocumentHTMLEncoder {
    return new DocumentHTMLEncoder({
      encodeParsers: this.encodeParsers
    });
  }

  decode(html: string): Document {
    // Implementation would depend on your specific HTML parsing needs
    // For now, returning a basic document structure
    return {
      root: {
        type: 'document',
        children: [],
        attributes: {}
      }
    };
  }

  encode(document: Document): string {
    return this.encoder.convert(document);
  }
}