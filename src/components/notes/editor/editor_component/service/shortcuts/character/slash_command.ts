import { EditorState } from '../../../../editor_state';
import { CharacterShortcutEvent } from '../character_shortcut_event';
import { SelectionMenuItem, SelectionMenuService, SelectionMenuStyle } from '../../../../selection_menu/selection_menu';
import { standardSelectionMenuItems } from '../../../../selection_menu/standard_selection_menu_items';
import { keepEditorFocusNotifier } from '../../../../focus/keep_editor_focus_notifier';
import { ParagraphBlockKeys, HeadingBlockKeys, TodoListBlockKeys, BulletedListBlockKeys, NumberedListBlockKeys, QuoteBlockKeys } from '../../../../block_component/block_keys';

const defaultSupportSlashMenuNodeTypes = new Set([
  ParagraphBlockKeys.type,
  HeadingBlockKeys.type,
  TodoListBlockKeys.type,
  BulletedListBlockKeys.type,
  NumberedListBlockKeys.type,
  QuoteBlockKeys.type,
]);

/**
 * Show the slash menu
 * 
 * - support
 *   - desktop
 *   - web
 */
export const slashCommand = new CharacterShortcutEvent({
  key: 'show the slash menu',
  character: '/',
  handler: async (editorState) => await showSlashMenu(
    editorState,
    standardSelectionMenuItems,
  ),
});

export function customSlashCommand(
  items: SelectionMenuItem[],
  options: {
    shouldInsertSlash?: boolean;
    deleteKeywordsByDefault?: boolean;
    singleColumn?: boolean;
    style?: SelectionMenuStyle;
    supportSlashMenuNodeTypes?: Set<string>;
  } = {}
): CharacterShortcutEvent {
  const {
    shouldInsertSlash = true,
    deleteKeywordsByDefault = false,
    singleColumn = true,
    style = SelectionMenuStyle.light,
    supportSlashMenuNodeTypes = defaultSupportSlashMenuNodeTypes,
  } = options;

  return new CharacterShortcutEvent({
    key: 'show the slash menu',
    character: '/',
    handler: (editorState) => showSlashMenu(
      editorState,
      items,
      {
        shouldInsertSlash,
        deleteKeywordsByDefault,
        singleColumn,
        style,
        supportSlashMenuNodeTypes,
      }
    ),
  });
}

let selectionMenuService: SelectionMenuService | null = null;

async function showSlashMenu(
  editorState: EditorState,
  items: SelectionMenuItem[],
  options: {
    shouldInsertSlash?: boolean;
    singleColumn?: boolean;
    deleteKeywordsByDefault?: boolean;
    style?: SelectionMenuStyle;
    supportSlashMenuNodeTypes?: Set<string>;
  } = {}
): Promise<boolean> {
  const {
    shouldInsertSlash = true,
    singleColumn = true,
    deleteKeywordsByDefault = false,
    style = SelectionMenuStyle.light,
    supportSlashMenuNodeTypes = defaultSupportSlashMenuNodeTypes,
  } = options;

  if (isMobile()) {
    return false;
  }

  const selection = editorState.selection;
  if (!selection) {
    return false;
  }

  // Delete the selection
  if (!selection.isCollapsed) {
    await editorState.deleteSelection(selection);
  }

  const afterSelection = editorState.selection;
  if (!afterSelection || !afterSelection.isCollapsed) {
    console.assert(false, 'the selection should be collapsed');
    return true;
  }

  const node = editorState.getNodeAtPath(selection.start.path);

  // Only enable in white-list nodes
  if (!node || !isSupportSlashMenuNode(node, supportSlashMenuNodeTypes)) {
    return false;
  }

  // Insert the slash character
  if (shouldInsertSlash) {
    keepEditorFocusNotifier.increase();
    await editorState.insertTextAtPosition('/', { position: selection.start });
  }

  // Show the slash menu
  const context = editorState.getNodeAtPath(selection.start.path)?.context;
  if (context) {
    selectionMenuService = new SelectionMenuService({
      context,
      editorState,
      selectionMenuItems: items,
      deleteSlashByDefault: shouldInsertSlash,
      deleteKeywordsByDefault,
      singleColumn,
      style,
    });

    if (!isTestEnvironment()) {
      await selectionMenuService.show();
    } else {
      selectionMenuService.show();
    }
  }

  if (shouldInsertSlash) {
    // Use setTimeout to simulate post-frame callback
    setTimeout(() => keepEditorFocusNotifier.decrease(), 0);
  }

  return true;
}

function isSupportSlashMenuNode(
  node: any,
  supportSlashMenuNodeWhiteList: Set<string>
): boolean {
  // Check if current node type is supported
  if (!supportSlashMenuNodeWhiteList.has(node.type)) {
    return false;
  }

  // If node has a parent and level > 1, recursively check parent nodes
  if (node.level > 1 && node.parent) {
    return isSupportSlashMenuNode(node.parent, supportSlashMenuNodeWhiteList);
  }

  return true;
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isTestEnvironment(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
}