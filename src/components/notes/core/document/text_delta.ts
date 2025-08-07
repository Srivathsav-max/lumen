import { Attributes, composeAttributes, invertAttributes, diffAttributes } from './attributes';

const MAX_INT = 9007199254740991;

export interface AppFlowyEditorSliceAttributes {
  (delta: Delta, index: number): Attributes | null;
}

/// Default slice attributes function.
///
/// For the BIUS attributes, the slice attributes function will slice the attributes from the previous position,
///   if the index is 0, it will slice the attributes from the next position.
/// For the link and code attributes, the slice attributes function will only work if the index is in the range of the link or code.
export const defaultAppFlowyEditorSliceAttributes: AppFlowyEditorSliceAttributes = (
  delta: Delta,
  index: number
): Attributes | null => {
  if (index < 0) {
    return null;
  }

  // if the index == 0, slice the attributes from the next position.
  if (index === 0 && delta.length > 0) {
    const slice = delta.slice(index, index + 1);
    const attributes = slice.operations[0]?.attributes;
    if (!attributes) {
      return null;
    }

    // if the attributes is not supported, return null.
    const supportSliced = ['bold', 'italic', 'underline', 'strikethrough'];
    if (Object.keys(attributes).some(key => !supportSliced.includes(key))) {
      return null;
    }

    return attributes;
  }

  // if the index is not 0, slice the attributes from the previous position.
  const prevSlice = delta.slice(index - 1, index);
  const prevAttributes = prevSlice.operations[0]?.attributes;
  if (!prevAttributes) {
    return null;
  }

  // if the prevAttributes doesn't include the code/href, return it.
  // Otherwise, check if the nextAttributes includes the code/href.
  const partialSliced = ['code', 'href'];
  if (!Object.keys(prevAttributes).some(key => partialSliced.includes(key))) {
    return prevAttributes;
  }

  // check if the nextAttributes includes the code.
  const nextSlice = delta.slice(index, index + 1);
  const nextAttributes = nextSlice.operations[0]?.attributes;
  if (!nextAttributes) {
    const filtered = { ...prevAttributes };
    partialSliced.forEach(key => delete filtered[key]);
    return filtered;
  }

  // if the nextAttributes doesn't include the code/href, exclude the code/href format.
  if (!Object.keys(nextAttributes).some(key => partialSliced.includes(key))) {
    const filtered = { ...prevAttributes };
    partialSliced.forEach(key => delete filtered[key]);
    return filtered;
  }

  return prevAttributes;
};

export let appflowyEditorSliceAttributes: AppFlowyEditorSliceAttributes | null = 
  defaultAppFlowyEditorSliceAttributes;

export abstract class TextOperation {
  abstract get attributes(): Attributes | null;
  abstract get data(): any;
  abstract get length(): number;
  
  get isEmpty(): boolean {
    return this.length === 0;
  }
  
  abstract equals(other: TextOperation): boolean;
  abstract toJson(): Record<string, any>;
}

export class TextInsert extends TextOperation {
  public text: string;
  private _attributes?: Attributes;

  constructor(text: string, attributes?: Attributes) {
    super();
    this.text = text;
    this._attributes = attributes;
  }

  get length(): number {
    return this.text.length;
  }

  get data(): string {
    return this.text;
  }

  get attributes(): Attributes | null {
    return this._attributes ? { ...this._attributes } : null;
  }

  toJson(): Record<string, any> {
    const result: Record<string, any> = {
      insert: this.text,
    };
    
    if (this._attributes && Object.keys(this._attributes).length > 0) {
      result.attributes = this.attributes;
    }
    
    return result;
  }

  equals(other: TextOperation): boolean {
    return other instanceof TextInsert &&
           other.text === this.text &&
           this.mapEquals(this._attributes, other._attributes);
  }

  private mapEquals(a?: Attributes, b?: Attributes): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => a[key] === b[key]);
  }
}

export class TextRetain extends TextOperation {
  public length: number;
  private _attributes?: Attributes;

  constructor(length: number, attributes?: Attributes) {
    super();
    this.length = length;
    this._attributes = attributes;
  }

  get data(): null {
    return null;
  }

  get attributes(): Attributes | null {
    return this._attributes ? { ...this._attributes } : null;
  }

  toJson(): Record<string, any> {
    const result: Record<string, any> = {
      retain: this.length,
    };
    
    if (this._attributes && Object.keys(this._attributes).length > 0) {
      result.attributes = this.attributes;
    }
    
    return result;
  }

  equals(other: TextOperation): boolean {
    return other instanceof TextRetain &&
           other.length === this.length &&
           this.mapEquals(this._attributes, other._attributes);
  }

  private mapEquals(a?: Attributes, b?: Attributes): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => a[key] === b[key]);
  }
}

export class TextDelete extends TextOperation {
  public length: number;

  constructor(length: number) {
    super();
    this.length = length;
  }

  get data(): null {
    return null;
  }

  get attributes(): null {
    return null;
  }

  toJson(): Record<string, any> {
    return {
      delete: this.length,
    };
  }

  equals(other: TextOperation): boolean {
    return other instanceof TextDelete && other.length === this.length;
  }
}

/// Deltas are a simple, yet expressive format that can be used to describe contents and changes.
/// The format is JSON based, and is human readable, yet easily parsible by machines.
/// Deltas can describe any rich text document, includes all text and formatting information, without the ambiguity and complexity of HTML.
export class Delta {
  public readonly operations: TextOperation[];
  private _plainText?: string;

  constructor(operations: TextOperation[] = []) {
    this.operations = operations;
  }

  static fromJson(list: any[]): Delta {
    const operations: TextOperation[] = [];

    for (const value of list) {
      if (typeof value === 'object' && value !== null) {
        const op = this.textOperationFromJson(value);
        if (op) {
          operations.push(op);
        }
      }
    }

    return new Delta(operations);
  }

  private static textOperationFromJson(json: Record<string, any>): TextOperation | null {
    if (typeof json.insert === 'string') {
      const attributes = json.attributes as Attributes | undefined;
      return new TextInsert(json.insert, attributes ? { ...attributes } : undefined);
    } else if (typeof json.retain === 'number') {
      const attributes = json.attributes as Attributes | undefined;
      return new TextRetain(json.retain, attributes ? { ...attributes } : undefined);
    } else if (typeof json.delete === 'number') {
      return new TextDelete(json.delete);
    }

    return null;
  }

  addAll(textOperations: TextOperation[]): void {
    textOperations.forEach(op => this.add(op));
  }

  add(textOperation: TextOperation): void {
    if (textOperation.isEmpty) {
      return;
    }
    
    this._plainText = undefined;

    if (this.operations.length > 0) {
      const lastOp = this.operations[this.operations.length - 1];
      
      if (lastOp instanceof TextDelete && textOperation instanceof TextDelete) {
        lastOp.length += textOperation.length;
        return;
      }
      
      if (this.mapEquals(lastOp.attributes, textOperation.attributes)) {
        if (lastOp instanceof TextInsert && textOperation instanceof TextInsert) {
          lastOp.text += textOperation.text;
          return;
        }
        
        // if there is a delete before the insert, swap the order
        if (lastOp instanceof TextDelete && textOperation instanceof TextInsert) {
          this.operations.pop();
          this.operations.push(textOperation);
          this.operations.push(lastOp);
          return;
        }
        
        if (lastOp instanceof TextRetain && textOperation instanceof TextRetain) {
          lastOp.length += textOperation.length;
          return;
        }
      }
    }

    this.operations.push(textOperation);
  }

  private mapEquals(a: Attributes | null, b: Attributes | null): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => a[key] === b[key]);
  }

  /// The slice() method does not change the original string.
  /// The start and end parameters specifies the part of the string to extract.
  /// The end position is optional.
  slice(start: number, end?: number): Delta {
    const result = new Delta();
    const iterator = new OpIterator(this.operations);
    let index = 0;

    while ((end === undefined || index < end) && iterator.hasNext) {
      let nextOp: TextOperation;
      if (index < start) {
        nextOp = iterator.next(start - index);
      } else {
        nextOp = iterator.next(end === undefined ? undefined : end - index);
        result.add(nextOp);
      }

      index += nextOp.length;
    }

    return result;
  }

  /// Insert operations have an `insert` key defined.
  /// A String value represents inserting text.
  insert(text: string, attributes?: Attributes): void {
    this.add(new TextInsert(text, attributes));
  }

  /// Retain operations have a Number `retain` key defined representing the number of characters to keep.
  /// An optional `attributes` key can be defined with an Object to describe formatting changes to the character range.
  /// A value of `null` in the `attributes` Object represents removal of that key.
  retain(length: number, attributes?: Attributes): void {
    this.add(new TextRetain(length, attributes));
  }

  /// Delete operations have a Number `delete` key defined representing the number of characters to delete.
  delete(length: number): void {
    this.add(new TextDelete(length));
  }

  /// The length of the string of the [Delta].
  get length(): number {
    return this.operations.reduce((sum, op) => sum + op.length, 0);
  }

  /// Returns a Delta that is equivalent to applying the operations of own Delta, followed by another Delta.
  compose(other: Delta): Delta {
    const thisIter = new OpIterator(this.operations);
    const otherIter = new OpIterator(other.operations);
    const operations: TextOperation[] = [];

    const firstOther = otherIter.peek();
    if (firstOther &&
        firstOther instanceof TextRetain &&
        !firstOther.attributes) {
      let firstLeft = firstOther.length;
      while (thisIter.peek() instanceof TextInsert && thisIter.peekLength() <= firstLeft) {
        firstLeft -= thisIter.peekLength();
        const next = thisIter.next();
        operations.push(next);
      }
      if (firstOther.length - firstLeft > 0) {
        otherIter.next(firstOther.length - firstLeft);
      }
    }

    const delta = new Delta(operations);
    while (thisIter.hasNext || otherIter.hasNext) {
      if (otherIter.peek() instanceof TextInsert) {
        const next = otherIter.next();
        delta.add(next);
      } else if (thisIter.peek() instanceof TextDelete) {
        const next = thisIter.next();
        delta.add(next);
      } else {
        const length = Math.min(thisIter.peekLength(), otherIter.peekLength());
        const thisOp = thisIter.next(length);
        const otherOp = otherIter.next(length);
        const attributes = composeAttributes(
          thisOp.attributes || undefined,
          otherOp.attributes || undefined,
          { keepNull: thisOp instanceof TextRetain }
        );

        if (otherOp instanceof TextRetain && otherOp.length > 0) {
          let newOp: TextOperation | null = null;
          if (thisOp instanceof TextRetain) {
            newOp = new TextRetain(length, attributes || undefined);
          } else if (thisOp instanceof TextInsert) {
            newOp = new TextInsert(thisOp.text, attributes || undefined);
          }

          if (newOp) {
            delta.add(newOp);
          }

          // Optimization if rest of other is just retain
          if (!otherIter.hasNext &&
              delta.operations.length > 0 &&
              delta.operations[delta.operations.length - 1] === newOp) {
            const rest = new Delta(thisIter.rest());
            const combined = delta.concat(rest);
            combined.chop();
            return combined;
          }
        } else if (otherOp instanceof TextDelete && thisOp instanceof TextRetain) {
          delta.add(otherOp);
        }
      }
    }

    delta.chop();
    return delta;
  }

  concat(other: Delta): Delta {
    const operations = [...this.operations];
    if (other.operations.length > 0) {
      operations.push(other.operations[0]);
      operations.push(...other.operations.slice(1));
    }
    return new Delta(operations);
  }

  chop(): void {
    if (this.operations.length === 0) {
      return;
    }
    
    this._plainText = undefined;
    const lastOp = this.operations[this.operations.length - 1];
    if (lastOp instanceof TextRetain && 
        (!lastOp.attributes || Object.keys(lastOp.attributes).length === 0)) {
      this.operations.pop();
    }
  }

  equals(other: Delta): boolean {
    if (this.operations.length !== other.operations.length) {
      return false;
    }
    
    return this.operations.every((op, index) => op.equals(other.operations[index]));
  }

  /// Returned an inverted delta that has the opposite effect of against a base document delta.
  invert(base: Delta): Delta {
    const inverted = new Delta();
    this.operations.reduce((previousValue: number, op) => {
      if (op instanceof TextInsert) {
        inverted.delete(op.length);
      } else if (op instanceof TextRetain && !op.attributes) {
        inverted.retain(op.length);
        return previousValue + op.length;
      } else if (op instanceof TextDelete || op instanceof TextRetain) {
        const length = op.length;
        const slice = base.slice(previousValue, previousValue + length);
        for (const baseOp of slice.operations) {
          if (op instanceof TextDelete) {
            inverted.add(baseOp);
          } else if (op instanceof TextRetain && op.attributes) {
            inverted.retain(
              baseOp.length,
              invertAttributes(baseOp.attributes || undefined, op.attributes || undefined) || undefined
            );
          }
        }
        return previousValue + length;
      }
      return previousValue;
    }, 0);
    
    inverted.chop();
    return inverted;
  }

  toJson(): any[] {
    return this.operations.map(op => op.toJson());
  }

  hashCode(): number {
    let hash = 0;
    const str = JSON.stringify(this.toJson());
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  toPlainText(): string {
    if (this._plainText === undefined) {
      this._plainText = this.operations
        .filter(op => op instanceof TextInsert)
        .map(op => (op as TextInsert).text)
        .join('');
    }
    return this._plainText;
  }

  sliceAttributes(index: number): Attributes | null {
    return appflowyEditorSliceAttributes?.(this, index) || null;
  }
}

class OpIterator {
  private readonly _operations: TextOperation[];
  private _index = 0;
  private _offset = 0;

  constructor(operations: TextOperation[]) {
    this._operations = [...operations];
  }

  get hasNext(): boolean {
    return this.peekLength() < MAX_INT;
  }

  peek(): TextOperation | null {
    if (this._index >= this._operations.length) {
      return null;
    }
    return this._operations[this._index];
  }

  peekLength(): number {
    if (this._index < this._operations.length) {
      const op = this._operations[this._index];
      return op.length - this._offset;
    }
    return MAX_INT;
  }

  next(length?: number): TextOperation {
    length = length ?? MAX_INT;

    if (this._index >= this._operations.length) {
      return new TextRetain(MAX_INT);
    }

    const nextOp = this._operations[this._index];
    const offset = this._offset;
    const opLength = nextOp.length;
    
    if (length >= opLength - offset) {
      length = opLength - offset;
      this._index += 1;
      this._offset = 0;
    } else {
      this._offset += length;
    }

    if (nextOp instanceof TextDelete) {
      return new TextDelete(length);
    } else if (nextOp instanceof TextRetain) {
      return new TextRetain(length, nextOp.attributes || undefined);
    } else if (nextOp instanceof TextInsert) {
      return new TextInsert(
        nextOp.text.substring(offset, offset + length),
        nextOp.attributes || undefined
      );
    }

    throw new Error('Unknown operation type');
  }

  rest(): TextOperation[] {
    if (!this.hasNext) {
      return [];
    } else if (this._offset === 0) {
      return this._operations.slice(this._index);
    } else {
      const offset = this._offset;
      const index = this._index;
      const next = this.next();
      const rest = this._operations.slice(this._index);
      this._offset = offset;
      this._index = index;
      return [next, ...rest];
    }
  }
}