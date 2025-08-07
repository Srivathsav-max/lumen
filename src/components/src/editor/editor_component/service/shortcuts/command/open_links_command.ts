import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { AppFlowyRichTextKeys } from '../../../../block_component/rich_text/rich_text_keys';
import { safeLaunchUrl } from '../../../../../infra/url_launcher';

/**
 * Option/Alt + Shift + Enter: to open links
 * - support
 *   - desktop
 *   - web
 */
export const openLinksCommand = new CommandShortcutEvent({
  key: 'open links',
  getDescription: () => AppFlowyEditorL10n.current.cmdOpenLinks,
  command: 'alt+shift+enter',
  handler: openLinksHandler,
});

function openLinksHandler(editorState: EditorState): KeyEventResult {
  const selection = editorState.selection;
  if (!selection || selection.isCollapsed) {
    return KeyEventResult.ignored;
  }

  const nodes = editorState.getNodesInSelection(selection);

  // A set to store the links which should be opened
  const links = new Set<string>();
  
  for (const node of nodes) {
    if (node.delta) {
      for (const op of node.delta.ops || []) {
        const href = op.attributes?.[AppFlowyRichTextKeys.href];
        if (href && typeof href === 'string') {
          links.add(href);
        }
      }
    }
  }

  for (const link of links) {
    safeLaunchUrl(link);
  }

  return KeyEventResult.handled;
}