import { Document } from './document';
import { Node } from './node';

/// [NodeIterator] is used to traverse the nodes in visual order.
export class NodeIterator implements Iterator<Node> {
  /// The document to iterate.
  public readonly document: Document;

  /// The node to start the iteration with.
  public readonly startNode: Node;

  /// The node to end the iteration with.
  public readonly endNode?: Node;

  private _currentNode: Node | null = null;
  private _began = false;

  /// Creates a NodeIterator.
  constructor(document: Document, startNode: Node, endNode?: Node) {
    this.document = document;
    this.startNode = startNode;
    this.endNode = endNode;
  }

  get current(): Node {
    if (!this._currentNode) {
      throw new Error('Iterator not started or already finished');
    }
    return this._currentNode;
  }

  next(): IteratorResult<Node> {
    if (!this._began) {
      this._currentNode = this.startNode;
      this._began = true;
      return { value: this._currentNode, done: false };
    }

    if (!this._currentNode) {
      return { value: undefined as any, done: true };
    }

    let node = this._currentNode;

    if (this.endNode && this.endNode === node) {
      this._currentNode = null;
      return { value: undefined as any, done: true };
    }

    if (node.children.length > 0) {
      this._currentNode = node.children[0];
    } else if (node.next) {
      this._currentNode = node.next;
    } else if (!node.parent) {
      this._currentNode = null;
      return { value: undefined as any, done: true };
    } else {
      while (node.parent) {
        node = node.parent;
        const nextOfParent = node.next;
        if (!nextOfParent) {
          this._currentNode = null;
        } else {
          this._currentNode = nextOfParent;
          break;
        }
      }
    }

    if (!this._currentNode) {
      return { value: undefined as any, done: true };
    }

    return { value: this._currentNode, done: false };
  }

  /// Transforms the [NodeIterator] into an
  /// [Iterable] containing all of the relevant [Node]'s
  toList(): Node[] {
    const result: Node[] = [];
    let iterResult = this.next();
    while (!iterResult.done) {
      result.push(iterResult.value);
      iterResult = this.next();
    }
    return result;
  }

  [Symbol.iterator](): Iterator<Node> {
    return this;
  }
}