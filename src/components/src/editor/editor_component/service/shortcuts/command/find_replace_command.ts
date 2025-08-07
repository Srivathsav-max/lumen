import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { FindReplaceService, FindReplaceMenu } from '../../../find_replace_menu/find_menu_service';

export interface FindReplaceStyle {
  selectedHighlightColor?: string;
  unselectedHighlightColor?: string;
  findMenuBuilder?: (
    context: any,
    editorState: EditorState,
    localizations?: FindReplaceLocalizations,
    style: FindReplaceStyle,
    showReplaceMenu: boolean,
    onDismiss: () => void,
  ) => HTMLElement;
}

export interface FindReplaceLocalizations {
  find: string;
  previousMatch: string;
  nextMatch: string;
  close: string;
  replace: string;
  replaceAll: string;
  noResult: string;
}

export function findAndReplaceCommands(options: {
  localizations?: FindReplaceLocalizations;
  context: any;
  style?: FindReplaceStyle;
}): CommandShortcutEvent[] {
  const { localizations, context, style = {} } = options;
  
  return [
    openFindDialog({ localizations, context, style }),
    openReplaceDialog({ localizations, context, style }),
  ];
}

/**
 * Show the find dialog
 * 
 * - support
 *   - desktop
 *   - web
 */
export function openFindDialog(options: {
  localizations?: FindReplaceLocalizations;
  context: any;
  style: FindReplaceStyle;
}): CommandShortcutEvent {
  return new CommandShortcutEvent({
    key: 'show the find dialog',
    getDescription: () => AppFlowyEditorL10n.current.cmdOpenFind,
    command: 'ctrl+f',
    macOSCommand: 'cmd+f',
    handler: (editorState) => showFindAndReplaceDialog(
      options.context,
      editorState,
      {
        localizations: options.localizations,
        style: options.style,
      }
    ),
  });
}

export function openReplaceDialog(options: {
  localizations?: FindReplaceLocalizations;
  context: any;
  style: FindReplaceStyle;
}): CommandShortcutEvent {
  return new CommandShortcutEvent({
    key: 'show the find and replace dialog',
    getDescription: () => AppFlowyEditorL10n.current.cmdOpenFindAndReplace,
    command: 'ctrl+h',
    macOSCommand: 'cmd+h',
    handler: (editorState) => showFindAndReplaceDialog(
      options.context,
      editorState,
      {
        localizations: options.localizations,
        style: options.style,
        openReplace: true,
      }
    ),
  });
}

let findReplaceService: FindReplaceService | null = null;

function showFindAndReplaceDialog(
  context: any,
  editorState: EditorState,
  options: {
    localizations?: FindReplaceLocalizations;
    style: FindReplaceStyle;
    openReplace?: boolean;
  }
): KeyEventResult {
  if (isMobile()) {
    return KeyEventResult.ignored;
  }

  const { localizations, style, openReplace = false } = options;

  findReplaceService = new FindReplaceMenu({
    context,
    editorState,
    showReplaceMenu: openReplace,
    localizations,
    style: {
      selectedHighlightColor: style.selectedHighlightColor || '#FFB931',
      unselectedHighlightColor: style.unselectedHighlightColor || 'rgba(236, 188, 95, 0.38)',
      findMenuBuilder: style.findMenuBuilder,
    },
    showRegexButton: true,
    showCaseSensitiveButton: true,
  });

  findReplaceService.show();

  return KeyEventResult.handled;
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}