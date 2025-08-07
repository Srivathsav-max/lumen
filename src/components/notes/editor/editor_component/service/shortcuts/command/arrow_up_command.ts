import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { Selection } from '../../../../selection';
import { SelectionUpdateReason } from '../../../../selection/selection_update_reason';
import { EditorStateSelectableUtils } from '../../../util/editor_state_selectable_extension';

export const arrowUpKeys = [
  moveCursorUpCommand,
  moveCursorTopSelectCommand,
  moveCursorTopCommand,
  moveCursorUpSelectCommand,
];

/**
 * Arrow up key events.
 * 
 * - support
 *   - desktop
 *   - web
 */

// Arrow up key - move the cursor upward vertically
export const moveCursorUpCommand = new CommandShortcutEvent({
  key: 'move the cursor upward',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorUp,
  command: 'arrow up',
  handler: moveCursorUpCommandHandler,
});

const moveCursorUpCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  const upPosition = selection.end.moveVertical(editorState);
  editorState.updateSelectionWithReason(
    upPosition ? Selection.collapsed(upPosition) : null,
    SelectionUpdateReason.uiEvent,
  );

  return KeyEventResult.handled;
};

// Arrow up + shift + ctrl or cmd - move cursor to top and select all
export const moveCursorTopSelectCommand = new CommandShortcutEvent({
  key: 'move cursor to start of file and select all',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorTopSelect,
  command: 'ctrl+shift+arrow up',
  macOSCommand: 'cmd+shift+arrow up',
  handler: moveCursorTopSelectCommandHandler,
});

const moveCursorTopSelectCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  const result = EditorStateSelectableUtils.getFirstSelectable(editorState);
  if (!result) {
    return KeyEventResult.ignored;
  }

  const position = result[1].start(result[0]);
  editorState.scrollService?.jumpToTop();
  editorState.updateSelectionWithReason(
    selection.copyWith({ end: position }),
    SelectionUpdateReason.uiEvent,
  );
  
  return KeyEventResult.handled;
};

// Arrow up + ctrl or cmd - move cursor to top
export const moveCursorTopCommand = new CommandShortcutEvent({
  key: 'move cursor to start of file',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorTop,
  command: 'ctrl+arrow up',
  macOSCommand: 'cmd+arrow up',
  handler: moveCursorTopCommandHandler,
});

const moveCursorTopCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  const result = EditorStateSelectableUtils.getFirstSelectable(editorState);
  if (!result) {
    return KeyEventResult.ignored;
  }

  const position = result[1].start(result[0]);
  editorState.scrollService?.jumpToTop();
  editorState.updateSelectionWithReason(
    Selection.collapsed(position),
    SelectionUpdateReason.uiEvent,
  );

  return KeyEventResult.handled;
};

// Arrow up + shift - move cursor up and select one line
export const moveCursorUpSelectCommand = new CommandShortcutEvent({
  key: 'move cursor up and select one line',
  getDescription: () => AppFlowyEditorL10n.current.cmdMoveCursorUpSelect,
  command: 'shift+arrow up',
  macOSCommand: 'shift+arrow up',
  handler: moveCursorUpSelectCommandHandler,
});

const moveCursorUpSelectCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }
  
  const end = selection.end.moveVertical(editorState);
  if (!end) {
    return KeyEventResult.ignored;
  }
  
  editorState.updateSelectionWithReason(
    selection.copyWith({ end }),
    SelectionUpdateReason.uiEvent,
  );
  
  return KeyEventResult.handled;
};