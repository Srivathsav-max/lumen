// HTML divider node parser for converting divider nodes to HTML
import { HTMLNodeParser, Node, DomNode, createElement } from './html_node_parser';

export class DividerBlockKeys {
  static readonly type = 'divider';
}

export class HTMLTags {
  static readonly divider = 'hr';
}

export class HTMLDividerNodeParser extends HTMLNodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return DividerBlockKeys.type;
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
    return [createElement(HTMLTags.divider)];
  }
}