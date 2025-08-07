import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';

// Import core types
import type { 
  EditorState, 
  Node, 
  Selection, 
  Position,
  Delta,
  TextInsert 
} from '../../../core/core';

// Import services and components (matching Flutter imports exactly)
import type { BlockComponentBuilder } from '../../block_component/base_component/block_component_configuration';
import type { CharacterShortcutEvent } from './shortcuts/character/character_shortcut_event';
import type { CommandShortcutEvent } from './shortcuts/command/command_shortcut_event';
import type { ContextMenuItem } from '../../../service/context_menu/context_menu';
import type { ContentInsertionConfiguration } from './ime/content_insertion_configuration';
import type { AppFlowyAutoCompleteTextProvider } from '../../../service/auto_complete/auto_complete_text_provider';
import type { AppFlowyDropTargetStyle } from './style/drop_target_style';
import type { DocumentRule } from '../../../core/document/rules/document_rule';
import type { BlockComponentWrapper } from '../../block_component/base_component/block_component_wrapper';
import type { EditorScrollController } from './scroll/editor_scroll_controller';

// Import standard configurations (matching Flutter imports)
import { standardBlockComponentBuilderMap } from '../../block_component/standard_block_components';
import { standardCharacterShortcutEvents } from './shortcuts/character/character_shortcut_events';
import { standardCommandShortcutEvents } from './shortcuts/command/command_shortcut_events';
import { standardContextMenuItems } from '../../../service/context_menu/built_in_context_menu_item';

// Import services (matching Flutter service widgets)
import { BlockComponentRendererService, BlockComponentRenderer } from './renderer/block_component_service';
import { KeyboardServiceWidget } from './keyboard_service_widget';
import { SelectionServiceWidget } from './selection_service_widget';
import { ScrollServiceWidget } from './scroll_service_widget';

// Import styles (matching Flutter EditorStyle)
import { EditorStyle } from './style/editor_style';

// Global focus notifier (matching Flutter implementation)
export class KeepEditorFocusNotifier {
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

// Global instance (matching Flutter implementation)
export const keepEditorFocusNotifier = new KeepEditorFocusNotifier();

// The default value of the auto scroll edge offset on mobile
// The editor will scroll when the cursor is close to the edge of the screen
export const appFlowyEditorAutoScrollEdgeOffset = 220.0;

// AppFlowyEditor Props interface (matching Flutter AppFlowyEditor constructor)
export interface AppFlowyEditorProps {
  // Simplified props for easy usage (like the dashboard expects)
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  
  // Advanced props (matching Flutter AppFlowyEditor)
  editorState?: EditorState;
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
  focusNode?: React.RefObject<HTMLElement>;
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

// Internal state interface (matching Flutter _AppFlowyEditorState)
interface AppFlowyEditorState {
  services: ReactNode | null;
  editorScrollController: EditorScrollController | null;
}

// AppFlowyEditor Component (matching Flutter AppFlowyEditor class)
export const AppFlowyEditor: React.FC<AppFlowyEditorProps> = ({
  // Simplified props
  content = '',
  onChange,
  placeholder = 'Start writing...',
  className,
  style,
  
  // Advanced props with defaults (matching Flutter constructor defaults)
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
  editorStyle = EditorStyle.desktop(),
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
  // State (matching Flutter _AppFlowyEditorState)
  const [state, setState] = useState<AppFlowyEditorState>({
    services: null,
    editorScrollController: null,
  });

  // Internal state for simple usage
  const [internalContent, setInternalContent] = useState(content);

  // Refs for managing lifecycle
  const mountedRef = useRef(true);
  const scrollControllerRef = useRef<EditorScrollController | null>(null);

  // Create default EditorState if not provided
  const defaultEditorState: EditorState = React.useMemo(() => {
    if (editorState) return editorState;
    
    return {
      editorStyle: editorStyle,
      editable: editable,
      showHeader: header != null,
      showFooter: footer != null,
      enableAutoComplete: enableAutoComplete,
      autoCompleteTextProvider: autoCompleteTextProvider,
      disableAutoScroll: disableAutoScroll,
      autoScrollEdgeOffset: autoScrollEdgeOffset,
      documentRules: documentRules,
      renderer: new BlockComponentRenderer({ builders: blockComponentBuilders }),
      service: {
        keyboardServiceKey: 'keyboard-service',
        selectionServiceKey: 'selection-service',
        scrollServiceKey: 'scroll-service',
      },
      document: {
        root: { content: internalContent } as any,
        updateContent: (newContent: string) => {
          setInternalContent(newContent);
          onChange?.(newContent);
        }
      },
      selection: null,
      updateSelectionWithReason: (selection: Selection, options: { reason: string }) => {
        // Handle selection updates
      },
    } as EditorState;
  }, [
    editorState,
    editorStyle,
    editable,
    header,
    footer,
    enableAutoComplete,
    autoCompleteTextProvider,
    disableAutoScroll,
    autoScrollEdgeOffset,
    documentRules,
    blockComponentBuilders,
    internalContent,
    onChange,
  ]);

  const currentEditorState = defaultEditorState;

  // Initialize scroll controller (matching Flutter initState)
  useEffect(() => {
    scrollControllerRef.current = editorScrollController || createEditorScrollController({
      editorState,
      shrinkWrap,
    });

    updateValues();
    currentEditorState.renderer = getRenderer();

    // Auto focus (matching Flutter WidgetsBinding.instance.addPostFrameCallback)
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        autoFocusIfNeeded();
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      // Dispose the scroll controller if it's created by the editor (matching Flutter dispose)
      if (!editorScrollController && scrollControllerRef.current) {
        scrollControllerRef.current.dispose();
      }
      mountedRef.current = false;
    };
  }, []);

  // Update values when props change (matching Flutter didUpdateWidget)
  useEffect(() => {
    updateValues();

    if (editorScrollController !== scrollControllerRef.current) {
      scrollControllerRef.current = editorScrollController || createEditorScrollController({
        editorState,
        shrinkWrap,
      });
    }

    // Reset services to rebuild (matching Flutter didUpdateWidget)
    setState(prev => ({ ...prev, services: null }));
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
    editorScrollController,
  ]);

  // Update values function (matching Flutter _updateValues)
  const updateValues = useCallback(() => {
    currentEditorState.editorStyle = editorStyle;
    currentEditorState.editable = editable;
    currentEditorState.showHeader = header != null;
    currentEditorState.showFooter = footer != null;
    currentEditorState.enableAutoComplete = enableAutoComplete;
    currentEditorState.autoCompleteTextProvider = autoCompleteTextProvider;
    currentEditorState.disableAutoScroll = disableAutoScroll;
    currentEditorState.autoScrollEdgeOffset = autoScrollEdgeOffset;
    currentEditorState.documentRules = documentRules;
  }, [
    currentEditorState,
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

  // Auto focus function (matching Flutter _autoFocusIfNeeded)
  const autoFocusIfNeeded = useCallback(() => {
    if (editable && autoFocus) {
      // For now, just focus the editor element
      // In a full implementation, this would use the Selection system
    }
  }, [editable, autoFocus]);

  // Get renderer function (matching Flutter _renderer getter)
  const getRenderer = useCallback((): BlockComponentRendererService => {
    return new BlockComponentRenderer({
      builders: { ...blockComponentBuilders },
    });
  }, [blockComponentBuilders]);

  // Create editor scroll controller (matching Flutter EditorScrollController constructor)
  const createEditorScrollController = useCallback((options: {
    editorState: EditorState;
    shrinkWrap: boolean;
  }): EditorScrollController => {
    return {
      dispose: () => {},
    } as EditorScrollController;
  }, []);

  // Build services function (matching Flutter _buildServices)
  const buildServices = useCallback((): ReactNode => {
    // For now, create a simple working editor that can actually be used
    // This matches the Flutter structure but provides a functional editor
    const editorContent = React.createElement('div', {
      contentEditable: editable,
      suppressContentEditableWarning: true,
      style: {
        outline: 'none',
        minHeight: '100px',
        padding: '16px',
        fontSize: '16px',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      onInput: (e: React.FormEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const content = target.textContent || '';
        // Update content
        setInternalContent(content);
        onChange?.(content);
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Handle basic keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case 'b':
              e.preventDefault();
              document.execCommand('bold');
              break;
            case 'i':
              e.preventDefault();
              document.execCommand('italic');
              break;
            case 'u':
              e.preventDefault();
              document.execCommand('underline');
              break;
          }
        }
      },
      placeholder: 'Start writing...',
    });

    let child = React.createElement('div', {
      style: { minHeight: '100px', width: '100%' }
    }, [
      header,
      editorContent,
      footer
    ]);

    // Wrap with keyboard service (matching Flutter KeyboardServiceWidget)
    if (!disableKeyboardService) {
      child = React.createElement(KeyboardServiceWidget, {
        key: currentEditorState.service.keyboardServiceKey,
        characterShortcutEvents: editable ? characterShortcutEvents : [],
        commandShortcutEvents: commandShortcutEvents,
        focusNode: focusNode,
        contentInsertionConfiguration: contentInsertionConfiguration,
        children: child,
      });
    }

    // Wrap with selection service (matching Flutter SelectionServiceWidget)
    if (!disableSelectionService) {
      child = React.createElement(SelectionServiceWidget, {
        key: currentEditorState.service.selectionServiceKey,
        cursorColor: editorStyle.cursorColor,
        selectionColor: editorStyle.selectionColor,
        showMagnifier: showMagnifier,
        contextMenuItems: contextMenuItems,
        dropTargetStyle: dropTargetStyle,
        children: child,
      });
    }

    // Wrap with scroll service (matching Flutter ScrollServiceWidget)
    if (!disableScrollService) {
      child = React.createElement(ScrollServiceWidget, {
        key: currentEditorState.service.scrollServiceKey,
        editorScrollController: scrollControllerRef.current,
        children: child,
      });
    }

    return child;
  }, [
    editable,
    header,
    footer,
    currentEditorState,
    disableKeyboardService,
    characterShortcutEvents,
    commandShortcutEvents,
    focusNode,
    contentInsertionConfiguration,
    disableSelectionService,
    editorStyle,
    showMagnifier,
    contextMenuItems,
    dropTargetStyle,
    disableScrollService,
  ]);

  // Build services if not already built (matching Flutter build method logic)
  if (!state.services) {
    const services = buildServices();
    setState(prev => ({ ...prev, services }));
  }

  // Update content when prop changes
  React.useEffect(() => {
    if (content !== internalContent) {
      setInternalContent(content);
    }
  }, [content, internalContent]);

  // Return the editor (matching Flutter build method)
  // Using React equivalent of Flutter's Provider.value + FocusScope + Overlay
  return React.createElement(
    'div', // React equivalent of Provider.value
    {
      className,
      'data-editor-state': currentEditorState,
      style: { 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        minHeight: '200px',
        ...style 
      }
    },
    React.createElement(
      'div', // React equivalent of FocusScope
      {
        tabIndex: -1,
        style: { width: '100%', height: '100%', outline: 'none' }
      },
      React.createElement(
        'div', // React equivalent of Overlay
        {
          style: { 
            position: 'relative', 
            width: '100%', 
            height: '100%',
            overflow: 'hidden' 
          }
        },
        state.services || buildServices()
      )
    )
  );
};

// Export default (matching Flutter export pattern)
export default AppFlowyEditor;