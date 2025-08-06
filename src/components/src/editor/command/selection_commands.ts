import { Selection, SelectionUpdateReason } from '../../core/location/selection';
import { Node } from '../../core/document/node';
import { Delta } from '../../core/document/text_delta';
import { Transaction } from '../../core/transform/transaction';
import { Path } from '../../core/document/path';

export enum SelectionMoveRange {
  character = 'character',
  word = 'word',
  line = 'line',
  block = 'block'
}

export enum SelectionMoveDirection {
  forward = 'forward',
  backward = 'backward'
}

// This would be mixed into EditorState class
export interface SelectionTransforms {
  selection: Selection | null;
  transaction: Transaction;
  
  getNodeAtPath(path: Path): Node | null;
  getNodesInSelection(selection: Selection): Node[];
  apply(transaction: Transaction): Promise<void>;
  updateSelectionWithReason(selection: Selection | null, options: { reason: SelectionUpdateReason }): Promise<void>;
}

export class SelectionCommandsImpl {
  /// backward delete one character
  static async deleteBackward(editorState: SelectionTransforms): Promise<boolean> {
    const selection = editorState.selection;
    if (!selection || !selection.isCollapsed) {
      return false;
    }
    
    const node = editorState.getNodeAtPath(selection.start.path);
    const delta = node?.delta;
    if (!node || !delta) {
      return false;
    }
    
    const transaction = editorState.transaction;
    const index = delta.prevRunePosition(selection.startIndex);
    TextTransactionImpl.deleteText(transaction, node, index, selection.startIndex - index);
    await editorState.apply(transaction);
    return true;
  }

  /// Deletes the selection.
  ///
  /// If the selection is collapsed, this function does nothing.
  static async deleteSelection(
    editorState: SelectionTransforms,
    selection: Selection,
    options: {
      ignoreNodeTypes?: string[];
    } = {}
  ): Promise<boolean> {
    const { ignoreNodeTypes = ['table_cell'] } = options;
    
    // Nothing to do if the selection is collapsed.
    if (selection.isCollapsed) {
      return false;
    }

    // Normalize the selection so that it is never reversed or extended.
    selection = selection.normalized;

    // Start a new transaction.
    const transaction = editorState.transaction;

    // Get the nodes that are fully or partially selected.
    const nodes = editorState.getNodesInSelection(selection);

    // If only one node is selected, then we can just delete the selected text or node.
    if (nodes.length === 1) {
      const node = ignoreNodeTypes.includes(nodes[0].type)
        ? nodes[0].children[0]
        : nodes[0];
        
      if (node.delta) {
        TextTransactionImpl.deleteText(
          transaction,
          node,
          selection.startIndex,
          selection.length
        );
      } else if (!ignoreNodeTypes.includes(node.parent?.type)) {
        transaction.deleteNode(node);
      }
    }
    // Otherwise, multiple nodes are selected, so we have to do more work.
    else {
      // The nodes are guaranteed to be in order
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // The first node is at the beginning of the selection.
        // All other nodes can be deleted.
        if (i !== 0) {
          // Never delete a table cell node child
          if (ignoreNodeTypes.includes(node.parent?.type)) {
            if (!nodes.some(n => n.id === node.parent?.parent?.id)) {
              TextTransactionImpl.deleteText(
                transaction,
                node,
                0,
                selection.end.offset
              );
            }
          }
          // Handle last node in table cell
          else if (node.id === nodes[nodes.length - 1].id &&
                   ignoreNodeTypes.includes(nodes[0].parent?.type)) {
            TextTransactionImpl.deleteText(
              transaction,
              node,
              0,
              selection.end.offset
            );
          } else if (!ignoreNodeTypes.includes(node.type)) {
            transaction.deleteNode(node);
          }
          continue;
        }

        // Handle merging text nodes
        if (nodes[nodes.length - 1].delta &&
            ![node.parent?.type, nodes[nodes.length - 1].parent?.type]
              .some(type => ignoreNodeTypes.includes(type))) {
          
          TextTransactionImpl.mergeText(
            transaction,
            node,
            nodes[nodes.length - 1],
            {
              leftOffset: selection.startIndex,
              rightOffset: selection.endIndex,
            }
          );

          // Handle children of the last node
          const last = nodes[nodes.length - 1];
          if (last.children.length > 0) {
            const indentableBlockTypes = ['bulleted_list', 'numbered_list', 'todo_list'];
            if (indentableBlockTypes.includes(node.type)) {
              transaction.insertNodes(
                [...node.path, 0],
                last.children,
                { deepCopy: true }
              );
            } else {
              transaction.insertNodes(
                [...node.path.slice(0, -1), node.path[node.path.length - 1] + 1],
                last.children,
                { deepCopy: true }
              );
            }
          }
        }
        // Otherwise, just delete the selected text
        else {
          if (ignoreNodeTypes.includes(nodes[nodes.length - 1].parent?.type) ||
              ignoreNodeTypes.includes(node.parent?.type)) {
            TextTransactionImpl.deleteText(
              transaction,
              node,
              selection.startIndex,
              node.delta!.length - selection.startIndex
            );
          } else {
            TextTransactionImpl.deleteText(
              transaction,
              node,
              selection.startIndex,
              selection.length
            );
          }
        }
      }
    }

    // After the selection is deleted, move the selection to the beginning
    transaction.afterSelection = selection.collapse({ atStart: true });

    // Apply the transaction
    await editorState.apply(transaction);
    return true;
  }

  /// move the cursor forward.
  static moveCursorForward(
    editorState: SelectionTransforms,
    range: SelectionMoveRange = SelectionMoveRange.character
  ): void {
    SelectionCommandsImpl.moveCursor(editorState, SelectionMoveDirection.forward, range);
  }

  /// move the cursor backward.
  static moveCursorBackward(
    editorState: SelectionTransforms,
    range: SelectionMoveRange
  ): void {
    SelectionCommandsImpl.moveCursor(editorState, SelectionMoveDirection.backward, range);
  }

  static moveCursor(
    editorState: SelectionTransforms,
    direction: SelectionMoveDirection,
    range: SelectionMoveRange = SelectionMoveRange.character
  ): void {
    const selection = editorState.selection?.normalized;
    if (!selection) {
      return;
    }

    // If the selection is not collapsed, collapse it
    if (!selection.isCollapsed && range !== SelectionMoveRange.line) {
      editorState.selection = selection.collapse({
        atStart: direction === SelectionMoveDirection.forward,
      });
      return;
    }

    const node = editorState.getNodeAtPath(selection.start.path);
    if (!node) {
      return;
    }

    // Handle movement based on range
    const delta = node.delta;
    switch (range) {
      case SelectionMoveRange.character:
        if (delta) {
          const offset = direction === SelectionMoveDirection.forward
            ? selection.startIndex
            : selection.endIndex;
          
          const newOffset = direction === SelectionMoveDirection.forward
            ? delta.prevRunePosition(offset)
            : delta.nextRunePosition(offset);
            
          editorState.updateSelectionWithReason(
            Selection.collapsed(
              selection.start.copyWith({ offset: newOffset })
            ),
            { reason: SelectionUpdateReason.uiEvent }
          );
        }
        break;
        
      case SelectionMoveRange.line:
        if (delta) {
          const newOffset = direction === SelectionMoveDirection.forward ? 0 : delta.length;
          editorState.updateSelectionWithReason(
            Selection.collapsed(
              selection.start.copyWith({ offset: newOffset })
            ),
            { reason: SelectionUpdateReason.uiEvent }
          );
        }
        break;
        
      default:
        throw new Error('Not implemented');
    }
  }
}

// Helper class for text operations
class TextTransactionImpl {
  static deleteText(
    transaction: Transaction,
    node: Node,
    index: number,
    length: number
  ): void {
    // Implementation would be similar to the original
    console.debug(`Delete text at ${index}, length ${length} in node ${node.id}`);
  }

  static mergeText(
    transaction: Transaction,
    left: Node,
    right: Node,
    options: {
      leftOffset?: number;
      rightOffset?: number;
    }
  ): void {
    // Implementation would merge text from right node into left node
    console.debug(`Merge text from node ${right.id} into ${left.id}`);
  }
}