import { CharacterShortcutEvent } from '../../service/shortcuts/character_shortcut_event';
import { EditorState } from '../../../core/editor_state';
import { formatMarkdownSymbol, insertNewLineInType } from '../../../core/markdown_utils';
import { NumberedListBlockKeys, HeadingBlockKeys } from '../../../core/block_keys';
import { Delta } from '../../../core/delta';

const _numberRegex = /^(\d+)\./;

/// Convert 'num. ' to numbered list
///
/// - support
///   - desktop
///   - mobile
///   - web
///
export const formatNumberToNumberedList: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'format number to numbered list',
  character: ' ',
  handler: async (editorState: EditorState) => await formatMarkdownSymbol(
    editorState,
    (node) => node.type !== NumberedListBlockKeys.type,
    (node, text, selection) => {
      // if the current node is a heading block, we should not convert it to a numbered list
      if (node.type === HeadingBlockKeys.type) {
        return false;
      }
      const match = _numberRegex.exec(text);
      if (!match) return false;

      const matchText = match[0];
      const numberText = match[1];
      if (!matchText || !numberText) return false;

      // if the previous one is numbered list,
      // we should check the current number is the next number of the previous one
      let previous = node.previous;
      let level = 0;
      let startNumber: number | null = null;
      while (previous && previous.type === NumberedListBlockKeys.type) {
        startNumber = previous.attributes[NumberedListBlockKeys.number] as number;
        level++;
        previous = previous.previous;
      }
      if (startNumber !== null) {
        const currentNumber = parseInt(numberText, 10);
        if (isNaN(currentNumber) || currentNumber !== startNumber + level) {
          return false;
        }
      }

      return selection.endIndex === matchText.length;
    },
    (text, node, delta) => {
      const match = _numberRegex.exec(text)!;
      const matchText = match[0];
      const number = matchText.substring(0, matchText.length - 1);
      return [
        node.copyWith({
          type: NumberedListBlockKeys.type,
          attributes: {
            [NumberedListBlockKeys.delta]: delta.compose(new Delta().delete(matchText.length)).toJson(),
            [NumberedListBlockKeys.number]: parseInt(number, 10),
          },
        }),
      ];
    },
  ),
});

/// Insert a new block after the numbered list block.
///
/// - support
///   - desktop
///   - web
///   - mobile
///
export const insertNewLineAfterNumberedList: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'insert new block after numbered list',
  character: '\n',
  handler: async (editorState: EditorState) => await insertNewLineInType(
    editorState,
    NumberedListBlockKeys.type,
  ),
});