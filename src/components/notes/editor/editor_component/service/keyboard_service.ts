import { Selection } from '../../../core/location/selection';

export enum UnfocusDisposition {
  scope = 'scope',
  previouslyFocusedChild = 'previouslyFocusedChild'
}

export enum TextInputAction {
  none = 'none',
  unspecified = 'unspecified',
  done = 'done',
  go = 'go',
  search = 'search',
  send = 'send',
  next = 'next',
  previous = 'previous',
  continueAction = 'continueAction',
  join = 'join',
  route = 'route',
  emergencyCall = 'emergencyCall',
  newline = 'newline'
}

export interface TextEditingDeltaInsertion {
  readonly insertionOffset: number;
  readonly textInserted: string;
  readonly selection: Selection;
  readonly composing: { start: number; end: number } | null;
}

export interface TextEditingDeltaDeletion {
  readonly deletedRange: { start: number; end: number };
  readonly selection: Selection;
  readonly composing: { start: number; end: number } | null;
}

export interface TextEditingDeltaReplacement {
  readonly replacedRange: { start: number; end: number };
  readonly replacementText: string;
  readonly selection: Selection;
  readonly composing: { start: number; end: number } | null;
}

export interface TextEditingDeltaNonTextUpdate {
  readonly oldText: string;
  readonly selection: Selection;
  readonly composing: { start: number; end: number } | null;
}

export interface RawFloatingCursorPoint {
  readonly state: 'start' | 'update' | 'end';
  readonly offset?: { x: number; y: number };
}

export interface CharacterShortcutEvent {
  key: string;
  character: string;
  handler: (editorState: any) => Promise<boolean>;
}

/// [AppFlowyKeyboardService] is responsible for processing shortcut keys,
///   like command, shift, control keys.
///
/// Usually, this service can be obtained by the following code.
/// ```typescript
/// const keyboardService = editorState.service.keyboardService;
///
/// /** Simulates shortcut key input*/
/// keyboardService?.onKey(...);
///
/// /** Enables or disables this service */
/// keyboardService?.enable();
/// keyboardService?.disable();
/// ```
export abstract class AppFlowyKeyboardService {
  /// Enables IME shortcuts service.
  abstract enable(): void;

  /// Disables IME shortcuts service.
  ///
  /// In some cases, if your custom component needs to monitor
  ///   keyboard events separately,
  ///   you can disable the keyboard service of flowy_editor.
  /// But you need to call the `enable` function to restore after exiting
  ///   your custom component, otherwise the keyboard service will fails.
  abstract disable(options?: {
    showCursor?: boolean;
    disposition?: UnfocusDisposition;
  }): void;

  /// Enable the keyboard shortcuts
  abstract enableShortcuts(): void;

  /// Disable the keyboard shortcuts
  abstract disableShortcuts(): void;

  /// Closes the keyboard
  ///
  /// Used in mobile
  abstract closeKeyboard(): void;

  /// Enable the keyboard in mobile
  ///
  /// Used in mobile
  abstract enableKeyBoard(selection: Selection): void;

  /// Register interceptor
  abstract registerInterceptor(interceptor: AppFlowyKeyboardServiceInterceptor): void;

  /// Unregister interceptor
  abstract unregisterInterceptor(interceptor: AppFlowyKeyboardServiceInterceptor): void;
}

/// [AppFlowyKeyboardServiceInterceptor] is used to intercept the keyboard service.
///
/// If the interceptor returns `true`, the keyboard service will not perform
/// the built-in operation.
export abstract class AppFlowyKeyboardServiceInterceptor {
  /// Intercept insert operation
  async interceptInsert(
    insertion: TextEditingDeltaInsertion,
    editorState: any,
    characterShortcutEvents: CharacterShortcutEvent[]
  ): Promise<boolean> {
    return false;
  }

  /// Intercept delete operation
  async interceptDelete(
    deletion: TextEditingDeltaDeletion,
    editorState: any
  ): Promise<boolean> {
    return false;
  }

  /// Intercept replace operation
  async interceptReplace(
    replacement: TextEditingDeltaReplacement,
    editorState: any,
    characterShortcutEvents: CharacterShortcutEvent[]
  ): Promise<boolean> {
    return false;
  }

  /// Intercept non-text update operation
  async interceptNonTextUpdate(
    nonTextUpdate: TextEditingDeltaNonTextUpdate,
    editorState: any,
    characterShortcutEvents: CharacterShortcutEvent[]
  ): Promise<boolean> {
    return false;
  }

  /// Intercept perform action operation
  async interceptPerformAction(
    action: TextInputAction,
    editorState: any
  ): Promise<boolean> {
    return false;
  }

  /// Intercept floating cursor operation
  async interceptFloatingCursor(
    point: RawFloatingCursorPoint,
    editorState: any
  ): Promise<boolean> {
    return false;
  }
}