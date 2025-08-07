import { Path, pathEquals, pathIsAncestorOf } from '../document/path';
import { Node, nodeEquals } from '../document/node';
import { Attributes } from '../document/attributes';
import { Delta } from '../document/text_delta';

/// [Operation] represents a change to a [Document].
export abstract class Operation {
  public readonly path: Path;

  constructor(path: Path) {
    this.path = path;
  }

  static fromJson(json: Record<string, any>): Operation {
    throw new Error('Not implemented');
  }

  /// Inverts the operation.
  ///
  /// Returns the inverted operation.
  abstract invert(): Operation;

  /// Returns the JSON representation of the operation.
  abstract toJson(): Record<string, any>;

  abstract copyWith(options: { path?: Path }): Operation;
}

/// [InsertOperation] represents an insert operation.
export class InsertOperation extends Operation {
  public readonly nodes: Node[];

  constructor(path: Path, nodes: Node[]) {
    super(path);
    this.nodes = nodes;
  }

  static fromJson(json: Record<string, any>): InsertOperation {
    const path = json.path as Path;
    const nodes = (json.nodes as any[])
      .map(n => Node.fromJson(n));
    return new InsertOperation(path, nodes);
  }

  invert(): Operation {
    return new DeleteOperation(this.path, this.nodes);
  }

  toJson(): Record<string, any> {
    return {
      op: 'insert',
      path: this.path,
      nodes: this.nodes.map(n => n.toJson()),
    };
  }

  copyWith(options: { path?: Path } = {}): Operation {
    return new InsertOperation(options.path || this.path, this.nodes);
  }

  equals(other: Operation): boolean {
    return other instanceof InsertOperation &&
           pathEquals(other.path, this.path) &&
           nodeEquals(other.nodes, this.nodes);
  }

  hashCode(): number {
    let hash = 0;
    for (const pathElement of this.path) {
      hash = (hash * 31 + pathElement) & 0xffffffff;
    }
    for (const node of this.nodes) {
      hash = (hash * 31 + node.hashCode()) & 0xffffffff;
    }
    return hash;
  }
}

/// [DeleteOperation] represents a delete operation.
export class DeleteOperation extends Operation {
  public readonly nodes: Node[];

  constructor(path: Path, nodes: Node[]) {
    super(path);
    this.nodes = nodes;
  }

  static fromJson(json: Record<string, any>): DeleteOperation {
    const path = json.path as Path;
    const nodes = (json.nodes as any[])
      .map(n => Node.fromJson(n));
    return new DeleteOperation(path, nodes);
  }

  invert(): Operation {
    return new InsertOperation(this.path, this.nodes);
  }

  toJson(): Record<string, any> {
    return {
      op: 'delete',
      path: this.path,
      nodes: this.nodes.map(n => n.toJson()),
    };
  }

  copyWith(options: { path?: Path } = {}): Operation {
    return new DeleteOperation(options.path || this.path, this.nodes);
  }

  equals(other: Operation): boolean {
    return other instanceof DeleteOperation &&
           pathEquals(other.path, this.path) &&
           nodeEquals(other.nodes, this.nodes);
  }

  hashCode(): number {
    let hash = 0;
    for (const pathElement of this.path) {
      hash = (hash * 31 + pathElement) & 0xffffffff;
    }
    for (const node of this.nodes) {
      hash = (hash * 31 + node.hashCode()) & 0xffffffff;
    }
    return hash;
  }
}

/// [UpdateOperation] represents an attributes update operation.
export class UpdateOperation extends Operation {
  public readonly attributes: Attributes;
  public readonly oldAttributes: Attributes;

  constructor(path: Path, attributes: Attributes, oldAttributes: Attributes) {
    super(path);
    this.attributes = attributes;
    this.oldAttributes = oldAttributes;
  }

  static fromJson(json: Record<string, any>): UpdateOperation {
    const path = json.path as Path;
    const oldAttributes = json.oldAttributes as Attributes;
    const attributes = json.attributes as Attributes;
    return new UpdateOperation(path, attributes, oldAttributes);
  }

  invert(): Operation {
    return new UpdateOperation(this.path, this.oldAttributes, this.attributes);
  }

  toJson(): Record<string, any> {
    return {
      op: 'update',
      path: this.path,
      attributes: { ...this.attributes },
      oldAttributes: { ...this.oldAttributes },
    };
  }

  copyWith(options: { path?: Path } = {}): Operation {
    return new UpdateOperation(
      options.path || this.path,
      { ...this.attributes },
      { ...this.oldAttributes }
    );
  }

  equals(other: Operation): boolean {
    return other instanceof UpdateOperation &&
           pathEquals(other.path, this.path) &&
           this.mapEquals(other.attributes, this.attributes) &&
           this.mapEquals(other.oldAttributes, this.oldAttributes);
  }

  private mapEquals(a: Attributes, b: Attributes): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => a[key] === b[key]);
  }

  hashCode(): number {
    let hash = 0;
    for (const pathElement of this.path) {
      hash = (hash * 31 + pathElement) & 0xffffffff;
    }
    hash = (hash * 31 + this.attributesHashCode(this.attributes)) & 0xffffffff;
    hash = (hash * 31 + this.attributesHashCode(this.oldAttributes)) & 0xffffffff;
    return hash;
  }

  private attributesHashCode(attributes: Attributes): number {
    let hash = 0;
    for (const [key, value] of Object.entries(attributes)) {
      hash = (hash * 31 + this.stringHashCode(key)) & 0xffffffff;
      hash = (hash * 31 + this.valueHashCode(value)) & 0xffffffff;
    }
    return hash;
  }

  private stringHashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  private valueHashCode(value: any): number {
    if (value == null) return 0;
    if (typeof value === 'string') return this.stringHashCode(value);
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return this.stringHashCode(JSON.stringify(value));
  }
}

/// [UpdateTextOperation] represents a text update operation.
export class UpdateTextOperation extends Operation {
  public readonly delta: Delta;
  public readonly inverted: Delta;

  constructor(path: Path, delta: Delta, inverted: Delta) {
    super(path);
    this.delta = delta;
    this.inverted = inverted;
  }

  static fromJson(json: Record<string, any>): UpdateTextOperation {
    const path = json.path as Path;
    const delta = Delta.fromJson(json.delta);
    const inverted = Delta.fromJson(json.inverted);
    return new UpdateTextOperation(path, delta, inverted);
  }

  invert(): Operation {
    return new UpdateTextOperation(this.path, this.inverted, this.delta);
  }

  toJson(): Record<string, any> {
    return {
      op: 'update_text',
      path: this.path,
      delta: this.delta.toJson(),
      inverted: this.inverted.toJson(),
    };
  }

  copyWith(options: { path?: Path } = {}): Operation {
    return new UpdateTextOperation(options.path || this.path, this.delta, this.inverted);
  }

  equals(other: Operation): boolean {
    return other instanceof UpdateTextOperation &&
           pathEquals(other.path, this.path) &&
           other.delta.equals(this.delta) &&
           other.inverted.equals(this.inverted);
  }

  hashCode(): number {
    let hash = 0;
    for (const pathElement of this.path) {
      hash = (hash * 31 + pathElement) & 0xffffffff;
    }
    hash = (hash * 31 + this.delta.hashCode()) & 0xffffffff;
    hash = (hash * 31 + this.inverted.hashCode()) & 0xffffffff;
    return hash;
  }
}

export function transformPath(preInsertPath: Path, b: Path, delta: number = 1): Path {
  if (preInsertPath.length > b.length || preInsertPath.length === 0 || b.length === 0) {
    return b;
  }

  // check the prefix
  for (let i = 0; i < preInsertPath.length - 1; i++) {
    if (preInsertPath[i] !== b[i]) {
      return b;
    }
  }

  const prefix = preInsertPath.slice(0, preInsertPath.length - 1);
  const suffix = b.slice(preInsertPath.length);
  const preInsertLast = preInsertPath[preInsertPath.length - 1];
  const bAtIndex = b[preInsertPath.length - 1];

  const newPath = [...prefix];
  newPath.push(preInsertLast <= bAtIndex ? bAtIndex + delta : bAtIndex);
  newPath.push(...suffix);

  return newPath;
}

export function transformOperation(a: Operation, b: Operation): Operation | null {
  if (a instanceof InsertOperation) {
    const newPath = transformPath(a.path, b.path, a.nodes.length);
    return b.copyWith({ path: newPath });
  } else if (a instanceof DeleteOperation) {
    if (b instanceof DeleteOperation) {
      if (pathIsAncestorOf(a.path, b.path)) {
        return null; // a is parent of b, we can just delete a and ignore b.
      } else if (pathIsAncestorOf(b.path, a.path)) {
        return a.copyWith({ path: b.path });
      }
    }
    const newPath = transformPath(a.path, b.path, -1 * a.nodes.length);
    return b.copyWith({ path: newPath });
  }

  return b;
}