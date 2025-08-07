import { EditorState } from '../../../../../editor_state';
import { buildOverlayDecoration, EditorOverlayTitle, buildOverlayButtonStyle } from '../utils/overlay_util';
import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';
import { isUri } from '../../../../util/link_util';

export class LinkMenu {
  private linkText?: string;
  private editorState?: EditorState;
  private onSubmitted: (text: string) => void;
  private onOpenLink: () => void;
  private onCopyLink: () => void;
  private onRemoveLink: () => void;
  private onDismiss: () => void;
  private textEditingController: HTMLInputElement;
  private focusNode: HTMLInputElement;

  constructor(options: {
    linkText?: string;
    editorState?: EditorState;
    onSubmitted: (text: string) => void;
    onOpenLink: () => void;
    onCopyLink: () => void;
    onRemoveLink: () => void;
    onDismiss: () => void;
  }) {
    this.linkText = options.linkText;
    this.editorState = options.editorState;
    this.onSubmitted = options.onSubmitted;
    this.onOpenLink = options.onOpenLink;
    this.onCopyLink = options.onCopyLink;
    this.onRemoveLink = options.onRemoveLink;
    this.onDismiss = options.onDismiss;

    this.textEditingController = document.createElement('input');
    this.focusNode = this.textEditingController;
    
    this.initializeController();
  }

  private initializeController(): void {
    this.textEditingController.value = this.linkText ?? '';
    setTimeout(() => this.focusNode.focus(), 0);
  }

  render(context: HTMLElement): HTMLElement {
    const decoration = buildOverlayDecoration(context);
    
    const container = document.createElement('div');
    container.style.cssText = `
      width: 300px;
      background-color: ${decoration.backgroundColor};
      border-radius: ${decoration.borderRadius};
      box-shadow: ${decoration.boxShadow};
      padding: 10px 10px 5px 10px;
      display: flex;
      flex-direction: column;
    `;

    // Title
    const title = new EditorOverlayTitle({
      text: AppFlowyEditorL10n.current.addYourLink
    });
    container.appendChild(title.render());

    // Spacing
    const spacing1 = document.createElement('div');
    spacing1.style.height = '16px';
    container.appendChild(spacing1);

    // Input
    container.appendChild(this.buildInput(context));

    // Spacing
    const spacing2 = document.createElement('div');
    spacing2.style.height = '16px';
    container.appendChild(spacing2);

    // Action buttons (only if linkText exists)
    if (this.linkText) {
      container.appendChild(this.buildIconButton({
        iconName: 'link',
        text: AppFlowyEditorL10n.current.openLink,
        onPressed: this.onOpenLink,
        context
      }));

      container.appendChild(this.buildIconButton({
        iconName: 'copy',
        text: AppFlowyEditorL10n.current.copyLink,
        onPressed: this.onCopyLink,
        context
      }));

      container.appendChild(this.buildIconButton({
        iconName: 'delete',
        text: AppFlowyEditorL10n.current.removeLink,
        onPressed: this.onRemoveLink,
        context
      }));
    }

    return container;
  }

  private buildInput(context: HTMLElement): HTMLElement {
    const container = document.createElement('div');
    
    // Handle keyboard events
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.onDismiss();
      } else if (event.key === 'Enter') {
        this.onSubmitted(this.textEditingController.value);
      }
    };

    const inputContainer = document.createElement('div');
    inputContainer.style.position = 'relative';

    this.textEditingController.style.cssText = `
      width: 100%;
      padding: 16px;
      padding-right: 40px;
      border: 1px solid #ccc;
      border-radius: 12px;
      font-size: 14px;
      outline: none;
    `;

    this.textEditingController.placeholder = AppFlowyEditorL10n.current.urlHint;
    this.textEditingController.addEventListener('keydown', handleKeyDown);

    // Validation
    const validateInput = () => {
      const value = this.textEditingController.value;
      if (value && !isUri(value)) {
        this.textEditingController.style.borderColor = '#ff0000';
        this.textEditingController.title = AppFlowyEditorL10n.current.incorrectLink;
      } else {
        this.textEditingController.style.borderColor = '#ccc';
        this.textEditingController.title = '';
      }
    };

    this.textEditingController.addEventListener('input', validateInput);

    // Clear button
    const clearButton = document.createElement('button');
    clearButton.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    clearButton.innerHTML = '✕';
    clearButton.addEventListener('click', () => {
      this.textEditingController.value = '';
      this.textEditingController.focus();
    });

    inputContainer.appendChild(this.textEditingController);
    inputContainer.appendChild(clearButton);
    container.appendChild(inputContainer);

    return container;
  }

  private buildIconButton(options: {
    iconName: string;
    text: string;
    onPressed: () => void;
    context: HTMLElement;
  }): HTMLElement {
    const { iconName, text, onPressed, context } = options;
    
    const button = document.createElement('button');
    button.style.cssText = `
      height: 36px;
      width: 100%;
      display: flex;
      align-items: center;
      padding: 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
      margin-bottom: 4px;
    `;

    const buttonStyle = buildOverlayButtonStyle(context);
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = buttonStyle.hoverBackgroundColor;
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = buttonStyle.backgroundColor;
    });

    button.addEventListener('click', onPressed);

    // Icon (simplified - in real implementation you'd load SVG)
    const icon = document.createElement('span');
    icon.style.cssText = `
      width: 16px;
      height: 16px;
      margin-right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Simple icon representations
    switch (iconName) {
      case 'link':
        icon.textContent = '🔗';
        break;
      case 'copy':
        icon.textContent = '📋';
        break;
      case 'delete':
        icon.textContent = '🗑️';
        break;
      default:
        icon.textContent = '•';
    }

    // Text
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    textSpan.style.flex = '1';
    textSpan.style.textAlign = 'left';

    button.appendChild(icon);
    button.appendChild(textSpan);

    return button;
  }

  dispose(): void {
    // Clean up event listeners if needed
  }
}