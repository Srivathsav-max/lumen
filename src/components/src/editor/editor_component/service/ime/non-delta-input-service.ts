import { EditorState } from '../../types';
import { TextInputService } from './text-input-service';
import { getTextEditingDeltas } from './text-diff';

// Constants
const _deleteBackwardSelectorName = 'deleteBackward:';
const _whitespace = ' ';
const _len = _whitespace.length;

// Platform detection utilities
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isMacOS = () => {
  return navigator.platform.indexOf('Mac') > -1;
};

// Interfaces
interface TextRange {
  start: number;
  end: number;
  readonly empty: boolean;
  readonly isValid: boolean;
  readonly isCollapsed: boolean;
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
  translate(dx: number, dy: number): Rect;
}

interface Matrix4 {
  values: number[];
}

interface TextInputConfiguration {
  inputType: string;
  obscureText: boolean;
  autocorrect: boolean;
}

interface TextInputConnection {
  attached: boolean;
  setEditingState(value: TextEditingValue): void;
  show(): void;
  close(): void;
  setEditableSizeAndTransform(size: Size, transform: Matrix4): void;
  setCaretRect(rect: Rect): void;
  setComposingRect(rect: Rect): void;
}

interface AutofillScope {
  // Placeholder
}

interface TextInputControl {
  // Placeholder
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
  
  abstract format(): TextEditingDelta;
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

  format(): TextEditingDeltaInsertion {
    const startWithSpace = this.oldText.startsWith(_whitespace);
    return new TextEditingDeltaInsertion(
      startWithSpace ? shiftString(this.oldText, _len) : this.oldText,
      this.textInserted,
      startWithSpace ? this.insertionOffset - _len : this.insertionOffset,
      startWithSpace ? shiftTextSelection(this.selection, -_len) : this.selection,
      startWithSpace ? shiftTextRange(this.composing, -_len) : this.composing
    );
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

  format(): TextEditingDeltaDeletion {
    return new TextEditingDeltaDeletion(
      shiftString(this.oldText, _len),
      shiftTextRange(this.deletedRange, -_len),
      shiftTextSelection(this.selection, -_len),
      shiftTextRange(this.composing, -_len)
    );
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

  format(): TextEditingDeltaReplacement {
    return new TextEditingDeltaReplacement(
      shiftString(this.oldText, _len),
      this.replacementText,
      shiftTextRange(this.replacedRange, -_len),
      shiftTextSelection(this.selection, -_len),
      shiftTextRange(this.composing, -_len)
    );
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

  format(): TextEditingDeltaNonTextUpdate {
    return new TextEditingDeltaNonTextUpdate(
      shiftString(this.oldText, _len),
      shiftTextSelection(this.selection, -_len),
      shiftTextRange(this.composing, -_len)
    );
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

// TextInputClient interface
interface TextInputClient {
  composingTextRange: TextRange | null;
  attached: boolean;
  currentAutofillScope: AutofillScope | null;
  currentTextEditingValue: TextEditingValue | null;
  
  apply(deltas: TextEditingDelta[]): Promise<boolean>;
  attach(textEditingValue: TextEditingValue, configuration: TextInputConfiguration): void;
  updateEditingValue(value: TextEditingValue): void;
  close(): void;
  updateCaretPosition(size: Size, transform: Matrix4, rect: Rect): void;
  clearComposingTextRange(): void;
  connectionClosed(): void;
  insertTextPlaceholder(size: Size): void;
  performAction(action: TextInputAction): Promise<void>;
  performPrivateCommand(action: string, data: Record<string, any>): void;
  removeTextPlaceholder(): void;
  showAutocorrectionPromptRect(start: number, end: number): void;
  showToolbar(): void;
  updateFloatingCursor(point: RawFloatingCursorPoint): void;
  didChangeInputControl(oldControl: TextInputControl | null, newControl: TextInputControl | null): void;
  performSelector(selectorName: string): void;
  insertContent(content: KeyboardInsertedContent): void;
}

// Debounce utility
class Debounce {
  private static timers: Map<string, NodeJS.Timeout> = new Map();

  static debounce(key: string, delay: number, callback: () => void): void {
    this.cancel(key);
    const timer = setTimeout(callback, delay);
    this.timers.set(key, timer);
  }

  static cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}

// Mock keepEditorFocusNotifier
const keepEditorFocusNotifier = {
  reset: () => {},
};

export class NonDeltaTextInputService extends TextInputService implements TextInputClient {
  public composingTextRange: TextRange | null = null;
  private _currentTextEditingValue: TextEditingValue | null = null;
  private _textInputConnection: TextInputConnection | null = null;
  private readonly debounceKey = 'updateEditingValue';
  private _isFloatingCursorVisible = false;

  constructor(options: {
    onInsert: (delta: any) => Promise<boolean>;
    onDelete: (delta: any) => Promise<boolean>;
    onReplace: (delta: any) => Promise<boolean>;
    onNonTextUpdate: (delta: any) => Promise<boolean>;
    onPerformAction: (action: TextInputAction) => Promise<void>;
    contentInsertionConfiguration?: ContentInsertionConfiguration;
    onFloatingCursor?: (point: RawFloatingCursorPoint) => void;
  }) {
    super(options);
  }

  get attached(): boolean {
    return this._textInputConnection?.attached ?? false;
  }

  get currentAutofillScope(): AutofillScope | null {
    throw new Error('UnimplementedError');
  }

  get currentTextEditingValue(): TextEditingValue | null {
    return this._currentTextEditingValue;
  }

  set currentTextEditingValue(newValue: TextEditingValue | null) {
    this._currentTextEditingValue = newValue;
  }

  async apply(deltas: TextEditingDelta[]): Promise<boolean> {
    const formattedDeltas = deltas.map(delta => delta.format());
    let willApply = true;
    
    for (const delta of formattedDeltas) {
      this._updateComposing(delta);
      
      if (delta instanceof TextEditingDeltaInsertion) {
        if (!(await this.onInsert(delta))) willApply = false;
      } else if (delta instanceof TextEditingDeltaDeletion) {
        if (!(await this.onDelete(delta))) willApply = false;
      } else if (delta instanceof TextEditingDeltaReplacement) {
        if (!(await this.onReplace(delta))) willApply = false;
      } else if (delta instanceof TextEditingDeltaNonTextUpdate) {
        if (!(await this.onNonTextUpdate(delta))) willApply = false;
      }
    }
    
    return willApply;
  }

  attach(textEditingValue: TextEditingValue, configuration: TextInputConfiguration): void {
    const formattedValue = formatTextEditingValue(textEditingValue);
    if (!isValidTextEditingValue(formattedValue) ||
        this.currentTextEditingValue === formattedValue) {
      return;
    }

    if (!this._textInputConnection || !this._textInputConnection.attached) {
      this._textInputConnection = this._createTextInputConnection(configuration);
    }

    Debounce.cancel(this.debounceKey);

    this._textInputConnection.setEditingState(formattedValue);
    this._textInputConnection.show();

    this.currentTextEditingValue = formattedValue;

    console.debug('attach text editing value:', textEditingValue);
  }

  updateEditingValue(value: TextEditingValue): void {
    if (this.currentTextEditingValue === value) {
      return;
    }

    if (isIOS() && this._isFloatingCursorVisible) {
      // on iOS, when using gesture to move cursor, this function will be called
      // which may cause the unneeded delta being applied
      // so we ignore the updateEditingValue event when the floating cursor is visible
      console.debug(
        'ignore updateEditingValue event when the floating cursor is visible'
      );
      return;
    }

    const deltas = getTextEditingDeltas(this.currentTextEditingValue, value);
    // On mobile, the IME will send a lot of updateEditingValue events, so we
    // need to debounce it to combine them together.
    Debounce.debounce(
      this.debounceKey,
      isMobile() ? 10 : 0,
      async () => {
        const oldValue = this._currentTextEditingValue ? { ...this._currentTextEditingValue } : null;
        this.currentTextEditingValue = value;
        const willApply = await this.apply(deltas);
        if (!willApply && oldValue) {
          this.currentTextEditingValue = oldValue;
          this._textInputConnection?.setEditingState(oldValue);
        }
      }
    );
  }

  close(): void {
    keepEditorFocusNotifier.reset();
    this.currentTextEditingValue = null;
    this.composingTextRange = null;
    this._textInputConnection?.close();
    this._textInputConnection = null;
  }

  updateCaretPosition(size: Size, transform: Matrix4, rect: Rect): void {
    this._textInputConnection?.setEditableSizeAndTransform(size, transform);
    this._textInputConnection?.setCaretRect(rect);
    this._textInputConnection?.setComposingRect(rect.translate(0, rect.height));
  }

  clearComposingTextRange(): void {
    this.composingTextRange = createEmptyTextRange();
  }

  connectionClosed(): void {}

  insertTextPlaceholder(size: Size): void {}

  async performAction(action: TextInputAction): Promise<void> {
    console.debug('performAction:', action);
    return this.onPerformAction(action);
  }

  performPrivateCommand(action: string, data: Record<string, any>): void {
    console.debug('performPrivateCommand:', action, data);
  }

  removeTextPlaceholder(): void {}

  showAutocorrectionPromptRect(start: number, end: number): void {}

  showToolbar(): void {}

  updateFloatingCursor(point: RawFloatingCursorPoint): void {
    switch (point.state) {
      case FloatingCursorDragState.Start:
        this._isFloatingCursorVisible = true;
        break;
      case FloatingCursorDragState.Update:
        this._isFloatingCursorVisible = true;
        break;
      case FloatingCursorDragState.End:
        this._isFloatingCursorVisible = false;
        break;
    }

    this.onFloatingCursor?.(point);
  }

  didChangeInputControl(
    oldControl: TextInputControl | null,
    newControl: TextInputControl | null
  ): void {}

  performSelector(selectorName: string): void {
    console.debug('performSelector:', selectorName);

    const currentTextEditingValue = this.currentTextEditingValue ? 
      unformatTextEditingValue(this.currentTextEditingValue) : null;
    if (!currentTextEditingValue) {
      return;
    }

    if (selectorName === _deleteBackwardSelectorName) {
      const oldText = currentTextEditingValue.text;
      const selection = currentTextEditingValue.selection;
      const deleteRange = selection.isCollapsed
        ? createTextRange(selection.start - 1, selection.end)
        : createTextRange(selection.start, selection.end);
      const deleteSelection = createTextSelection(
        selection.baseOffset - 1,
        selection.extentOffset - 1
      );

      if (!deleteRange.isValid) {
        return;
      }

      // valid the result
      this.onDelete(
        new TextEditingDeltaDeletion(
          oldText,
          deleteRange,
          deleteSelection,
          createEmptyTextRange()
        )
      );
    }
  }

  insertContent(content: KeyboardInsertedContent): void {
    const config = this.contentInsertionConfiguration;
    if (!config?.allowedMimeTypes.includes(content.mimeType)) {
      throw new Error('Content type not allowed');
    }
    config.onContentInserted(content);
  }

  private _updateComposing(delta: TextEditingDelta): void {
    if (delta instanceof TextEditingDeltaNonTextUpdate) {
      this.composingTextRange = delta.composing;
    } else {
      this.composingTextRange = this.composingTextRange &&
              this.composingTextRange.start !== -1 &&
              delta.composing.end !== -1
          ? createTextRange(
              this.composingTextRange.start,
              delta.composing.end
            )
          : delta.composing;
    }

    // solve the issue where the Chinese IME doesn't continue deleting after the input content has been deleted.
    if (isMacOS() && (this.composingTextRange?.isCollapsed ?? false)) {
      this.composingTextRange = createEmptyTextRange();
    }
  }

  private _createTextInputConnection(configuration: TextInputConfiguration): TextInputConnection {
    // Mock implementation
    return {
      attached: true,
      setEditingState: (value: TextEditingValue) => {},
      show: () => {},
      close: () => {},
      setEditableSizeAndTransform: (size: Size, transform: Matrix4) => {},
      setCaretRect: (rect: Rect) => {},
      setComposingRect: (rect: Rect) => {},
    };
  }
}

// Helper functions
const isValidTextEditingValue = (value: TextEditingValue): boolean => {
  if (value.selection.baseOffset < 0 ||
      value.selection.extentOffset < 0 ||
      value.selection.baseOffset > value.text.length ||
      value.selection.extentOffset > value.text.length) {
    return false;
  }
  return true;
};

const formatTextEditingValue = (value: TextEditingValue): TextEditingValue => {
  // The IME will not report the backspace button if the cursor is at the beginning of the text.
  // Therefore, we need to add a transparent symbol at the start to ensure that we can capture the backspace event.
  const text = _whitespace + value.text;
  const selection = shiftTextSelection(value.selection, _len);

  let composing = shiftTextRange(value.composing, _len);
  const textLength = text.length;

  // check invalid composing
  if (composing.start > textLength || composing.end > textLength) {
    composing = createEmptyTextRange();
  }

  return {
    text,
    selection,
    composing,
  };
};

const unformatTextEditingValue = (value: TextEditingValue): TextEditingValue => {
  return {
    text: shiftString(value.text, _len),
    selection: shiftTextSelection(value.selection, -_len),
    composing: shiftTextRange(value.composing, -_len),
  };
};

const shiftTextSelection = (selection: TextSelection, shiftAmount: number): TextSelection => {
  return {
    ...selection,
    baseOffset: Math.max(0, selection.baseOffset + shiftAmount),
    extentOffset: Math.max(0, selection.extentOffset + shiftAmount),
  };
};

const shiftTextRange = (range: TextRange, shiftAmount: number): TextRange => {
  if (!range.isValid) {
    return range;
  }
  return {
    ...range,
    start: Math.max(0, range.start + shiftAmount),
    end: Math.max(0, range.end + shiftAmount),
  };
};

const shiftString = (str: string, shiftAmount: number): string => {
  if (shiftAmount > str.length) {
    return '';
  }
  return str.substring(shiftAmount);
};

const createTextRange = (start: number, end: number): TextRange => ({
  start,
  end,
  empty: start === end,
  isValid: start >= 0 && end >= 0 && start <= end,
  isCollapsed: start === end,
});

const createEmptyTextRange = (): TextRange => createTextRange(0, 0);

const createTextSelection = (baseOffset: number, extentOffset: number): TextSelection => ({
  baseOffset,
  extentOffset,
  start: Math.min(baseOffset, extentOffset),
  end: Math.max(baseOffset, extentOffset),
  isCollapsed: baseOffset === extentOffset,
});