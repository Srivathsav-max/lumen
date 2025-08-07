import { CharacterShortcutEvent } from '../../service/shortcuts/character_shortcut_event';
import { EditorState, Selection, Position } from '../../../core/editor_state';
import { dividerNode } from './divider_block_component';
import { paragraphNode } from '../../../core/node_factory';

/// insert divider into a document by typing three dashes (-)
/// or one em dash (—) and one dash (-)
///
/// - support
///   - desktop
///   - web
///   - mobile
///
export const convertMinusesToDivider: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'convert minuses to a divider',
  character: '-',
  handler: async (editorState: EditorState) =>
      await _convertSyntaxToDivider(editorState, '--') ||
      await _convertSyntaxToDivider(editorState, '—'),
});

export const convertStarsToDivider: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'convert stars to a divider',
  character: '*',
  handler: (editorState: EditorState) => _convertSyntaxToDivider(editorState, '**'),
});

export const convertUnderscoreToDivider: CharacterShortcutEvent = new CharacterShortcutEvent({
  key: 'convert underscore to a divider',
  character: '_',
  handler: (editorState: EditorState) => _convertSyntaxToDivider(editorState, '__'),
});

async function _convertSyntaxToDivider(
  editorState: EditorState,
  syntax: string,
): Promise<boolean> {
  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) {
    return false;
  }
  const path = selection.end.path;
  const node = editorState.getNodeAtPath(path);
  const delta = node?.delta;
  if (!node || !delta) {
    return false;
  }
  if (delta.toPlainText() !== syntax) {
    return false;
  }
  
  const nextPath = [...path];
  nextPath[nextPath.length - 1]++;
  
  const transaction = editorState.transaction;
  transaction.insertNode(path, dividerNode());
  transaction.insertNode(path, paragraphNode());
  transaction.deleteNode(node);
  transaction.afterSelection = Selection.collapsed(new Position(nextPath, 0));
  
  editorState.apply(transaction);
  return true;
}