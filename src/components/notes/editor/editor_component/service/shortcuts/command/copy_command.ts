import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { Document } from '../../../../document';
import { documentToHTML } from '../../../../plugins/html/html_document';
import { AppFlowyClipboard } from '../../../../../infra/clipboard';

/**
 * Copy command
 * 
 * - support
 *   - desktop
 *   - web
 */
export const copyCommand = new CommandShortcutEvent({
  key: 'copy the selected content',
  getDescription: () => AppFlowyEditorL10n.current.cmdCopySelection,
  command: 'ctrl+c',
  macOSCommand: 'cmd+c',
  handler: copyCommandHandler,
});

const copyCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection?.normalized;
  if (!selection || selection.isCollapsed) {
    return KeyEventResult.ignored;
  }

  // Plain text
  const text = editorState.getTextInSelection(selection).join('\n');

  // HTML
  const nodes = editorState.getSelectedNodes({ selection });
  const document = Document.blank();
  document.insert([0], nodes);
  const html = documentToHTML(document);

  // Async operation
  (async () => {
    await AppFlowyClipboard.setData({
      text: text.length > 0 ? text : undefined,
      html: html.length > 0 ? html : undefined,
    });
  })();

  return KeyEventResult.handled;
};