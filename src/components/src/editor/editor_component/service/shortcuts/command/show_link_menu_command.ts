import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { PlatformExtension } from '../../../../util/platform_extension';
import { BuiltInAttributeKey } from '../../../../core/attributes';
import { showLinkMenu } from '../../../../toolbar/link_menu';

/**
 * Cmd / Ctrl + K: show link menu
 * - support
 *   - desktop
 *   - web
 */
export const showLinkMenuCommand = new CommandShortcutEvent({
  key: 'link menu',
  getDescription: () => AppFlowyEditorL10n.current.cmdConvertToLink,
  command: 'ctrl+k',
  macOSCommand: 'cmd+k',
  handler: showLinkMenuHandler,
});

function showLinkMenuHandler(editorState: EditorState): KeyEventResult {
  if (PlatformExtension.isMobile) {
    console.assert(false, 'showLinkMenuCommand is not supported on mobile platform.');
    return KeyEventResult.ignored;
  }

  const selection = editorState.selection;
  if (!selection || selection.isCollapsed) {
    return KeyEventResult.ignored;
  }
  
  const context = editorState.getNodeAtPath(selection.end.path)?.key.currentContext;
  if (!context) {
    return KeyEventResult.ignored;
  }
  
  const nodes = editorState.getNodesInSelection(selection);
  const isHref = nodes.allSatisfyInSelection(selection, (delta) => {
    return delta.everyAttributes(
      (attributes) => attributes[BuiltInAttributeKey.href] !== undefined,
    );
  });

  showLinkMenu(
    context,
    editorState,
    selection,
    isHref,
  );

  return KeyEventResult.handled;
}