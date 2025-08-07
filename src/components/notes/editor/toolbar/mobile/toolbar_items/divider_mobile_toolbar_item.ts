import { MobileToolbarItem } from '../mobile_toolbar_item';
import { Position } from '../../../../core/location/position';
import { Selection } from '../../../../core/location/selection';

export const dividerMobileToolbarItem = MobileToolbarItem.action({
  itemIconBuilder: (context, editorState, service) => {
    const icon = document.createElement('div');
    icon.style.cssText = `
      width: 24px;
      height: 24px;
      background-color: currentColor;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    `;
    icon.textContent = '—';
    return icon;
  },
  actionHandler: (editorState) => {
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
    
    const insertedPath = delta.isEmpty ? path : path.next;
    const transaction = editorState.transaction;
    
    // Create divider node (simplified)
    const dividerNode = {
      type: 'divider',
      attributes: {}
    };
    
    transaction.insertNode(insertedPath, [dividerNode]);
    
    // Insert paragraph if needed
    const next = node.next;
    if (!next || next.type !== 'paragraph' || next.delta?.isNotEmpty) {
      const paragraphNode = {
        type: 'paragraph',
        attributes: { delta: [] }
      };
      transaction.insertNode(insertedPath, [paragraphNode]);
    }
    
    transaction.afterSelection = Selection.collapsed(
      new Position({ path: insertedPath.next, offset: 0 })
    );
    
    editorState.apply(transaction);
  }
});