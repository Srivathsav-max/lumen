// Find and replace menu service for editor overlay management
export interface FindReplaceLocalizations {
  [key: string]: string;
}

export interface FindReplaceStyle {
  findMenuBuilder?: (
    context: any,
    editorState: EditorState,
    localizations?: FindReplaceLocalizations,
    style?: FindReplaceStyle,
    showReplaceMenu?: boolean,
    onDismiss?: () => void
  ) => HTMLElement;
}

export interface EditorState {
  service: {
    keyboardService?: { enable(): void };
    scrollService?: { enable(): void };
    selectionServiceKey: { currentState: any };
    selectionService: {
      selectionRects: any[];
      currentSelection: { value: any; removeListener(fn: () => void): void };
    };
  };
  onDispose: { addListener(fn: () => void): void; removeListener(fn: () => void): void };
  editorStyle: { selectionColor: string };
}

export abstract class FindReplaceService {
  abstract show(): void;
  abstract dismiss(): void;
}

let _findReplaceMenuEntry: HTMLElement | null = null;

export class FindReplaceMenu implements FindReplaceService {
  private context: any;
  private editorState: EditorState;
  private showReplaceMenu: boolean;
  private localizations?: FindReplaceLocalizations;
  private style: FindReplaceStyle;
  private showRegexButton: boolean;
  private showCaseSensitiveButton: boolean;
  private readonly topOffset = 52;
  private readonly rightOffset = 40;
  private _selectionUpdateByInner = false;

  constructor(options: {
    context: any;
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
    if (_findReplaceMenuEntry) {
      this.editorState.service.keyboardService?.enable();
      this.editorState.service.scrollService?.enable();
    }

    this.editorState.onDispose.removeListener(this.dismiss.bind(this));

    if (_findReplaceMenuEntry) {
      _findReplaceMenuEntry.remove();
      _findReplaceMenuEntry = null;
    }

    const isSelectionDisposed = 
      this.editorState.service.selectionServiceKey.currentState == null;
    if (!isSelectionDisposed) {
      const selectionService = this.editorState.service.selectionService;
      selectionService.currentSelection.removeListener(this._onSelectionChange.bind(this));
    }
  }

  show(): void {
    if (_findReplaceMenuEntry) {
      this.dismiss();
    }

    const selectionService = this.editorState.service.selectionService;
    const selectionRects = selectionService.selectionRects;
    if (selectionRects.length === 0) {
      return;
    }

    this.editorState.onDispose.addListener(this.dismiss.bind(this));

    // Create overlay element
    const overlayElement = document.createElement('div');
    overlayElement.style.position = 'fixed';
    overlayElement.style.top = `${this.topOffset}px`;
    overlayElement.style.right = `${this.rightOffset}px`;
    overlayElement.style.zIndex = '1000';

    if (this.style.findMenuBuilder) {
      const customElement = this.style.findMenuBuilder(
        this.context,
        this.editorState,
        this.localizations,
        this.style,
        this.showReplaceMenu,
        this.dismiss.bind(this)
      );
      overlayElement.appendChild(customElement);
    } else {
      // Create default find/replace widget
      const defaultWidget = this.createDefaultWidget();
      overlayElement.appendChild(defaultWidget);
    }

    _findReplaceMenuEntry = overlayElement;
    document.body.appendChild(overlayElement);
  }

  private createDefaultWidget(): HTMLElement {
    const container = document.createElement('div');
    container.style.backgroundColor = this.editorState.editorStyle.selectionColor;
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
    container.style.padding = '12px';
    container.style.minWidth = '300px';

    // This would contain the actual FindAndReplaceMenuWidget implementation
    // For now, creating a placeholder
    const placeholder = document.createElement('div');
    placeholder.textContent = 'Find and Replace Menu';
    placeholder.style.color = '#333';
    placeholder.style.fontFamily = 'system-ui, sans-serif';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.float = 'right';
    closeButton.style.border = 'none';
    closeButton.style.background = 'transparent';
    closeButton.style.fontSize = '18px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => this.dismiss();

    container.appendChild(closeButton);
    container.appendChild(placeholder);

    return container;
  }

  private _onSelectionChange(): void {
    // Workaround: SelectionService has been released after hot reload
    const isSelectionDisposed = 
      this.editorState.service.selectionServiceKey.currentState == null;
    if (!isSelectionDisposed) {
      const selectionService = this.editorState.service.selectionService;
      if (selectionService.currentSelection.value == null) {
        return;
      }
    }

    if (this._selectionUpdateByInner) {
      this._selectionUpdateByInner = false;
      return;
    }

    this.dismiss();
  }
}