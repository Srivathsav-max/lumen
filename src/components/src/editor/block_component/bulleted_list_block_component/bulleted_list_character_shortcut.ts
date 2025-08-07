import { CharacterShortcutEvent } from '../../service/shortcuts/character_shortcut_event';
import { EditorState } from '../../../core/editor_state';
import { formatMarkdownSymbol, insertNewLineInType } from '../base_component/markdown_format_helper';
import { BulletedListBlockKeys } from './bulleted_list_block_component';
import { Delta } from '../../../core/delta';

/// Convert '* ' to bulleted list
///
/// - support
///   - desktop
///   - mobile
///   - web
///
export const formatAsteriskToBulletedList: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'format asterisk to bulleted list',
  character: ' ',
  handler: async (editorState: EditorState) =>
      await _formatSymbolToBulletedList(editorState, '*'),
});

/// Convert '- ' to bulleted list
///
/// - support
///   - desktop
///   - mobile
///   - web
///
export const formatMinusToBulletedList: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'format minus to bulleted list',
  character: ' ',
  handler: async (editorState: EditorState) =>
      await _formatSymbolToBulletedList(editorState, '-'),
});

/// Insert a new block after the bulleted list block.
///
/// - support
///   - desktop
///   - web
///   - mobile
///
export const insertNewLineAfterBulletedList: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'insert new block after bulleted list',
  character: '\n',
  handler: async (editorState: EditorState) => await insertNewLineInType(
    editorState,
    'bulleted_list',
  ),
});

// This function formats a symbol in the selection to a bulleted list.
// If the selection is not collapsed, it returns false.
// If the selection is collapsed and the text is not the symbol, it returns false.
// If the selection is collapsed and the text is the symbol, it will format the current node to a bulleted list.
async function _formatSymbolToBulletedList(
  editorState: EditorState,
  symbol: string,
): Promise<boolean> {
  if (symbol.length !== 1) {
    throw new Error('Symbol must be a single character');
  }

  return formatMarkdownSymbol(
    editorState,
    (node) => node.type !== BulletedListBlockKeys.type,
    (_, text, __) => text === symbol,
    (_, node, delta) => [
      node.copyWith({
        type: BulletedListBlockKeys.type,
        attributes: {
          [BulletedListBlockKeys.delta]: delta.compose(new Delta().delete(symbol.length)).toJson(),
        },
      }),
    ],
  );
}