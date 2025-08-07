// Import TransactionTime from the canonical location
import { TransactionTime } from '../../transform/transaction';

export interface EditorState {
  document: any;
  transaction: any;
  apply(transaction: any): void;
}

export interface EditorTransactionValue {
  // This would be a tuple type in the original Dart code
  // Representing [TransactionTime, ...other values]
  0: TransactionTime;
  1?: any;
}

// Export TransactionTime for convenience
export { TransactionTime };

export abstract class DocumentRule {
  constructor() {}

  /// Whether the rule should be applied.
  abstract shouldApply(options: {
    editorState: EditorState;
    value: EditorTransactionValue;
  }): boolean;

  /// Apply the rule to the document.
  abstract apply(options: {
    editorState: EditorState;
    value: EditorTransactionValue;
  }): Promise<void>;
}