// Numbered list node parser for converting numbered list blocks to markdown
import { NodeParser, Node, DocumentMarkdownEncoder } from './node_parser';

export class NumberedListBlockKeys {
  static readonly type = 'numbered_list';
  static readonly number = 'number';
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

export class NumberedListNodeParser extends NodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return NumberedListBlockKeys.type;
  }

  transform(node: Node, encoder?: DocumentMarkdownEncoder): string {
    const delta = node.delta ?? this.createEmptyDelta();
    const number = node.attributes[NumberedListBlockKeys.number] ?? '1';
    const children = encoder?.convertNodes(node.children, { withIndent: true });
    
    let markdown = `${number}. ${new MockDeltaMarkdownEncoder().convert(delta)}\n`;
    
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