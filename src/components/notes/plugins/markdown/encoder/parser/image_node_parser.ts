// Image node parser for converting image blocks to markdown
import { NodeParser, Node, DocumentMarkdownEncoder } from './node_parser';

export class ImageBlockKeys {
  static readonly type = 'image';
  static readonly url = 'url';
}

export class ImageNodeParser extends NodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return ImageBlockKeys.type;
  }

  transform(node: Node, encoder?: DocumentMarkdownEncoder): string {
    const url = node.attributes[ImageBlockKeys.url] ?? '';
    return `![](${url})`;
  }
}