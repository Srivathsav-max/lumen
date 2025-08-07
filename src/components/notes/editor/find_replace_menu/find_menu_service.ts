import { EditorState } from '../../editor_state';
import { FindAndReplaceMenuWidget, FindReplaceLocalizations, FindReplaceStyle } from './find_replace_widget';

export interface FindReplaceService {
  show(): void;
  dismiss(): void;
}

let findReplaceMenuEntry: HTMLElement | null = null;

export class FindReplaceMenu implements FindReplaceService {
  private context: HTMLElement;
  private editorState: EditorState;
  private showReplaceMenu: boolean;
  private localizations?: FindReplaceLocalizations;
  private style: FindReplaceStyle;
  private showRegexButton: boolean;
  private showCaseSensitiveButton: boolean;
  private topOffset: number = 52;
  private rightOffset: number = 40;
  private selectionUpdateByInner: boolean = false;
  private onSelectionChangeHandler?: () => void;

  constructor(options: {
    context: HTMLElement;
    editorState: EditorState;
    showReplaceMenu: boolean;
    localizations?: FindReplaceLocalizations;
    style: FindReplaceStyle;
    showRegexButton?: boolean;
    showCaseSensitiveButton?: boolean;
  }) {
    this.context = options.context;
    this.editorState = options.editorState;
    this.showReplaceMenu = options.showReplaceMenu;
    this.localizations = options.localizations;
    this.style = options.style;
    this.showRegexButton = options.showRegexButton ?? true;
    this.showCaseSensitiveButton = options.showCaseSensitiveButton ?? true;
  }

  dismiss(): void {
    if (findReplaceMenuEntry) {
      // Re-enable keyboard and scroll services
      if (this.editorState.service.keyboardService) {
        this.editorState.service.keyboardService.enable();
      }
      if (this.editorState.scrollService) {
        this.editorState.scrollService.enable();
      }
    }

    this.editorState.onDispose.removeListener(this.dismiss.bind(this));

    if (findReplaceMenuEntry) {
      findReplaceMenuEntry.remove();
      findReplaceMenuEntry = null;
    }

    // Remove selection change listener
    if (this.onSelectionChangeHandler) {
      this.editorState.selectionNotifier.removeListener(this.onSelectionChangeHandler);
      this.onSelectionChangeHandler = undefined;
    }
  }

  show(): void {
    if (findReplaceMenuEntry) {
      this.dismiss();
    }

    const selectionService = this.editorState.selectionService;
    const selectionRects = this.editorState.selectionRects();
    if (selectionRects.length === 0) {
      return;
    }

    this.editorState.onDispose.addListener(this.dismiss.bind(this));

    // Create the menu element
    const menuElement = document.createElement('div');
    menuElement.style.position = 'fixed';
    menuElement.style.top = `${this.topOffset}px`;
    menuElement.style.right = `${this.rightOffset}px`;
    menuElement.style.zIndex = '1000';

    // Apply styling
    if (this.style.findMenuBuilder) {
      const customMenu = this.style.findMenuBuilder(
        this.context,
        this.editorState,
        this.localizations,
        this.style,
        this.showReplaceMenu,
        this.dismiss.bind(this)
      );
      if (customMenu instanceof HTMLElement) {
        menuElement.appendChild(customMenu);
      }
    } else {
      // Create default menu
      const defaultMenu = this.createDefaultMenu();
      menuElement.appendChild(defaultMenu);
    }

    // Add to DOM
    document.body.appendChild(menuElement);
    findReplaceMenuEntry = menuElement;

    // Set up selection change listener
    this.onSelectionChangeHandler = this.onSelectionChange.bind(this);
    this.editorState.selectionNotifier.addListener(this.onSelectionChangeHandler);
  }

  private createDefaultMenu(): HTMLElement {
    const container = document.createElement('div');
    container.style.backgroundColor = '#ffffff';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    container.style.border = '1px solid #e0e0e0';
    container.style.padding = '8px';

    // Create the find and replace widget
    const widget = new FindAndReplaceMenuWidget({
      onDismiss: this.dismiss.bind(this),
      editorState: this.editorState,
      showReplaceMenu: this.showReplaceMenu,
      localizations: this.localizations,
      style: this.style,
      showRegexButton: this.showRegexButton,
      showCaseSensitiveButton: this.showCaseSensitiveButton
    });

    container.appendChild(widget.render());
    return container;
  }

  private onSelectionChange(): void {
    // Check if selection service is still available
    if (!this.editorState.selectionService) {
      return;
    }

    if (this.editorState.selection === null) {
      return;
    }

    if (this.selectionUpdateByInner) {
      this.selectionUpdateByInner = false;
      return;
    }

    this.dismiss();
  }
}