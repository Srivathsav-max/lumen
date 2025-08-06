import { Node, TextNode, paragraphNode } from './node';
import { Path } from './path';
import { Attributes } from './attributes';
import { Delta } from './text_delta';
import { NodeIterator } from './node_iterator';

/// [Document] represents an AppFlowy Editor document structure.
///
/// It stores the root of the document.
///
/// **DO NOT** directly mutate the properties of a [Document] object.
export class Document {
  /// The root [Node] of the [Document]
  public readonly root: Node;

  constructor(root: Node) {
    this.root = root;
  }

  /// Constructs a [Document] from a JSON structure.
  ///
  /// _Example of a [Document] in JSON format:_
  /// ```
  /// {
  ///   'document': {
  ///     'type': 'page',
  ///     'children': [
  ///       {
  ///         'type': 'paragraph',
  ///         'data': {
  ///           'delta': [
  ///             { 'insert': 'Welcome ' },
  ///             { 'insert': 'to ' },
  ///             { 'insert': 'AppFlowy!' }
  ///           ]
  ///         }
  ///       }
  ///     ]
  ///   }
  /// }
  /// ```
  static fromJson(json: Record<string, any>): Document {
    if (!json.document || typeof json.document !== 'object') {
      throw new Error('Invalid document JSON structure');
    }

    const document = json.document as Record<string, any>;
    const root = Node.fromJson(document);
    return new Document(root);
  }

  /// Creates a empty document with a single text node.
  /// @deprecated use Document.blank() instead
  static empty(): Document {
    const root = new Node({
      type: 'document',
      children: [TextNode.empty()]
    });
    return new Document(root);
  }

  /// Creates a blank [Document] containing an empty root [Node].
  ///
  /// If [withInitialText] is true, the document will contain an empty
  /// paragraph [Node].
  static blank(options: { withInitialText?: boolean } = {}): Document {
    const { withInitialText = false } = options;
    const root = new Node({
      type: 'page',
      children: withInitialText ? [paragraphNode()] : []
    });
    return new Document(root);
  }

  /// First node of the document.
  get first(): Node | null {
    return this.root.children[0] || null;
  }

  /// Last node of the document.
  get last(): Node | null {
    let current: Node | null = this.root.children[this.root.children.length - 1] || null;
    while (current && current.children.length > 0) {
      current = current.children[current.children.length - 1];
    }
    return current;
  }

  /// Must call this method when the [Document] is no longer needed.
  dispose(): void {
    const nodes = new NodeIterator(this, this.root).toList();
    for (const node of nodes) {
      node.dispose();
    }
  }

  /// Returns the node at the given [path].
  nodeAtPath(path: Path): Node | null {
    return this.root.childAtPath(path);
  }

  /// Inserts a [Node]s at the given [Path].
  insert(path: Path, nodes: Node[]): boolean {
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

    const parent = this.nodeAtPath(path.slice(0, -1));
    if (parent) {
      for (let i = 0; i < nodes.length; i++) {
        parent.insert(nodes[i], path[path.length - 1] + i);
      }
      return true;
    }

    return false;
  }

  /// Deletes the [Node]s at the given [Path].
  delete(path: Path, length: number = 1): boolean {
    if (path.length === 0 || length <= 0) {
      return false;
    }
    
    let target = this.nodeAtPath(path);
    if (!target) {
      return false;
    }
    
    while (target && length > 0) {
      const next = target.next;
      target.unlink();
      target = next;
      length--;
    }
    return true;
  }

  /// Updates the [Node] at the given [Path]
  update(path: Path, attributes: Attributes): boolean {
    // if the path is empty, it means the root node.
    if (path.length === 0) {
      this.root.updateAttributes(attributes);
      return true;
    }
    
    const target = this.nodeAtPath(path);
    if (!target) {
      return false;
    }
    
    target.updateAttributes(attributes);
    return true;
  }

  /// Updates the [Node] with [Delta] at the given [Path]
  updateText(path: Path, delta: Delta): boolean {
    if (path.length === 0) {
      return false;
    }
    
    const target = this.nodeAtPath(path);
    const targetDelta = target?.delta;
    if (!target || !targetDelta) {
      return false;
    }
    
    target.updateAttributes({ delta: targetDelta.compose(delta).toJson() });
    return true;
  }

  /// Returns whether the root [Node] does not contain
  /// any text.
  get isEmpty(): boolean {
    if (this.root.children.length === 0) {
      return true;
    }

    if (this.root.children.length > 1) {
      return false;
    }

    const node = this.root.children[0];
    const delta = node.delta;
    if (delta && (delta.length === 0 || delta.toPlainText().length === 0)) {
      return true;
    }

    return false;
  }

  /// Encodes the [Document] into a JSON structure.
  toJson(): Record<string, any> {
    return {
      document: this.root.toJson(),
    };
  }
}