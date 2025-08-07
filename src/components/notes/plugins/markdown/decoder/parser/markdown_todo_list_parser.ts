// Markdown todo list parser for converting task list items
import { CustomMarkdownParser, Node, MdNode, MarkdownListType } from './custom_markdown_node_parser';

export interface MdElement extends MdNode {
  tag: string;
  children?: MdNode[];
  attributes?: Record<string, string>;
}

export interface Delta {
  // Define delta interface
}

export interface DeltaMarkdownDecoder {
  convertNodes(nodes?: MdNode[]): Delta;
}

class DeltaMarkdownDecoderImpl implements DeltaMarkdownDecoder {
  convertNodes(nodes?: MdNode[]): Delta {
    if (!nodes || nodes.length === 0) {
      return { ops: [] };
    }

    const ops: any[] = [];
    
    for (const node of nodes) {
      if ('text' in node && typeof (node as any).text === 'string') {
        ops.push({ insert: (node as any).text });
      } else if (node.textContent) {
        ops.push({ insert: node.textContent });
      }
    }

    return { ops };
  }
}

function todoListNode(options: {
  checked: boolean;
  delta: Delta;
  children?: Node[] | null;
}): Node {
  return {
    type: 'todo_list',
    children: options.children || [],
    attributes: {
      checked: options.checked,
      delta: options.delta
    }
  };
}

// Mock implementation for parseElementChildren
function parseElementChildren(
  elements: MdNode[],
  parsers: CustomMarkdownParser[],
  options: {
    listType?: MarkdownListType;
  } = {}
): Node[] {
  const nodes: Node[] = [];
  for (const element of elements) {
    for (const parser of parsers) {
      const result = parser.transform(element, parsers, options);
      if (result.length > 0) {
        nodes.push(...result);
        break;
      }
    }
  }
  return nodes;
}

export class MarkdownTodoListParserV2 extends CustomMarkdownParser {
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

    if (element.tag !== 'li' || element.attributes?.['class'] !== 'task-list-item') {
      return [];
    }

    const ec = element.children;
    if (!ec || ec.length === 0) {
      return [];
    }

    // For the task list item, the first two children are the input and the label
    // the rest are its children
    const firstChild = ec[0];
    const checked = this.isElement(firstChild) && 
                   firstChild.attributes?.['checked'] === 'true';

    let last: MdElement | null = null;
    // If the last child is not a list or paragraph, ignore it
    const lastChild = ec[ec.length - 1];
    if (this.isElement(lastChild)) {
      if (lastChild.tag === 'ul' || lastChild.tag === 'ol') {
        last = lastChild;
      }
    }

    const deltaDecoder = new DeltaMarkdownDecoderImpl();
    return [
      todoListNode({
        checked,
        delta: deltaDecoder.convertNodes(
          element.children?.slice(
            1,
            ec.length - (last ? 1 : 0)
          )
        ),
        children: last === null
          ? null
          : parseElementChildren(
              [last],
              parsers,
              { listType: MarkdownListType.unknown }
            )
      })
    ];
  }

  private isElement(node: MdNode): node is MdElement {
    return 'tag' in node && typeof node.tag === 'string';
  }
}