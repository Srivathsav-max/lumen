import { EditorState } from '../../../editor_state';
import { MobileToolbarItem } from './mobile_toolbar_item';
import { MobileToolbarTheme } from './mobile_toolbar_style';
import { Selection } from '../../../core/location/selection';

export class MobileToolbar {
  private editorState: EditorState;
  private toolbarItems: MobileToolbarItem[];
  private theme: MobileToolbarTheme;

  constructor(options: {
    editorState: EditorState;
    toolbarItems: MobileToolbarItem[];
    backgroundColor?: string;
    foregroundColor?: string;
    clearDiagonalLineColor?: string;
    itemHighlightColor?: string;
    itemOutlineColor?: string;
    tabbarSelectedBackgroundColor?: string;
    tabbarSelectedForegroundColor?: string;
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
    
    // Create theme from options
    this.theme = new MobileToolbarTheme({
      backgroundColor: options.backgroundColor ?? '#ffffff',
      foregroundColor: options.foregroundColor ?? '#676666',
      clearDiagonalLineColor: options.clearDiagonalLineColor ?? '#B3261E',
      itemHighlightColor: options.itemHighlightColor ?? '#1F71AC',
      itemOutlineColor: options.itemOutlineColor ?? '#E3E3E3',
      tabBarSelectedBackgroundColor: options.tabbarSelectedBackgroundColor ?? '#23808080',
      tabBarSelectedForegroundColor: options.tabbarSelectedForegroundColor ?? '#000000',
      primaryColor: options.primaryColor ?? '#1F71AC',
      onPrimaryColor: options.onPrimaryColor ?? '#ffffff',
      outlineColor: options.outlineColor ?? '#E3E3E3',
      toolbarHeight: options.toolbarHeight ?? 50.0,
      borderRadius: options.borderRadius ?? 6.0,
      buttonHeight: options.buttonHeight ?? 40.0,
      buttonSpacing: options.buttonSpacing ?? 8.0,
      buttonBorderWidth: options.buttonBorderWidth ?? 1.0,
      buttonSelectedBorderWidth: options.buttonSelectedBorderWidth ?? 2.0
    });
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    
    // Listen to selection changes
    this.editorState.selectionNotifier.addListener((selection) => {
      if (selection) {
        container.innerHTML = '';
        container.appendChild(this.buildToolbarWidget(selection));
      } else {
        container.innerHTML = '';
      }
    });

    // Initial render
    const selection = this.editorState.selection;
    if (selection) {
      container.appendChild(this.buildToolbarWidget(selection));
    }

    return container;
  }

  private buildToolbarWidget(selection: Selection): HTMLElement {
    return new MobileToolbarWidget({
      editorState: this.editorState,
      toolbarItems: this.toolbarItems,
      selection,
      theme: this.theme
    }).render();
  }
}

class MobileToolbarWidget {
  private editorState: EditorState;
  private toolbarItems: MobileToolbarItem[];
  private selection: Selection;
  private theme: MobileToolbarTheme;
  private showItemMenu: boolean = false;
  private selectedToolbarItemIndex?: number;

  constructor(options: {
    editorState: EditorState;
    toolbarItems: MobileToolbarItem[];
    selection: Selection;
    theme: MobileToolbarTheme;
  }) {
    this.editorState = options.editorState;
    this.toolbarItems = options.toolbarItems;
    this.selection = options.selection;
    this.theme = options.theme;
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
    `;

    container.appendChild(this.buildToolbar());
    container.appendChild(this.buildMenuContainer());

    return container;
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

      const icon = item.itemIconBuilder?.(toolbar, this.editorState, this);
      if (icon) {
        button.appendChild(icon);
      }

      button.addEventListener('click', () => {
        if (item.hasMenu) {
          if (this.selectedToolbarItemIndex === index) {
            this.showItemMenu = !this.showItemMenu;
          } else {
            this.selectedToolbarItemIndex = index;
            this.showItemMenu = true;
          }
          this.updateMenuContainer();
        } else {
          this.closeItemMenu();
          item.actionHandler?.(this.editorState);
        }
      });

      itemsContainer.appendChild(button);
    });

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = `
      width: 1px;
      height: 24px;
      background-color: ${this.theme.itemOutlineColor};
      margin: 0 8px;
    `;

    // Close/quit button
    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      background: transparent;
      border: none;
      padding: 8px;
      cursor: pointer;
    `;
    closeButton.textContent = this.showItemMenu ? '✕' : '⌨';
    closeButton.addEventListener('click', () => {
      if (this.showItemMenu) {
        this.closeItemMenu();
      } else {
        this.editorState.selection = null;
      }
    });

    toolbar.appendChild(itemsContainer);
    toolbar.appendChild(divider);
    toolbar.appendChild(closeButton);

    return toolbar;
  }

  private buildMenuContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'menu-container';
    this.updateMenuContainer();
    return container;
  }

  private updateMenuContainer(): void {
    const container = document.getElementById('menu-container');
    if (!container) return;

    container.innerHTML = '';
    
    if (this.showItemMenu && this.selectedToolbarItemIndex !== undefined) {
      const item = this.toolbarItems[this.selectedToolbarItemIndex];
      if (item.itemMenuBuilder) {
        const menu = item.itemMenuBuilder(this.editorState, this);
        if (menu) {
          container.appendChild(menu);
        }
      }
    }
  }

  closeItemMenu(): void {
    if (this.showItemMenu) {
      this.showItemMenu = false;
      this.updateMenuContainer();
    }
  }
}