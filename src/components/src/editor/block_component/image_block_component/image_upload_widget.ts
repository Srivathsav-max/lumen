import { EditorState, Selection, Position } from '../../../core/editor_state';
import { Component, ComponentChild } from '../../../core/component';
import { AppFlowyEditorL10n } from '../../../l10n/l10n';
import { ParagraphBlockKeys } from '../../../core/block_keys';
import { imageNode } from './image_block_component';
import { base64StringFromFile } from './base64_image';
import { EditorSvg } from '../../../render/svg/editor_svg';
import { isURL } from '../../../core/url_validator';

export enum ImageFromFileStatus {
  notSelected = 'notSelected',
  selected = 'selected',
}

export type OnInsertImage = (url: string) => void;

export interface SelectionMenuService {
  dismiss(): void;
  getPosition(): [number, number, number, number]; // left, top, right, bottom
  style: {
    selectionMenuBackgroundColor: string;
    selectionMenuItemTextColor: string;
    selectionMenuUnselectedLabelColor: string;
    selectionMenuDividerColor: string;
    selectionMenuLinkBorderColor: string;
    selectionMenuInvalidLinkColor: string;
    selectionMenuButtonColor: string;
    selectionMenuButtonBorderColor: string;
    selectionMenuButtonTextColor: string;
    selectionMenuTabIndicatorColor: string;
    selectionMenuButtonIconColor: string;
  };
}

export function showImageMenu(
  container: HTMLElement,
  editorState: EditorState,
  menuService: SelectionMenuService,
  options?: { onInsertImage?: OnInsertImage }
): void {
  menuService.dismiss();

  const [left, top, right, bottom] = menuService.getPosition();

  function insertImage(url: string): void {
    if (options?.onInsertImage) {
      options.onInsertImage(url);
    } else {
      editorState.insertImageNode(url);
    }
    menuService.dismiss();
    if (imageMenuElement.parentNode) {
      imageMenuElement.parentNode.removeChild(imageMenuElement);
    }
  }

  const imageMenuElement = new UploadImageMenu({
    backgroundColor: menuService.style.selectionMenuBackgroundColor,
    headerColor: menuService.style.selectionMenuItemTextColor,
    unselectedLabelColor: menuService.style.selectionMenuUnselectedLabelColor,
    dividerColor: menuService.style.selectionMenuDividerColor,
    urlInputBorderColor: menuService.style.selectionMenuLinkBorderColor,
    urlInvalidLinkColor: menuService.style.selectionMenuInvalidLinkColor,
    uploadButtonColor: menuService.style.selectionMenuButtonColor,
    uploadButtonBorderColor: menuService.style.selectionMenuButtonBorderColor,
    uploadButtonTextColor: menuService.style.selectionMenuButtonTextColor,
    tabIndicatorColor: menuService.style.selectionMenuTabIndicatorColor,
    uploadIconColor: menuService.style.selectionMenuButtonIconColor,
    width: window.innerWidth * 0.3,
    onSubmitted: insertImage,
    onUpload: insertImage,
  }).render() as HTMLElement;

  // Position the menu
  imageMenuElement.style.position = 'absolute';
  imageMenuElement.style.left = `${left}px`;
  imageMenuElement.style.top = `${top}px`;
  imageMenuElement.style.zIndex = '1000';

  container.appendChild(imageMenuElement);
}

interface UploadImageMenuProps {
  backgroundColor?: string;
  headerColor?: string;
  unselectedLabelColor?: string;
  dividerColor?: string;
  urlInputBorderColor?: string;
  urlInvalidLinkColor?: string;
  uploadButtonColor?: string;
  tabIndicatorColor?: string;
  uploadButtonBorderColor?: string;
  uploadIconColor?: string;
  uploadButtonTextColor?: string;
  width?: number;
  onSubmitted: (text: string) => void;
  onUpload: (text: string) => void;
}

interface UploadImageMenuState {
  activeTab: number;
  imagePathOrContent: string | null;
  isUrlValid: boolean;
  urlValue: string;
}

class UploadImageMenu extends Component<UploadImageMenuProps, UploadImageMenuState> {
  private static readonly allowedExtensions = ['jpg', 'png', 'jpeg'];

  constructor(props: UploadImageMenuProps) {
    super(props);
    this.state = {
      activeTab: 0,
      imagePathOrContent: null,
      isUrlValid: true,
      urlValue: '',
    };
  }

  render(): ComponentChild {
    return {
      tag: 'div',
      style: {
        width: `${this.props.width || 300}px`,
        height: '240px',
        padding: '5px 12px',
        backgroundColor: this.props.backgroundColor || 'white',
        boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
        borderRadius: '6px',
      },
      children: [
        this.buildTabHeader(),
        this.buildTabContent(),
      ],
    };
  }

  private buildTabHeader(): ComponentChild {
    return {
      tag: 'div',
      style: {
        display: 'flex',
        borderBottom: `1px solid ${this.props.dividerColor || 'transparent'}`,
        marginBottom: '16px',
      },
      children: [
        {
          tag: 'button',
          style: {
            padding: '8px 16px',
            border: 'none',
            background: 'none',
            color: this.state.activeTab === 0 ? this.props.headerColor : this.props.unselectedLabelColor,
            borderBottom: this.state.activeTab === 0 ? `2px solid ${this.props.tabIndicatorColor}` : 'none',
            cursor: 'pointer',
          },
          textContent: AppFlowyEditorL10n.current.uploadImage,
          onClick: () => this.setState({ activeTab: 0 }),
        },
        {
          tag: 'button',
          style: {
            padding: '8px 16px',
            border: 'none',
            background: 'none',
            color: this.state.activeTab === 1 ? this.props.headerColor : this.props.unselectedLabelColor,
            borderBottom: this.state.activeTab === 1 ? `2px solid ${this.props.tabIndicatorColor}` : 'none',
            cursor: 'pointer',
          },
          textContent: AppFlowyEditorL10n.current.urlImage,
          onClick: () => this.setState({ activeTab: 1 }),
        },
      ],
    };
  }

  private buildTabContent(): ComponentChild {
    return {
      tag: 'div',
      style: { flex: '1', display: 'flex', flexDirection: 'column' },
      children: [
        this.state.activeTab === 0 ? this.buildFileTab() : this.buildUrlTab(),
      ],
    };
  }

  private buildUrlTab(): ComponentChild {
    return {
      tag: 'div',
      style: { display: 'flex', flexDirection: 'column', height: '100%' },
      children: [
        this.buildInput(),
        { tag: 'div', style: { height: '18px' } },
        ...(this.state.isUrlValid ? [] : [this.buildInvalidLinkText()]),
        { tag: 'div', style: { height: '18px' } },
        {
          tag: 'div',
          style: { display: 'flex', justifyContent: 'flex-end' },
          children: [this.buildUploadButton()],
        },
      ],
    };
  }

  private buildFileTab(): ComponentChild {
    return {
      tag: 'div',
      style: { display: 'flex', flexDirection: 'column', height: '100%' },
      children: [
        this.buildFileUploadContainer(),
        { tag: 'div', style: { height: '18px' } },
        {
          tag: 'div',
          style: { display: 'flex', justifyContent: 'flex-end' },
          children: [this.buildUploadButton()],
        },
      ],
    };
  }

  private buildInput(): ComponentChild {
    return {
      tag: 'input',
      type: 'text',
      placeholder: 'URL',
      value: this.state.urlValue,
      style: {
        padding: '16px',
        border: `1px solid ${this.props.urlInputBorderColor}`,
        borderRadius: '12px',
        fontSize: '14px',
        outline: 'none',
      },
      onInput: (event: Event) => {
        const target = event.target as HTMLInputElement;
        this.setState({ urlValue: target.value, isUrlValid: true });
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          this.handleUrlSubmit();
        }
      },
    };
  }

  private buildInvalidLinkText(): ComponentChild {
    return {
      tag: 'div',
      style: {
        color: this.props.urlInvalidLinkColor || 'red',
        fontSize: '12px',
      },
      textContent: AppFlowyEditorL10n.current.incorrectLink,
    };
  }

  private buildUploadButton(): ComponentChild {
    return {
      tag: 'button',
      style: {
        width: '170px',
        height: '36px',
        backgroundColor: this.props.uploadButtonColor || '#00BCF0',
        color: this.props.uploadButtonTextColor || 'white',
        border: `1px solid ${this.props.uploadButtonBorderColor || '#00BCF0'}`,
        borderRadius: '12px',
        fontSize: '14px',
        cursor: 'pointer',
      },
      textContent: AppFlowyEditorL10n.current.upload,
      onClick: () => this.handleUpload(),
    };
  }

  private buildFileUploadContainer(): ComponentChild {
    return {
      tag: 'div',
      style: {
        flex: '1',
        margin: '10px',
        border: `1px solid ${this.props.uploadButtonBorderColor}`,
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60px',
      },
      onClick: () => this.handleFileSelect(),
      children: [
        this.state.imagePathOrContent
          ? {
              tag: 'img',
              src: this.state.imagePathOrContent.startsWith('data:') 
                ? this.state.imagePathOrContent 
                : `data:image/png;base64,${this.state.imagePathOrContent}`,
              style: {
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'cover',
              },
            }
          : {
              tag: 'div',
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              },
              children: [
                new EditorSvg({
                  name: 'upload_image',
                  width: 32,
                  height: 32,
                  color: this.props.uploadIconColor,
                }),
                {
                  tag: 'div',
                  style: { height: '8px' },
                },
                {
                  tag: 'span',
                  style: {
                    fontSize: '14px',
                    color: this.props.uploadButtonTextColor,
                  },
                  textContent: AppFlowyEditorL10n.current.chooseImage,
                },
              ],
            },
      ],
    };
  }

  private async handleFileSelect(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = UploadImageMenu.allowedExtensions.map(ext => `.${ext}`).join(',');
    
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (file) {
        try {
          const base64Content = await base64StringFromFile(file);
          this.setState({ imagePathOrContent: base64Content });
        } catch (error) {
          console.error('Failed to process file:', error);
        }
      }
    };
    
    input.click();
  }

  private handleUrlSubmit(): void {
    if (this.validateUrl(this.state.urlValue)) {
      this.props.onSubmitted(this.state.urlValue);
    } else {
      this.setState({ isUrlValid: false });
    }
  }

  private handleUpload(): void {
    if (this.state.imagePathOrContent) {
      this.props.onUpload(this.state.imagePathOrContent);
    } else if (this.validateUrl(this.state.urlValue)) {
      this.props.onUpload(this.state.urlValue);
    } else {
      this.setState({ isUrlValid: false });
    }
  }

  private validateUrl(url: string): boolean {
    return url.length > 0 && isURL(url);
  }
}

// Extension methods for EditorState
declare module '../../../core/editor_state' {
  interface EditorState {
    insertImageNode(src: string): Promise<void>;
  }
}

EditorState.prototype.insertImageNode = async function(src: string): Promise<void> {
  const selection = this.selection;
  if (!selection || !selection.isCollapsed) {
    return;
  }
  const node = this.getNodeAtPath(selection.end.path);
  if (!node) {
    return;
  }
  const transaction = this.transaction;
  
  // if the current node is empty paragraph, replace it with image node
  if (node.type === ParagraphBlockKeys.type && (node.delta?.isEmpty ?? false)) {
    transaction.insertNode(node.path, imageNode({ url: src }));
    transaction.deleteNode(node);
  } else {
    const nextPath = [...node.path];
    nextPath[nextPath.length - 1]++;
    transaction.insertNode(nextPath, imageNode({ url: src }));
  }

  const nextPath = [...node.path];
  nextPath[nextPath.length - 1]++;
  transaction.afterSelection = Selection.collapsed(new Position(nextPath, 0));

  return this.apply(transaction);
};