import { EditorState } from '../../editor_state';
import { Node } from '../../node';
import { TextInsert } from '../../delta';
import { Selection } from '../../selection';
import { AppFlowyRichTextKeys } from '../../block_component/rich_text/rich_text_keys';
import { AppFlowyEditorL10n } from '../../l10n/appflowy_editor_l10n';
import { safeLaunchUrl } from '../../../infra/url_launcher';
import { SelectionUpdateReason } from '../../selection/selection_update_reason';

export interface TextSpan {
  style?: CSSStyleDeclaration;
  text: string;
  recognizer?: EventListener;
}

/**
 * Support mobile platform
 * - customize the href text span
 */
export function mobileTextSpanDecoratorForAttribute(
  context: any,
  node: Node,
  index: number,
  text: TextInsert,
  before: TextSpan,
  after: TextSpan,
): TextSpan {
  const attributes = text.attributes;
  if (!attributes) {
    return before;
  }

  const editorState = EditorState.getInstance();
  const hrefAddress = attributes[AppFlowyRichTextKeys.href] as string;
  
  if (hrefAddress) {
    let timer: number | undefined;

    const tapHandler = async (event: Event) => {
      if (timer !== undefined && timer > 0) {
        // Implement single tap logic
        safeLaunchUrl(hrefAddress);
        clearTimeout(timer);
        timer = undefined;
        return;
      }
    };

    const tapDownHandler = (event: Event) => {
      const selection = Selection.single({
        path: node.path,
        startOffset: index,
        endOffset: index + text.text.length,
      });
      
      editorState.updateSelectionWithReason(
        selection,
        SelectionUpdateReason.uiEvent,
      );

      timer = window.setTimeout(() => {
        // Implement long tap logic
        showLinkEditDialog(node, index, text.text, hrefAddress, editorState, selection);
      }, 500);
    };

    return {
      style: before.style,
      text: text.text,
      recognizer: (event: Event) => {
        if (event.type === 'pointerup') {
          tapHandler(event);
        } else if (event.type === 'pointerdown') {
          tapDownHandler(event);
        }
      },
    };
  }

  return before;
}

function showLinkEditDialog(
  node: Node,
  index: number,
  hrefText: string,
  hrefAddress: string,
  editorState: EditorState,
  selection: Selection,
): void {
  const dialog = new LinkEditForm({
    node,
    index,
    hrefText,
    hrefAddress,
    editorState,
    selection,
  });
  
  dialog.show();
}

interface LinkEditFormProps {
  node: Node;
  index: number;
  hrefText: string;
  hrefAddress: string;
  editorState: EditorState;
  selection: Selection;
}

class LinkEditForm {
  private props: LinkEditFormProps;
  private element: HTMLElement;
  private hrefAddressInput: HTMLInputElement;
  private hrefTextInput: HTMLInputElement;

  constructor(props: LinkEditFormProps) {
    this.props = props;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'link-edit-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = 'white';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    dialog.style.zIndex = '1000';
    dialog.style.minWidth = '300px';

    const title = document.createElement('h3');
    title.textContent = AppFlowyEditorL10n.current.editLink;
    title.style.marginTop = '0';
    dialog.appendChild(title);

    const form = document.createElement('form');
    form.className = 'link-edit-form';

    // Text input
    const textLabel = document.createElement('label');
    textLabel.textContent = AppFlowyEditorL10n.current.linkText;
    form.appendChild(textLabel);

    this.hrefTextInput = document.createElement('input');
    this.hrefTextInput.type = 'text';
    this.hrefTextInput.value = this.props.hrefText;
    this.hrefTextInput.placeholder = AppFlowyEditorL10n.current.linkTextHint;
    this.hrefTextInput.style.width = '100%';
    this.hrefTextInput.style.marginBottom = '10px';
    this.hrefTextInput.style.padding = '8px';
    this.hrefTextInput.style.border = '1px solid #ccc';
    this.hrefTextInput.style.borderRadius = '4px';
    form.appendChild(this.hrefTextInput);

    // URL input
    const urlLabel = document.createElement('label');
    urlLabel.textContent = AppFlowyEditorL10n.current.urlHint;
    form.appendChild(urlLabel);

    this.hrefAddressInput = document.createElement('input');
    this.hrefAddressInput.type = 'url';
    this.hrefAddressInput.value = this.props.hrefAddress;
    this.hrefAddressInput.placeholder = AppFlowyEditorL10n.current.linkAddressHint;
    this.hrefAddressInput.style.width = '100%';
    this.hrefAddressInput.style.marginBottom = '20px';
    this.hrefAddressInput.style.padding = '8px';
    this.hrefAddressInput.style.border = '1px solid #ccc';
    this.hrefAddressInput.style.borderRadius = '4px';
    form.appendChild(this.hrefAddressInput);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = AppFlowyEditorL10n.current.removeLink;
    removeButton.style.color = '#dc3545';
    removeButton.style.backgroundColor = 'transparent';
    removeButton.style.border = 'none';
    removeButton.style.cursor = 'pointer';
    removeButton.addEventListener('click', this.handleRemoveLink.bind(this));
    buttonContainer.appendChild(removeButton);

    const doneButton = document.createElement('button');
    doneButton.type = 'submit';
    doneButton.textContent = AppFlowyEditorL10n.current.done;
    doneButton.style.backgroundColor = '#007bff';
    doneButton.style.color = 'white';
    doneButton.style.border = 'none';
    doneButton.style.padding = '8px 16px';
    doneButton.style.borderRadius = '4px';
    doneButton.style.cursor = 'pointer';
    buttonContainer.appendChild(doneButton);

    form.appendChild(buttonContainer);
    form.addEventListener('submit', this.handleSubmit.bind(this));

    dialog.appendChild(form);

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    backdrop.style.zIndex = '999';
    backdrop.addEventListener('click', this.close.bind(this));

    const container = document.createElement('div');
    container.appendChild(backdrop);
    container.appendChild(dialog);

    return container;
  }

  private async handleRemoveLink(event: Event): Promise<void> {
    event.preventDefault();
    
    const transaction = this.props.editorState.transaction;
    transaction.formatText(
      this.props.node,
      this.props.index,
      this.props.hrefText.length,
      { [AppFlowyRichTextKeys.href]: null },
    );
    
    await this.props.editorState.apply(transaction);
    this.close();
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    if (!this.validate()) {
      return;
    }

    const newText = this.hrefTextInput.value;
    const newAddress = this.hrefAddressInput.value;
    const textChanged = newText !== this.props.hrefText;
    const addressChanged = newAddress !== this.props.hrefAddress;

    if (textChanged && addressChanged) {
      const transaction = this.props.editorState.transaction;
      transaction.replaceText(
        this.props.node,
        this.props.index,
        this.props.hrefText.length,
        newText,
        {
          attributes: {
            [AppFlowyRichTextKeys.href]: newAddress,
          },
        },
      );
      await this.props.editorState.apply(transaction);
    } else if (textChanged && !addressChanged) {
      const transaction = this.props.editorState.transaction;
      transaction.replaceText(
        this.props.node,
        this.props.index,
        this.props.hrefText.length,
        newText,
      );
      await this.props.editorState.apply(transaction);
    } else if (!textChanged && addressChanged) {
      await this.props.editorState.formatDelta(this.props.selection, {
        [AppFlowyRichTextKeys.href]: newAddress,
      });
    }

    this.close();
  }

  private validate(): boolean {
    if (!this.hrefTextInput.value.trim()) {
      alert(AppFlowyEditorL10n.current.linkTextHint);
      return false;
    }
    
    if (!this.hrefAddressInput.value.trim()) {
      alert(AppFlowyEditorL10n.current.linkAddressHint);
      return false;
    }
    
    return true;
  }

  show(): void {
    document.body.appendChild(this.element);
    this.hrefTextInput.focus();
  }

  private close(): void {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}