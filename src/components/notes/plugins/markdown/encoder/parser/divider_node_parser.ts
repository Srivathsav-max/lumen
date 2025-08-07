// Divider node parser for converting divider blocks to markdown
import { NodeParser, Node, DocumentMarkdownEncoder } from './node_parser';

export class DividerBlockKeys {
  static readonly type = 'divider';
}

export class DividerNodeParser extends NodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return DividerBlockKeys.type;
  }

  transform(node: Node, encoder?: DocumentMarkdownEncoder): string {
    return '---\n';
  }
}