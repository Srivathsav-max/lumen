import { MobileToolbarItem } from '../mobile_toolbar_item';

export const todoListMobileToolbarItem = MobileToolbarItem.action({
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
      font-size: 16px;
    `;
    icon.textContent = '☐';
    return icon;
  },
  actionHandler: async (editorState) => {
    const selection = editorState.selection;
    if (!selection) {
      return;
    }
    
    const node = editorState.getNodeAtPath(selection.start.path);
    if (!node) {
      return;
    }
    
    const isTodoList = node.type === 'todo_list';
    
    editorState.formatNode(
      selection,
      (node) => node.copyWith({
        type: isTodoList ? 'paragraph' : 'todo_list',
        attributes: {
          checked: false,
          delta: node.delta?.toJson() || []
        }
      })
    );
  }
});