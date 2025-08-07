import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../../service/shortcuts/command_shortcut_event';
import { EditorState } from '../../../core/editor_state';
import { 
  ParagraphBlockKeys, 
  NumberedListBlockKeys, 
  TodoListBlockKeys, 
  BulletedListBlockKeys, 
  QuoteBlockKeys, 
  HeadingBlockKeys 
} from '../../../core/block_keys';

// Add your custom block keys if it supports auto complete
export const autoCompletableBlockTypes = new Set([
  ParagraphBlockKeys.type,
  NumberedListBlockKeys.type,
  TodoListBlockKeys.type,
  BulletedListBlockKeys.type,
  QuoteBlockKeys.type,
  HeadingBlockKeys.type,
]);

/// Auto complete the current block
///
/// - support
///   - desktop
///   - web
///
export const tabToAutoCompleteCommand: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'tab to auto complete',
  getDescription: () => 'Tab to auto complete',
  command: 'tab',
  handler: _tabToAutoCompleteCommandHandler,
});

const _tabToAutoCompleteCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) {
    return KeyEventResult.ignored;
  }

  const context = editorState.document.root.context;
  const node = editorState.getNodeAtPath(selection.end.path);
  const delta = node?.delta;

  // Now, this command only support auto complete the text if the cursor is at the end of the block
  if (!context ||
      !node ||
      !autoCompletableBlockTypes.has(node.type) ||
      !delta ||
      selection.endIndex !== delta.length) {
    return KeyEventResult.ignored;
  }

  // Support async auto complete text provider in the future
  const autoCompleteText = editorState.autoCompleteTextProvider?.(
    context,
    node,
    null,
  );
  if (!autoCompleteText || autoCompleteText.length === 0) {
    return KeyEventResult.ignored;
  }

  const transaction = editorState.transaction;
  transaction.insertText(
    node,
    selection.endIndex,
    autoCompleteText,
  );
  editorState.apply(transaction);

  return KeyEventResult.handled;
};