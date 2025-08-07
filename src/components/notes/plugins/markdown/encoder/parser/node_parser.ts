// Abstract base class for node parsers in markdown encoding
export interface Node {
  type: string;
  attributes: Record<string, any>;
  delta?: any;
  children: Node[];
  parent?: Node;
  next?: Node;
  findParent?(predicate: (element: Node) => boolean): Node | null;
}

export interface DocumentMarkdownEncoder {
  convertNodes(nodes: Node[], options?: { withIndent?: boolean }): string | null;
}

export abstract class NodeParser {
  constructor() {}

  abstract get id(): string;
  abstract transform(node: Node, encoder?: DocumentMarkdownEncoder): string;
}