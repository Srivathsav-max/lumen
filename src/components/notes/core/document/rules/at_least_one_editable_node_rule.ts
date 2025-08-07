import { DocumentRule } from './document_rule';
import { EditorState, EditorTransactionValue, TransactionTime } from '../../core';
import { paragraphNode } from '../node';
import { Position } from '../../location/position';
import { Selection } from '../../location/selection';

/// This rule ensures that there is at least one editable node in the document.
///
/// If the document is empty, it will create a new paragraph node.
export class AtLeastOneEditableNodeRule extends DocumentRule {
  constructor() {
    super();
  }

  shouldApply(options: {
    editorState: EditorState;
    value: EditorTransactionValue;
  }): boolean {
    const { editorState, value } = options;
    const time = value.time;
    
    if (time !== TransactionTime.after) {
      return false;
    }
    
    const document = editorState.document;
    return document.root.children.length === 0;
  }

  async apply(options: {
    editorState: EditorState;
    value: EditorTransactionValue;
  }): Promise<void> {
    const { editorState } = options;
    const transaction = editorState.transaction;
    
    // Insert a paragraph node at path [0]
    transaction.insertNode([0], paragraphNode());
    
    // Set selection to the beginning of the new paragraph
    transaction.afterSelection = Selection.collapsed(
      new Position({ path: [0], offset: 0 })
    );
    
    editorState.apply(transaction);
  }
}