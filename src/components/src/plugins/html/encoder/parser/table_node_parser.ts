// HTML table node parser for converting table nodes to HTML
import {
  HTMLNodeParser,
  Node,
  DomNode,
  createElement,
} from "./html_node_parser";

export class TableBlockKeys {
  static readonly type = "table";
  static readonly rowsLen = "rowsLen";
  static readonly colsLen = "colsLen";
}

export class HTMLTags {
  static readonly table = "table";
  static readonly tableRow = "tr";
  static readonly tabledata = "td";
}

// Mock implementation for getCellNode - would need actual table utility
function getCellNode(node: Node, col: number, row: number): Node | null {
  // This would need to be implemented based on your table structure
  // For now, returning a mock cell node
  if (
    node.children &&
    node.children[row * (node.attributes[TableBlockKeys.colsLen] || 1) + col]
  ) {
    return node.children[
      row * (node.attributes[TableBlockKeys.colsLen] || 1) + col
    ];
  }
  return {
    type: "paragraph",
    children: [],
    attributes: {},
  };
}

export class HtmlTableNodeParser extends HTMLNodeParser {
  constructor() {
    super();
  }

  get id(): string {
    return TableBlockKeys.type;
  }

  transformNodeToHTMLString(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): string {
    if (node.type !== TableBlockKeys.type) {
      throw new Error(
        `Expected node type '${TableBlockKeys.type}', got '${node.type}'`
      );
    }

    return this.toHTMLString(this.transformNodeToDomNodes(node, options));
  }

  transformNodeToDomNodes(
    node: Node,
    options: { encodeParsers: HTMLNodeParser[] }
  ): DomNode[] {
    const rowsLen = node.attributes[TableBlockKeys.rowsLen] as number;
    const colsLen = node.attributes[TableBlockKeys.colsLen] as number;
    const domNodes: DomNode[] = [];

    for (let i = 0; i < rowsLen; i++) {
      const nodes: DomNode[] = [];

      for (let j = 0; j < colsLen; j++) {
        const cell = getCellNode(node, j, i);

        if (cell) {
          for (const childNode of cell.children) {
            const parser = options.encodeParsers.find(
              (element) => element.id === childNode.type
            );

            if (parser) {
              const cellElement = this.wrapChildrenNodesWithTagName(
                HTMLTags.tabledata,
                {
                  childNodes: parser.transformNodeToDomNodes(
                    childNode,
                    options
                  ),
                }
              );
              nodes.push(cellElement);
            }
          }
        }
      }

      const rowElement = this.wrapChildrenNodesWithTagName(HTMLTags.tableRow, {
        childNodes: nodes,
      });

      domNodes.push(rowElement);
    }

    const element = this.wrapChildrenNodesWithTagName(HTMLTags.table, {
      childNodes: domNodes,
    });

    return [element];
  }
}
