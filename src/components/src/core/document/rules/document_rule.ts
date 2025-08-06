// Note: These types would need to be imported from the appropriate modules
// For now, I'll define placeholder interfaces

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

export enum TransactionTime {
  before = 'before',
  after = 'after'
}

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