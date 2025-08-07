// Text node parser for converting paragraph nodes to markdown
import { NodeParser, Node, DocumentMarkdownEncoder } from './node_parser';

export class ParagraphBlockKeys {
  static readonly type = 'paragraph';
}

export class TableBlockKeys {
  static readonly type = 'table';
}

export interface Delta {
  insert(text: string): Delta;
}

export interface DeltaMarkdownEncoder {
  convert(delta: Delta): string;
}

// Mock implementation - would need actual DeltaMarkdownEncoder
class MockDeltaMarkdownEncoder implements DeltaMarkdownEncoder {
  convert(delta: Delta): string {
    // This would need to be implemented based on your Delta structure
    return '';
  }
}

export class TextNodeParser extends NodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return ParagraphBlockKeys.type;
  }

  transform(node: Node, encoder?: DocumentMarkdownEncoder): string {
    const delta = node.delta ?? this.createEmptyDelta();
    const children = encoder?.convertNodes(node.children, { withIndent: true });
    
    let markdown = new MockDeltaMarkdownEncoder().convert(delta);
    
    if (markdown.length === 0 && !children) {
      return '';
    } else if (!node.findParent?.(element => element.type === TableBlockKeys.type)) {
      markdown += '\n';
    }
    
    if (children && children.length > 0) {
      markdown += children;
    }
    
    return markdown;
  }

  private createEmptyDelta(): Delta {
    return {
      insert: (text: string) => {
        return this.createEmptyDelta();
      }
    };
  }
}