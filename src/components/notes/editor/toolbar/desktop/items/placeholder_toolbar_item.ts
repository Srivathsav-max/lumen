import { ToolbarItem } from '../../../../render/toolbar/toolbar_item';

export const placeholderItemId = 'editor.placeholder';

export const placeholderItem = new ToolbarItem({
  id: placeholderItemId,
  group: -1,
  isActive: (editorState) => true,
  builder: (context, editorState, highlightColor, iconColor, tooltipBuilder) => {
    const container = document.createElement('div');
    container.style.cssText = `
      padding: 8px 5px;
      display: flex;
      align-items: center;
    `;
    
    const separator = document.createElement('div');
    separator.style.cssText = `
      width: 1px;
      height: 20px;
      background-color: #ccc;
    `;
    
    container.appendChild(separator);
    return container;
  }
});