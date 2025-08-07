import { Attributes } from '../attributes';
import { NodeV0, TextNodeV0 } from './node';
import { Path, pathParent } from '../path';
import { Delta } from '../text_delta';

///
/// ⚠️ THIS FILE HAS BEEN DEPRECATED.
/// ⚠️ THIS FILE HAS BEEN DEPRECATED.
/// ⚠️ THIS FILE HAS BEEN DEPRECATED.
///
/// ONLY USE FOR MIGRATION.
///
export class DocumentV0 {
  public readonly root: NodeV0;

  constructor(root: NodeV0) {
    this.root = root;
  }

  static fromJson(json: Record<string, any>): DocumentV0 {
    if (!json.document || typeof json.document !== 'object') {
      throw new Error('Invalid document JSON structure');
    }

    const document = json.document as Record<string, any>;
    const root = NodeV0.fromJson(document);
    return new DocumentV0(root);
  }

  /// Creates a empty document with a single text node.
  static empty(): DocumentV0 {
    const root = new NodeV0({
      type: 'editor',
      children: [TextNodeV0.empty()]
    });
    return new DocumentV0(root);
  }

  /// Returns the node at the given [path].
  nodeAtPath(path: Path): NodeV0 | null {
    return this.root.childAtPath(path);
  }

  /// Inserts a [NodeV0]s at the given [Path].
  insert(path: Path, nodes: NodeV0[]): boolean {
    if (path.length === 0 || nodes.length === 0) {
      return false;
    }

    const target = this.nodeAtPath(path);
    if (target) {
      for (const node of nodes) {
        target.insertBefore(node);
      }
      return true;
    }

    const parent = this.nodeAtPath(pathParent(path));
    if (parent) {
      for (let i = 0; i < nodes.length; i++) {
        parent.insert(nodes[i], path[path.length - 1] + i);
      }
      return true;
    }

    return false;
  }

  /// Deletes the [NodeV0]s at the given [Path].
  delete(path: Path, length: number = 1): boolean {
    if (path.length === 0 || length <= 0) {
      return false;
    }
    
    let target = this.nodeAtPath(path);
    if (!target) {
      return false;
    }
    
    while (target && length > 0) {
      const next: any = target.next;
      target.unlink();
      target = next;
      length--;
    }
    return true;
  }

  /// Updates the [NodeV0] at the given [Path]
  update(path: Path, attributes: Attributes): boolean {
    if (path.length === 0) {
      return false;
    }
    
    const target = this.nodeAtPath(path);
    if (!target) {
      return false;
    }
    
    target.updateAttributes(attributes);
    return true;
  }

  /// Updates the [TextNodeV0] at the given [Path]
  updateText(path: Path, delta: Delta): boolean {
    if (path.length === 0) {
      return false;
    }
    
    const target = this.nodeAtPath(path);
    if (!target || !(target instanceof TextNodeV0)) {
      return false;
    }
    
    target.delta = target.delta.compose(delta);
    return true;
  }

  get isEmpty(): boolean {
    if (this.root.children.length === 0) {
      return true;
    }

    if (this.root.children.length > 1) {
      return false;
    }

    const node = this.root.children[0];
    if (node instanceof TextNodeV0 &&
        (node.delta.length === 0 || node.delta.toPlainText().length === 0)) {
      return true;
    }

    return false;
  }

  toJson(): Record<string, any> {
    return {
      document: this.root.toJson(),
    };
  }
}