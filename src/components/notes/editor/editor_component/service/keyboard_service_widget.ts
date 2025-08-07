import { EditorState } from '../../editor_state';
import { Selection } from '../../selection';
import { CommandShortcutEvent, CharacterShortcutEvent } from '../../shortcut_event/shortcut_event';
import { SelectionGestureInterceptor } from '../../selection/selection_gesture_interceptor';
import { AppFlowyKeyboardService, AppFlowyKeyboardServiceInterceptor } from '../../keyboard/keyboard_service';
import { TextInputService, NonDeltaTextInputService } from '../../ime/text_input_service';
import { SelectionUpdateReason } from '../../selection/selection_update_reason';
import { onInsert, onDelete, onReplace, onNonTextUpdate, onPerformAction } from '../../ime/delta_input_impl';
import { onFloatingCursorUpdate } from '../../ime/delta_input_on_floating_cursor_update';
import { keepEditorFocusNotifier } from '../../focus/keep_editor_focus_notifier';

export interface ContentInsertionConfiguration {
  allowedMimeTypes?: string[];
}

interface KeyboardServiceWidgetProps {
  commandShortcutEvents?: CommandShortcutEvent[];
  characterShortcutEvents?: CharacterShortcutEvent[];
  focusNode?: HTMLElement;
  contentInsertionConfiguration?: ContentInsertionConfiguration;
  child: HTMLElement;
}

/**
 * Handle software keyboard and hardware keyboard
 */
export class KeyboardServiceWidget implements AppFlowyKeyboardService {
  private props: Required<KeyboardServiceWidgetProps>;
  private element: HTMLElement;
  private interceptor: SelectionGestureInterceptor;
  private editorState: EditorState;
  private textInputService: TextInputService;
  private focusNode: HTMLElement;
  private interceptors: AppFlowyKeyboardServiceInterceptor[] = [];
  private previousSelection?: Selection;
  private enableIMEShortcuts = true;
  private enableKeyboardShortcuts = true;

  constructor(props: KeyboardServiceWidgetProps) {
    this.props = {
      commandShortcutEvents: [],
      characterShortcutEvents: [],
      contentInsertionConfiguration: {},
      ...props
    };

    this.editorState = EditorState.getInstance();
    this.editorState.selectionNotifier.addListener(this.onSelectionChanged.bind(this));

    this.interceptor = new SelectionGestureInterceptor({
      key: 'keyboard',
      canTap: (details) => {
        this.enableIMEShortcuts = true;
        this.focusNode.focus();
        this.textInputService.close();
        return true;
      },
    });

    this.editorState.service.selectionService.registerGestureInterceptor(this.interceptor);
    this.textInputService = this.buildTextInputService();
    this.focusNode = this.props.focusNode || this.createFocusNode();
    this.focusNode.addEventListener('focus', this.onFocusChanged.bind(this));
    this.focusNode.addEventListener('blur', this.onFocusChanged.bind(this));

    keepEditorFocusNotifier.addListener(this.onKeepEditorFocusChanged.bind(this));

    this.element = this.createElement();
  }

  private createFocusNode(): HTMLElement {
    const focusNode = document.createElement('div');
    focusNode.tabIndex = 0;
    focusNode.style.position = 'absolute';
    focusNode.style.left = '-9999px';
    focusNode.style.opacity = '0';
    focusNode.setAttribute('aria-label', 'keyboard service');
    return focusNode;
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'keyboard-service-widget';
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';

    // Add focus node to container
    container.appendChild(this.focusNode);

    let child = this.props.child;

    // If there are command shortcut events, handle hardware keyboard
    if (this.props.commandShortcutEvents.length > 0) {
      child.addEventListener('keydown', this.onKeyEvent.bind(this));
      child.addEventListener('keyup', this.onKeyEvent.bind(this));
    }

    // Ignore the default behavior of the space key on web
    if (this.isWeb()) {
      child.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          // Allow space in text input contexts
          const target = event.target as HTMLElement;
          if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
            event.preventDefault();
            event.stopPropagation();
          }
        }
      });
    }

    container.appendChild(child);
    return container;
  }

  private isWeb(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  disable(options: { showCursor?: boolean } = {}): void {
    this.focusNode.blur();
  }

  enable(): void {
    this.focusNode.focus();
  }

  enableShortcuts(): void {
    this.enableKeyboardShortcuts = true;
  }

  disableShortcuts(): void {
    this.enableKeyboardShortcuts = false;
  }

  closeKeyboard(): void {
    this.textInputService.close();
  }

  enableKeyBoard(selection: Selection): void {
    this.attachTextInputService(selection);
  }

  registerInterceptor(interceptor: AppFlowyKeyboardServiceInterceptor): void {
    this.interceptors.push(interceptor);
  }

  unregisterInterceptor(interceptor: AppFlowyKeyboardServiceInterceptor): void {
    const index = this.interceptors.indexOf(interceptor);
    if (index > -1) {
      this.interceptors.splice(index, 1);
    }
  }

  /**
   * Handle hardware keyboard
   */
  private onKeyEvent(event: KeyboardEvent): boolean {
    if (!this.enableKeyboardShortcuts) {
      return false;
    }

    if ((event.type !== 'keydown' && event.type !== 'keypress') || !this.enableIMEShortcuts) {
      if (this.textInputService.composingTextRange && 
          this.textInputService.composingTextRange.start !== this.textInputService.composingTextRange.end) {
        return true; // Skip remaining handlers
      }
      return false;
    }

    for (const shortcutEvent of this.props.commandShortcutEvents) {
      // Check if the shortcut event can respond to the raw key event
      if (shortcutEvent.canRespondToRawKeyEvent(event)) {
        const result = shortcutEvent.handler(this.editorState);
        if (result === 'handled') {
          console.debug('keyboard service - handled by command shortcut event:', shortcutEvent);
          event.preventDefault();
          return true;
        } else if (result === 'skipRemainingHandlers') {
          console.debug('keyboard service - skip by command shortcut event:', shortcutEvent);
          return true;
        }
        continue;
      }
    }

    return false;
  }

  private onSelectionChanged(): void {
    const doNotAttach = this.editorState.selectionExtraInfo?.['selectionExtraInfoDoNotAttachTextService'];
    if (doNotAttach === true) {
      return;
    }

    // Attach the delta text input service if needed
    const selection = this.editorState.selection;
    this.enableIMEShortcuts = true;

    if (!selection) {
      this.textInputService.close();
    } else {
      // For the deletion, we should attach the text input service immediately
      this.attachTextInputService(selection);
      this.updateCaretPosition(selection);

      if (this.editorState.selectionUpdateReason === SelectionUpdateReason.uiEvent) {
        this.focusNode.focus();
        console.debug('keyboard service - request focus');
      } else {
        console.debug('keyboard service - selection changed:', selection);
      }
    }

    this.previousSelection = selection;
  }

  private attachTextInputService(selection: Selection): void {
    const textEditingValue = this.getCurrentTextEditingValue(selection);
    console.debug('keyboard service - attach text input service:', textEditingValue);
    
    if (textEditingValue) {
      this.textInputService.attach(textEditingValue, {
        enableDeltaModel: false,
        inputType: 'text',
        textCapitalization: 'sentences',
        inputAction: 'newline',
        allowedMimeTypes: this.props.contentInsertionConfiguration.allowedMimeTypes || [],
      });
      
      // Disable shortcuts when the IME is active
      this.enableIMEShortcuts = !textEditingValue.composing || 
        textEditingValue.composing.start === textEditingValue.composing.end;
    } else {
      this.enableIMEShortcuts = true;
    }
  }

  /**
   * Get the current text editing value of the editor based on the given selection
   */
  private getCurrentTextEditingValue(selection: Selection): any {
    // Get all the editable nodes in the selection
    const editableNodes = this.editorState
      .getNodesInSelection(selection)
      .filter(element => element.delta !== null);

    // If the selection is inline and updated by UI event, clear composing range on Android
    const shouldClearComposingRange = 
      this.editorState.selectionType === 'inline' &&
      this.editorState.selectionUpdateReason === SelectionUpdateReason.uiEvent;

    if (this.isAndroid() && shouldClearComposingRange) {
      this.textInputService.clearComposingTextRange();
    }

    // Get the composing text range
    const composingTextRange = this.textInputService.composingTextRange || { start: 0, end: 0 };
    
    if (editableNodes.length > 0) {
      // Get the text by concatenating all the editable nodes in the selection
      let text = editableNodes
        .map(editableNode => editableNode.delta!.toPlainText())
        .join('\n');

      return {
        text,
        selection: {
          baseOffset: selection.startIndex,
          extentOffset: selection.endIndex,
        },
        composing: composingTextRange,
      };
    }
    
    return null;
  }

  private isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  }

  private onFocusChanged(): void {
    console.debug('keyboard service - focus changed:', document.activeElement === this.focusNode);

    // On web, we don't need to close the keyboard when focus is lost
    if (this.isWeb()) {
      return;
    }

    // Clear the selection when focus is lost
    if (document.activeElement !== this.focusNode) {
      if (keepEditorFocusNotifier.shouldKeepFocus) {
        return;
      }

      this.editorState.selection = null;
      this.textInputService.close();
    }
  }

  private onKeepEditorFocusChanged(): void {
    console.debug('keyboard service - on keep editor focus changed:', keepEditorFocusNotifier.value);

    if (!keepEditorFocusNotifier.shouldKeepFocus) {
      this.focusNode.focus();
    }
  }

  private updateCaretPosition(selection?: Selection): void {
    if (!selection || !selection.isCollapsed) {
      return;
    }
    
    const node = this.editorState.getNodeAtPath(selection.start.path);
    if (!node) {
      return;
    }
    
    const renderBox = node.renderBox;
    const selectable = node.selectable;
    
    if (renderBox && selectable) {
      const rect = selectable.getCursorRectInPosition(selection.end, { shiftWithBaseOffset: true });
      if (rect) {
        this.textInputService.updateCaretPosition(renderBox.getBoundingClientRect(), rect);
      }
    }
  }

  private buildTextInputService(): NonDeltaTextInputService {
    return new NonDeltaTextInputService({
      onInsert: async (insertion) => {
        for (const interceptor of this.interceptors) {
          const result = await interceptor.interceptInsert(
            insertion,
            this.editorState,
            this.props.characterShortcutEvents,
          );
          if (result) {
            console.info('keyboard service onInsert - intercepted by interceptor:', interceptor);
            return false;
          }
        }

        await onInsert(insertion, this.editorState, this.props.characterShortcutEvents);
        return true;
      },
      onDelete: async (deletion) => {
        for (const interceptor of this.interceptors) {
          const result = await interceptor.interceptDelete(deletion, this.editorState);
          if (result) {
            console.info('keyboard service onDelete - intercepted by interceptor:', interceptor);
            return false;
          }
        }

        await onDelete(deletion, this.editorState);
        return true;
      },
      onReplace: async (replacement) => {
        for (const interceptor of this.interceptors) {
          const result = await interceptor.interceptReplace(
            replacement,
            this.editorState,
            this.props.characterShortcutEvents,
          );
          if (result) {
            console.info('keyboard service onReplace - intercepted by interceptor:', interceptor);
            return false;
          }
        }

        await onReplace(replacement, this.editorState, this.props.characterShortcutEvents);
        return true;
      },
      onNonTextUpdate: async (nonTextUpdate) => {
        for (const interceptor of this.interceptors) {
          const result = await interceptor.interceptNonTextUpdate(
            nonTextUpdate,
            this.editorState,
            this.props.characterShortcutEvents,
          );
          if (result) {
            console.info('keyboard service onNonTextUpdate - intercepted by interceptor:', interceptor);
            return false;
          }
        }

        await onNonTextUpdate(nonTextUpdate, this.editorState, this.props.characterShortcutEvents);
        return true;
      },
      onPerformAction: async (action) => {
        for (const interceptor of this.interceptors) {
          const result = await interceptor.interceptPerformAction(action, this.editorState);
          if (result) {
            console.info('keyboard service onPerformAction - intercepted by interceptor:', interceptor);
            return;
          }
        }

        await onPerformAction(action, this.editorState);
      },
      onFloatingCursor: async (point) => {
        for (const interceptor of this.interceptors) {
          const result = await interceptor.interceptFloatingCursor(point, this.editorState);
          if (result) {
            console.info('keyboard service onFloatingCursor - intercepted by interceptor:', interceptor);
            return;
          }
        }

        await onFloatingCursorUpdate(point, this.editorState);
      },
      contentInsertionConfiguration: this.props.contentInsertionConfiguration,
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.editorState.selectionNotifier.removeListener(this.onSelectionChanged);
    this.editorState.service.selectionService.unregisterGestureInterceptor('keyboard');
    this.focusNode.removeEventListener('focus', this.onFocusChanged);
    this.focusNode.removeEventListener('blur', this.onFocusChanged);
    keepEditorFocusNotifier.removeListener(this.onKeepEditorFocusChanged);
    this.textInputService.close();
  }
}