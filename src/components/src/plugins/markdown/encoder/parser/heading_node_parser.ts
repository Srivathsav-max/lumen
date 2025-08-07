// Heading node parser for converting heading nodes to markdown
import { NodeParser, Node, DocumentMarkdownEncoder } from './node_parser';

export class HeadingBlockKeys {
  static readonly type = 'heading';
  static readonly level = 'level';
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

export class HeadingNodeParser extends NodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return HeadingBlockKeys.type;
  }

  transform(node: Node, encoder?: DocumentMarkdownEncoder): string {
    const delta = node.delta ?? this.createEmptyDelta();
    const markdown = new MockDeltaMarkdownEncoder().convert(delta);
    const attributes = node.attributes;
    const level = (attributes[HeadingBlockKeys.level] as number) ?? 1;
    
    const result = `${'#'.repeat(level)} ${markdown}`;
    const suffix = node.next == null ? '' : '\n';

    return `${result}${suffix}`;
  }

  private createEmptyDelta(): Delta {
    return {
      insert: (text: string) => {
        return this.createEmptyDelta();
      }
    };
  }
}