import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { Selection } from '../../../../selection';
import { SelectionUpdateReason } from '../../../../selection/selection_update_reason';
import { EditorStateSelectableUtils } from '../../../util/editor_state_selectable_extension';

export const arrowDownKeys = [
  moveCursorDownCommand,
  moveCursorBottomSelectCommand,
  moveCursorBottomCommand,
  moveCursorDownSelectCommand,
];

// Arrow down key - move cursor downward vertically
export const moveCursorDownCommand = new CommandShortcutEvent({
  key: 'move the cursor downward',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorDown,
  command: 'arrow down',
  handler: moveCursorDownCommandHandler,
});

const moveCursorDownCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  const downPosition = selection.end.moveVertical(editorState, { upwards: false });
  editorState.updateSelectionWithReason(
    downPosition ? Selection.collapsed(downPosition) : null,
    SelectionUpdateReason.uiEvent,
  );

  return KeyEventResult.handled;
};

// Arrow down + shift + ctrl/cmd - move cursor to bottom and select all
export const moveCursorBottomSelectCommand = new CommandShortcutEvent({
  key: 'move cursor to end of file and select all',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorBottomSelect,
  command: 'ctrl+shift+arrow down',
  macOSCommand: 'cmd+shift+arrow down',
  handler: moveCursorBottomSelectCommandHandler,
});

const moveCursorBottomSelectCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  const result = EditorStateSelectableUtils.getLastSelectable(editorState);
  if (!result) {
    return KeyEventResult.ignored;
  }

  const position = result[1].end(result[0]);
  editorState.scrollService?.jumpToBottom();
  editorState.updateSelectionWithReason(
    selection.copyWith({ end: position }),
    SelectionUpdateReason.uiEvent,
  );

  return KeyEventResult.handled;
};

// Arrow down + ctrl/cmd - move cursor to bottom
export const moveCursorBottomCommand = new CommandShortcutEvent({
  key: 'move cursor to end of file',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorBottom,
  command: 'ctrl+arrow down',
  macOSCommand: 'cmd+arrow down',
  handler: moveCursorBottomCommandHandler,
});

const moveCursorBottomCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  const result = EditorStateSelectableUtils.getLastSelectable(editorState);
  if (!result) {
    return KeyEventResult.ignored;
  }

  const position = result[1].end(result[0]);
  editorState.scrollService?.jumpToBottom();
  editorState.updateSelectionWithReason(
    Selection.collapsed(position),
    SelectionUpdateReason.uiEvent,
  );

  return KeyEventResult.handled;
};

// Arrow down + shift - move cursor down and select one line
export const moveCursorDownSelectCommand = new CommandShortcutEvent({
  key: 'move cursor down and select one line',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorDownSelect,
  command: 'shift+arrow down',
  macOSCommand: 'shift+arrow down',
  handler: moveCursorDownSelectCommandHandler,
});

const moveCursorDownSelectCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  const end = selection.end.moveVertical(editorState, { upwards: false });
  if (!end) {
    return KeyEventResult.ignored;
  }
  
  editorState.updateSelectionWithReason(
    selection.copyWith({ end }),
    SelectionUpdateReason.uiEvent,
  );
  
  return KeyEventResult.handled;
};