import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { Selection } from '../../../../selection';
import { SelectionUpdateReason } from '../../../../selection/selection_update_reason';
import { SelectionMoveRange, SelectionRange } from '../../../../selection/selection_range';

export const arrowRightKeys = [
  moveCursorRightCommand,
  moveCursorToEndCommand,
  moveCursorToRightWordCommand,
  moveCursorRightSelectCommand,
  moveCursorEndSelectCommand,
  moveCursorRightWordSelectCommand,
];

/**
 * Arrow right key events.
 * 
 * - support
 *   - desktop
 *   - web
 */

// Arrow right key - move cursor forward one character
export const moveCursorRightCommand = new CommandShortcutEvent({
  key: 'move the cursor forward one character',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorRight,
  command: 'arrow right',
  handler: arrowRightCommandHandler,
});

const arrowRightCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  if (isRTL(editorState)) {
    editorState.moveCursorForward(SelectionMoveRange.character);
  } else {
    editorState.moveCursorBackward(SelectionMoveRange.character);
  }
  
  return KeyEventResult.handled;
};

// Arrow right + ctrl/cmd - move cursor to end of line
export const moveCursorToEndCommand = new CommandShortcutEvent({
  key: 'move the cursor to the end of line',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorLineEnd,
  command: 'end',
  macOSCommand: 'cmd+arrow right',
  handler: moveCursorToEndCommandHandler,
});

const moveCursorToEndCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  if (isRTL(editorState)) {
    editorState.moveCursorForward(SelectionMoveRange.line);
  } else {
    editorState.moveCursorBackward(SelectionMoveRange.line);
  }
  
  return KeyEventResult.handled;
};

// Arrow right + alt - move cursor to right word
export const moveCursorToRightWordCommand = new CommandShortcutEvent({
  key: 'move the cursor to the right word',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorWordRight,
  command: 'ctrl+arrow right',
  macOSCommand: 'alt+arrow right',
  handler: moveCursorToRightWordCommandHandler,
});

const moveCursorToRightWordCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  const node = editorState.getNodeAtPath(selection.end.path);
  const delta = node?.delta;

  if (!node || !delta) {
    return KeyEventResult.ignored;
  }

  if (isRTL(editorState)) {
    const startOfWord = selection.end.moveHorizontal(
      editorState,
      { selectionRange: SelectionRange.word }
    );
    if (!startOfWord) {
      return KeyEventResult.ignored;
    }
    const selectedWord = delta.toPlainText().substring(
      startOfWord.offset,
      selection.end.offset,
    );
    // Check if the selected word is whitespace
    if (selectedWord.trim().length === 0) {
      editorState.moveCursorForward(SelectionMoveRange.word);
    }
    editorState.moveCursorForward(SelectionMoveRange.word);
  } else {
    const endOfWord = selection.end.moveHorizontal(
      editorState,
      { forward: false, selectionRange: SelectionRange.word }
    );
    if (!endOfWord) {
      return KeyEventResult.handled;
    }
    const selectedLine = delta.toPlainText();
    const selectedWord = selectedLine.substring(
      selection.end.offset,
      endOfWord.offset,
    );
    // Check if the selected word is whitespace
    if (selectedWord.trim().length === 0) {
      editorState.moveCursorBackward(SelectionMoveRange.word);
    }
    editorState.moveCursorBackward(SelectionMoveRange.word);
  }
  
  return KeyEventResult.handled;
};

// Arrow right + alt + shift - select right word
export const moveCursorRightWordSelectCommand = new CommandShortcutEvent({
  key: 'move the cursor to select the right word',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorWordRightSelect,
  command: 'ctrl+shift+arrow right',
  macOSCommand: 'alt+shift+arrow right',
  handler: moveCursorRightWordSelectCommandHandler,
});

const moveCursorRightWordSelectCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  let forward = false;
  if (isRTL(editorState)) {
    forward = true;
  }
  
  const end = selection.end.moveHorizontal(
    editorState,
    { selectionRange: SelectionRange.word, forward }
  );
  if (!end) {
    return KeyEventResult.ignored;
  }
  
  editorState.updateSelectionWithReason(
    selection.copyWith({ end }),
    SelectionUpdateReason.uiEvent,
  );
  
  return KeyEventResult.handled;
};

// Arrow right + shift - select one character
export const moveCursorRightSelectCommand = new CommandShortcutEvent({
  key: 'move the cursor right select',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorRightSelect,
  command: 'shift+arrow right',
  handler: moveCursorRightSelectCommandHandler,
});

const moveCursorRightSelectCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  let forward = false;
  if (isRTL(editorState)) {
    forward = true;
  }
  
  const end = selection.end.moveHorizontal(editorState, { forward });
  if (!end) {
    return KeyEventResult.ignored;
  }
  
  editorState.updateSelectionWithReason(
    selection.copyWith({ end }),
    SelectionUpdateReason.uiEvent,
  );
  
  return KeyEventResult.handled;
};

// Arrow right + shift + ctrl/cmd - select to end of line
export const moveCursorEndSelectCommand = new CommandShortcutEvent({
  key: 'move cursor to select till end of line',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorLineEndSelect,
  command: 'shift+end',
  macOSCommand: 'cmd+shift+arrow right',
  handler: moveCursorEndSelectCommandHandler,
});

const moveCursorEndSelectCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  const nodes = editorState.getNodesInSelection(selection);
  if (nodes.length === 0) {
    return KeyEventResult.ignored;
  }
  
  let end = selection.end;
  const position = isRTL(editorState)
    ? nodes[nodes.length - 1].selectable?.start()
    : nodes[nodes.length - 1].selectable?.end();
  
  if (position) {
    end = position;
  }
  
  editorState.updateSelectionWithReason(
    selection.copyWith({ end }),
    SelectionUpdateReason.uiEvent,
  );
  
  return KeyEventResult.handled;
};

function isRTL(editorState: EditorState): boolean {
  // Simple RTL detection - in a real implementation, this would check the text direction
  return false; // Default to LTR for now
}