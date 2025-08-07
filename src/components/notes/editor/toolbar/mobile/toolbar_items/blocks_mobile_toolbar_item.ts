import { MobileToolbarItem } from '../mobile_toolbar_item';
import { EditorState } from '../../../../editor_state';
import { MobileToolbarWidgetService } from '../mobile_toolbar_v2';

export const blocksMobileToolbarItem = MobileToolbarItem.withMenu({
  itemIconBuilder: (context, editorState, service) => {
    const icon = document.createElement('div');
    icon.style.cssText = `
      width: 24px;
      height: 24px;
      background-color: currentColor;
      border-radius: 2px;
    `;
    icon.textContent = '☰';
    return icon;
  },
  itemMenuBuilder: (editorState, service) => {
    const selection = editorState.selection;
    if (!selection) {
      return null;
    }
    return new BlocksMenu(editorState, selection).render();
  }
});

class BlocksMenu {
  private editorState: EditorState;
  private selection: any;

  constructor(editorState: EditorState, selection: any) {
    this.editorState = editorState;
    this.selection = selection;
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 8px;
    `;

    const blocks = [
      { name: 'heading', level: 1, label: 'Heading 1', icon: 'H1' },
      { name: 'heading', level: 2, label: 'Heading 2', icon: 'H2' },
      { name: 'heading', level: 3, label: 'Heading 3', icon: 'H3' },
      { name: 'bulleted_list', label: 'Bulleted List', icon: '•' },
      { name: 'numbered_list', label: 'Numbered List', icon: '1.' },
      { name: 'todo_list', label: 'Todo List', icon: '☐' },
      { name: 'quote', label: 'Quote', icon: '"' }
    ];

    blocks.forEach(block => {
      const button = document.createElement('button');
      button.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
      `;

      const icon = document.createElement('span');
      icon.style.marginRight = '8px';
      icon.textContent = block.icon;

      const label = document.createElement('span');
      label.textContent = block.label;

      button.appendChild(icon);
      button.appendChild(label);

      button.addEventListener('click', () => {
        // Simplified block formatting
        this.editorState.formatNode(this.selection, (node) => {
          const attributes: any = { delta: node.delta?.toJson() };
          if (block.level) {
            attributes.level = block.level;
          }
          return node.copyWith({
            type: block.name,
            attributes
          });
        });
      });

      container.appendChild(button);
    });

    return container;
  }
}