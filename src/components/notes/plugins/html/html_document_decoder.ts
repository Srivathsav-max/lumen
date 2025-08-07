// HTML document decoder for converting HTML strings to document structures
export interface Document {
  root: Node;
  insert(path: number[], nodes: Node[]): void;
  static blank(options?: { withInitialText?: boolean }): Document;
}

export interface Node {
  type: string;
  children: Node[];
  attributes: Record<string, any>;
  delta?: Delta;
  text?: string;
}

export interface Delta {
  ops: any[];
  insert(text: string, options?: { attributes?: Attributes }): Delta;
  isEmpty: boolean;
  toJson(): any;
}

export interface Attributes {
  [key: string]: any;
}

export interface DomElement {
  localName: string;
  children: DomElement[];
  nodes: DomNode[];
  attributes: Record<string, string>;
  text: string;
}

export interface DomNode {
  nodeType: number;
  text?: string;
}

export interface DomText extends DomNode {
  nodeType: 3;
  text: string;
}

export class AppFlowyRichTextKeys {
  static readonly bold = 'bold';
  static readonly italic = 'italic';
  static readonly underline = 'underline';
  static readonly strikethrough = 'strikethrough';
  static readonly code = 'code';
  static readonly href = 'href';
  static readonly backgroundColor = 'backgroundColor';
  static readonly textColor = 'textColor';
}

export class ParagraphBlockKeys {
  static readonly type = 'paragraph';
  static readonly delta = 'delta';
}

export class BulletedListBlockKeys {
  static readonly type = 'bulleted_list';
}

export class NumberedListBlockKeys {
  static readonly type = 'numbered_list';
}

export class TableBlockKeys {
  static readonly type = 'table';
  static readonly rowsLen = 'rowsLen';
  static readonly colsLen = 'colsLen';
  static readonly colDefaultWidth = 'colDefaultWidth';
  static readonly rowDefaultHeight = 'rowDefaultHeight';
  static readonly colMinimumWidth = 'colMinimumWidth';
}

export class TableCellBlockKeys {
  static readonly type = 'table_cell';
  static readonly colPosition = 'colPosition';
  static readonly rowPosition = 'rowPosition';
}

export class TableDefaults {
  static readonly colWidth = 120;
  static readonly rowHeight = 36;
  static readonly colMinimumWidth = 60;
}

export class HTMLTags {
  static readonly h1 = 'h1';
  static readonly h2 = 'h2';
  static readonly h3 = 'h3';
  static readonly h4 = 'h4';
  static readonly h5 = 'h5';
  static readonly h6 = 'h6';
  static readonly orderedList = 'ol';
  static readonly unorderedList = 'ul';
  static readonly list = 'li';
  static readonly paragraph = 'p';
  static readonly image = 'img';
  static readonly anchor = 'a';
  static readonly italic = 'i';
  static readonly em = 'em';
  static readonly bold = 'b';
  static readonly underline = 'u';
  static readonly strikethrough = 's';
  static readonly del = 'del';
  static readonly strong = 'strong';
  static readonly checkbox = 'input';
  static readonly br = 'br';
  static readonly span = 'span';
  static readonly code = 'code';
  static readonly blockQuote = 'blockquote';
  static readonly div = 'div';
  static readonly divider = 'hr';
  static readonly table = 'table';
  static readonly tableRow = 'tr';
  static readonly tableheader = 'th';
  static readonly tabledata = 'td';
  static readonly section = 'section';
  static readonly font = 'font';
  static readonly mark = 'mark';

  static readonly formattingElements = [
    HTMLTags.anchor,
    HTMLTags.italic,
    HTMLTags.em,
    HTMLTags.bold,
    HTMLTags.underline,
    HTMLTags.del,
    HTMLTags.strong,
    HTMLTags.span,
    HTMLTags.code,
    HTMLTags.strikethrough,
    HTMLTags.font,
    HTMLTags.mark,
  ];

  static readonly specialElements = [
    HTMLTags.h1,
    HTMLTags.h2,
    HTMLTags.h3,
    HTMLTags.h4,
    HTMLTags.h5,
    HTMLTags.h6,
    HTMLTags.unorderedList,
    HTMLTags.orderedList,
    HTMLTags.div,
    HTMLTags.list,
    HTMLTags.table,
    HTMLTags.paragraph,
    HTMLTags.blockQuote,
    HTMLTags.checkbox,
    HTMLTags.image,
    HTMLTags.section,
  ];

  static isTopLevel(tag: string): boolean {
    return tag === HTMLTags.h1 ||
           tag === HTMLTags.h2 ||
           tag === HTMLTags.h3 ||
           tag === HTMLTags.table ||
           tag === HTMLTags.checkbox ||
           tag === HTMLTags.paragraph ||
           tag === HTMLTags.div ||
           tag === HTMLTags.blockQuote;
  }
}

// Mock implementations for node creation functions
function paragraphNode(options: { delta?: Delta; text?: string } = {}): Node {
  const delta = options.delta || createDelta();
  if (options.text) {
    delta.insert(options.text);
  }
  return {
    type: ParagraphBlockKeys.type,
    children: [],
    attributes: { [ParagraphBlockKeys.delta]: delta.toJson() },
    delta
  };
}

function headingNode(options: { level: number; delta: Delta }): Node {
  return {
    type: 'heading',
    children: [],
    attributes: { level: options.level, delta: options.delta.toJson() },
    delta: options.delta
  };
}

function quoteNode(options: { delta: Delta; children?: Node[] }): Node {
  return {
    type: 'quote',
    children: options.children || [],
    attributes: { delta: options.delta.toJson() },
    delta: options.delta
  };
}

function imageNode(options: { url: string }): Node {
  return {
    type: 'image',
    children: [],
    attributes: { url: options.url }
  };
}

function createDelta(): Delta {
  const ops: any[] = [];
  return {
    ops,
    insert: function(text: string, options?: { attributes?: Attributes }) {
      this.ops.push({ insert: text, attributes: options?.attributes });
      return this;
    },
    get isEmpty() {
      return this.ops.length === 0;
    },
    toJson: function() {
      return { ops: this.ops };
    }
  };
}

class TableNode {
  node: Node;

  constructor(options: { node: Node }) {
    this.node = options.node;
  }
}

class AppFlowyEditorLog {
  static editor = {
    debug: (message: string) => console.debug(message)
  };
}

export class DocumentHTMLDecoder {
  static enableColorParse = true;

  convert(input: string): Document {
    const parser = new DOMParser();
    const document = parser.parseFromString(input, 'text/html');
    const body = document.body;
    
    if (!body) {
      return this.createBlankDocument();
    }

    // Handle single child case for Google Docs compatibility
    const parseForSingleChild = body.children.length === 1 &&
      HTMLTags.formattingElements.includes(body.children[0].localName);
    
    const doc = this.createBlankDocument();
    const nodes = parseForSingleChild
      ? this.parseElement(Array.from(body.children[0].children))
      : this.parseElement(Array.from(body.childNodes));
    
    doc.insert([0], nodes);
    return doc;
  }

  private createBlankDocument(): Document {
    const root: Node = {
      type: 'document',
      children: [],
      attributes: {}
    };

    return {
      root,
      insert: function(path: number[], nodes: Node[]) {
        if (path.length === 1 && path[0] >= 0) {
          if (path[0] >= this.root.children.length) {
            this.root.children.push(...nodes);
          } else {
            this.root.children.splice(path[0], 0, ...nodes);
          }
        }
      }
    };
  }

  private parseElement(domNodes: (Element | Node)[], type?: string): Node[] {
    const delta = createDelta();
    const nodes: Node[] = [];
    
    for (const domNode of domNodes) {
      if (domNode.nodeType === 1) { // Element node
        const element = domNode as Element;
        const localName = element.localName;
        
        if (HTMLTags.formattingElements.includes(localName)) {
          const style = element.getAttribute('style');
          
          // Handle meaningless tags from Google Docs
          const isMeaninglessTag = style === 'font-weight:normal;' && localName === HTMLTags.bold;
          if (isMeaninglessTag && element.children.length > 0) {
            nodes.push(...this.parseElement(Array.from(element.children)));
          } else {
            const attributes = this.parseFormattingElementAttributes(element);
            delta.insert(element.textContent || '', { attributes });
          }
        } else if (HTMLTags.specialElements.includes(localName)) {
          if (!delta.isEmpty) {
            nodes.push(paragraphNode({ delta }));
          }
          nodes.push(...this.parseSpecialElements(element, type || ParagraphBlockKeys.type));
        }
      } else if (domNode.nodeType === 3) { // Text node
        const text = domNode.textContent?.trim();
        if (text) {
          delta.insert(text);
        }
      } else {
        AppFlowyEditorLog.editor.debug(`Unknown node type: ${domNode}`);
      }
    }
    
    if (!delta.isEmpty) {
      nodes.push(paragraphNode({ delta }));
    }
    
    return nodes;
  }

  private parseSpecialElements(element: Element, type: string): Node[] {
    const localName = element.localName;
    
    switch (localName) {
      case HTMLTags.h1:
        return this.parseHeadingElement(element, 1);
      case HTMLTags.h2:
        return this.parseHeadingElement(element, 2);
      case HTMLTags.h3:
        return this.parseHeadingElement(element, 3);
      case HTMLTags.h4:
        return this.parseHeadingElement(element, 4);
      case HTMLTags.h5:
        return this.parseHeadingElement(element, 5);
      case HTMLTags.h6:
        return this.parseHeadingElement(element, 6);
      case HTMLTags.unorderedList:
        return this.parseUnOrderListElement(element);
      case HTMLTags.orderedList:
        return this.parseOrderListElement(element);
      case HTMLTags.table:
        return this.parseTable(element);
      case HTMLTags.list:
        return [this.parseListElement(element, type)];
      case HTMLTags.paragraph:
        return this.parseParagraphElement(element);
      case HTMLTags.blockQuote:
        return [this.parseBlockQuoteElement(element)];
      case HTMLTags.image:
        return [this.parseImageElement(element)];
      default:
        return this.parseParagraphElement(element);
    }
  }

  private parseHeadingElement(element: Element, level: number): Node[] {
    const [delta, specialNodes] = this.parseDeltaElement(element);
    return [
      headingNode({ level, delta }),
      ...specialNodes
    ];
  }

  private parseBlockQuoteElement(element: Element): Node {
    const [delta, nodes] = this.parseDeltaElement(element);
    return quoteNode({ delta, children: nodes });
  }

  private parseUnOrderListElement(element: Element): Node[] {
    return Array.from(element.children).map(child =>
      this.parseListElement(child, BulletedListBlockKeys.type)
    );
  }

  private parseOrderListElement(element: Element): Node[] {
    return Array.from(element.children).map(child =>
      this.parseListElement(child, NumberedListBlockKeys.type)
    );
  }

  private parseListElement(element: Element, type: string): Node {
    let [delta, nodes] = this.parseDeltaElement(element, type);
    
    if (delta.isEmpty &&
        element.children.length === 1 &&
        element.children[0].localName === HTMLTags.paragraph) {
      [delta, nodes] = this.parseDeltaElement(element.children[0], type);
    }
    
    return {
      type,
      children: nodes,
      attributes: { [ParagraphBlockKeys.delta]: delta.toJson() }
    };
  }

  private parseParagraphElement(element: Element): Node[] {
    const [delta, specialNodes] = this.parseDeltaElement(element);
    return [paragraphNode({ delta }), ...specialNodes];
  }

  private parseImageElement(element: Element): Node {
    const src = element.getAttribute('src');
    if (!src || !src.startsWith('http')) {
      return paragraphNode(); // return empty paragraph
    }
    return imageNode({ url: src });
  }

  private parseTable(element: Element): Node[] {
    const tableNodes: Node[] = [];
    let columnLength = 0;
    let rowLength = 0;
    
    for (const data of Array.from(element.children)) {
      const [col, row, rowData] = this.parseTableRows(data);
      columnLength = columnLength + col;
      rowLength = rowLength + row;
      tableNodes.push(...rowData);
    }

    return [
      new TableNode({
        node: {
          type: TableBlockKeys.type,
          attributes: {
            [TableBlockKeys.rowsLen]: rowLength,
            [TableBlockKeys.colsLen]: columnLength,
            [TableBlockKeys.colDefaultWidth]: TableDefaults.colWidth,
            [TableBlockKeys.rowDefaultHeight]: TableDefaults.rowHeight,
            [TableBlockKeys.colMinimumWidth]: TableDefaults.colMinimumWidth,
          },
          children: tableNodes,
        }
      }).node
    ];
  }

  private parseTableRows(element: Element): [number, number, Node[]] {
    const nodes: Node[] = [];
    let colLength = 0;
    let rowLength = 0;

    for (const data of Array.from(element.children)) {
      const tableData = this.parseTableData(data, rowLength);
      if (colLength === 0) {
        colLength = tableData.length;
      }
      nodes.push(...tableData);
      rowLength++;
    }
    
    return [colLength, rowLength, nodes];
  }

  private parseTableData(element: Element, rowPosition: number): Node[] {
    const nodes: Node[] = [];
    let columnPosition = 0;

    for (const data of Array.from(element.children)) {
      const attributes: Attributes = {
        [TableCellBlockKeys.colPosition]: columnPosition,
        [TableCellBlockKeys.rowPosition]: rowPosition,
      };

      if (Object.keys(data.attributes).length > 0) {
        const deltaAttributes = this.getDeltaAttributesFromHTMLAttributes(data.attributes) || {};
        Object.assign(attributes, deltaAttributes);
      }

      let children: Node[];
      if (data.children.length === 0) {
        children = [paragraphNode({ text: data.textContent || '' })];
      } else {
        children = this.parseTableSpecialNodes(data);
      }

      const node: Node = {
        type: TableCellBlockKeys.type,
        attributes,
        children,
      };

      nodes.push(node);
      columnPosition++;
    }

    return nodes;
  }

  private parseTableSpecialNodes(element: Element): Node[] {
    const nodes: Node[] = [];

    if (element.children.length > 0) {
      for (const child of Array.from(element.children)) {
        nodes.push(...this.parseTableDataElementsData(child));
      }
    } else {
      nodes.push(...this.parseTableDataElementsData(element));
    }
    
    return nodes;
  }

  private parseTableDataElementsData(element: Element): Node[] {
    const nodes: Node[] = [];
    const delta = createDelta();
    const localName = element.localName;

    if (HTMLTags.formattingElements.includes(localName)) {
      const attributes = this.parseFormattingElementAttributes(element);
      delta.insert(element.textContent || '', { attributes });
    } else if (HTMLTags.specialElements.includes(localName)) {
      if (!delta.isEmpty) {
        nodes.push(paragraphNode({ delta }));
      }
      nodes.push(...this.parseSpecialElements(element, ParagraphBlockKeys.type));
    } else {
      delta.insert(element.textContent || '');
    }

    if (!delta.isEmpty) {
      nodes.push(paragraphNode({ delta }));
    }
    
    return nodes;
  }

  private parseFormattingElementAttributes(element: Element): Attributes {
    const localName = element.localName;
    let attributes: Attributes = {};

    switch (localName) {
      case HTMLTags.bold:
      case HTMLTags.strong:
        attributes = { [AppFlowyRichTextKeys.bold]: true };
        break;
      case HTMLTags.italic:
      case HTMLTags.em:
        attributes = { [AppFlowyRichTextKeys.italic]: true };
        break;
      case HTMLTags.underline:
        attributes = { [AppFlowyRichTextKeys.underline]: true };
        break;
      case HTMLTags.del:
        attributes = { [AppFlowyRichTextKeys.strikethrough]: true };
        break;
      case HTMLTags.code:
        attributes = { [AppFlowyRichTextKeys.code]: true };
        break;
      case HTMLTags.span:
      case HTMLTags.mark:
        const deltaAttributes = this.getDeltaAttributesFromHTMLAttributes(element.attributes) || {};
        Object.assign(attributes, deltaAttributes);
        break;
      case HTMLTags.anchor:
        const href = element.getAttribute('href');
        if (href) {
          attributes = { [AppFlowyRichTextKeys.href]: href };
        }
        break;
      case HTMLTags.strikethrough:
        attributes = { [AppFlowyRichTextKeys.strikethrough]: true };
        break;
    }

    for (const child of Array.from(element.children)) {
      Object.assign(attributes, this.parseFormattingElementAttributes(child));
    }

    return attributes;
  }

  private parseDeltaElement(element: Element, type?: string): [Delta, Node[]] {
    const delta = createDelta();
    const nodes: Node[] = [];
    const children = Array.from(element.childNodes);

    for (const child of children) {
      if (child.nodeType === 1) { // Element node
        const childElement = child as Element;
        
        if (childElement.children.length > 0 &&
            !HTMLTags.formattingElements.includes(childElement.localName)) {
          nodes.push(...this.parseElement(Array.from(childElement.children), type));
        } else {
          if (HTMLTags.specialElements.includes(childElement.localName)) {
            nodes.push(...this.parseSpecialElements(childElement, ParagraphBlockKeys.type));
          } else {
            const attributes = this.parseFormattingElementAttributes(childElement);
            const text = (childElement.textContent || '').replace(/\n+/g, '');
            delta.insert(text, { attributes });
          }
        }
      } else {
        const text = (child.textContent || '').replace(/\n+/g, '');
        delta.insert(text);
      }
    }

    return [delta, nodes];
  }

  private getDeltaAttributesFromHTMLAttributes(htmlAttributes: NamedNodeMap): Attributes | null {
    const attributes: Attributes = {};
    const style = (htmlAttributes as any)['style'];
    const css = this.getCssFromString(style);

    // Font weight
    const fontWeight = css['font-weight'];
    if (fontWeight) {
      if (fontWeight === 'bold') {
        attributes[AppFlowyRichTextKeys.bold] = true;
      } else {
        const weight = parseInt(fontWeight);
        if (!isNaN(weight) && weight >= 500) {
          attributes[AppFlowyRichTextKeys.bold] = true;
        }
      }
    }

    // Text decoration
    const textDecoration = css['text-decoration'];
    if (textDecoration) {
      const decorations = textDecoration.split(' ');
      for (const decoration of decorations) {
        switch (decoration) {
          case 'underline':
            attributes[AppFlowyRichTextKeys.underline] = true;
            break;
          case 'line-through':
            attributes[AppFlowyRichTextKeys.strikethrough] = true;
            break;
        }
      }
    }

    // Background color
    const backgroundColor = css['background-color'];
    if (DocumentHTMLDecoder.enableColorParse && backgroundColor) {
      const highlightColor = this.tryToColor(backgroundColor)?.toHex();
      if (highlightColor) {
        attributes[AppFlowyRichTextKeys.backgroundColor] = highlightColor;
      }
    }

    // Background
    const background = css['background'];
    if (DocumentHTMLDecoder.enableColorParse && background) {
      const highlightColor = this.tryToColor(background)?.toHex();
      if (highlightColor) {
        attributes[AppFlowyRichTextKeys.backgroundColor] = highlightColor;
      }
    }

    // Color
    const color = css['color'];
    if (DocumentHTMLDecoder.enableColorParse && color) {
      const textColor = this.tryToColor(color)?.toHex();
      if (textColor) {
        attributes[AppFlowyRichTextKeys.textColor] = textColor;
      }
    }

    // Italic
    const fontStyle = css['font-style'];
    if (fontStyle === 'italic') {
      attributes[AppFlowyRichTextKeys.italic] = true;
    }

    return Object.keys(attributes).length === 0 ? null : attributes;
  }

  private getCssFromString(cssString?: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!cssString) {
      return result;
    }
    
    const entries = cssString.split(';');
    for (const entry of entries) {
      const tuples = entry.split(':');
      if (tuples.length < 2) {
        continue;
      }
      result[tuples[0].trim()] = tuples[1].trim();
    }
    
    return result;
  }

  private tryToColor(colorString: string): { toHex(): string } | null {
    // Simple color parsing - would need more comprehensive implementation
    if (colorString.startsWith('#')) {
      return {
        toHex: () => `0xFF${colorString.substring(1)}`
      };
    }
    
    if (colorString.startsWith('rgb')) {
      const match = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return {
          toHex: () => `0xFF${r}${g}${b}`
        };
      }
    }
    
    return null;
  }
}