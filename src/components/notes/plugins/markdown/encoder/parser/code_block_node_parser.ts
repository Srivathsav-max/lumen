// Code block node parser for converting code blocks to markdown
import { NodeParser, Node, DocumentMarkdownEncoder } from './node_parser';

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

export class CodeBlockNodeParser extends NodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return 'code';
  }

  transform(node: Node, encoder?: DocumentMarkdownEncoder): string {
    if (node.type !== 'code') {
      throw new Error(`Expected node type 'code', got '${node.type}'`);
    }

    const delta = node.delta;
    const language = node.attributes['language'] ?? '';
    
    if (!delta) {
      throw new Error('Delta is null');
    }
    
    const markdown = new MockDeltaMarkdownEncoder().convert(delta);
    const result = `\`\`\`${language}\n${markdown}\n\`\`\``;
    const suffix = node.next == null ? '' : '\n';

    return `${result}${suffix}`;
  }
}