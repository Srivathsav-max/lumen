import { Node, paragraphNode } from '../../core/document/node';
import { Position } from '../../core/location/position';
import { Selection, SelectionType } from '../../core/location/selection';
import { Path, pathNext } from '../../core/document/path';
import { Delta } from '../../core/document/text_delta';
import { Attributes } from '../../core/document/attributes';
import { Transaction } from '../../core/transform/transaction';
import { blockComponentTextDirection } from '../block_component/base_component_keys';

// This would be mixed into EditorState class
export interface TextTransforms {
  selection: Selection | null;
  transaction: Transaction;
  toggledStyle: Attributes;
  
  getNodeAtPath(path: Path): Node | null;
  getNodesInSelection(selection: Selection): Node[];
  apply(transaction: Transaction, options?: { withUpdateSelection?: boolean }): Promise<void>;
  updateToggledStyle(key: string, value: any): void;
}

export class TextCommandsImpl {
  /// Inserts a new line at the given position.
  ///
  /// If the [Position] is not passed in, use the current selection.
  /// If there is no position, or if the selection is not collapsed, do nothing.
  ///
  /// Then it inserts a new paragraph node. After that, it sets the selection to be at the
  /// beginning of the new paragraph.
  static async insertNewLine(
    editorState: TextTransforms,
    options: {
      position?: Position;
      nodeBuilder?: (node: Node) => Node;
    } = {}
  ): Promise<void> {
    let { position, nodeBuilder } = options;
    
    // If the position is not passed in, use the current selection.
    position = position || editorState.selection?.start || null;

    // If there is no position, or if the selection is not collapsed, do nothing.
    if (!position || !(editorState.selection?.isCollapsed ?? false)) {
      return;
    }

    const node = editorState.getNodeAtPath(position.path);
    if (!node) {
      return;
    }

    // Get the transaction and the path of the next node.
    const transaction = editorState.transaction;
    const next = pathNext(position.path);
    const children = node.children;
    const delta = node.delta;

    if (delta) {
      // Delete the text after the cursor in the current node.
      TextTransactionImpl.deleteText(
        transaction,
        node,
        position.offset,
        delta.length - position.offset
      );
    }

    // Delete the current node's children if it is not empty.
    if (children.length > 0) {
      transaction.deleteNodes(children);
    }

    const slicedDelta = delta ? delta.slice(position.offset) : new Delta();
    const attributes: Record<string, any> = {
      delta: slicedDelta.toJson(),
    };

    // Copy the text direction from the current node.
    const textDirection = node.attributes[blockComponentTextDirection] as string | undefined;
    if (textDirection) {
      attributes[blockComponentTextDirection] = textDirection;
    }

    const insertedNode = paragraphNode({
      attributes,
      children,
    });
    
    nodeBuilder = nodeBuilder || ((node: Node) => node.copyWith());

    // Insert a new paragraph node.
    transaction.insertNode(
      next,
      nodeBuilder(insertedNode),
      { deepCopy: true }
    );

    // Set the selection to be at the beginning of the new paragraph.
    transaction.afterSelection = Selection.collapsed(
      new Position({
        path: next,
        offset: 0,
      })
    );
    transaction.selectionExtraInfo = {};
    transaction.customSelectionType = SelectionType.inline;

    // Apply the transaction.
    return editorState.apply(transaction);
  }

  /// Inserts text at the given position.
  /// If the [Position] is not passed in, use the current selection.
  /// If there is no position, or if the selection is not collapsed, do nothing.
  /// Then it inserts the text at the given position.
  static async insertTextAtPosition(
    editorState: TextTransforms,
    text: string,
    options: {
      position?: Position;
    } = {}
  ): Promise<void> {
    let { position } = options;
    
    // If the position is not passed in, use the current selection.
    position = position || editorState.selection?.start || null;

    // If there is no position, or if the selection is not collapsed, do nothing.
    if (!position || !(editorState.selection?.isCollapsed ?? false)) {
      return;
    }

    const path = position.path;
    const node = editorState.getNodeAtPath(path);
    if (!node) {
      return;
    }

    // Get the transaction and the path of the next node.
    const transaction = editorState.transaction;
    const delta = node.delta;
    if (!delta) {
      return;
    }

    // Insert the text at the given position.
    TextTransactionImpl.insertText(transaction, node, position.offset, text);

    // Set the selection to be at the beginning of the new paragraph.
    transaction.afterSelection = Selection.collapsed(
      new Position({
        path,
        offset: position.offset + text.length,
      })
    );

    // Apply the transaction.
    return editorState.apply(transaction);
  }

  /// format the delta at the given selection.
  ///
  /// If the [Selection] is not passed in, use the current selection.
  static async formatDelta(
    editorState: TextTransforms,
    selection: Selection | null,
    attributes: Attributes,
    options: {
      withUpdateSelection?: boolean;
      selectionExtraInfo?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const { withUpdateSelection = true, selectionExtraInfo } = options;
    
    selection = selection || editorState.selection;
    selection = selection?.normalized || null;

    if (!selection || selection.isCollapsed) {
      return;
    }

    const nodes = editorState.getNodesInSelection(selection);
    if (nodes.length === 0) {
      return;
    }

    const transaction = editorState.transaction;

    for (const node of nodes) {
      const delta = node.delta;
      if (!delta) {
        continue;
      }
      const startIndex = node === nodes[0] ? selection.startIndex : 0;
      const endIndex = node === nodes[nodes.length - 1] ? selection.endIndex : delta.length;
      
      TextTransactionImpl.formatText(
        transaction,
        node,
        startIndex,
        endIndex - startIndex,
        attributes
      );
      
      transaction.afterSelection = transaction.beforeSelection;
      transaction.selectionExtraInfo = selectionExtraInfo || null;
    }

    return editorState.apply(transaction, { withUpdateSelection });
  }

  /// Toggles the given attribute on or off for the selected text.
  ///
  /// If the [Selection] is not passed in, use the current selection.
  static async toggleAttribute(
    editorState: TextTransforms,
    key: string,
    options: {
      selection?: Selection;
      selectionExtraInfo?: Record<string, any>;
    } = {}
  ): Promise<void> {
    let { selection, selectionExtraInfo } = options;
    
    selection = selection || editorState.selection;
    if (!selection) {
      return;
    }

    const nodes = editorState.getNodesInSelection(selection);
    if (selection.isCollapsed) {
      if (editorState.toggledStyle.hasOwnProperty(key)) {
        editorState.updateToggledStyle(key, !editorState.toggledStyle[key]);
      } else {
        // get the attributes from the previous one character.
        const adjustedSelection = selection.copyWith({
          start: selection.start.copyWith({
            offset: Math.max(selection.startIndex - 1, 0),
          }),
        });
        
        const toggled = NodesExtensionsImpl.allSatisfyInSelection(
          nodes,
          adjustedSelection,
          (delta) => {
            return DeltaExtensionsImpl.everyAttributes(delta, (attributes) => {
              return attributes[key] === true;
            });
          }
        );
        editorState.updateToggledStyle(key, !toggled);
      }
    } else {
      const isHighlight = NodesExtensionsImpl.allSatisfyInSelection(
        nodes,
        selection,
        (delta) => {
          return DeltaExtensionsImpl.everyAttributes(delta, (attributes) => {
            return attributes[key] === true;
          });
        }
      );
      
      await TextCommandsImpl.formatDelta(
        editorState,
        selection,
        { [key]: !isHighlight },
        { selectionExtraInfo }
      );
    }
  }

  /// Get the text in the given selection.
  ///
  /// If the [Selection] is not passed in, use the current selection.
  static getTextInSelection(
    editorState: TextTransforms,
    selection?: Selection
  ): string[] {
    const res: string[] = [];
    selection = selection || editorState.selection;
    
    if (!selection || selection.isCollapsed) {
      return res;
    }
    
    const nodes = editorState.getNodesInSelection(selection);
    for (const node of nodes) {
      const delta = node.delta;
      if (!delta) {
        continue;
      }
      const startIndex = node === nodes[0] ? selection.startIndex : 0;
      const endIndex = node === nodes[nodes.length - 1] ? selection.endIndex : delta.length;
      res.push(delta.slice(startIndex, endIndex).toPlainText());
    }
    return res;
  }
}

// Helper classes for delta and nodes operations
class DeltaExtensionsImpl {
  static everyAttributes(delta: Delta, test: (attributes: Attributes) => boolean): boolean {
    // Implementation would check every text operation's attributes
    for (const op of delta.operations) {
      if (op.attributes && !test(op.attributes)) {
        return false;
      }
    }
    return true;
  }
}

class NodesExtensionsImpl {
  static allSatisfyInSelection(
    nodes: Node[],
    selection: Selection,
    test: (delta: Delta) => boolean
  ): boolean {
    // Implementation similar to the Dart version
    if (selection.isCollapsed) {
      return false;
    }

    const normalizedSelection = selection.normalized;
    const normalizedNodes = nodes; // Assume already normalized

    if (normalizedNodes.length === 1) {
      return NodeExtensionsImpl.allSatisfyInSelection(normalizedNodes[0], selection, test);
    }

    for (let i = 0; i < normalizedNodes.length; i++) {
      const node = normalizedNodes[i];
      let delta = node.delta;
      if (!delta || delta.length === 0) {
        continue;
      }

      if (i === 0) {
        delta = delta.slice(normalizedSelection.start.offset);
      } else if (i === normalizedNodes.length - 1) {
        delta = delta.slice(0, normalizedSelection.end.offset);
      }
      
      if (!test(delta)) {
        return false;
      }
    }

    return true;
  }
}

class NodeExtensionsImpl {
  static allSatisfyInSelection(
    node: Node,
    selection: Selection,
    test: (delta: Delta) => boolean
  ): boolean {
    if (selection.isCollapsed) {
      return false;
    }

    const normalizedSelection = selection.normalized;
    let delta = node.delta;
    if (!delta) {
      return false;
    }

    delta = delta.slice(normalizedSelection.startIndex, normalizedSelection.endIndex);
    return test(delta);
  }
}

// Text transaction implementation
class TextTransactionImpl {
  // We use this map to cache the delta waiting to be composed.
  static readonly _composeMap = new Map<Node, Delta[]>();

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

    // Add to compose map like the real TextTransaction does
    this.addDeltaToComposeMap(transaction, node, insert);

    transaction.afterSelection = Selection.collapsed(
      new Position({ path: node.path, offset: index + text.length })
    );
  }

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

    // Add to compose map like the real TextTransaction does
    this.addDeltaToComposeMap(transaction, node, deleteOp);

    transaction.afterSelection = Selection.collapsed(
      new Position({ path: node.path, offset: index })
    );
  }

  static formatText(
    transaction: Transaction,
    node: Node,
    index: number,
    length: number,
    attributes: Attributes
  ): void {
    const delta = node.delta;
    if (!delta) {
      return;
    }

    const format = new Delta();
    format.retain(index);
    format.retain(length, attributes);

    // Add to compose map like the real TextTransaction does
    this.addDeltaToComposeMap(transaction, node, format);
  }

  static addDeltaToComposeMap(transaction: Transaction, node: Node, delta: Delta): void {
    transaction.markNeedsComposing = true;
    if (!this._composeMap.has(node)) {
      this._composeMap.set(node, []);
    }
    this._composeMap.get(node)!.push(delta);
  }
}