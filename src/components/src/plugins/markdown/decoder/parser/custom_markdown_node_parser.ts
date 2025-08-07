// Abstract base class for custom markdown node parsers
export interface Node {
  type: string;
  children: Node[];
  attributes: Record<string, any>;
}

export interface MdNode {
  textContent: string;
  tag?: string;
  children?: MdNode[];
}

export enum MarkdownListType {
  unknown = 'unknown',
  ordered = 'ordered',
  unordered = 'unordered'
}

export abstract class CustomMarkdownParser {
  constructor() {}

  abstract transform(
    element: MdNode,
    parsers: CustomMarkdownParser[],
    options?: {
      listType?: MarkdownListType;
      startNumber?: number;
    }
  ): Node[];
}