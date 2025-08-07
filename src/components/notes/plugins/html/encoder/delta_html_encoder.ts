// Delta to HTML encoder for converting rich text deltas to HTML DOM nodes
export interface Attributes {
  [key: string]: any;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  href?: string;
  backgroundColor?: { toRgbaString(): string };
  color?: { toRgbaString(): string };
}

export interface TextInsert {
  text: string;
  attributes?: Attributes;
}

export interface Delta {
  ops: Array<TextInsert | any>;
}

export interface DomNode {
  nodeType: number;
  textContent?: string;
}

export interface DomElement extends DomNode {
  tagName: string;
  attributes: Record<string, string>;
  appendChild(child: DomNode): void;
  setAttribute(name: string, value: string): void;
}

export interface DomText extends DomNode {
  nodeType: 3;
  textContent: string;
}

export class AppFlowyRichTextKeys {
  static readonly bold = 'bold';
  static readonly italic = 'italic';
  static readonly underline = 'underline';
  static readonly strikethrough = 'strikethrough';
  static readonly code = 'code';
  static readonly href = 'href';
  static readonly backgroundColor = 'backgroundColor';
}

export class HTMLTags {
  static readonly anchor = 'a';
  static readonly strong = 'strong';
  static readonly italic = 'em';
  static readonly underline = 'u';
  static readonly del = 'del';
  static readonly code = 'code';
  static readonly paragraph = 'p';
  static readonly span = 'span';
}

// DOM creation utilities
function createTextNode(text: string): DomText {
  if (typeof document !== 'undefined' && document.createTextNode) {
    return document.createTextNode(text) as DomText;
  }
  return {
    nodeType: 3,
    textContent: text
  } as DomText;
}

function createElement(tagName: string): DomElement {
  if (typeof document !== 'undefined' && document.createElement) {
    return document.createElement(tagName) as DomElement;
  }
  
  // Mock implementation for server-side
  const attributes: Record<string, string> = {};
  const children: DomNode[] = [];
  
  return {
    nodeType: 1,
    tagName: tagName.toLowerCase(),
    attributes,
    appendChild: function(child: DomNode) {
      children.push(child);
    },
    setAttribute: function(name: string, value: string) {
      this.attributes[name] = value;
    }
  } as DomElement;
}

/**
 * A Delta encoder that encodes a Delta to HTML DOM nodes.
 * Supports nested styles and rich text formatting.
 */
export class DeltaHTMLEncoder {
  convert(input: Delta): DomNode[] {
    return input.ops
      .filter(op => this.isTextInsert(op))
      .map(op => this.convertTextInsertToDomNode(op as TextInsert));
  }

  private isTextInsert(op: any): op is TextInsert {
    return typeof op === 'object' && 'text' in op && typeof op.text === 'string';
  }

  convertTextInsertToDomNode(textInsert: TextInsert): DomNode {
    const text = textInsert.text;
    const attributes = textInsert.attributes;

    if (!attributes) {
      return createTextNode(text);
    }

    // If there is only one attribute, we can use the tag directly
    if (Object.keys(attributes).length === 1) {
      return this.convertSingleAttributeTextInsertToDomNode(text, attributes);
    }

    return this.convertMultipleAttributeTextInsertToDomNode(text, attributes);
  }

  convertSingleAttributeTextInsertToDomNode(
    text: string,
    attributes: Attributes
  ): DomElement {
    const domText = createTextNode(text);

    // href is a special case, it should be an anchor tag
    const href = attributes.href;
    if (href) {
      const anchor = createElement(HTMLTags.anchor);
      anchor.setAttribute('href', href);
      anchor.appendChild(domText);
      return anchor;
    }

    // Background color and text color need special handling
    if (attributes.backgroundColor || attributes.color) {
      return this.convertMultipleAttributeTextInsertToDomNode(text, attributes);
    }

    const keyToTag: Record<string, string> = {
      [AppFlowyRichTextKeys.bold]: HTMLTags.strong,
      [AppFlowyRichTextKeys.italic]: HTMLTags.italic,
      [AppFlowyRichTextKeys.underline]: HTMLTags.underline,
      [AppFlowyRichTextKeys.strikethrough]: HTMLTags.del,
      [AppFlowyRichTextKeys.code]: HTMLTags.code,
    };

    const firstKey = Object.keys(attributes)[0];
    const tag = keyToTag[firstKey] || HTMLTags.paragraph;
    const element = createElement(tag);
    element.appendChild(domText);
    return element;
  }

  convertMultipleAttributeTextInsertToDomNode(
    text: string,
    attributes: Attributes
  ): DomElement {
    // Handle href edge case with nested formatting
    const hrefElement = this.hrefEdgeCaseAttributes(text, attributes);
    if (hrefElement) {
      return hrefElement;
    }

    const span = createElement(HTMLTags.span);
    const cssString = this.convertAttributesToCssStyle(attributes);
    if (cssString.length > 0) {
      span.setAttribute('style', cssString);
    }
    span.appendChild(createTextNode(text));
    return span;
  }

  hrefEdgeCaseAttributes(
    text: string,
    attributes: Attributes
  ): DomElement | null {
    const href = attributes[AppFlowyRichTextKeys.href];
    if (!href) {
      return null;
    }

    const element = createElement(HTMLTags.anchor);
    element.setAttribute('href', href);
    
    let newElement: DomElement | null = null;
    let nestedElement: DomElement | null = null;

    for (const [key, value] of Object.entries(attributes)) {
      if (key === AppFlowyRichTextKeys.href) {
        continue;
      }

      const appendElement = this.convertSingleAttributeTextInsertToDomNode(
        newElement === null ? text : '',
        { [key]: value }
      );

      if (newElement === null) {
        newElement = appendElement;
      } else {
        nestedElement = appendElement;
        nestedElement.appendChild(newElement);
        newElement = nestedElement;
      }
    }

    if (newElement) {
      element.appendChild(newElement);
    }

    return element;
  }

  convertAttributesToCssStyle(attributes: Attributes): string {
    const cssMap: Record<string, string> = {};

    if (attributes.bold) {
      cssMap['font-weight'] = 'bold';
    }

    if (attributes.underline && attributes.strikethrough) {
      cssMap['text-decoration'] = 'underline line-through';
    } else if (attributes.underline) {
      cssMap['text-decoration'] = 'underline';
    } else if (attributes.strikethrough) {
      cssMap['text-decoration'] = 'line-through';
    }

    if (attributes.italic) {
      cssMap['font-style'] = 'italic';
    }

    const backgroundColor = attributes.backgroundColor;
    if (backgroundColor && typeof backgroundColor.toRgbaString === 'function') {
      cssMap['background-color'] = backgroundColor.toRgbaString();
    }

    const color = attributes.color;
    if (color && typeof color.toRgbaString === 'function') {
      cssMap['color'] = color.toRgbaString();
    }

    return Object.entries(cssMap)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }
}

export const deltaHTMLEncoder = new DeltaHTMLEncoder();