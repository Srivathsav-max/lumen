import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { Selection } from '../../../../selection';
import { SelectionRange } from '../../../../selection/selection_range';
import { backspaceCommand } from './backspace_command';
import { deleteCommand } from './delete_command';

/**
 * Delete word commands
 * 
 * - support
 *   - desktop
 *   - web
 */

export const deleteLeftWordCommand = new CommandShortcutEvent({
  key: 'delete the left word',
  getDescription: () => AppFlowyEditorL10n.current.cmdDeleteWordLeft,
  command: 'ctrl+backspace',
  macOSCommand: 'alt+backspace',
  handler: deleteLeftWordCommandHandler,
});

export const deleteRightWordCommand = new CommandShortcutEvent({
  key: 'delete the right word',
  getDescription: () => AppFlowyEditorL10n.current.cmdDeleteWordRight,
  command: 'ctrl+delete',
  macOSCommand: 'alt+delete',
  handler: deleteRightWordCommandHandler,
});

const deleteLeftWordCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection || !selection.isSingle) {
    return KeyEventResult.ignored;
  }

  const node = editorState.getNodeAtPath(selection.end.path);
  const delta = node?.delta;
  if (!node || !delta) {
    return KeyEventResult.ignored;
  }

  // If the selection is not collapsed, we should just delete the selected text.
  // If the selection is collapsed and at the beginning of the line, we should delete the newline.
  if (!selection.isCollapsed || (selection.isCollapsed && selection.start.offset === 0)) {
    return backspaceCommand.execute(editorState);
  }

  // We store the position where the current word starts.
  let startOfWord = selection.end.moveHorizontal(
    editorState,
    { selectionRange: SelectionRange.word }
  );

  if (!startOfWord) {
    return KeyEventResult.ignored;
  }

  // Check if the selected word is whitespace
  const selectedWord = delta.toPlainText().substring(
    startOfWord.offset,
    selection.end.offset,
  );

  // If it is whitespace then we have to update the selection to include
  // the left word from the whitespace.
  if (selectedWord.trim().length === 0) {
    // Make a new selection from the left of the whitespace.
    const newSelection = Selection.single({
      path: startOfWord.path,
      startOffset: startOfWord.offset,
    });

    // We need to check if this position is not null
    const newStartOfWord = newSelection.end.moveHorizontal(
      editorState,
      { selectionRange: SelectionRange.word }
    );

    // This handles the edge case where the textNode only consists of single space.
    if (newStartOfWord) {
      startOfWord = newStartOfWord;
    }
  }

  const transaction = editorState.transaction;
  transaction.deleteText(
    node,
    startOfWord.offset,
    selection.end.offset - startOfWord.offset,
  );

  editorState.apply(transaction);

  return KeyEventResult.handled;
};

const deleteRightWordCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection || !selection.isSingle) {
    return KeyEventResult.ignored;
  }

  const node = editorState.getNodeAtPath(selection.end.path);
  const delta = node?.delta;
  if (!node || !delta) {
    return KeyEventResult.ignored;
  }

  if (selection.isCollapsed && selection.start.offset === delta.length) {
    return deleteCommand.execute(editorState);
  }

  // We store the position where the current word ends.
  let endOfWord = selection.end.moveHorizontal(
    editorState,
    { forward: false, selectionRange: SelectionRange.word }
  );

  if (!endOfWord) {
    return KeyEventResult.ignored;
  }

  // Check if the selected word is whitespace
  const selectedLine = delta.toPlainText();
  const selectedWord = selectedLine.substring(
    selection.end.offset,
    endOfWord.offset,
  );

  // If it is whitespace then we have to update the selection to include
  // the right word from the whitespace.
  if (selectedWord.trim().length === 0) {
    // Make a new selection to the right of the whitespace.
    const newSelection = Selection.single({
      path: endOfWord.path,
      startOffset: endOfWord.offset,
    });

    // We need to check if this position is not null
    const newEndOfWord = newSelection.end.moveHorizontal(
      editorState,
      { forward: false, selectionRange: SelectionRange.word }
    );

    // This handles the edge case where the textNode only consists of single space.
    if (newEndOfWord) {
      endOfWord = newEndOfWord;
    }
  }

  const transaction = editorState.transaction;
  transaction.deleteText(
    node,
    selection.end.offset,
    endOfWord.offset - selection.end.offset,
  );

  editorState.apply(transaction);

  return KeyEventResult.handled;
};