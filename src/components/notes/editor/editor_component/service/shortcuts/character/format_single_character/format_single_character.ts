import { EditorState } from '../../../../../editor_state';
import { Selection, Position } from '../../../../../selection';
import { Node } from '../../../../../node';
import { Delta } from '../../../../../delta';
import { AppFlowyRichTextKeys } from '../../../../../block_component/rich_text/rich_text_keys';

export enum FormatStyleByWrappingWithSingleChar {
  code = 'code',
  italic = 'italic',
  strikethrough = 'strikethrough',
}

export interface CheckSingleFormatFormatResult {
  node: Node;
  lastCharIndex: number;
  path: number[];
  delta: Delta;
}

/**
 * Check if the single character format should be applied.
 * 
 * It's helpful for the IME to check if the single character format should be applied.
 */
export function checkSingleCharacterFormatShouldBeApplied(options: {
  editorState: EditorState;
  selection: Selection;
  character: string;
  formatStyle: FormatStyleByWrappingWithSingleChar;
}): [boolean, CheckSingleFormatFormatResult | null] {
  const { editorState, selection, character, formatStyle } = options;

  if (character.length !== 1) {
    console.debug('character length is not 1');
    return [false, null];
  }

  // If the selection is not collapsed or the cursor is at the first two index range, we don't need to format it.
  if (!selection.isCollapsed || selection.end.offset < 2) {
    console.debug('selection is not valid');
    return [false, null];
  }

  const path = selection.end.path;
  const node = editorState.getNodeAtPath(path);
  const delta = node?.delta;
  
  // If the node doesn't contain the delta (which means it isn't a text), we don't need to format it.
  if (!node || !delta) {
    return [false, null];
  }

  // Find the last inline code attributes
  const deltaOps = delta.ops || [];
  let lastInlineCodeIndex = -1;
  let currentIndex = 0;
  
  for (let i = 0; i < deltaOps.length; i++) {
    const op = deltaOps[i];
    if (op.attributes?.[AppFlowyRichTextKeys.code] === true) {
      lastInlineCodeIndex = currentIndex;
    }
    currentIndex += op.insert?.length || 0;
  }

  let startIndex = 0;
  if (lastInlineCodeIndex !== -1 && formatStyle !== FormatStyleByWrappingWithSingleChar.code) {
    startIndex = lastInlineCodeIndex;
  }

  if (startIndex >= selection.end.offset) {
    return [false, null];
  }

  const plainText = delta.toPlainText().substring(startIndex, selection.end.offset);
  const lastCharIndex = plainText.lastIndexOf(character);
  const textAfterLastChar = plainText.substring(lastCharIndex + 1);
  const textAfterLastCharIsEmpty = textAfterLastChar.trim().length === 0;

  // The following conditions won't trigger the single character formatting:
  // 1. There is no 'Character' in the plainText: lastIndexOf returns -1.
  if (lastCharIndex === -1) {
    return [false, null];
  }
  
  // 2. The text after last char is empty or only contains spaces.
  if (textAfterLastCharIsEmpty) {
    return [false, null];
  }

  // 3. If it is in a double character case, we should skip the single character formatting.
  if ((character === '*' || character === '_' || character === '~') &&
      (lastCharIndex >= 1) &&
      (plainText[lastCharIndex - 1] === character)) {
    return [false, null];
  }

  // 4. If the last character index is greater than current cursor position, we should skip the single character formatting.
  if (lastCharIndex >= selection.end.offset) {
    return [false, null];
  }

  // 5. If the text in between is empty (continuous)
  const rawPlainText = delta.toPlainText();
  if (rawPlainText.substring(startIndex + lastCharIndex + 1, selection.end.offset).length === 0) {
    return [false, null];
  }

  return [
    true,
    {
      node,
      lastCharIndex: startIndex + lastCharIndex,
      path,
      delta,
    }
  ];
}

export function handleFormatByWrappingWithSingleCharacter(options: {
  editorState: EditorState;
  character: string;
  formatStyle: FormatStyleByWrappingWithSingleChar;
}): boolean {
  const { editorState, character, formatStyle } = options;
  const selection = editorState.selection;
  
  if (!selection) {
    return false;
  }

  const [shouldApply, formatResult] = checkSingleCharacterFormatShouldBeApplied({
    editorState,
    selection,
    character,
    formatStyle,
  });

  if (!shouldApply || !formatResult) {
    console.debug('format single character failed');
    return false;
  }

  const { node, lastCharIndex, delta, path } = formatResult;

  // Before deletion we need to insert the character in question so that undo manager
  // will undo only the style applied and keep the character.
  const insertion = editorState.transaction;
  insertion.insertText(node, selection.end.offset, character);
  insertion.afterSelection = Selection.collapsed(
    new Position(selection.end.path, selection.end.offset + 1)
  );
  editorState.apply(insertion, { skipHistoryDebounce: true });

  // If none of the above exclusive conditions are satisfied, we should format the text to [formatStyle].
  // 1. Delete the previous 'Character'.
  // 2. Update the style of the text surrounded by the two 'Character's to [formatStyle].
  // 3. Update the cursor position.
  const deletion = editorState.transaction;
  deletion.deleteText(node, lastCharIndex, 1);
  deletion.deleteText(node, selection.end.offset - 1, 1);
  editorState.apply(deletion);

  // Get the format style string
  const style = formatStyle;

  // If the text is already formatted, we should remove the format.
  const sliced = delta.slice(lastCharIndex + 1, selection.end.offset);
  const result = sliced.ops?.every(op => op.attributes?.[style] === true) || false;

  const format = editorState.transaction;
  format.formatText(
    node,
    lastCharIndex,
    selection.end.offset - lastCharIndex - 1,
    {
      [style]: !result,
    }
  );
  format.afterSelection = Selection.collapsed(
    new Position(path, selection.end.offset - 1)
  );
  editorState.apply(format);
  
  return true;
}