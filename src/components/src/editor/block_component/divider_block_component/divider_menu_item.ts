import { SelectionMenuItem, SelectionMenuIconWidget } from '../../../render/selection_menu/selection_menu';
import { EditorState, Selection, Position } from '../../../core/editor_state';
import { AppFlowyEditorL10n } from '../../../l10n/l10n';
import { dividerNode } from './divider_block_component';
import { paragraphNode } from '../../../core/node_factory';

export const dividerMenuItem: SelectionMenuItem = new SelectionMenuItem({
  getName: () => AppFlowyEditorL10n.current.divider,
  icon: (editorState, isSelected, style) => new SelectionMenuIconWidget({
    icon: 'horizontal_rule', // Material Icons name
    isSelected,
    style,
  }),
  keywords: ['horizontal rule', 'divider'],
  handler: (editorState: EditorState, _, __) => {
    const selection = editorState.selection;
    if (!selection || !selection.isCollapsed) {
      return;
    }
    const path = selection.end.path;
    const node = editorState.getNodeAtPath(path);
    const delta = node?.delta;
    if (!node || !delta) {
      return;
    }
    
    const insertedPath = delta.isEmpty ? path : [...path.slice(0, -1), path[path.length - 1] + 1];
    const nextPath = [...insertedPath.slice(0, -1), insertedPath[insertedPath.length - 1] + 1];
    
    const transaction = editorState.transaction;
    transaction.insertNode(insertedPath, dividerNode());
    transaction.insertNode(insertedPath, paragraphNode());
    transaction.afterSelection = Selection.collapsed(new Position(nextPath, 0));
    
    editorState.apply(transaction);
  },
});