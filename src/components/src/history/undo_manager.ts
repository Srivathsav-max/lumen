import { Selection } from '../core/location/selection';
import { Operation } from '../core/transform/operation';
import { Transaction } from '../core/transform/transaction';
import { Document } from '../core/document/document';

export interface ApplyOptions {
  /// This flag indicates that
  /// whether the transaction should be recorded into
  /// the undo stack
  recordUndo: boolean;
  recordRedo: boolean;
  /// This flag used to determine whether the transaction is in-memory update.
  inMemoryUpdate: boolean;
}

export const defaultApplyOptions: ApplyOptions = {
  recordUndo: true,
  recordRedo: false,
  inMemoryUpdate: false,
};

/// A [HistoryItem] contains list of operations committed by users.
/// If a [HistoryItem] is not sealed, operations can be added sequentially.
/// Otherwise, the operations should be added to a new [HistoryItem].
export class HistoryItem {
  public readonly operations: Operation[] = [];
  public beforeSelection: Selection | null = null;
  public afterSelection: Selection | null = null;
  private _sealed = false;

  constructor() {}

  /// Seal the history item.
  /// When an item is sealed, no more operations can be added
  /// to the item.
  ///
  /// The caller should create a new [HistoryItem].
  seal(): void {
    this._sealed = true;
  }

  get sealed(): boolean {
    return this._sealed;
  }

  add(op: Operation): void {
    this.operations.push(op);
  }

  addAll(iterable: Operation[]): void {
    this.operations.push(...iterable);
  }

  /// Create a new [Transaction] by inverting the operations.
  toTransaction(document: Document): Transaction {
    const transaction = new Transaction(document);
    
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const operation = this.operations[i];
      const inverted = operation.invert();
      transaction.add(inverted, { transform: false });
    }
    
    transaction.afterSelection = this.beforeSelection;
    transaction.beforeSelection = this.afterSelection;
    return transaction;
  }
}

class FixedSizeStack {
  private readonly _list: HistoryItem[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(stackItem: HistoryItem): void {
    if (this._list.length >= this.maxSize) {
      this._list.shift(); // Remove first item
    }
    this._list.push(stackItem);
  }

  pop(): HistoryItem | null {
    if (this._list.length === 0) {
      return null;
    }
    return this._list.pop() || null;
  }

  clear(): void {
    this._list.length = 0;
  }

  get last(): HistoryItem {
    return this._list[this._list.length - 1];
  }

  get isEmpty(): boolean {
    return this._list.length === 0;
  }

  get isNonEmpty(): boolean {
    return this._list.length > 0;
  }

  get length(): number {
    return this._list.length;
  }
}

export class UndoManager {
  public readonly undoStack: FixedSizeStack;
  public readonly redoStack: FixedSizeStack;
  public state: any = null; // Will be properly typed as EditorState

  constructor(stackSize: number = 20) {
    this.undoStack = new FixedSizeStack(stackSize);
    this.redoStack = new FixedSizeStack(stackSize);
  }

  getUndoHistoryItem(): HistoryItem {
    if (this.undoStack.isEmpty) {
      const item = new HistoryItem();
      this.undoStack.push(item);
      return item;
    }
    
    const last = this.undoStack.last;
    if (last.sealed) {
      this.redoStack.clear();
      const item = new HistoryItem();
      this.undoStack.push(item);
      return item;
    }
    
    return last;
  }

  undo(): void {
    console.debug('undo');
    const s = this.state;
    if (!s) {
      return;
    }
    
    const historyItem = this.undoStack.pop();
    if (!historyItem) {
      return;
    }
    
    const transaction = historyItem.toTransaction(s.document);
    s.apply(transaction, {
      applyOptions: {
        recordUndo: false,
        recordRedo: true,
        inMemoryUpdate: false,
      },
    });
  }

  redo(): void {
    console.debug('redo');
    const s = this.state;
    if (!s) {
      return;
    }
    
    const historyItem = this.redoStack.pop();
    if (!historyItem) {
      return;
    }
    
    const transaction = historyItem.toTransaction(s.document);
    s.apply(transaction, {
      applyOptions: {
        recordUndo: true,
        recordRedo: false,
        inMemoryUpdate: false,
      },
    });
  }

  forgetRecentUndo(): void {
    console.debug('forgetRecentUndo');
    if (this.state) {
      this.undoStack.pop();
    }
  }

  clear(): void {
    this.undoStack.clear();
    this.redoStack.clear();
  }
}