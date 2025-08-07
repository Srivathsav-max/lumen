import { any } from 'zod';
import { EditorState } from '../../../../../editor_state';
import { Selection, Position } from '../../../../../selection';

// We currently have only one format style is triggered by double characters.
// **abc** or __abc__ -> bold abc
// If we have more in the future, we should add them in this enum and update the [style] variable in [handleDoubleCharactersFormat].
export enum DoubleCharacterFormatStyle {
  bold = 'bold',
  strikethrough = 'strikethrough',
}

export function handleFormatByWrappingWithDoubleCharacter(options: {
  // for demonstration purpose, the following comments use * to represent the character from the parameter [char].
  editorState: EditorState;
  character: string;
  formatStyle: DoubleCharacterFormatStyle;
}): boolean {
  const { editorState, character, formatStyle } = options;
  
  if (character.length !== 1) {
    throw new Error('Character must be a single character');
  }
  
  const selection = editorState.selection;
  // If the selection is not collapsed or the cursor is at the first three index range, we don't need to format it.
  // We should return false to let the IME handle it.
  if (!selection || !selection.isCollapsed || selection.end.offset < 4) {
    return false;
  }

  const path = selection.end.path;
  const node = editorState.getNodeAtPath(path);
  const delta = node?.delta;
  
  // If the node doesn't contain the delta (which means it isn't a text), we don't need to format it.
  if (!node || !delta) {
    return false;
  }

  const plainText = delta.toPlainText();

  // The plainText should have at least 4 characters, like **a*.
  // The last char in the plainText should be *[char]. Otherwise, we don't need to format it.
  if (plainText.length < 4 || plainText[selection.end.offset - 1] !== character) {
    return false;
  }

  // Find all the index of *[char]
  const charIndexList: number[] = [];
  for (let i = 0; i < plainText.length; i++) {
    if (plainText[i] === character) {
      charIndexList.push(i);
    }
  }

  if (charIndexList.length < 3) {
    return false;
  }

  // For example: **abc* -> [0, 1, 5]
  // thirdLastCharIndex = 0, secondLastCharIndex = 1, lastCharIndex = 5
  // Make sure the third *[char] and second *[char] are connected
  // Make sure the second *[char] and last *[char] are split by at least one character
  const thirdLastCharIndex = charIndexList[charIndexList.length - 3];
  const secondLastCharIndex = charIndexList[charIndexList.length - 2];
  const lastCharIndex = charIndexList[charIndexList.length - 1];
  
  if (secondLastCharIndex !== thirdLastCharIndex + 1 ||
      lastCharIndex === secondLastCharIndex + 1) {
    return false;
  }

  // Before deletion we need to insert the character in question so that undo manager
  // will undo only the style applied and keep the character.
  const insertion = editorState.transaction;
  insertion.insertText(node, lastCharIndex, character);
  insertion.afterSelection = Selection.collapsed(
    new Position(selection.end.path, selection.end.offset + 1)
  );
  editorState.apply(insertion, { skipHistoryDebounce: true });

  // If all the conditions are met, we should format the text.
  // 1. Delete all the *[char]
  // 2. Update the style of the text surrounded by the double *[char] to [formatStyle]
  // 3. Update the cursor position.
  const deletion = editorState.transaction;
  deletion.deleteText(node, lastCharIndex, 2);
  deletion.deleteText(node, thirdLastCharIndex, 2);
  editorState.apply(deletion);

  // Get the format style string
  const style = formatStyle;

  // If the text is already formatted, we should remove the format.
  const sliced = delta.slice(thirdLastCharIndex + 2, selection.end.offset - 1);
  const result = sliced.ops?.every(op => op.attributes?.[style] === true) || false;

  const format = editorState.transaction;
  format.formatText(
    node,
    thirdLastCharIndex,
    selection.end.offset - thirdLastCharIndex - 3,
    {
      [style]: !result,
    }
  );
  format.afterSelection = Selection.collapsed(
    new Position(path, selection.end.offset - 3)
  );
  editorState.apply(format);
  
  return true;
}