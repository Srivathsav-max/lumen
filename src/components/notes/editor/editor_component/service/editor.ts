import React, { useState, useEffect, useRef, ReactNode } from 'react';

// TypeScript interfaces for editor functionality
interface EditorState {
  editorStyle: EditorStyle;
  editable: boolean;
  showHeader: boolean;
  showFooter: boolean;
  enableAutoComplete: boolean;
  autoCompleteTextProvider?: AppFlowyAutoCompleteTextProvider;
  disableAutoScroll: boolean;
  autoScrollEdgeOffset: number;
  documentRules: DocumentRule[];
  renderer: BlockComponentRendererService;
  service: {
    keyboardServiceKey: string;
    selectionServiceKey: string;
    scrollServiceKey: string;
  };
  document: {
    root: any;
  };
  updateSelectionWithReason: (selection: Selection, options: { reason: SelectionUpdateReason }) => void;
}

interface EditorStyle {
  cursorColor: string;
  selectionColor: string;
  static desktop(): EditorStyle;
}

interface BlockComponentBuilder {
  // Block component builder interface
}

interface CharacterShortcutEvent {
  // Character shortcut event interface
}

interface CommandShortcutEvent {
  // Command shortcut event interface
}

interface ContextMenuItem {
  // Context menu item interface
}

interface Selection {
  static single(options: { path: number[]; startOffset: number }): Selection;
}

enum SelectionUpdateReason {
  uiEvent = 'uiEvent'
}

interface EditorScrollController {
  dispose(): void;
}

interface ContentInsertionConfiguration {
  // Content insertion configuration
}

interface AppFlowyAutoCompleteTextProvider {
  // Auto complete text provider
}

interface AppFlowyDropTargetStyle {
  // Drop target style
}

interface DocumentRule {
  // Document rule interface
}

interface BlockComponentWrapper {
  // Block component wrapper
}

interface BlockComponentRendererService {
  build(context: any, root: any, options: {
    header?: ReactNode;
    footer?: ReactNode;
    wrapper?: BlockComponentWrapper;
  }): ReactNode;
}

class BlockComponentRenderer implements BlockComponentRendererService {
  constructor(private options: { builders: Record<string, BlockComponentBuilder> }) {}
  
  build(context: any, root: any, options: {
    header?: ReactNode;
    footer?: ReactNode;
    wrapper?: BlockComponentWrapper;
  }): ReactNode {
    // Implementation placeholder
    return null;
  }
}

// Standard configurations (to be implemented)
const standardBlockComponentBuilderMap: Record<string, BlockComponentBuilder> = {};
const standardCharacterShortcutEvents: CharacterShortcutEvent[] = [];
const standardCommandShortcutEvents: CommandShortcutEvent[] = [];
const standardContextMenuItems: ContextMenuItem[][] = [];

// workaround for the issue:
// the popover will grab the focus even if it's inside the editor
// setup a global value to indicate whether the focus should be grabbed
// increase the value when the popover is opened
// decrease the value when the popover is closed
// only grab the focus when the value is 0
// the operation must be paired
const keepEditorFocusNotifier = new KeepEditorFocusNotifier();

/// The default value of the auto scroll edge offset on mobile
/// The editor will scroll when the cursor is close to the edge of the screen
const appFlowyEditorAutoScrollEdgeOffset = 220.0;

interface AppFlowyEditorProps {
  editorState: EditorState;
  blockComponentBuilders?: Record<string, BlockComponentBuilder>;
  characterShortcutEvents?: CharacterShortcutEvent[];
  commandShortcutEvents?: CommandShortcutEvent[];
  contextMenuItems?: ContextMenuItem[][];
  contentInsertionConfiguration?: ContentInsertionConfiguration;
  editable?: boolean;
  autoFocus?: boolean;
  focusedSelection?: Selection;
  shrinkWrap?: boolean;
  showMagnifier?: boolean;
  editorScrollController?: EditorScrollController;
  editorStyle?: EditorStyle;
  header?: ReactNode;
  footer?: ReactNode;
  focusNode?: any; // React focus node
  enableAutoComplete?: boolean;
  autoCompleteTextProvider?: AppFlowyAutoCompleteTextProvider;
  dropTargetStyle?: AppFlowyDropTargetStyle;
  disableSelectionService?: boolean;
  disableKeyboardService?: boolean;
  disableScrollService?: boolean;
  disableAutoScroll?: boolean;
  autoScrollEdgeOffset?: number;
  documentRules?: DocumentRule[];
  blockWrapper?: BlockComponentWrapper;
}

export const AppFlowyEditor: React.FC<AppFlowyEditorProps> = ({
  editorState,
  blockComponentBuilders = standardBlockComponentBuilderMap,
  characterShortcutEvents = standardCharacterShortcutEvents,
  commandShortcutEvents = standardCommandShortcutEvents,
  contextMenuItems = standardContextMenuItems,
  contentInsertionConfiguration,
  editable = true,
  autoFocus = false,
  focusedSelection,
  shrinkWrap = false,
  showMagnifier = true,
  editorScrollController,
  editorStyle,
  header,
  footer,
  focusNode,
  enableAutoComplete = false,
  autoCompleteTextProvider,
  dropTargetStyle,
  disableSelectionService = false,
  disableKeyboardService = false,
  disableScrollService = false,
  disableAutoScroll = false,
  autoScrollEdgeOffset = appFlowyEditorAutoScrollEdgeOffset,
  documentRules = [],
  blockWrapper,
}) => {
  const [services, setServices] = useState<ReactNode | null>(null);
  const scrollControllerRef = useRef<EditorScrollController | null>(null);

  // Initialize scroll controller
  useEffect(() => {
    if (!scrollControllerRef.current) {
      scrollControllerRef.current = editorScrollController || createEditorScrollController({
        editorState,
        shrinkWrap,
      });
    }

    updateValues();
    editorState.renderer = getRenderer();

    // auto focus
    setTimeout(() => {
      autoFocusIfNeeded();
    }, 0);

    return () => {
      // dispose the scroll controller if it's created by the editor
      if (!editorScrollController && scrollControllerRef.current) {
        scrollControllerRef.current.dispose();
      }
    };
  }, []);

  // Update values when props change
  useEffect(() => {
    updateValues();
    setServices(null); // Reset services to rebuild
  }, [
    editorStyle,
    editable,
    header,
    footer,
    enableAutoComplete,
    autoCompleteTextProvider,
    disableAutoScroll,
    autoScrollEdgeOffset,
    documentRules,
  ]);
  const updateValues = () => {
    editorState.editorStyle = editorStyle || EditorStyle.desktop();
    editorState.editable = editable;
    editorState.showHeader = header != null;
    editorState.showFooter = footer != null;
    editorState.enableAutoComplete = enableAutoComplete;
    editorState.autoCompleteTextProvider = autoCompleteTextProvider;
    editorState.disableAutoScroll = disableAutoScroll;
    editorState.autoScrollEdgeOffset = autoScrollEdgeOffset;
    editorState.documentRules = documentRules;
  };

  const autoFocusIfNeeded = () => {
    if (editable && autoFocus) {
      editorState.updateSelectionWithReason(
        focusedSelection ??
          Selection.single({
            path: [0],
            startOffset: 0,
          }),
        { reason: SelectionUpdateReason.uiEvent }
      );
    }
  };

  const getRenderer = (): BlockComponentRendererService => {
    return new BlockComponentRenderer({
      builders: { ...blockComponentBuilders },
    });
  };

  const createEditorScrollController = (options: {
    editorState: EditorState;
    shrinkWrap: boolean;
  }): EditorScrollController => {
    // Implementation placeholder
    return {
      dispose: () => {},
    } as EditorScrollController;
  };

  const buildServices = (): ReactNode => {
    let child = editorState.renderer.build(
      null, // context
      editorState.document.root,
      {
        header,
        footer,
        wrapper: blockWrapper,
      }
    );

    if (!disableKeyboardService) {
      child = React.createElement('div', {
        key: editorState.service.keyboardServiceKey,
        'data-keyboard-service': true,
        'data-character-shortcuts': editable ? characterShortcutEvents : [],
        'data-command-shortcuts': commandShortcutEvents,
        'data-focus-node': focusNode,
        'data-content-insertion': contentInsertionConfiguration,
      }, child);
    }

    if (!disableSelectionService) {
      child = React.createElement('div', {
        key: editorState.service.selectionServiceKey,
        'data-selection-service': true,
        'data-cursor-color': editorStyle?.cursorColor,
        'data-selection-color': editorStyle?.selectionColor,
        'data-show-magnifier': showMagnifier,
        'data-context-menu': contextMenuItems,
        'data-drop-target-style': dropTargetStyle,
      }, child);
    }

    if (!disableScrollService) {
      child = React.createElement('div', {
        key: editorState.service.scrollServiceKey,
        'data-scroll-service': true,
        'data-scroll-controller': scrollControllerRef.current,
      }, child);
    }

    return child;
  };

  // Build services if not already built
  if (!services) {
    setServices(buildServices());
  }

  return services || React.createElement('div', null, 'Loading...');
};

class KeepEditorFocusNotifier {
  private _value: number = 0;
  private _listeners: Array<(value: number) => void> = [];

  get value(): number {
    return this._value;
  }

  set value(v: number) {
    this._value = Math.max(0, v);
    this._notifyListeners();
  }

  get shouldKeepFocus(): boolean {
    return this._value > 0;
  }

  increase(): void {
    this.value++;
  }

  decrease(): void {
    this.value--;
  }

  reset(): void {
    this.value = 0;
  }

  addListener(listener: (value: number) => void): void {
    this._listeners.push(listener);
  }

  removeListener(listener: (value: number) => void): void {
    const index = this._listeners.indexOf(listener);
    if (index > -1) {
      this._listeners.splice(index, 1);
    }
  }

  private _notifyListeners(): void {
    this._listeners.forEach(listener => listener(this._value));
  }

  dispose(): void {
    this._listeners.length = 0;
  }
}
