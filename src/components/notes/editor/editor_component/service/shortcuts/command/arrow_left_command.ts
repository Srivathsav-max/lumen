import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { SelectionMoveRange, SelectionRange } from '../../../../selection/selection_move_range';
import { SelectionUpdateReason } from '../../../../selection/selection_update_reason';
import { TextDirection } from '../../../../infra/text_direction';

export const arrowLeftKeys: CommandShortcutEvent[] = [
  moveCursorLeftCommand,
  moveCursorToBeginCommand,
  moveCursorToLeftWordCommand,
  moveCursorLeftSelectCommand,
  moveCursorBeginSelectCommand,
  moveCursorLeftWordSelectCommand,
];

/**
 * Arrow left key events.
 *
 * - support
 *   - desktop
 *   - web
 */

// arrow left key
// move the cursor forward one character
export const moveCursorLeftCommand = new CommandShortcutEvent({
  key: 'move the cursor backward one character',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorLeft,
  command: 'arrow left',
  handler: arrowLeftCommandHandler,
});

const arrowLeftCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  if (isRTL(editorState)) {
    editorState.moveCursorBackward(SelectionMoveRange.character);
  } else {
    editorState.moveCursorForward(SelectionMoveRange.character);
  }
  
  return KeyEventResult.handled;
};

// arrow left key + ctrl or command
// move the cursor to the beginning of the block
export const moveCursorToBeginCommand = new CommandShortcutEvent({
  key: 'move the cursor at the start of line',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorLineStart,
  command: 'home',
  macOSCommand: 'cmd+arrow left',
  handler: moveCursorToBeginCommandHandler,
});

const moveCursorToBeginCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  if (isRTL(editorState)) {
    editorState.moveCursorBackward(SelectionMoveRange.line);
  } else {
    editorState.moveCursorForward(SelectionMoveRange.line);
  }
  
  return KeyEventResult.handled;
};

// arrow left key + alt
// move the cursor to the left word
export const moveCursorToLeftWordCommand = new CommandShortcutEvent({
  key: 'move the cursor to the left word',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorWordLeft,
  command: 'ctrl+arrow left',
  macOSCommand: 'alt+arrow left',
  handler: moveCursorToLeftWordCommandHandler,
});

const moveCursorToLeftWordCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
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
    const endOfWord = selection.end.moveHorizontal(
      editorState,
      { forward: false, selectionRange: SelectionRange.word }
    );
    if (endOfWord) {
      const selectedWord = delta.toPlainText().substring(
        selection.end.offset,
        endOfWord.offset,
      );
      // check if the selected word is whitespace
      if (selectedWord.trim().length === 0) {
        editorState.moveCursorBackward(SelectionMoveRange.word);
      }
    }
    editorState.moveCursorBackward(SelectionMoveRange.word);
  } else {
    const startOfWord = selection.end.moveHorizontal(
      editorState,
      { selectionRange: SelectionRange.word }
    );
    if (!startOfWord) {
      return KeyEventResult.handled;
    }
    const selectedWord = delta.toPlainText().substring(
      startOfWord.offset,
      selection.end.offset,
    );
    // check if the selected word is whitespace
    if (selectedWord.trim().length === 0) {
      editorState.moveCursorForward(SelectionMoveRange.word);
    }
    editorState.moveCursorForward(SelectionMoveRange.word);
  }
  
  return KeyEventResult.handled;
};

// arrow left key + alt + shift
export const moveCursorLeftWordSelectCommand = new CommandShortcutEvent({
  key: 'move the cursor to select the left word',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorWordLeftSelect,
  command: 'ctrl+shift+arrow left',
  macOSCommand: 'alt+shift+arrow left',
  handler: moveCursorLeftWordSelectCommandHandler,
});

const moveCursorLeftWordSelectCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  let forward = true;
  if (isRTL(editorState)) {
    forward = false;
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

// arrow left key + shift
// selects only one character
export const moveCursorLeftSelectCommand = new CommandShortcutEvent({
  key: 'move the cursor left select',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorLeftSelect,
  command: 'shift+arrow left',
  handler: moveCursorLeftSelectCommandHandler,
});

const moveCursorLeftSelectCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  let forward = true;
  if (isRTL(editorState)) {
    forward = false;
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

export const moveCursorBeginSelectCommand = new CommandShortcutEvent({
  key: 'move cursor to select till start of line',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorLineStartSelect,
  command: 'shift+home',
  macOSCommand: 'cmd+shift+arrow left',
  handler: moveCursorBeginSelectCommandHandler,
});

const moveCursorBeginSelectCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
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
    ? nodes[nodes.length - 1].selectable?.end()
    : nodes[nodes.length - 1].selectable?.start();
  
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
  if (editorState.selection) {
    const node = editorState.getNodeAtPath(editorState.selection.end.path);
    return node?.selectable?.textDirection() === TextDirection.rtl;
  }
  return false;
}