import { MobileToolbarItem } from '../mobile_toolbar_item';
import { EditorState } from '../../../../editor_state';
import { MobileToolbarWidgetService } from '../mobile_toolbar_v2';

export const headingMobileToolbarItem = MobileToolbarItem.withMenu({
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
      font-weight: bold;
    `;
    icon.textContent = 'H';
    return icon;
  },
  itemMenuBuilder: (editorState, service) => {
    const selection = editorState.selection;
    if (!selection) {
      return null;
    }
    return new HeadingMenu(editorState, selection).render();
  }
});

class HeadingMenu {
  private editorState: EditorState;
  private selection: any;

  constructor(editorState: EditorState, selection: any) {
    this.editorState = editorState;
    this.selection = selection;
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      justify-content: space-between;
      padding: 8px;
      width: 100%;
    `;

    const headings = [
      { level: 1, label: 'Heading 1', icon: 'H1' },
      { level: 2, label: 'Heading 2', icon: 'H2' },
      { level: 3, label: 'Heading 3', icon: 'H3' }
    ];

    headings.forEach(heading => {
      const button = document.createElement('button');
      button.style.cssText = `
        flex: 1;
        margin: 0 4px;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
      `;

      const icon = document.createElement('div');
      icon.style.cssText = `
        font-weight: bold;
        margin-bottom: 4px;
      `;
      icon.textContent = heading.icon;

      const label = document.createElement('div');
      label.style.fontSize = '12px';
      label.textContent = heading.label;

      button.appendChild(icon);
      button.appendChild(label);

      button.addEventListener('click', () => {
        const node = this.editorState.getNodeAtPath(this.selection.start.path);
        if (!node) return;

        const isSelected = node.type === 'heading' && 
                          node.attributes.level === heading.level;

        this.editorState.formatNode(this.selection, (node) => {
          return node.copyWith({
            type: isSelected ? 'paragraph' : 'heading',
            attributes: {
              level: heading.level,
              delta: node.delta?.toJson() || []
            }
          });
        });
      });

      container.appendChild(button);
    });

    return container;
  }
}