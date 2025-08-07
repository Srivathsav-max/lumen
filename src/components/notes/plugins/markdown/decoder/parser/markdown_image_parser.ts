// Markdown image parser for converting image elements
import { CustomMarkdownParser, Node, MdNode, MarkdownListType } from './custom_markdown_node_parser';

export interface MdElement extends MdNode {
  tag: string;
  children?: MdNode[];
  attributes?: Record<string, string>;
}

function imageNode(options: { url: string }): Node {
  return {
    type: 'image',
    children: [],
    attributes: {
      url: options.url
    }
  };
}

export class MarkdownImageParserV2 extends CustomMarkdownParser {
  constructor() {
    super();
  }

  transform(
    element: MdNode,
    parsers: CustomMarkdownParser[],
    options: {
      listType?: MarkdownListType;
      startNumber?: number;
    } = {}
  ): Node[] {
    if (!this.isElement(element)) {
      return [];
    }

    if (element.attributes?.['src']) {
      return [
        imageNode({ url: element.attributes['src'] })
      ];
    }

    if (element.children?.length !== 1 || !this.isElement(element.children[0])) {
      return [];
    }

    const ec = element.children[0] as MdElement;
    if (ec.tag !== 'img' || !ec.attributes?.['src']) {
      return [];
    }

    return [
      imageNode({ url: ec.attributes['src'] })
    ];
  }

  private isElement(node: MdNode): node is MdElement {
    return 'tag' in node && typeof node.tag === 'string';
  }
}