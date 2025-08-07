import { CharacterShortcutEvent } from '../../service/shortcuts/character_shortcut_event';
import { EditorState } from '../../../core/editor_state';
import { formatMarkdownSymbol, insertNewLineInType } from '../../../core/markdown_utils';
import { TodoListBlockKeys } from './todo_list_block_component';
import { Delta } from '../../../core/delta';

/// Convert '[] ' to unchecked todo list
///
/// - support
///   - desktop
///   - mobile
///   - web
///
export const formatEmptyBracketsToUncheckedBox: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'format empty square brackets to unchecked todo list',
  character: ' ',
  handler: async (editorState: EditorState) => {
    return _formatSymbolToUncheckedBox({
      editorState,
      symbol: '[]',
    });
  },
});

/// Convert '-[] ' to unchecked todo list
///
/// - support
///   - desktop
///   - mobile
///   - web
///
export const formatHyphenEmptyBracketsToUncheckedBox: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'format hyphen and empty square brackets to unchecked todo list',
  character: ' ',
  handler: async (editorState: EditorState) => {
    return _formatSymbolToUncheckedBox({
      editorState,
      symbol: '-[]',
    });
  },
});

/// Convert '[x] ' to checked todo list
///
/// - support
///   - desktop
///   - mobile
///   - web
///
export const formatFilledBracketsToCheckedBox: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'format filled square brackets to checked todo list',
  character: ' ',
  handler: async (editorState: EditorState) => {
    return _formatSymbolToCheckedBox({
      editorState,
      symbol: '[x]',
    });
  },
});

/// Convert '-[x] ' to checked todo list
///
/// - support
///   - desktop
///   - mobile
///   - web
///
export const formatHyphenFilledBracketsToCheckedBox: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'format hyphen and filled square brackets to checked todo list',
  character: ' ',
  handler: async (editorState: EditorState) => {
    return _formatSymbolToCheckedBox({
      editorState,
      symbol: '-[x]',
    });
  },
});

/// Insert a new block after the todo list block.
///
/// - support
///   - desktop
///   - web
///   - mobile
///
export const insertNewLineAfterTodoList: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'insert new block after todo list',
  character: '\n',
  handler: async (editorState: EditorState) => await insertNewLineInType(
    editorState,
    'todo_list',
    {
      [TodoListBlockKeys.checked]: false,
    },
  ),
});

async function _formatSymbolToUncheckedBox(options: {
  editorState: EditorState;
  symbol: string;
}): Promise<boolean> {
  const { editorState, symbol } = options;
  if (symbol !== '[]' && symbol !== '-[]') {
    throw new Error('Symbol must be "[]" or "-[]"');
  }

  return formatMarkdownSymbol(
    editorState,
    (node) => node.type !== 'todo_list',
    (_, text, __) => text === symbol,
    (_, node, delta) => [
      node.copyWith({
        type: TodoListBlockKeys.type,
        attributes: {
          [TodoListBlockKeys.checked]: false,
          [TodoListBlockKeys.delta]: delta.compose(new Delta().delete(symbol.length)).toJson(),
        },
      }),
    ],
  );
}

async function _formatSymbolToCheckedBox(options: {
  editorState: EditorState;
  symbol: string;
}): Promise<boolean> {
  const { editorState, symbol } = options;
  if (symbol !== '[x]' && symbol !== '-[x]') {
    throw new Error('Symbol must be "[x]" or "-[x]"');
  }

  return formatMarkdownSymbol(
    editorState,
    (node) => node.type !== 'todo_list',
    (_, text, __) => text === symbol,
    (_, node, delta) => [
      node.copyWith({
        type: TodoListBlockKeys.type,
        attributes: {
          [TodoListBlockKeys.checked]: true,
          [TodoListBlockKeys.delta]: delta.compose(new Delta().delete(symbol.length)).toJson(),
        },
      }),
    ],
  );
}