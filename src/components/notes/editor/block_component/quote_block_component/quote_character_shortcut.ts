import { CharacterShortcutEvent } from '../../service/shortcuts/character_shortcut_event';
import { EditorState } from '../../../core/editor_state';
import { formatMarkdownSymbol } from '../../../core/markdown_utils';
import { QuoteBlockKeys } from '../../../core/block_keys';
import { quoteNode } from './quote_block_component';
import { Delta } from '../../../core/delta';

const _doubleQuotes = ['"', '"'];

/// Convert '" ' to quote
///
/// - support
///   - desktop
///   - mobile
///   - web
///
export const formatDoubleQuoteToQuote: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'format greater to quote',
  character: ' ',
  handler: async (editorState: EditorState) => await formatMarkdownSymbol(
    editorState,
    (node) => node.type !== QuoteBlockKeys.type,
    (_, text, __) => _doubleQuotes.some((element) => element === text),
    (_, node, delta) => [
      quoteNode({
        attributes: {
          [QuoteBlockKeys.delta]: delta.compose(new Delta().delete(1)).toJson(),
        },
      }),
      ...(node.children.length > 0 ? node.children : []),
    ],
  ),
});