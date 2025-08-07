import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { Selection, Position } from '../../../../selection';
import { SelectionUpdateReason } from '../../../../selection/selection_update_reason';
import { EditorStateSelectableUtils } from '../../../util/editor_state_selectable_extension';

/**
 * Select all key event.
 * 
 * - support
 *   - desktop
 *   - web
 */
export const selectAllCommand = new CommandShortcutEvent({
  key: 'select all the selectable content',
  getDescription: () => AppFlowyEditorL10n.current.cmdSelectAll,
  command: 'ctrl+a',
  macOSCommand: 'cmd+a',
  handler: selectAllCommandHandler,
});

const selectAllCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  if (editorState.document.root.children.length === 0 || !editorState.selection) {
    return KeyEventResult.ignored;
  }
  
  const lastSelectable = EditorStateSelectableUtils.getLastSelectable(editorState);
  if (!lastSelectable) {
    return KeyEventResult.handled;
  }
  
  const start = new Position([0], 0);
  const end = lastSelectable[1].end(lastSelectable[0]);
  
  editorState.updateSelectionWithReason(
    new Selection(start, end),
    SelectionUpdateReason.selectAll,
  );
  
  return KeyEventResult.handled;
};