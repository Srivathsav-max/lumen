import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../../service/shortcuts/command_shortcut_event';
import { EditorState } from '../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../l10n/l10n';
import { 
  BulletedListBlockKeys, 
  NumberedListBlockKeys, 
  TodoListBlockKeys, 
  QuoteBlockKeys, 
  HeadingBlockKeys,
  ParagraphBlockKeys 
} from '../../../core/block_keys';
import { blockComponentTextDirection } from '../../../core/constants';
import { paragraphNode } from '../../../core/node_factory';

export const convertibleBlockTypes = [
  BulletedListBlockKeys.type,
  NumberedListBlockKeys.type,
  TodoListBlockKeys.type,
  QuoteBlockKeys.type,
  HeadingBlockKeys.type,
];

/// Convert to paragraph command.
///
/// - support
///   - desktop
///   - web
///   - mobile
///
/// convert the current block to paragraph.
export const convertToParagraphCommand: CommandShortcutEvent = new CommandShortcutEvent({
  key: 'convert to paragraph',
  getDescription: () => AppFlowyEditorL10n.current.cmdConvertToParagraph,
  command: 'backspace',
  handler: _convertToParagraphCommandHandler,
});

const _convertToParagraphCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) {
    return KeyEventResult.ignored;
  }
  const node = editorState.getNodeAtPath(selection.end.path);
  const delta = node?.delta;
  if (!node ||
      !delta ||
      !convertibleBlockTypes.includes(node.type)) {
    return KeyEventResult.ignored;
  }
  const index = delta.prevRunePosition(selection.startIndex);
  if (index >= 0) {
    return KeyEventResult.ignored;
  }
  const textDirection = node.attributes[blockComponentTextDirection];
  const transaction = editorState.transaction;
  transaction.insertNode(
    node.path,
    paragraphNode({
      attributes: {
        [ParagraphBlockKeys.delta]: delta.toJson(),
      },
      textDirection,
      children: node.children,
    }),
    { deepCopy: true },
  );
  transaction.deleteNode(node);
  transaction.afterSelection = transaction.beforeSelection;
  editorState.apply(transaction);
  return KeyEventResult.handled;
};