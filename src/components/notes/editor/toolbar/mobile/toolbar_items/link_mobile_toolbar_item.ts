import { MobileToolbarItem } from '../mobile_toolbar_item';
import { EditorState } from '../../../../editor_state';
import { MobileToolbarWidgetService } from '../mobile_toolbar_v2';
import { AppFlowyRichTextKeys } from '../../../block_component/rich_text/appflowy_rich_text_keys';
import { AppFlowyEditorL10n } from '../../../../l10n/l10n';
import { MobileToolbarTheme } from '../mobile_toolbar_style';

export const linkMobileToolbarItem = MobileToolbarItem.withMenu({
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
    icon.textContent = '🔗';
    return icon;
  },
  itemMenuBuilder: (editorState, itemMenuService) => {
    const selection = editorState.selection;
    if (!selection) {
      return null;
    }
    
    const linkText = editorState.getDeltaAttributeValueInSelection(
      AppFlowyRichTextKeys.href,
      selection
    );

    return new MobileLinkMenu({
      editorState,
      linkText,
      onSubmitted: async (value) => {
        if (value.trim()) {
          await editorState.formatDelta(selection, {
            [AppFlowyRichTextKeys.href]: value
          });
        }
        itemMenuService.closeItemMenu();
        // Close keyboard equivalent
      },
      onCancel: () => itemMenuService.closeItemMenu()
    }).render();
  }
});

class MobileLinkMenu {
  private linkText?: string;
  private editorState: EditorState;
  private onSubmitted: (value: string) => Promise<void>;
  private onCancel: () => void;
  private textEditingController: HTMLInputElement;

  constructor(options: {
    linkText?: string;
    editorState: EditorState;
    onSubmitted: (value: string) => Promise<void>;
    onCancel: () => void;
  }) {
    this.linkText = options.linkText;
    this.editorState = options.editorState;
    this.onSubmitted = options.onSubmitted;
    this.onCancel = options.onCancel;
    
    this.textEditingController = document.createElement('input');
    this.textEditingController.value = this.linkText ?? '';
  }

  render(): HTMLElement {
    const style = MobileToolbarTheme.of(document.body); // Simplified context access
    const spacing = 8;
    
    const container = document.createElement('div');
    container.style.cssText = `
      background-color: ${style.backgroundColor};
      height: ${style.toolbarHeight * 2 + spacing}px;
      padding: 8px;
      display: flex;
      flex-direction: column;
    `;

    // Text field
    this.textEditingController.style.cssText = `
      flex: 1;
      padding: 8px;
      border: 1px solid ${style.itemOutlineColor};
      border-radius: ${style.borderRadius}px;
      font-size: 16px;
      outline: none;
      margin-bottom: ${spacing}px;
    `;
    
    this.textEditingController.placeholder = 'URL';
    this.textEditingController.type = 'url';
    this.textEditingController.autofocus = true;
    
    this.textEditingController.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.onSubmitted(this.textEditingController.value);
      }
    });

    // Clear button (simplified)
    const clearButton = document.createElement('button');
    clearButton.style.cssText = `
      position: absolute;
      right: 16px;
      top: 16px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 18px;
      color: ${style.foregroundColor};
    `;
    clearButton.textContent = '✕';
    clearButton.addEventListener('click', () => {
      this.textEditingController.value = '';
      this.textEditingController.focus();
    });

    // Button row
    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
      display: flex;
      gap: ${style.buttonSpacing}px;
    `;

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.style.cssText = `
      flex: 1;
      padding: 12px;
      background-color: ${style.backgroundColor};
      color: ${style.primaryColor};
      border: 1px solid ${style.outlineColor};
      border-radius: ${style.borderRadius}px;
      cursor: pointer;
    `;
    cancelButton.textContent = AppFlowyEditorL10n.current.cancel;
    cancelButton.addEventListener('click', this.onCancel);

    // Done button
    const doneButton = document.createElement('button');
    doneButton.style.cssText = `
      flex: 1;
      padding: 12px;
      background-color: ${style.primaryColor};
      color: ${style.onPrimaryColor};
      border: none;
      border-radius: ${style.borderRadius}px;
      cursor: pointer;
    `;
    doneButton.textContent = AppFlowyEditorL10n.current.done;
    doneButton.addEventListener('click', () => {
      this.onSubmitted(this.textEditingController.value);
    });

    buttonRow.appendChild(cancelButton);
    buttonRow.appendChild(doneButton);

    const inputContainer = document.createElement('div');
    inputContainer.style.position = 'relative';
    inputContainer.appendChild(this.textEditingController);
    inputContainer.appendChild(clearButton);

    container.appendChild(inputContainer);
    container.appendChild(buttonRow);

    return container;
  }
}