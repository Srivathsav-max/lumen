import { EditorState } from '../../../editor_state';
import { MobileToolbarItem } from './mobile_toolbar_item';
import { MobileToolbarTheme } from './mobile_toolbar_style';
import { KeyboardHeightObserver } from './utils/keyboard_height_observer';
import { PropertyValueNotifier } from '../../../editor_state';

export const selectionExtraInfoDisableMobileToolbarKey = 'disableMobileToolbar';

export interface MobileToolbarWidgetService {
  closeItemMenu(): void;
}

export class MobileToolbarV2 {
  private editorState: EditorState;
  private toolbarItems: MobileToolbarItem[];
  private child: HTMLElement;
  private toolbarOverlay: HTMLElement | null = null;
  private isKeyboardShow = new PropertyValueNotifier(false);
  
  // Style properties
  private backgroundColor: string;
  private foregroundColor: string;
  private iconColor: string;
  private clearDiagonalLineColor: string;
  private itemHighlightColor: string;
  private itemOutlineColor: string;
  private tabBarSelectedBackgroundColor: string;
  private tabBarSelectedForegroundColor: string;
  private primaryColor: string;
  private onPrimaryColor: string;
  private outlineColor: string;
  private toolbarHeight: number;
  private borderRadius: number;
  private buttonHeight: number;
  private buttonSpacing: number;
  private buttonBorderWidth: number;
  private buttonSelectedBorderWidth: number;

  constructor(options: {
    editorState: EditorState;
    toolbarItems: MobileToolbarItem[];
    child: HTMLElement;
    backgroundColor?: string;
    foregroundColor?: string;
    iconColor?: string;
    clearDiagonalLineColor?: string;
    itemHighlightColor?: string;
    itemOutlineColor?: string;
    tabBarSelectedBackgroundColor?: string;
    tabBarSelectedForegroundColor?: string;
    primaryColor?: string;
    onPrimaryColor?: string;
    outlineColor?: string;
    toolbarHeight?: number;
    borderRadius?: number;
    buttonHeight?: number;
    buttonSpacing?: number;
    buttonBorderWidth?: number;
    buttonSelectedBorderWidth?: number;
  }) {
    this.editorState = options.editorState;
    this.toolbarItems = options.toolbarItems;
    this.child = options.child;
    
    // Initialize style properties
    this.backgroundColor = options.backgroundColor ?? '#ffffff';
    this.foregroundColor = options.foregroundColor ?? '#676666';
    this.iconColor = options.iconColor ?? '#000000';
    this.clearDiagonalLineColor = options.clearDiagonalLineColor ?? '#B3261E';
    this.itemHighlightColor = options.itemHighlightColor ?? '#1F71AC';
    this.itemOutlineColor = options.itemOutlineColor ?? '#E3E3E3';
    this.tabBarSelectedBackgroundColor = options.tabBarSelectedBackgroundColor ?? '#23808080';
    this.tabBarSelectedForegroundColor = options.tabBarSelectedForegroundColor ?? '#000000';
    this.primaryColor = options.primaryColor ?? '#1F71AC';
    this.onPrimaryColor = options.onPrimaryColor ?? '#ffffff';
    this.outlineColor = options.outlineColor ?? '#E3E3E3';
    this.toolbarHeight = options.toolbarHeight ?? 50.0;
    this.borderRadius = options.borderRadius ?? 6.0;
    this.buttonHeight = options.buttonHeight ?? 40.0;
    this.buttonSpacing = options.buttonSpacing ?? 8.0;
    this.buttonBorderWidth = options.buttonBorderWidth ?? 1.0;
    this.buttonSelectedBorderWidth = options.buttonSelectedBorderWidth ?? 2.0;

    this.initialize();
  }

  private initialize(): void {
    this.insertKeyboardToolbar();
    KeyboardHeightObserver.instance.addListener(this.onKeyboardHeightChanged.bind(this));
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
    `;

    const contentContainer = document.createElement('div');
    contentContainer.style.flex = '1';
    contentContainer.appendChild(this.child);

    const spacer = document.createElement('div');
    spacer.style.height = this.isKeyboardShow.value ? `${this.toolbarHeight}px` : '0px';
    
    this.isKeyboardShow.addListener((isShow) => {
      spacer.style.height = isShow ? `${this.toolbarHeight}px` : '0px';
    });

    container.appendChild(contentContainer);
    container.appendChild(spacer);

    return container;
  }

  private onKeyboardHeightChanged(height: number): void {
    this.isKeyboardShow.value = height > 0;
  }

  private removeKeyboardToolbar(): void {
    if (this.toolbarOverlay) {
      this.toolbarOverlay.remove();
      this.toolbarOverlay = null;
    }
  }

  private insertKeyboardToolbar(): void {
    this.removeKeyboardToolbar();

    const toolbar = new MobileToolbar({
      editorState: this.editorState,
      toolbarItems: this.toolbarItems,
      theme: {
        backgroundColor: this.backgroundColor,
        foregroundColor: this.foregroundColor,
        iconColor: this.iconColor,
        clearDiagonalLineColor: this.clearDiagonalLineColor,
        itemHighlightColor: this.itemHighlightColor,
        itemOutlineColor: this.itemOutlineColor,
        tabBarSelectedBackgroundColor: this.tabBarSelectedBackgroundColor,
        tabBarSelectedForegroundColor: this.tabBarSelectedForegroundColor,
        primaryColor: this.primaryColor,
        onPrimaryColor: this.onPrimaryColor,
        outlineColor: this.outlineColor,
        toolbarHeight: this.toolbarHeight,
        borderRadius: this.borderRadius,
        buttonHeight: this.buttonHeight,
        buttonSpacing: this.buttonSpacing,
        buttonBorderWidth: this.buttonBorderWidth,
        buttonSelectedBorderWidth: this.buttonSelectedBorderWidth
      }
    });

    this.toolbarOverlay = document.createElement('div');
    this.toolbarOverlay.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
    `;

    this.toolbarOverlay.appendChild(toolbar.render());
    document.body.appendChild(this.toolbarOverlay);
  }

  dispose(): void {
    this.removeKeyboardToolbar();
    KeyboardHeightObserver.instance.removeListener(this.onKeyboardHeightChanged.bind(this));
    this.isKeyboardShow.dispose();
  }
}

class MobileToolbar implements MobileToolbarWidgetService {
  private editorState: EditorState;
  private toolbarItems: MobileToolbarItem[];
  private theme: any;
  private showMenuNotifier = new PropertyValueNotifier(false);
  private selectedMenuIndex: number | null = null;

  constructor(options: {
    editorState: EditorState;
    toolbarItems: MobileToolbarItem[];
    theme: any;
  }) {
    this.editorState = options.editorState;
    this.toolbarItems = options.toolbarItems;
    this.theme = options.theme;
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
    `;

    container.appendChild(this.buildToolbar());
    container.appendChild(this.buildMenuOrSpacer());

    return container;
  }

  closeItemMenu(): void {
    this.showMenuNotifier.value = false;
  }

  private buildToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      width: 100%;
      height: ${this.theme.toolbarHeight}px;
      background-color: ${this.theme.backgroundColor};
      border-top: 1px solid ${this.theme.itemOutlineColor};
      border-bottom: 1px solid ${this.theme.itemOutlineColor};
      display: flex;
      align-items: center;
    `;

    // Toolbar items
    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = `
      flex: 1;
      display: flex;
      overflow-x: auto;
      padding: 0 8px;
    `;

    this.toolbarItems.forEach((item, index) => {
      const button = document.createElement('button');
      button.style.cssText = `
        background: transparent;
        border: none;
        padding: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      button.addEventListener('click', () => {
        if (item.hasMenu) {
          if (this.selectedMenuIndex === index && this.showMenuNotifier.value) {
            this.closeItemMenu();
          } else {
            this.selectedMenuIndex = index;
            this.showMenuNotifier.value = true;
          }
        } else {
          this.closeItemMenu();
          item.actionHandler?.(this.editorState);
        }
      });

      // Add icon (simplified)
      const icon = document.createElement('div');
      icon.style.cssText = `
        width: 24px;
        height: 24px;
        background-color: ${this.theme.iconColor};
        border-radius: 2px;
      `;
      button.appendChild(icon);
      itemsContainer.appendChild(button);
    });

    // Close button
    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 8px;
      cursor: pointer;
      margin-left: 8px;
    `;
    closeButton.textContent = this.showMenuNotifier.value ? '✕' : '⌨';
    closeButton.addEventListener('click', () => {
      if (this.showMenuNotifier.value) {
        this.closeItemMenu();
      } else {
        this.editorState.selection = null;
      }
    });

    toolbar.appendChild(itemsContainer);
    toolbar.appendChild(closeButton);

    return toolbar;
  }

  private buildMenuOrSpacer(): HTMLElement {
    const container = document.createElement('div');
    
    this.showMenuNotifier.addListener((showMenu) => {
      if (showMenu && this.selectedMenuIndex !== null) {
        const item = this.toolbarItems[this.selectedMenuIndex];
        if (item.itemMenuBuilder) {
          const menu = item.itemMenuBuilder(this.editorState, this);
          container.innerHTML = '';
          if (menu) {
            container.appendChild(menu);
          }
        }
      } else {
        container.innerHTML = '';
      }
    });

    return container;
  }
}