// Delta markdown decoder for converting markdown inline elements to delta format
export interface Attributes {
  [key: string]: any;
}

export interface TextInsert {
  text: string;
  attributes?: Attributes;
}

export interface Delta {
  ops: Array<TextInsert | any>;
  add(insert: TextInsert): void;
}

export interface MdNode {
  textContent: string;
  accept(visitor: NodeVisitor): void;
}

export interface MdElement extends MdNode {
  tag: string;
  attributes: Record<string, string>;
  children?: MdNode[];
}

export interface MdText extends MdNode {
  text: string;
}

export interface NodeVisitor {
  visitElementBefore(element: MdElement): boolean;
  visitElementAfter(element: MdElement): void;
  visitText(text: MdText): void;
}

export interface InlineSyntax {
  // Define interface for inline syntax
}

export class BuiltInAttributeKey {
  static readonly bold = 'bold';
  static readonly italic = 'italic';
  static readonly code = 'code';
  static readonly strikethrough = 'strikethrough';
  static readonly href = 'href';
  static readonly underline = 'underline';
}

// Mock Delta implementation
class MockDelta implements Delta {
  ops: Array<TextInsert | any> = [];

  add(insert: TextInsert): void {
    this.ops.push(insert);
  }
}

export class DeltaMarkdownDecoder implements NodeVisitor {
  private _delta: Delta = new MockDelta();
  private _attributes: Attributes = {};
  private customInlineSyntaxes: InlineSyntax[];

  constructor(options: {
    customInlineSyntaxes?: InlineSyntax[];
  } = {}) {
    this.customInlineSyntaxes = options.customInlineSyntaxes ?? [];
  }

  convert(input: string): Delta {
    // This would need actual markdown parsing implementation
    // For now, returning the delta as-is
    return this._delta;
  }

  convertNodes(nodes?: MdNode[]): Delta {
    if (!nodes) {
      return new MockDelta();
    }

    for (const node of nodes) {
      node.accept(this);
    }
    return this._delta;
  }

  visitElementBefore(element: MdElement): boolean {
    this._addAttributeKey(element);
    return true;
  }

  visitElementAfter(element: MdElement): void {
    this._removeAttributeKey(element);
  }

  visitText(text: MdText): void {
    this._delta.add({
      text: text.text,
      attributes: { ...this._attributes }
    });
  }

  private _addAttributeKey(element: MdElement): void {
    if (element.tag === 'strong') {
      this._attributes[BuiltInAttributeKey.bold] = true;
    } else if (element.tag === 'em') {
      this._attributes[BuiltInAttributeKey.italic] = true;
    } else if (element.tag === 'code') {
      this._attributes[BuiltInAttributeKey.code] = true;
    } else if (element.tag === 'del') {
      this._attributes[BuiltInAttributeKey.strikethrough] = true;
    } else if (element.tag === 'a') {
      this._attributes[BuiltInAttributeKey.href] = element.attributes['href'];
    } else if (element.tag === 'u') {
      this._attributes[BuiltInAttributeKey.underline] = true;
    } else {
      Object.entries(element.attributes).forEach(([key, value]) => {
        try {
          this._attributes[key] = JSON.parse(value);
        } catch {
          // Ignore parsing errors
        }
      });
    }
  }

  private _removeAttributeKey(element: MdElement): void {
    if (element.tag === 'strong') {
      delete this._attributes[BuiltInAttributeKey.bold];
    } else if (element.tag === 'em') {
      delete this._attributes[BuiltInAttributeKey.italic];
    } else if (element.tag === 'code') {
      delete this._attributes[BuiltInAttributeKey.code];
    } else if (element.tag === 'del') {
      delete this._attributes[BuiltInAttributeKey.strikethrough];
    } else if (element.tag === 'a') {
      delete this._attributes[BuiltInAttributeKey.href];
    } else if (element.tag === 'u') {
      delete this._attributes[BuiltInAttributeKey.underline];
    } else {
      Object.keys(element.attributes).forEach(key => {
        delete this._attributes[key];
      });
    }
  }
}