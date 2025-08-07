// Markdown parser extension utilities
import { CustomMarkdownParser, Node, MdNode, MarkdownListType } from './custom_markdown_node_parser';

export { MarkdownListType };

export function parseElementChildren(
  elementChildren: MdNode[] | null | undefined,
  parsers: CustomMarkdownParser[],
  options: {
    listType?: MarkdownListType;
    startNumber?: number;
  } = {}
): Node[] {
  const { listType = MarkdownListType.unknown, startNumber } = options;
  const children: Node[] = [];

  if (!elementChildren || elementChildren.length === 0) {
    return children;
  }

  for (const child of elementChildren) {
    for (const parser of parsers) {
      const nodes = parser.transform(child, parsers, {
        listType,
        startNumber
      });

      if (nodes.length > 0) {
        children.push(...nodes);
        break;
      }
    }
  }

  return children;
}