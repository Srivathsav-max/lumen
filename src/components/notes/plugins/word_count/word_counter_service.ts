// Word counter service for tracking word and character counts in the editor
// Import TransactionTime from the canonical location
import { TransactionTime } from '../../core/transform/transaction';

export interface EditorState {
  document: Document;
  selection: Selection | null;
  transactionStream: EventStream<EditorTransactionValue>;
  selectionNotifier: EventNotifier;
  getSelectedNodes(): Node[];
}

export interface EventStream<T> {
  listen(callback: (value: T) => void): StreamSubscription;
}

export interface StreamSubscription {
  cancel(): void;
}

export interface EventNotifier {
  addListener(callback: () => void): void;
  removeListener(callback: () => void): void;
}

export interface Document {
  root: Node;
}

export interface Node {
  children: Node[];
  delta?: Delta;
}

export interface Selection {
  isCollapsed: boolean;
}

export interface Delta {
  toPlainText(): string;
}

export type EditorTransactionValue = [TransactionTime, any];

// Export TransactionTime for convenience
export { TransactionTime };

// Word regex that matches all non-whitespace characters
const _wordRegex = /\S+/g;

const _emptyCounters = new Counters();

/**
 * Used by the WordCountService to contain count statistics
 * in a Document or in the current Selection.
 */
export class Counters {
  private _wordCount: number;
  private _charCount: number;

  constructor(options: { wordCount?: number; charCount?: number } = {}) {
    this._wordCount = options.wordCount ?? 0;
    this._charCount = options.charCount ?? 0;
  }

  get wordCount(): number {
    return this._wordCount;
  }

  get charCount(): number {
    return this._charCount;
  }

  equals(other: Counters): boolean {
    return other.wordCount === this.wordCount && other.charCount === this.charCount;
  }
}

/**
 * A Word Counter service that runs based on the changes and updates to an EditorState.
 * 
 * Due to this service relying on listening to transactions in the Document and iterating
 * the complete Document to count the words and characters, this can be a potentially
 * slow and cumbersome task.
 */
export class WordCountService {
  private editorState: EditorState;
  private debounceDuration: number;
  private selectionTimer?: NodeJS.Timeout;
  private documentTimer?: NodeJS.Timeout;
  private _documentCounters: Counters = new Counters();
  private _selectionCounters: Counters = new Counters();
  private streamSubscription?: StreamSubscription;
  private listeners: (() => void)[] = [];

  /**
   * Signifies whether the service is currently running or not.
   * The service can be stopped/started as needed for performance.
   */
  isRunning = false;

  constructor(options: {
    editorState: EditorState;
    debounceDuration?: number;
  }) {
    this.editorState = options.editorState;
    this.debounceDuration = options.debounceDuration ?? 300;
  }

  /**
   * Number of words and characters in the Document.
   */
  get documentCounters(): Counters {
    return this._documentCounters;
  }

  /**
   * Number of words and characters in the Selection.
   */
  get selectionCounters(): Counters {
    return this._selectionCounters;
  }

  /**
   * This method can be used to get the word and character count of the Document.
   * If the service is running, it will return the cached documentCounters.
   * Otherwise it will compute it on demand.
   */
  getDocumentCounters(): Counters {
    return this.isRunning ? this.documentCounters : this._countersFromNode();
  }

  /**
   * This method can be used to get the word and character count of the current Selection.
   * If the service is running, it will return the cached selectionCounters.
   * Otherwise it will compute it on demand.
   */
  getSelectionCounters(): Counters {
    return this.isRunning ? this.selectionCounters : this._countersFromSelection();
  }

  /**
   * Registers the Word Counter and starts notifying about updates to word and character count.
   */
  register(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this._documentCounters = this._countersFromNode(this.editorState.document.root);
    
    if (this.editorState.selection?.isCollapsed ?? false) {
      this._recountOnSelectionUpdate();
    }

    if (!this.documentCounters.equals(_emptyCounters) || !this.selectionCounters.equals(_emptyCounters)) {
      this.notifyListeners();
    }

    this.streamSubscription = this.editorState.transactionStream.listen(this._onDocUpdate.bind(this));
    this.editorState.selectionNotifier.addListener(this._onSelUpdate.bind(this));
  }

  /**
   * Stops the Word Counter and resets the counts.
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.documentTimer) {
      clearTimeout(this.documentTimer);
      this.documentTimer = undefined;
    }
    
    if (this.selectionTimer) {
      clearTimeout(this.selectionTimer);
      this.selectionTimer = undefined;
    }
    
    this.streamSubscription?.cancel();
    this._documentCounters = new Counters();
    this._selectionCounters = new Counters();
    this.isRunning = false;

    this.notifyListeners();
  }

  /**
   * Add a listener for counter updates
   */
  addListener(listener: () => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener for counter updates
   */
  removeListener(listener: () => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.editorState.selectionNotifier.removeListener(this._onSelUpdate.bind(this));
    this.streamSubscription?.cancel();
    
    if (this.documentTimer) {
      clearTimeout(this.documentTimer);
    }
    if (this.selectionTimer) {
      clearTimeout(this.selectionTimer);
    }
    
    this.listeners = [];
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in WordCountService listener:', error);
      }
    });
  }

  private _onSelUpdate(): void {
    if (this.debounceDuration === 0) {
      return this._recountOnSelectionUpdate();
    }

    if (this.selectionTimer) {
      clearTimeout(this.selectionTimer);
    }

    this.selectionTimer = setTimeout(() => {
      this._recountOnSelectionUpdate();
    }, this.debounceDuration);
  }

  private _recountOnSelectionUpdate(): void {
    // If collapsed or null, reset count
    if (this.editorState.selection?.isCollapsed ?? true) {
      if (this._selectionCounters.equals(_emptyCounters)) {
        return;
      }

      this._selectionCounters = new Counters();
      return this.notifyListeners();
    }

    const counters = this._countersFromSelection();

    if (!counters.equals(this.selectionCounters)) {
      this._selectionCounters = counters;
      this.notifyListeners();
    }
  }

  private _countersFromSelection(): Counters {
    let wordCount = 0;
    let charCount = 0;

    const nodes = this.editorState.getSelectedNodes();
    for (const node of nodes) {
      const counters = this._countersFromNode(node);
      wordCount += counters.wordCount;
      charCount += counters.charCount;
    }

    return new Counters({ wordCount, charCount });
  }

  private _onDocUpdate(value: EditorTransactionValue): void {
    if (this.debounceDuration === 0) {
      return this._recountOnTransactionUpdate(value[0]);
    }

    if (this.documentTimer) {
      clearTimeout(this.documentTimer);
    }

    this.documentTimer = setTimeout(() => {
      this._recountOnTransactionUpdate(value[0]);
    }, this.debounceDuration);
  }

  private _recountOnTransactionUpdate(time: TransactionTime): void {
    if (time !== TransactionTime.after) {
      return;
    }

    const counters = this._countersFromNode();

    // If there is no update, no need to notify listeners
    if (counters.wordCount !== this.documentCounters.wordCount ||
        counters.charCount !== this.documentCounters.charCount) {
      if (!counters.equals(this.documentCounters)) {
        this._documentCounters = counters;
        this.notifyListeners();
      }
    }
  }

  /**
   * Returns Counters for a specific Node.
   * If Node is null, takes the root Node of the Document.
   */
  private _countersFromNode(node?: Node): Counters {
    const n = node ?? this.editorState.document.root;

    let wCount = 0;
    let cCount = 0;

    const plain = this._toPlainText(n);
    wCount += this._wordsInString(plain);
    cCount += this._getRuneLength(plain);

    for (const child of n.children) {
      const counters = this._countersFromNode(child);
      wCount += counters.wordCount;
      cCount += counters.charCount;
    }

    return new Counters({ wordCount: wCount, charCount: cCount });
  }

  private _wordsInString(text: string): number {
    const matches = text.match(_wordRegex);
    return matches ? matches.length : 0;
  }

  private _toPlainText(node: Node): string {
    return node.delta?.toPlainText() ?? '';
  }

  private _getRuneLength(text: string): number {
    // In JavaScript, we can use the spread operator to get proper Unicode character count
    return [...text].length;
  }
}