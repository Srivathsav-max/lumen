import { Attributes, composeAttributes } from '../attributes';
import { Path } from '../path';
import { Delta, TextInsert } from '../text_delta';
import { BuiltInAttributeKey } from '../../legacy/built_in_attribute_keys';

///
/// ⚠️ THIS FILE HAS BEEN DEPRECATED.
/// ⚠️ THIS FILE HAS BEEN DEPRECATED.
/// ⚠️ THIS FILE HAS BEEN DEPRECATED.
///
/// ONLY USE FOR MIGRATION.
///
export class NodeV0 {
  public readonly type: string;
  public readonly children: NodeV0[] = [];
  public parent: NodeV0 | null = null;
  private _attributes: Attributes;

  // Renderable
  public readonly key = Math.random().toString(36);
  public readonly layerLink = {}; // Placeholder for LayerLink

  private _listeners: (() => void)[] = [];

  constructor(options: {
    type: string;
    attributes?: Attributes;
    parent?: NodeV0;
    children?: NodeV0[];
  }) {
    this.type = options.type;
    this._attributes = options.attributes || {};
    this.parent = options.parent || null;
    
    if (options.children) {
      this.children.push(...options.children);
      for (const child of this.children) {
        child.parent = this;
      }
    }
  }

  static fromJson(json: Record<string, any>): NodeV0 {
    if (typeof json.type !== 'string') {
      throw new Error('Invalid node JSON: type must be a string');
    }

    const jType = json.type as string;
    const jChildren = json.children as any[] | undefined;
    const jAttributes = json.attributes ? 
      { ...json.attributes as Attributes } : 
      {};

    const children: NodeV0[] = [];
    if (jChildren) {
      children.push(...jChildren.map(jChild => NodeV0.fromJson(jChild)));
    }

    let node: NodeV0;

    if (jType === 'text') {
      const jDelta = json.delta as any[] | undefined;
      const delta = jDelta ? Delta.fromJson(jDelta) : new Delta();
      node = new TextNodeV0({
        children,
        attributes: jAttributes,
        delta,
      });
    } else {
      node = new NodeV0({
        type: jType,
        children,
        attributes: jAttributes,
      });
    }

    for (const child of children) {
      child.parent = node;
    }

    return node;
  }

  get attributes(): Attributes {
    return { ...this._attributes };
  }

  get id(): string {
    const subtype = this.subtype;
    if (subtype) {
      return `${this.type}/${subtype}`;
    }
    return this.type;
  }

  get subtype(): string | null {
    const subtypeValue = this.attributes[BuiltInAttributeKey.subtype];
    return typeof subtypeValue === 'string' ? subtypeValue : null;
  }

  get path(): Path {
    return this._computePath();
  }

  get next(): NodeV0 | null {
    if (!this.parent) return null;
    const siblings = this.parent.children;
    const index = siblings.indexOf(this);
    return index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  }

  addListener(listener: () => void): void {
    this._listeners.push(listener);
  }

  removeListener(listener: () => void): void {
    const index = this._listeners.indexOf(listener);
    if (index >= 0) {
      this._listeners.splice(index, 1);
    }
  }

  notifyListeners(): void {
    this._listeners.forEach(listener => listener());
  }

  updateAttributes(attributes: Attributes): void {
    const oldAttributes = this.attributes;

    this._attributes = composeAttributes(this.attributes, attributes) || {};

    // Notifies the new attributes
    // if attributes contains 'subtype', should notify parent to rebuild node
    // else, just notify current node.
    const shouldNotifyParent = 
      this.attributes.subtype !== oldAttributes.subtype;
    
    if (shouldNotifyParent) {
      this.parent?.notifyListeners();
    } else {
      this.notifyListeners();
    }
  }

  childAtIndex(index: number): NodeV0 | null {
    if (this.children.length <= index || index < 0) {
      return null;
    }
    return this.children[index];
  }

  childAtPath(path: Path): NodeV0 | null {
    if (path.length === 0) {
      return this;
    }
    return this.childAtIndex(path[0])?.childAtPath(path.slice(1)) || null;
  }

  insert(entry: NodeV0, index?: number): void {
    const length = this.children.length;
    index = index ?? length;

    if (this.children.length === 0) {
      entry.parent = this;
      this.children.push(entry);
      this.notifyListeners();
      return;
    }

    // If index is out of range, insert at the end.
    // If index is negative, insert at the beginning.
    // If index is positive, insert at the index.
    if (index >= length) {
      this.children[length - 1].insertAfter(entry);
    } else if (index <= 0) {
      this.children[0].insertBefore(entry);
    } else {
      this.childAtIndex(index)?.insertBefore(entry);
    }
  }

  insertAfter(entry: NodeV0): void {
    if (!this.parent) return;
    
    entry.parent = this.parent;
    const siblings = this.parent.children;
    const index = siblings.indexOf(this);
    if (index >= 0) {
      siblings.splice(index + 1, 0, entry);
      this.parent.notifyListeners();
    }
  }

  insertBefore(entry: NodeV0): void {
    if (!this.parent) return;
    
    entry.parent = this.parent;
    const siblings = this.parent.children;
    const index = siblings.indexOf(this);
    if (index >= 0) {
      siblings.splice(index, 0, entry);
      this.parent.notifyListeners();
    }
  }

  unlink(): void {
    if (!this.parent) return;
    
    const siblings = this.parent.children;
    const index = siblings.indexOf(this);
    if (index >= 0) {
      siblings.splice(index, 1);
      this.parent.notifyListeners();
      this.parent = null;
    }
  }

  toJson(): Record<string, any> {
    const map: Record<string, any> = {
      type: this.type,
    };
    
    if (this.children.length > 0) {
      map.children = this.children.map(node => node.toJson());
    }
    
    if (Object.keys(this.attributes).length > 0) {
      map.attributes = this.attributes;
    }
    
    return map;
  }

  copyWith(options: {
    type?: string;
    children?: NodeV0[];
    attributes?: Attributes;
  } = {}): NodeV0 {
    const node = new NodeV0({
      type: options.type || this.type,
      attributes: options.attributes || { ...this.attributes },
      children: options.children,
    });
    
    if (!options.children && this.children.length > 0) {
      for (const child of this.children) {
        const copiedChild = child.copyWith();
        copiedChild.parent = node;
        node.children.push(copiedChild);
      }
    }
    
    return node;
  }

  private _computePath(previous: Path = []): Path {
    if (!this.parent) {
      return previous;
    }
    
    let index = 0;
    for (const child of this.parent.children) {
      if (child === this) {
        break;
      }
      index += 1;
    }
    
    return this.parent._computePath([index, ...previous]);
  }
}

export class TextNodeV0 extends NodeV0 {
  private _delta: Delta;

  constructor(options: {
    delta: Delta;
    children?: NodeV0[];
    attributes?: Attributes;
  }) {
    super({
      type: 'text',
      children: options.children || [],
      attributes: options.attributes || {},
    });
    this._delta = options.delta;
  }

  static empty(attributes?: Attributes): TextNodeV0 {
    return new TextNodeV0({
      delta: new Delta([new TextInsert('')]),
      attributes: attributes || {},
    });
  }

  get delta(): Delta {
    return this._delta;
  }

  set delta(v: Delta) {
    this._delta = v;
    this.notifyListeners();
  }

  toJson(): Record<string, any> {
    const map = super.toJson();
    map.delta = this.delta.toJson();
    return map;
  }

  copyWith(options: {
    type?: string;
    children?: NodeV0[];
    attributes?: Attributes;
    delta?: Delta;
  } = {}): TextNodeV0 {
    const textNode = new TextNodeV0({
      children: options.children,
      attributes: options.attributes || this.attributes,
      delta: options.delta || this.delta,
    });
    
    if (!options.children && this.children.length > 0) {
      for (const child of this.children) {
        const copiedChild = child.copyWith();
        copiedChild.parent = textNode;
        textNode.children.push(copiedChild);
      }
    }
    
    return textNode;
  }

  toPlainText(): string {
    return this._delta.toPlainText();
  }
}

export function nodeV0Equals(nodes1: NodeV0[], nodes2: NodeV0[]): boolean {
  if (nodes1.length !== nodes2.length) {
    return false;
  }
  
  for (let i = 0; i < nodes1.length; i++) {
    if (!_nodeEquals(nodes1[i], nodes2[i])) {
      return false;
    }
  }
  
  return true;
}

function _nodeEquals(base: NodeV0, other: NodeV0): boolean {
  if (base === other) return true;

  return base.type === other.type &&
         nodeV0Equals(base.children, other.children);
}