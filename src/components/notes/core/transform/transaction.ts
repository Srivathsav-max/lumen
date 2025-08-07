import { Document } from '../document/document';
import { Node, paragraphNode } from '../document/node';
import { Path, pathEquals, pathNextN, pathPreviousN, pathParent } from '../document/path';
import { Attributes, invertAttributes } from '../document/attributes';
import { Delta } from '../document/text_delta';
import { Selection } from '../location/selection';
import { Position } from '../location/position';
import { Operation, InsertOperation, DeleteOperation, UpdateOperation, UpdateTextOperation, transformOperation } from './operation';

// Placeholder types - these would need to be properly defined
export enum SelectionType {
  block = 'block',
  inline = 'inline'
}

export enum TransactionTime {
  before = 'before',
  after = 'after'
}

export enum SelectionUpdateReason {
  uiEvent = 'uiEvent',
  transaction = 'transaction'
}

// Placeholder constant - this would need to be properly defined
export const blockComponentDelta = 'delta';

/// A [Transaction] has a list of [Operation] objects that will be applied
/// to the editor.
///
/// There will be several ways to consume the transaction:
/// 1. Apply to the state to update the UI.
/// 2. Send to the backend to store and do operation transforming.
export class Transaction {
  public readonly document: Document;

  /// The operations to be applied.
  private _operations: Operation[] = [];

  /// The selection to be applied.
  public afterSelection?: Selection;

  /// The before selection is to be recovered if needed.
  public beforeSelection?: Selection;

  /// The custom selection type is to be applied.
  public customSelectionType?: SelectionType;

  /// The custom selection reason is to be applied.
  public reason?: SelectionUpdateReason;

  public selectionExtraInfo?: Record<string, any>;

  // mark needs to be composed
  public markNeedsComposing = false;

  constructor(document: Document) {
    this.document = document;
  }

  get operations(): Operation[] {
    if (this.markNeedsComposing) {
      // compose the delta operations
      this.compose();
      this.markNeedsComposing = false;
    }
    return this._operations;
  }

  set operations(value: Operation[]) {
    this._operations = [];
    this._operations.push(...value);
  }

  /// Inserts the [Node] at the given [Path].
  insertNode(path: Path, node: Node, options: { deepCopy?: boolean } = {}): void {
    const { deepCopy = true } = options;
    this.insertNodes(path, [node], { deepCopy });
  }

  /// Inserts a sequence of [Node]s at the given [Path].
  insertNodes(path: Path, nodes: Node[], options: { deepCopy?: boolean } = {}): void {
    const { deepCopy = true } = options;
    
    if (nodes.length === 0) {
      return;
    }
    
    let processedNodes = nodes;
    if (deepCopy) {
      // add `toList()` to prevent the redundant copy of the nodes when looping
      processedNodes = nodes.map(e => e.copyWith());
    }
    
    this.add(new InsertOperation(path, processedNodes));
  }

  /// Updates the attributes of the [Node].
  ///
  /// The [attributes] will be merged into the existing attributes.
  updateNode(node: Node, attributes: Attributes): void {
    const inverted = invertAttributes(node.attributes, attributes);
    this.add(new UpdateOperation(node.path, { ...attributes }, inverted));
  }

  /// Deletes the [Node] in the document.
  deleteNode(node: Node): void {
    this.deleteNodesAtPath(node.path);
    if (this.beforeSelection) {
      const nodePath = node.path;
      const selectionPath = this.beforeSelection.start.path;
      if (!pathEquals(nodePath, selectionPath)) {
        this.afterSelection = this.beforeSelection;
      }
    }
  }

  /// Deletes the [Node]s in the document.
  deleteNodes(nodes: Node[]): void {
    nodes.forEach(node => this.deleteNode(node));
  }

  /// Deletes the [Node]s at the given [Path].
  ///
  /// The [length] indicates the number of consecutive deletions,
  ///   including the node of the current path.
  deleteNodesAtPath(path: Path, length: number = 1): void {
    if (path.length === 0) return;
    
    const nodes: Node[] = [];
    const parent = pathParent(path);
    
    for (let i = 0; i < length; i++) {
      const nodePath = [...parent, path[path.length - 1] + i];
      const node = this.document.nodeAtPath(nodePath);
      if (!node) {
        break;
      }
      nodes.push(node);
    }
    
    this.add(new DeleteOperation(path, nodes));
  }

  /// Moves a [Node] to the provided [Path]
  moveNode(path: Path, node: Node): void {
    this.deleteNode(node);
    this.insertNode(path, node, { deepCopy: false });
  }

  /// Returns the JSON representation of the transaction.
  toJson(): Record<string, any> {
    const json: Record<string, any> = {};
    
    if (this.operations.length > 0) {
      json.operations = this.operations.map(o => o.toJson());
    }
    
    if (this.afterSelection) {
      json.after_selection = this.afterSelection.toJson();
    }
    
    if (this.beforeSelection) {
      json.before_selection = this.beforeSelection.toJson();
    }
    
    return json;
  }

  /// Adds an operation to the transaction.
  /// This method will merge operations if they are both TextEdits.
  ///
  /// Also, this method will transform the path of the operations
  /// to avoid conflicts.
  add(operation: Operation, options: { transform?: boolean } = {}): void {
    const { transform = true } = options;
    
    let op: Operation | null = operation;
    const last = this._operations.length === 0 ? null : this._operations[this._operations.length - 1];
    
    if (last) {
      if (op instanceof UpdateTextOperation &&
          last instanceof UpdateTextOperation &&
          pathEquals(op.path, last.path)) {
        const newOp = new UpdateTextOperation(
          op.path,
          last.delta.compose(op.delta),
          op.inverted.compose(last.inverted)
        );
        this._operations[this._operations.length - 1] = newOp;
        return;
      }
    }
    
    if (transform) {
      for (let i = 0; i < this._operations.length; i++) {
        if (!op) {
          continue;
        }
        op = transformOperation(this._operations[i], op);
      }
    }
    
    if (op instanceof UpdateTextOperation && op.delta.length === 0) {
      return;
    }
    
    if (!op) {
      return;
    }
    
    this._operations.push(op);
  }

  /// Compose the delta in the compose map.
  compose(): void {
    if (TextTransaction._composeMap.size === 0) {
      this.markNeedsComposing = false;
      return;
    }
    
    for (const [node, deltaQueue] of Array.from(TextTransaction._composeMap.entries())) {
      if (!node.delta) {
        continue;
      }
      
      const composed = deltaQueue.reduce((p: any, e: any) => p.compose(e), node.delta);
      
      // Assert that composed delta only contains TextInsert operations
      // (This would be a runtime check in TypeScript)
      
      this.updateNode(node, {
        [blockComponentDelta]: composed.toJson(),
      });
    }
    
    this.markNeedsComposing = false;
    TextTransaction._composeMap.clear();
  }
}

export class TextTransaction {
  /// We use this map to cache the delta waiting to be composed.
  ///
  /// This is for make calling the below function as chained.
  /// For example, transaction..deleteText(..)..insertText(..);
  static readonly _composeMap = new Map<Node, Delta[]>();

  /// Inserts the [text] at the given [index].
  ///
  /// If the [attributes] is null, the attributes of the previous character will be used.
  /// If the [attributes] is not null, the attributes will be used.
  static insertText(
    transaction: Transaction,
    node: Node,
    index: number,
    text: string,
    options: {
      attributes?: Attributes;
      toggledAttributes?: Attributes;
      sliceAttributes?: boolean;
    } = {}
  ): void {
    const { attributes, toggledAttributes, sliceAttributes = true } = options;
    
    const delta = node.delta;
    if (!delta) {
      console.error('The node must have a delta.');
      return;
    }

    if (index < 0 || index > delta.length) {
      console.info(`The index(${index}) is out of range or negative.`);
      return;
    }

    const newAttributes = attributes ||
      (sliceAttributes ? delta.sliceAttributes(index) : {}) ||
      {};

    if (toggledAttributes) {
      Object.assign(newAttributes, toggledAttributes);
    }

    const insert = new Delta();
    insert.retain(index);
    insert.insert(text, newAttributes);

    this.addDeltaToComposeMap(transaction, node, insert);

    transaction.afterSelection = Selection.collapsed(
      new Position({ path: node.path, offset: index + text.length })
    );
  }

  static insertTextDelta(
    transaction: Transaction,
    node: Node,
    index: number,
    insertedDelta: Delta
  ): void {
    const delta = node.delta;
    if (!delta) {
      console.error('The node must have a delta.');
      return;
    }

    if (!(index <= delta.length && index >= 0)) {
      console.error(`The index(${index}) is out of range or negative.`);
      return;
    }

    const insert = new Delta();
    insert.retain(index);
    insert.addAll(insertedDelta.operations);

    this.addDeltaToComposeMap(transaction, node, insert);

    transaction.afterSelection = Selection.collapsed(
      new Position({ path: node.path, offset: index + insertedDelta.length })
    );
  }

  /// Deletes the [length] characters at the given [index].
  static deleteText(
    transaction: Transaction,
    node: Node,
    index: number,
    length: number
  ): void {
    const delta = node.delta;
    if (!delta) {
      console.error('The node must have a delta.');
      return;
    }

    if (!(index + length <= delta.length && index >= 0 && length >= 0)) {
      console.error(`The index(${index}) or length(${length}) is out of range or negative.`);
      return;
    }

    const deleteOp = new Delta();
    deleteOp.retain(index);
    deleteOp.delete(length);

    this.addDeltaToComposeMap(transaction, node, deleteOp);

    transaction.afterSelection = Selection.collapsed(
      new Position({ path: node.path, offset: index })
    );
  }

  static addDeltaToComposeMap(transaction: Transaction, node: Node, delta: Delta): void {
    transaction.markNeedsComposing = true;
    if (!this._composeMap.has(node)) {
      this._composeMap.set(node, []);
    }
    this._composeMap.get(node)!.push(delta);
  }
}