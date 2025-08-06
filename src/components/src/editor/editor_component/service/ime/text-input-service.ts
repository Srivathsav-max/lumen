// Interfaces
interface TextRange {
  start: number;
  end: number;
  isCollapsed: boolean;
}

interface TextSelection {
  baseOffset: number;
  extentOffset: number;
  start: number;
  end: number;
  isCollapsed: boolean;
}

interface TextEditingValue {
  text: string;
  selection: TextSelection;
  composing: TextRange;
}

interface Size {
  width: number;
  height: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface Matrix4 {
  values: number[];
}

interface TextInputConfiguration {
  inputType: string;
  obscureText: boolean;
  autocorrect: boolean;
}

interface KeyboardInsertedContent {
  data: string;
  mimeType: string;
}

interface ContentInsertionConfiguration {
  allowedMimeTypes: string[];
  onContentInserted: (content: KeyboardInsertedContent) => void;
}

// TextEditingDelta types
abstract class TextEditingDelta {
  abstract oldText: string;
  abstract selection: TextSelection;
  abstract composing: TextRange;
}

class TextEditingDeltaInsertion extends TextEditingDelta {
  constructor(
    public oldText: string,
    public textInserted: string,
    public insertionOffset: number,
    public selection: TextSelection,
    public composing: TextRange
  ) {
    super();
  }
}

class TextEditingDeltaDeletion extends TextEditingDelta {
  constructor(
    public oldText: string,
    public deletedRange: TextRange,
    public selection: TextSelection,
    public composing: TextRange
  ) {
    super();
  }
}

class TextEditingDeltaReplacement extends TextEditingDelta {
  constructor(
    public oldText: string,
    public replacementText: string,
    public replacedRange: TextRange,
    public selection: TextSelection,
    public composing: TextRange
  ) {
    super();
  }
}

class TextEditingDeltaNonTextUpdate extends TextEditingDelta {
  constructor(
    public oldText: string,
    public selection: TextSelection,
    public composing: TextRange
  ) {
    super();
  }
}

// TextInputAction enum
enum TextInputAction {
  none = 'none',
  unspecified = 'unspecified',
  done = 'done',
  go = 'go',
  search = 'search',
  send = 'send',
  next = 'next',
  previous = 'previous',
  continueAction = 'continue',
  join = 'join',
  route = 'route',
  emergencyCall = 'emergencyCall',
  newline = 'newline',
}

// FloatingCursorDragState enum
enum FloatingCursorDragState {
  Start = 'Start',
  Update = 'Update',
  End = 'End',
}

// RawFloatingCursorPoint interface
interface RawFloatingCursorPoint {
  state: FloatingCursorDragState;
  offset?: { x: number; y: number };
}

// TextInputService options interface
interface TextInputServiceOptions {
  onInsert: (insertion: TextEditingDeltaInsertion) => Promise<boolean>;
  onDelete: (deletion: TextEditingDeltaDeletion) => Promise<boolean>;
  onReplace: (replacement: TextEditingDeltaReplacement) => Promise<boolean>;
  onNonTextUpdate: (nonTextUpdate: TextEditingDeltaNonTextUpdate) => Promise<boolean>;
  onPerformAction: (action: TextInputAction) => Promise<void>;
  onFloatingCursor?: (point: RawFloatingCursorPoint) => Promise<void>;
  contentInsertionConfiguration?: ContentInsertionConfiguration;
}

/**
 * Abstract base class for text input services.
 * Handles text input deltas, editing values, and text input connections.
 */
export abstract class TextInputService {
  protected onInsert: (insertion: TextEditingDeltaInsertion) => Promise<boolean>;
  protected onDelete: (deletion: TextEditingDeltaDeletion) => Promise<boolean>;
  protected onReplace: (replacement: TextEditingDeltaReplacement) => Promise<boolean>;
  protected onNonTextUpdate: (nonTextUpdate: TextEditingDeltaNonTextUpdate) => Promise<boolean>;
  protected onPerformAction: (action: TextInputAction) => Promise<void>;
  protected onFloatingCursor?: (point: RawFloatingCursorPoint) => Promise<void>;
  protected contentInsertionConfiguration?: ContentInsertionConfiguration;

  constructor(options: TextInputServiceOptions) {
    this.onInsert = options.onInsert;
    this.onDelete = options.onDelete;
    this.onReplace = options.onReplace;
    this.onNonTextUpdate = options.onNonTextUpdate;
    this.onPerformAction = options.onPerformAction;
    this.onFloatingCursor = options.onFloatingCursor;
    this.contentInsertionConfiguration = options.contentInsertionConfiguration;
  }

  /**
   * Gets the current composing text range.
   */
  abstract get composingTextRange(): TextRange | null;

  /**
   * Gets whether the text input service is currently attached.
   */
  abstract get attached(): boolean;

  /**
   * Clears the composing text range.
   */
  abstract clearComposingTextRange(): void;

  /**
   * Updates the caret position with size, transform, and rect information.
   */
  abstract updateCaretPosition(size: Size, transform: Matrix4, rect: Rect): void;

  /**
   * Updates the TextEditingValue of the text currently being edited.
   * 
   * Note that if there are IME-related requirements,
   * please config `composing` value within TextEditingValue
   * 
   * @param textEditingValue - The new text editing value
   * @param configuration - Text input configuration
   */
  abstract attach(
    textEditingValue: TextEditingValue,
    configuration: TextInputConfiguration
  ): void;

  /**
   * Applies insertion, deletion and replacement to the text currently being edited.
   * 
   * @param deltas - List of text editing deltas to apply
   * @returns Promise<boolean> - false means will not apply
   * 
   * For more information, please check TextEditingDelta.
   */
  abstract apply(deltas: TextEditingDelta[]): Promise<boolean>;

  /**
   * Closes the editing state of the text currently being edited.
   */
  abstract close(): void;
}

// Export types
export {
  TextRange,
  TextSelection,
  TextEditingValue,
  Size,
  Rect,
  Matrix4,
  TextInputConfiguration,
  KeyboardInsertedContent,
  ContentInsertionConfiguration,
  TextEditingDelta,
  TextEditingDeltaInsertion,
  TextEditingDeltaDeletion,
  TextEditingDeltaReplacement,
  TextEditingDeltaNonTextUpdate,
  TextInputAction,
  FloatingCursorDragState,
  RawFloatingCursorPoint,
  TextInputServiceOptions,
};