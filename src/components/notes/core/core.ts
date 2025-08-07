// Core document system
export * from './document/attributes';
export * from './document/document';
export * from './document/node';
export * from './document/node_iterator';
export * from './document/path';
export * from './document/text_delta';
export * from './document/diff';

// Location and selection
export * from './location/position';
export * from './location/selection';

// Transform operations
export * from './transform/operation';
export * from './transform/transaction';

// Rules
export * from './document/rules/document_rule';
export * from './document/rules/at_least_one_editable_node_rule';

// Core utilities
export * from './constants';
export * from './color_utils';
export * from './component';

// Legacy support
export * from './legacy/built_in_attribute_keys';

// Deprecated (for backward compatibility)
export * from './document/deprecated/document';
export * from './document/deprecated/node';

// Editor state and block keys (avoid conflicts)
export type {
  EditorState,
  EditorTransactionValue,
  SelectionType,
  SelectionUpdateReason
} from './editor_state';

export {
  TransactionTime
} from './transform/transaction';

export {
  blockComponentDelta,
  blockComponentType,
  paragraphBlockType,
  headingBlockType,
  headingLevel
} from './block_keys';