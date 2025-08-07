// HTML image node parser for converting image nodes to HTML
import { HTMLNodeParser, Node, DomNode, createElement } from './html_node_parser';

export class ImageBlockKeys {
  static readonly type = 'image';
  static readonly url = 'url';
  static readonly height = 'height';
  static readonly width = 'width';
  static readonly align = 'align';
}

export class HTMLTags {
  static readonly image = 'img';
}

export class HTMLImageNodeParser extends HTMLNodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return ImageBlockKeys.type;
  }

  transformNodeToHTMLString(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): string {
    return this.toHTMLString(
      this.transformNodeToDomNodes(node, options)
    );
  }

  transformNodeToDomNodes(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): DomNode[] {
    const anchor = createElement(HTMLTags.image);
    anchor.setAttribute('src', node.attributes[ImageBlockKeys.url] || '');

    const height = node.attributes[ImageBlockKeys.height];
    if (height != null) {
      anchor.setAttribute('height', height.toString());
    }

    const width = node.attributes[ImageBlockKeys.width];
    if (width != null) {
      anchor.setAttribute('width', width.toString());
    }

    const align = node.attributes[ImageBlockKeys.align];
    if (align != null) {
      anchor.setAttribute('align', align);
    }

    return [
      anchor,
      ...this.processChildrenNodes(node.children, options)
    ];
  }
}