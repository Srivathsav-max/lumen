import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { PlatformExtension } from '../../../../util/platform_extension';
import { AppFlowyRichTextKeys } from '../../../../block_component/rich_text/rich_text_keys';
import { Color } from '../../../../infra/color';

/**
 * Toggle Color Commands
 *
 * Cmd / Ctrl + Shift + H: toggle highlight color
 * Cmd / Ctrl + Shift + T: toggle text color
 * - support
 *   - desktop
 *   - web
 */

export function toggleColorCommands(options: {
  style?: ToggleColorsStyle;
} = {}): CommandShortcutEvent[] {
  return [
    customToggleHighlightCommand({
      style: options.style ?? new ToggleColorsStyle(),
    }),
  ];
}

export class ToggleColorsStyle {
  readonly highlightColor: Color;

  constructor(options: {
    highlightColor?: Color;
  } = {}) {
    this.highlightColor = options.highlightColor ?? new Color(0x60FFCE00);
  }
}

export const toggleHighlightCommand = new CommandShortcutEvent({
  key: 'toggle highlight',
  getDescription: () => AppFlowyEditorL10n.current.cmdToggleHighlight,
  command: 'ctrl+shift+h',
  macOSCommand: 'cmd+shift+h',
  handler: (editorState) => toggleHighlight(
    editorState,
    { style: new ToggleColorsStyle() }
  ),
});

export function customToggleHighlightCommand(options: {
  style: ToggleColorsStyle;
}): CommandShortcutEvent {
  return new CommandShortcutEvent({
    key: 'toggle highlight',
    getDescription: () => AppFlowyEditorL10n.current.cmdToggleHighlight,
    command: 'ctrl+shift+h',
    macOSCommand: 'cmd+shift+h',
    handler: (editorState) => toggleHighlight(editorState, { style: options.style }),
  });
}

function toggleHighlight(
  editorState: EditorState,
  options: { style: ToggleColorsStyle }
): KeyEventResult {
  const { style } = options;
  
  if (PlatformExtension.isMobile) {
    console.assert(false, 'toggle highlight is not supported on mobile platform.');
    return KeyEventResult.ignored;
  }

  const selection = editorState.selection;
  if (!selection || selection.isCollapsed) {
    return KeyEventResult.ignored;
  }

  // check if already highlighted
  const nodes = editorState.getNodesInSelection(selection);
  const isHighlighted = nodes.allSatisfyInSelection(selection, (delta) => {
    return delta.everyAttributes(
      (attributes) => attributes[AppFlowyRichTextKeys.backgroundColor] !== undefined,
    );
  });

  editorState.formatDelta(
    selection,
    {
      [AppFlowyRichTextKeys.backgroundColor]:
        isHighlighted ? undefined : style.highlightColor.toHex(),
    },
  );

  return KeyEventResult.handled;
}