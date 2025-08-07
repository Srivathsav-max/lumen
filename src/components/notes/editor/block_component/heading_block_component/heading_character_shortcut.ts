import { CharacterShortcutEvent } from '../../service/shortcuts/character_shortcut_event';
import { EditorState, Selection, Position } from '../../../core/editor_state';
import { formatMarkdownSymbol } from '../base_component/markdown_format_helper';
import { headingNode, HeadingBlockKeys } from './heading_block_component';
import { paragraphNode } from '../../../core/node_factory';
import { Delta } from '../../../core/delta';

/// Convert '# ' to heading
///
/// - support
///   - desktop
///   - mobile
///   - web
///
export const formatSignToHeading: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'format sign to heading list',
  character: ' ',
  handler: async (editorState: EditorState) => await formatMarkdownSymbol(
    editorState,
    (node) => true,
    (_, text, selection) => {
      const characters = text.split('');
      // only supports heading1 to heading6 levels
      // if the characters is empty, the every function will return true directly
      return characters.length > 0 &&
          characters.every((element) => element === '#') &&
          characters.length < 7;
    },
    (text, node, delta) => {
      const numberOfSign = text.split('').length;
      return [
        headingNode({
          level: numberOfSign,
          delta: delta.compose(new Delta().delete(numberOfSign)),
        }),
        ...(node.children.length > 0 ? node.children : []),
      ];
    },
  ),
});

/// Insert a new block after the heading block.
///
/// - support
///   - desktop
///   - web
///   - mobile
///
export const insertNewLineAfterHeading: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'insert new block after heading',
  character: '\n',
  handler: async (editorState: EditorState) => {
    const selection = editorState.selection;
    if (!selection ||
        !selection.isCollapsed ||
        selection.startIndex !== 0) {
      return false;
    }
    const node = editorState.getNodeAtPath(selection.end.path);
    if (!node || node.type !== HeadingBlockKeys.type) {
      return false;
    }
    const transaction = editorState.transaction;
    transaction.insertNode(selection.start.path, paragraphNode());
    
    const nextPath = [...selection.start.path];
    nextPath[nextPath.length - 1]++;
    transaction.afterSelection = Selection.collapsed(
      new Position(nextPath, 0),
    );
    await editorState.apply(transaction);
    return true;
  },
});