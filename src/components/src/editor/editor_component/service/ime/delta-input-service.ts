import { EditorState } from '../../types';
import { TextInputService } from './text-input-service';

// Constants
const _whitespace = ' ';
const _len = 1;

// Interfaces
interface TextRange {
  start: number;
  end: number;
  readonly empty: boolean;
  readonly isValid: boolean;
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
}

interface Matrix4 {
  // Simplified matrix representation
  values: number[];
}

interface TextInputConfiguration {
  inputType: string;
  obscureText: boolean;
  autocorrect: boolean;
  // Add other configuration properties as needed
}

interface TextInputConnection {
  attached: boolean;
  setEditingState(value: TextEditingValue): void;
  show(): void;
  close(): void;
  setEditableSizeAndTransform(size: Size, transform: Matrix4): void;
  setCaretRect(rect: Rect): void;
}

interface AutofillScope {
  // Placeholder for autofill scope
}

interface TextInputControl {
  // Placeholder for text input control
}

interface KeyboardInsertedContent {
  data: string;
  mimeType: string;
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
    return new TextEditingDeltaInsertion(
      shiftString(this.oldText, _len),
      this.textInserted,
      this.insertionOffset - _len,
      shiftTextSelection(this.selection, -_len),
      shiftTextRange(this.composing, -_len)
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

// RawFloatingCursorPoint interface
interface RawFloatingCursorPoint {
  state: string;
  offset?: { x: number; y: number };
}

// DeltaTextInputClient interface
interface DeltaTextInputClient {
  composingTextRange: TextRange | null;
  attached: boolean;
  currentAutofillScope: AutofillScope | null;
  currentTextEditingValue: TextEditingValue | null;
  
  apply(deltas: TextEditingDelta[]): Promise<boolean>;
  attach(textEditingValue: TextEditingValue, configuration: TextInputConfiguration): void;
  close(): void;
  updateEditingValueWithDeltas(textEditingDeltas: TextEditingDelta[]): void;
  updateCaretPosition(size: Size, transform: Matrix4, rect: Rect): void;
  clearComposingTextRange(): void;
  connectionClosed(): void;
  insertTextPlaceholder(size: Size): void;
  performAction(action: TextInputAction): Promise<void>;
  performPrivateCommand(action: string, data: Record<string, any>): void;
  removeTextPlaceholder(): void;
  showAutocorrectionPromptRect(start: number, end: number): void;
  showToolbar(): void;
  updateEditingValue(value: TextEditingValue): void;
  updateFloatingCursor(point: RawFloatingCursorPoint): void;
  didChangeInputControl(oldControl: TextInputControl | null, newControl: TextInputControl | null): void;
  performSelector(selectorName: string): void;
  insertContent(content: KeyboardInsertedContent): void;
}

export class DeltaTextInputService extends TextInputService implements DeltaTextInputClient {
  public composingTextRange: TextRange | null = null;
  public currentTextEditingValue: TextEditingValue | null = null;
  private _textInputConnection: TextInputConnection | null = null;

  constructor(options: {
    onInsert: (delta: any) => Promise<boolean>;
    onDelete: (delta: any) => Promise<boolean>;
    onReplace: (delta: any) => Promise<boolean>;
    onNonTextUpdate: (delta: any) => Promise<boolean>;
    onPerformAction: (action: TextInputAction) => Promise<void>;
  }) {
    super(options);
  }

  get attached(): boolean {
    return this._textInputConnection?.attached ?? false;
  }

  get currentAutofillScope(): AutofillScope | null {
    throw new Error('UnimplementedError');
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
    if (!this._textInputConnection || !this._textInputConnection.attached) {
      // In a real implementation, this would create a connection to the platform's text input
      this._textInputConnection = this._createTextInputConnection(configuration);
    }

    const formattedValue = formatTextEditingValue(textEditingValue);
    this._textInputConnection.setEditingState(formattedValue);
    this._textInputConnection.show();
    this.currentTextEditingValue = formattedValue;

    console.debug('attach text editing value:', textEditingValue);
  }

  close(): void {
    this.composingTextRange = null;
    this._textInputConnection?.close();
    this._textInputConnection = null;
  }

  updateEditingValueWithDeltas(textEditingDeltas: TextEditingDelta[]): void {
    console.debug(textEditingDeltas.map(delta => delta.toString()).toString());
    this.apply(textEditingDeltas);
  }

  updateCaretPosition(size: Size, transform: Matrix4, rect: Rect): void {
    this._textInputConnection?.setEditableSizeAndTransform(size, transform);
    this._textInputConnection?.setCaretRect(rect);
  }

  clearComposingTextRange(): void {
    this.composingTextRange = createEmptyTextRange();
  }

  connectionClosed(): void {}

  insertTextPlaceholder(size: Size): void {}

  async performAction(action: TextInputAction): Promise<void> {
    return this.onPerformAction(action);
  }

  performPrivateCommand(action: string, data: Record<string, any>): void {}

  removeTextPlaceholder(): void {}

  showAutocorrectionPromptRect(start: number, end: number): void {}

  showToolbar(): void {}

  updateEditingValue(value: TextEditingValue): void {}

  updateFloatingCursor(point: RawFloatingCursorPoint): void {}

  didChangeInputControl(
    oldControl: TextInputControl | null,
    newControl: TextInputControl | null
  ): void {}

  performSelector(selectorName: string): void {
    const currentTextEditingValue = this.currentTextEditingValue;
    if (!currentTextEditingValue) {
      return;
    }
    
    // magic string from flutter callback
    if (selectorName === 'deleteBackward:') {
      const oldText = currentTextEditingValue.text;
      const selection = currentTextEditingValue.selection;
      const deleteRange = selection.isCollapsed
        ? createTextRange(selection.start - 1, selection.end)
        : createTextRange(selection.start, selection.end);
      
      this.onDelete(
        new TextEditingDeltaDeletion(
          oldText,
          deleteRange,
          createCollapsedTextSelection(-1),
          createEmptyTextRange()
        )
      );
    }
  }

  insertContent(content: KeyboardInsertedContent): void {}

  private _updateComposing(delta: TextEditingDelta): void {
    if (!(delta instanceof TextEditingDeltaNonTextUpdate)) {
      if (this.composingTextRange &&
          this.composingTextRange.start !== -1 &&
          delta.composing.end !== -1) {
        this.composingTextRange = createTextRange(
          this.composingTextRange.start,
          delta.composing.end
        );
      } else {
        this.composingTextRange = delta.composing;
      }
    }
  }

  private _createTextInputConnection(configuration: TextInputConfiguration): TextInputConnection {
    // Mock implementation - in a real scenario, this would interface with the browser's input system
    return {
      attached: true,
      setEditingState: (value: TextEditingValue) => {},
      show: () => {},
      close: () => {},
      setEditableSizeAndTransform: (size: Size, transform: Matrix4) => {},
      setCaretRect: (rect: Rect) => {},
    };
  }
}

// Helper functions
const formatTextEditingValue = (value: TextEditingValue): TextEditingValue => {
  // The IME will not report the backspace button if the cursor is at the beginning of the text.
  // Therefore, we need to add a transparent symbol at the start to ensure that we can capture the backspace event.
  const text = _whitespace + value.text;
  const selection = shiftTextSelection(value.selection, _len);
  const composing = shiftTextRange(value.composing, _len);

  return {
    text,
    selection,
    composing,
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
});

const createEmptyTextRange = (): TextRange => createTextRange(0, 0);

const createCollapsedTextSelection = (offset: number): TextSelection => ({
  baseOffset: offset,
  extentOffset: offset,
  start: offset,
  end: offset,
  isCollapsed: true,
});