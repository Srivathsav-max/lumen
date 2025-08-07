// Delta to Markdown encoder for converting rich text deltas to markdown syntax
export interface Attributes {
  [key: string]: any;
}

export interface TextInsert {
  text: string;
  attributes?: Attributes;
}

export interface Delta {
  ops: Array<TextInsert | any>;
  iterator(): DeltaIterator;
}

export interface DeltaIterator {
  moveNext(): boolean;
  current: TextInsert | any;
}

export class BuiltInAttributeKey {
  static readonly bold = 'bold';
  static readonly italic = 'italic';
  static readonly underline = 'underline';
  static readonly strikethrough = 'strikethrough';
  static readonly code = 'code';
  static readonly href = 'href';
}

/**
 * A Delta encoder that encodes a Delta to Markdown.
 * Only supports inline styles like bold, italic, underline, strike, code.
 */
export class DeltaMarkdownEncoder {
  convert(input: Delta): string {
    const buffer: string[] = [];
    const iterator = input.iterator();
    
    while (iterator.moveNext()) {
      const op = iterator.current;
      if (this.isTextInsert(op)) {
        const attributes = op.attributes;
        if (attributes) {
          buffer.push(this._prefixSyntax(attributes));
          buffer.push(op.text);
          buffer.push(this._suffixSyntax(attributes));
        } else {
          buffer.push(op.text);
        }
      }
    }
    
    return buffer.join('');
  }

  private isTextInsert(op: any): op is TextInsert {
    return typeof op === 'object' && 'text' in op && typeof op.text === 'string';
  }

  private _prefixSyntax(attributes: Attributes): string {
    let syntax = '';

    if (attributes[BuiltInAttributeKey.bold] === true &&
        attributes[BuiltInAttributeKey.italic] === true) {
      syntax += '***';
    } else if (attributes[BuiltInAttributeKey.bold] === true) {
      syntax += '**';
    } else if (attributes[BuiltInAttributeKey.italic] === true) {
      syntax += '_';
    }

    if (attributes[BuiltInAttributeKey.strikethrough] === true) {
      syntax += '~~';
    }
    
    if (attributes[BuiltInAttributeKey.underline] === true) {
      syntax += '<u>';
    }
    
    if (attributes[BuiltInAttributeKey.code] === true) {
      syntax += '`';
    }

    if (attributes[BuiltInAttributeKey.href] != null) {
      syntax += '[';
    }

    return syntax;
  }

  private _suffixSyntax(attributes: Attributes): string {
    let syntax = '';

    if (attributes[BuiltInAttributeKey.href] != null) {
      syntax += `](${attributes[BuiltInAttributeKey.href]})`;
    }

    if (attributes[BuiltInAttributeKey.code] === true) {
      syntax += '`';
    }

    if (attributes[BuiltInAttributeKey.underline] === true) {
      syntax += '</u>';
    }

    if (attributes[BuiltInAttributeKey.strikethrough] === true) {
      syntax += '~~';
    }

    if (attributes[BuiltInAttributeKey.bold] === true &&
        attributes[BuiltInAttributeKey.italic] === true) {
      syntax += '***';
    } else if (attributes[BuiltInAttributeKey.bold] === true) {
      syntax += '**';
    } else if (attributes[BuiltInAttributeKey.italic] === true) {
      syntax += '_';
    }

    return syntax;
  }
}