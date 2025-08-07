import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { AppFlowyRichTextKeys } from '../../../../block_component/rich_text/rich_text_keys';

export const toggleMarkdownCommands: CommandShortcutEvent[] = [
  toggleBoldCommand,
  toggleItalicCommand,
  toggleUnderlineCommand,
  toggleStrikethroughCommand,
  toggleCodeCommand,
];

/**
 * Markdown key event.
 *
 * Cmd / Ctrl + B: toggle bold
 * Cmd / Ctrl + I: toggle italic
 * Cmd / Ctrl + U: toggle underline
 * Cmd / Ctrl + Shift + S: toggle strikethrough
 * Cmd / Ctrl + E: code
 * - support
 *   - desktop
 *   - web
 */

export const toggleBoldCommand = new CommandShortcutEvent({
  key: 'toggle bold',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleBold,
  command: 'ctrl+b',
  macOSCommand: 'cmd+b',
  handler: (editorState) => toggleAttribute(
    editorState,
    AppFlowyRichTextKeys.bold,
  ),
});

export const toggleItalicCommand = new CommandShortcutEvent({
  key: 'toggle italic',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleItalic,
  command: 'ctrl+i',
  macOSCommand: 'cmd+i',
  handler: (editorState) => toggleAttribute(
    editorState,
    AppFlowyRichTextKeys.italic,
  ),
});

export const toggleUnderlineCommand = new CommandShortcutEvent({
  key: 'toggle underline',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleUnderline,
  command: 'ctrl+u',
  macOSCommand: 'cmd+u',
  handler: (editorState) => toggleAttribute(
    editorState,
    AppFlowyRichTextKeys.underline,
  ),
});

export const toggleStrikethroughCommand = new CommandShortcutEvent({
  key: 'toggle strikethrough',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleStrikethrough,
  command: 'ctrl+shift+s',
  macOSCommand: 'cmd+shift+s',
  handler: (editorState) => toggleAttribute(
    editorState,
    AppFlowyRichTextKeys.strikethrough,
  ),
});

export const toggleCodeCommand = new CommandShortcutEvent({
  key: 'toggle code',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleCode,
  command: 'ctrl+e',
  macOSCommand: 'cmd+e',
  handler: (editorState) => toggleAttribute(
    editorState,
    AppFlowyRichTextKeys.code,
  ),
});

function toggleAttribute(
  editorState: EditorState,
  key: string,
): KeyEventResult {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  editorState.toggleAttribute(key);

  return KeyEventResult.handled;
}