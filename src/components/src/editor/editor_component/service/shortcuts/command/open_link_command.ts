import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { EditorState } from '../../../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';
import { BuiltInAttributeKey } from '../../../../../core/attributes';
import { editorLaunchUrl } from '../../../../../core/utils';

/// Option/Alt + Enter: to open inline link
/// - support
///   - desktop
///   - web
///
export const openInlineLinkCommand: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'open inline link',
  getDescription: () => AppFlowyEditorL10n.current.cmdOpenLink,
  command: 'alt+enter',
  handler: _openInlineLink,
});

const _openInlineLink: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection || selection.isCollapsed) {
    return KeyEventResult.ignored;
  }

  const nodes = editorState.getNodesInSelection(selection);

  const isHref = nodes.allSatisfyInSelection(selection, (delta) => {
    return delta.everyAttributes(
      (attributes) => attributes[BuiltInAttributeKey.href] != null,
    );
  });

  let linkText: string | null = null;
  if (isHref) {
    linkText = editorState.getDeltaAttributeValueInSelection(
      BuiltInAttributeKey.href,
      selection,
    );
  }

  if (linkText) {
    editorLaunchUrl(linkText);
  }

  return KeyEventResult.handled;
};