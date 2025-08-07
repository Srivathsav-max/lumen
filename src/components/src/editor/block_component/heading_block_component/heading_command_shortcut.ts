import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../../service/shortcuts/command_shortcut_event';
import { EditorState, Selection } from '../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../l10n/l10n';
import { HeadingBlockKeys } from './heading_block_component';
import { ParagraphBlockKeys } from '../../../core/block_keys';
import { blockComponentBackgroundColor, blockComponentTextDirection, blockComponentDelta } from '../../../core/constants';
import { Delta } from '../../../core/delta';

export const toggleHeadingCommands: CommandShortcutEvent[] = [
  toggleH1,
  toggleH2,
  toggleH3,
  toggleBody,
];

/// Markdown key event.
///
/// Cmd / Ctrl + Shift + T: toggle H1
/// Cmd / Ctrl + Shift + G: toggle H2
/// Cmd / Ctrl + Shift + J: toggle H3
/// Cmd / Ctrl + Shift + B: toggle Body
/// - support
///   - desktop
///   - web
///
export const toggleH1: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'toggle into Heading 1',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleH1,
  command: 'ctrl+shift+t',
  macOSCommand: 'cmd+shift+t',
  handler: (editorState: EditorState) => _toggleAttribute(editorState, 1),
});

export const toggleH2: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'toggle into Heading 2',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleH2,
  command: 'ctrl+shift+g',
  macOSCommand: 'cmd+shift+g',
  handler: (editorState: EditorState) => _toggleAttribute(editorState, 2),
});

export const toggleH3: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'toggle into Heading 3',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleH3,
  command: 'ctrl+shift+j',
  macOSCommand: 'cmd+shift+j',
  handler: (editorState: EditorState) => _toggleAttribute(editorState, 3),
});

export const toggleBody: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'toggle Body',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleBody,
  command: 'ctrl+shift+b',
  macOSCommand: 'cmd+shift+b',
  handler: (editorState: EditorState) => _toggleAttribute(editorState, 1, true),
});

function _toggleAttribute(
  editorState: EditorState,
  level?: number,
  isBody?: boolean,
): KeyEventResult {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  const node = editorState.getNodeAtPath(selection.start.path)!;
  const isHeading = isBody ?? 
    (node.type === HeadingBlockKeys.type && 
     node.attributes[HeadingBlockKeys.level] === level);

  const delta = (node.delta || new Delta()).toJson();

  editorState.formatNode(
    selection,
    (node) => node.copyWith({
      type: isHeading ? ParagraphBlockKeys.type : HeadingBlockKeys.type,
      attributes: {
        [HeadingBlockKeys.level]: level,
        [blockComponentBackgroundColor]: node.attributes[blockComponentBackgroundColor],
        [blockComponentTextDirection]: node.attributes[blockComponentTextDirection],
        [blockComponentDelta]: delta,
      },
    }),
  );

  return KeyEventResult.handled;
}