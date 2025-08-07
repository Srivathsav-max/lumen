import { MobileToolbarItem } from '../mobile_toolbar_item';
import { EditorState } from '../../../../editor_state';
import { Selection } from '../../../../core/location/selection';
import { MobileToolbarWidgetService } from '../mobile_toolbar_v2';
import { AppFlowyEditorL10n } from '../../../../l10n/l10n';
import { MobileToolbarItemMenuBtn } from '../utils/mobile_toolbar_item_menu_btn';

export const listMobileToolbarItem = MobileToolbarItem.withMenu({
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
    icon.textContent = '☰';
    return icon;
  },
  itemMenuBuilder: (editorState, service) => {
    const selection = editorState.selection;
    if (!selection) {
      return null;
    }
    return new ListMenu(editorState, selection).render();
  }
});

class ListMenu {
  private editorState: EditorState;
  private selection: Selection;

  constructor(editorState: EditorState, selection: Selection) {
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
      grid-auto-rows: 40px;
    `;

    const lists = [
      {
        icon: '•',
        label: AppFlowyEditorL10n.current.bulletedList,
        name: 'bulleted_list'
      },
      {
        icon: '1.',
        label: AppFlowyEditorL10n.current.numberedList,
        name: 'numbered_list'
      }
    ];

    lists.forEach(list => {
      // Check if current node is list and its type
      const node = this.editorState.getNodeAtPath(this.selection.start.path);
      if (!node) return;
      
      const isSelected = node.type === list.name;

      const button = new MobileToolbarItemMenuBtn({
        icon: this.createIcon(list.icon),
        label: this.createLabel(list.label),
        isSelected,
        onPressed: () => {
          this.editorState.formatNode(
            this.selection,
            (node) => node.copyWith({
              type: isSelected ? 'paragraph' : list.name,
              attributes: {
                delta: node.delta?.toJson() || []
              }
            })
          );
          // Re-render to update selection state
          this.updateButtonState(container);
        }
      });

      container.appendChild(button.render(container));
    });

    return container;
  }

  private createIcon(iconText: string): HTMLElement {
    const icon = document.createElement('div');
    icon.style.cssText = `
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    `;
    icon.textContent = iconText;
    return icon;
  }

  private createLabel(labelText: string): HTMLElement {
    const label = document.createElement('span');
    label.textContent = labelText;
    return label;
  }

  private updateButtonState(container: HTMLElement): void {
    // Simple re-render approach
    const newMenu = this.render();
    container.innerHTML = '';
    while (newMenu.firstChild) {
      container.appendChild(newMenu.firstChild);
    }
  }
}