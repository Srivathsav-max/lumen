import { MobileToolbarItem } from '../mobile_toolbar_item';
import { EditorState } from '../../../../editor_state';
import { Selection } from '../../../../core/location/selection';
import { MobileToolbarWidgetService } from '../mobile_toolbar_v2';
import { AppFlowyRichTextKeys } from '../../../block_component/rich_text/appflowy_rich_text_keys';
import { AppFlowyEditorL10n } from '../../../../l10n/l10n';
import { MobileToolbarItemMenuBtn } from '../utils/mobile_toolbar_item_menu_btn';
import { selectionExtraInfoDoNotAttachTextService } from '../../../../editor_state';

export const textDecorationMobileToolbarItemV2 = MobileToolbarItem.withMenu({
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
    icon.textContent = 'A';
    return icon;
  },
  itemMenuBuilder: (editorState, service) => {
    const selection = editorState.selection;
    if (!selection) {
      return null;
    }
    return new TextDecorationMenuV2(editorState, selection).render();
  }
});

class TextDecorationMenuV2 {
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
    `;

    const textDecorations = [
      // BIUS
      {
        icon: 'B',
        label: AppFlowyEditorL10n.current.bold,
        name: AppFlowyRichTextKeys.bold
      },
      {
        icon: 'I',
        label: AppFlowyEditorL10n.current.italic,
        name: AppFlowyRichTextKeys.italic
      },
      {
        icon: 'U',
        label: AppFlowyEditorL10n.current.underline,
        name: AppFlowyRichTextKeys.underline
      },
      {
        icon: 'S',
        label: AppFlowyEditorL10n.current.strikethrough,
        name: AppFlowyRichTextKeys.strikethrough
      },
      // Code
      {
        icon: '</>',
        label: AppFlowyEditorL10n.current.embedCode,
        name: AppFlowyRichTextKeys.code
      }
    ];

    textDecorations.forEach(decoration => {
      // Check if current decoration is active
      const selection = this.selection;
      const nodes = this.editorState.getNodesInSelection(selection);
      let isSelected: boolean;

      if (selection.isCollapsed) {
        isSelected = this.editorState.toggledStyle.hasOwnProperty(decoration.name);
      } else {
        isSelected = nodes.allSatisfyInSelection(selection, (delta) => {
          return delta.everyAttributes(
            (attributes) => attributes[decoration.name] === true
          );
        });
      }

      const button = new MobileToolbarItemMenuBtn({
        icon: this.createIcon(decoration.icon),
        label: this.createLabel(decoration.label),
        isSelected,
        onPressed: () => {
          this.editorState.toggleAttribute(decoration.name, {
            selectionExtraInfo: {
              [selectionExtraInfoDoNotAttachTextService]: true
            }
          });
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
      font-size: ${iconText === '</>' ? '12px' : '14px'};
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