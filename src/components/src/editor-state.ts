// Editor state management for the notes editor
// Converted from Dart AppFlowy Editor

import { EventEmitter } from 'events';
import { Document, Node, Selection, RemoteSelection, Transaction, Operation, Delta, Path, Position, Attributes } from './types';
import { UndoManager, HistoryItem } from './undo-manager';
import { DocumentUtils } from './document';

export type EditorTransactionValue = {
  time: TransactionTime;
  transaction: Transaction;
  options: ApplyOptions;
};

export interface EditorStateDebugInfo {
  /// Enable the debug paint size for selection handle.
  /// It only available on mobile.
  debugPaintSizeEnabled: boolean;
}

/// the type of this value is bool.
/// set true to this key to prevent attaching the text service when selection is changed.
export const selectionExtraInfoDoNotAttachTextService = 'selectionExtraInfoDoNotAttachTextService';

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

/** @deprecated use SelectionUpdateReason instead */
export enum CursorUpdateReason {
  uiEvent = 'uiEvent',
  others = 'others',
}

export enum SelectionUpdateReason {
  uiEvent = 'uiEvent', // like mouse click, keyboard event
  transaction = 'transaction', // like insert, delete, format
  remote = 'remote', // like remote selection
  selectAll = 'selectAll',
  searchHighlight = 'searchHighlight', // Highlighting search results
}

export enum SelectionType {
  inline = 'inline',
  block = 'block',
}

export enum TransactionTime {
  before = 'before',
  after = 'after',
}

/// The state of the editor.
///
/// The state includes:
/// - The document to render
/// - The state of the selection
///
/// EditorState also includes the services of the editor:
/// - Selection service
/// - Scroll service
/// - Keyboard service
/// - Input service
/// - Toolbar service
///
/// In consideration of collaborative editing,
/// all the mutations should be applied through Transaction.
///
/// Mutating the document with document's API is not recommended.
export class EditorState extends EventEmitter {
  public readonly document: Document;
  public readonly minHistoryItemDuration: number;
  public undoManager: UndoManager;

  constructor(options: {
    document: Document;
    minHistoryItemDuration?: number;
    maxHistoryItemSize?: number;
  }) {
    super();
    this.document = options.document;
    this.minHistoryItemDuration = options.minHistoryItemDuration ?? 50;
    this.undoManager = new UndoManager(options.maxHistoryItemSize ?? 200);
    this.undoManager.state = this;
  }

  /** @deprecated use EditorState.blank() instead */
  static empty(): EditorState {
    return EditorState.blank();
  }

  static blank(options: { withInitialText?: boolean } = {}): EditorState {
    return new EditorState({
      document: DocumentUtils.createBlankDocument(options.withInitialText ?? true),
    });
  }

  // Properties
  private _editable: boolean = true;
  private _editableListeners: Set<(editable: boolean) => void> = new Set();

  /// Whether the editor is editable.
  get editable(): boolean {
    return this._editable;
  }

  set editable(value: boolean) {
    if (value === this._editable) {
      return;
    }
    this._editable = value;
    this._editableListeners.forEach(listener => listener(value));
    this.emit('editableChanged', value);
  }

  onEditableChanged(listener: (editable: boolean) => void): () => void {
    this._editableListeners.add(listener);
    return () => this._editableListeners.delete(listener);
  }

  /// Whether the editor should disable auto scroll.
  public disableAutoScroll: boolean = false;

  /// The edge offset of the auto scroll.
  public autoScrollEdgeOffset: number = 50; // Default value

  /// The style of the editor.
  public editorStyle: any = {}; // Will be properly typed later

  // Selection management
  private _selection: Selection | null = null;
  private _selectionListeners: Set<(selection: Selection | null) => void> = new Set();
  private _remoteSelections: RemoteSelection[] = [];
  private _remoteSelectionListeners: Set<(selections: RemoteSelection[]) => void> = new Set();

  /// The selection of the editor.
  get selection(): Selection | null {
    return this._selection;
  }

  /// Sets the selection of the editor.
  set selection(value: Selection | null) {
    // clear the toggled style when the selection is changed.
    if (this._selection !== value) {
      this._toggledStyle.clear();
      this._notifyToggledStyleListeners();
    }

    // reset slice flag
    this.sliceUpcomingAttributes = true;

    this._selection = value;
    this._selectionListeners.forEach(listener => listener(value));
    this.emit('selectionChanged', value);
  }

  onSelectionChanged(listener: (selection: Selection | null) => void): () => void {
    this._selectionListeners.add(listener);
    return () => this._selectionListeners.delete(listener);
  }

  /// Remote selection is the selection from other users.
  get remoteSelections(): RemoteSelection[] {
    return [...this._remoteSelections];
  }

  set remoteSelections(value: RemoteSelection[]) {
    this._remoteSelections = [...value];
    this._remoteSelectionListeners.forEach(listener => listener(this._remoteSelections));
    this.emit('remoteSelectionsChanged', this._remoteSelections);
  }

  onRemoteSelectionsChanged(listener: (selections: RemoteSelection[]) => void): () => void {
    this._remoteSelectionListeners.add(listener);
    return () => this._remoteSelectionListeners.delete(listener);
  }

  private _selectionType: SelectionType | null = null;
  private _selectionUpdateReason: SelectionUpdateReason = SelectionUpdateReason.uiEvent;
  public selectionExtraInfo: Record<string, any> | null = null;

  get selectionType(): SelectionType | null {
    return this._selectionType;
  }

  set selectionType(value: SelectionType | null) {
    if (value === this._selectionType) {
      return;
    }
    this._selectionType = value;
  }

  get selectionUpdateReason(): SelectionUpdateReason {
    return this._selectionUpdateReason;
  }

  // Service references - simplified for TypeScript
  public scrollService: any = null; // Will be properly typed later
  public selectionService: any = null; // Will be properly typed later
  public renderer: any = null; // Will be properly typed later

  /// Customize the debug info for the editor state.
  /// Refer to EditorStateDebugInfo for more details.
  public debugInfo: EditorStateDebugInfo = {
    debugPaintSizeEnabled: false,
  };

  /// store the auto scroller instance in here temporarily.
  public autoScroller: any = null; // Will be properly typed later
  public scrollableState: any = null; // Will be properly typed later

  /// Configures log output parameters,
  /// such as log level and log output callbacks,
  /// with this variable.
  public logConfiguration: any = {}; // Will be properly typed later

  /// Stores the selection menu items.
  public selectionMenuItems: any[] = []; // Will be properly typed later

  /** @deprecated use floating toolbar or mobile toolbar instead */
  public toolbarItems: any[] = []; // Will be properly typed later

  // Transaction stream management
  private _transactionListeners: Set<(value: EditorTransactionValue) => void> = new Set();

  /// listen to this event to get notified when the transaction applies.
  onTransaction(listener: (value: EditorTransactionValue) => void): () => void {
    this._transactionListeners.add(listener);
    return () => this._transactionListeners.delete(listener);
  }

  private _notifyTransactionListeners(value: EditorTransactionValue): void {
    this._transactionListeners.forEach(listener => listener(value));
    this.emit('transaction', value);
  }

  /// Store the toggled format style, like bold, italic, etc.
  /// All the values must be the key from supported toggled styles.
  ///
  /// Use the method updateToggledStyle to update key-value pairs
  ///
  /// NOTES: It only works once;
  ///   after the selection is changed, the toggled style will be cleared.
  private _toggledStyle: Attributes = {};
  private _toggledStyleListeners: Set<(style: Attributes) => void> = new Set();

  get toggledStyle(): Readonly<Attributes> {
    return { ...this._toggledStyle };
  }

  onToggledStyleChanged(listener: (style: Attributes) => void): () => void {
    this._toggledStyleListeners.add(listener);
    return () => this._toggledStyleListeners.delete(listener);
  }

  private _notifyToggledStyleListeners(): void {
    const style = { ...this._toggledStyle };
    this._toggledStyleListeners.forEach(listener => listener(style));
    this.emit('toggledStyleChanged', style);
  }

  updateToggledStyle(key: string, value: any): void {
    this._toggledStyle[key] = value;
    this._notifyToggledStyleListeners();
  }

  /// Whether the upcoming attributes should be sliced.
  ///
  /// If the value is true, the upcoming attributes will be sliced.
  /// If the value is false, the upcoming attributes will be skipped.
  private _sliceUpcomingAttributes: boolean = true;

  get sliceUpcomingAttributes(): boolean {
    return this._sliceUpcomingAttributes;
  }

  set sliceUpcomingAttributes(value: boolean) {
    if (value === this._sliceUpcomingAttributes) {
      return;
    }
    console.debug('sliceUpcomingAttributes:', value);
    this._sliceUpcomingAttributes = value;
  }

  get transaction(): Transaction {
    const transaction: Transaction = {
      id: `transaction-${Date.now()}-${Math.random()}`,
      operations: [],
      beforeSelection: this.selection,
      afterSelection: null,
      timestamp: Date.now()
    };
    return transaction;
  }

  public showHeader: boolean = false;
  public showFooter: boolean = false;
  public enableAutoComplete: boolean = false;
  public autoCompleteTextProvider: any = null; // Will be properly typed later

  // only used for testing
  public disableSealTimer: boolean = false;

  /// The rules to apply to the document.
  private _documentRules: any[] = []; // Will be properly typed later
  private _documentRuleSubscription: (() => void) | null = null;

  get documentRules(): any[] {
    return [...this._documentRules];
  }

  set documentRules(value: any[]) {
    this._documentRules = [...value];

    this._documentRuleSubscription?.();
    this._documentRuleSubscription = this.onTransaction(async (transactionValue) => {
      for (const rule of this._documentRules) {
        if (rule.shouldApply && rule.shouldApply(this, transactionValue)) {
          await rule.apply(this, transactionValue);
        }
      }
    });
  }

  /** @deprecated use editorState.selection instead */
  private _cursorSelection: Selection | null = null;

  /** @deprecated use editorState.selection instead */
  get cursorSelection(): Selection | null {
    return this._cursorSelection;
  }

  private _onScrollViewScrolledListeners: Set<() => void> = new Set();

  addScrollViewScrolledListener(callback: () => void): void {
    this._onScrollViewScrolledListeners.add(callback);
  }

  removeScrollViewScrolledListener(callback: () => void): void {
    this._onScrollViewScrolledListeners.delete(callback);
  }

  private _notifyScrollViewScrolledListeners(): void {
    for (const listener of Array.from(this._onScrollViewScrolledListeners)) {
      listener();
    }
  }

  get renderBox(): any {
    // This would need to be implemented based on the actual DOM structure
    // For now, returning null as a placeholder
    return null;
  }

  async updateSelectionWithReason(
    selection: Selection | null,
    options: {
      reason?: SelectionUpdateReason;
      extraInfo?: Record<string, any> | null;
      customSelectionType?: SelectionType | null;
    } = {}
  ): Promise<void> {
    const {
      reason = SelectionUpdateReason.transaction,
      extraInfo,
      customSelectionType
    } = options;

    return new Promise<void>((resolve) => {
      if (reason === SelectionUpdateReason.uiEvent) {
        this._selectionType = customSelectionType ?? SelectionType.inline;
        // Use setTimeout to simulate post-frame callback
        setTimeout(() => resolve(), 0);
      } else if (customSelectionType != null) {
        this._selectionType = customSelectionType;
      }

      // broadcast to other users here
      this.selectionExtraInfo = extraInfo || null;
      this._selectionUpdateReason = reason;

      this.selection = selection;

      if (reason !== SelectionUpdateReason.uiEvent) {
        resolve();
      }
    });
  }

  /** @deprecated use updateSelectionWithReason or editorState.selection instead */
  async updateCursorSelection(
    cursorSelection: Selection | null,
    reason: CursorUpdateReason = CursorUpdateReason.others
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      // broadcast to other users here
      if (reason !== CursorUpdateReason.uiEvent) {
        this.selectionService?.updateSelection?.(cursorSelection);
      }
      this._cursorSelection = cursorSelection;
      this.selection = cursorSelection;
      setTimeout(() => resolve(), 0);
    });
  }

  private _debouncedSealHistoryItemTimer: NodeJS.Timeout | null = null;
  private readonly _enableCheckIntegrity: boolean = false;

  // Disposal management
  private _disposeListeners: Set<() => void> = new Set();
  public isDisposed: boolean = false;

  onDispose(listener: () => void): () => void {
    this._disposeListeners.add(listener);
    return () => this._disposeListeners.delete(listener);
  }

  dispose(): void {
    this.isDisposed = true;
    
    // Clear timer
    if (this._debouncedSealHistoryItemTimer) {
      clearTimeout(this._debouncedSealHistoryItemTimer);
      this._debouncedSealHistoryItemTimer = null;
    }
    
    // Notify dispose listeners
    this._disposeListeners.forEach(listener => listener());
    
    // Clear all listeners
    this._editableListeners.clear();
    this._selectionListeners.clear();
    this._remoteSelectionListeners.clear();
    this._transactionListeners.clear();
    this._toggledStyleListeners.clear();
    this._onScrollViewScrolledListeners.clear();
    this._disposeListeners.clear();
    
    // Cancel document rule subscription
    this._documentRuleSubscription?.();
    
    // Remove all event listeners
    this.removeAllListeners();
  }

  /// Apply the transaction to the state.
  ///
  /// The options can be used to determine whether the editor
  /// should record the transaction in undo/redo stack.
  ///
  /// The withUpdateSelection is used to determine whether the editor
  /// should update the selection after applying the transaction.
  async apply(
    transaction: Transaction,
    options: {
      isRemote?: boolean;
      applyOptions?: ApplyOptions;
      withUpdateSelection?: boolean;
      skipHistoryDebounce?: boolean;
    } = {}
  ): Promise<void> {
    const {
      isRemote = false,
      applyOptions = defaultApplyOptions,
      withUpdateSelection = true,
      skipHistoryDebounce = false
    } = options;

    if (!this.editable || this.isDisposed) {
      return;
    }

    // it's a time consuming task, only enable it if necessary.
    if (this._enableCheckIntegrity) {
      // document.root.checkDocumentIntegrity(); // TODO: Implement if needed
    }

    if (isRemote) {
      this._selectionUpdateReason = SelectionUpdateReason.remote;
      this.selection = this._applyTransactionFromRemote(transaction);
    } else {
      // broadcast to other users here, before applying the transaction
      const beforeValue: EditorTransactionValue = {
        time: TransactionTime.before,
        transaction,
        options: applyOptions
      };
      this._notifyTransactionListeners(beforeValue);

      this._applyTransactionInLocal(transaction);

      // broadcast to other users here, after applying the transaction
      const afterValue: EditorTransactionValue = {
        time: TransactionTime.after,
        transaction,
        options: applyOptions
      };
      this._notifyTransactionListeners(afterValue);

      this._recordRedoOrUndo(applyOptions, transaction, skipHistoryDebounce);

      if (withUpdateSelection) {
        this._selectionUpdateReason = transaction.reason ?? SelectionUpdateReason.transaction;
        this._selectionType = transaction.customSelectionType || null;
        if (transaction.selectionExtraInfo != null) {
          this.selectionExtraInfo = transaction.selectionExtraInfo;
        }
        this.selection = transaction.afterSelection;
      }
    }
  }

  /// Reload the editor state.
  ///
  /// This method will reload the editor state with the given document.
  /// It will also clear the undo/redo stack.
  reload(document: Document): void {
    this.document = document;
    this.undoManager.clear();
    this.selection = null;
  }

  /// Get the nodes in the given selection.
  ///
  /// If the selection is null, return an empty list.
  getNodesInSelection(selection: Selection | null): Node[] {
    if (selection == null) {
      return [];
    }
    return this.document.nodesInSelection(selection);
  }

  getSelectedNodes(options: {
    selection?: Selection | null;
    withCopy?: boolean;
  } = {}): Node[] {
    const { selection = this.selection, withCopy = true } = options;
    const res: Node[] = [];
    if (selection == null) {
      return res;
    }
    const nodes = this.getNodesInSelection(selection);
    for (const node of nodes) {
      if (res.some((element) => element.isParentOf(node))) {
        continue;
      }
      res.push(node);
    }

    if (withCopy) {
      return res.map((e) => e.copyWith());
    }

    if (res.length > 0) {
      let delta = res[0].delta;
      if (delta != null) {
        res[0].updateAttributes({
          ...res[0].attributes,
          blockComponentDelta: delta
            .slice(
              selection.startIndex,
              selection.isSingle ? selection.endIndex : delta.length,
            )
            .toJson(),
        });
      }

      let node = res[res.length - 1];
      while (node.children.length > 0) {
        node = node.children[node.children.length - 1];
      }
      delta = node.delta;
      if (delta != null && !selection.isSingle) {
        if (node.parent != null) {
          node.insertBefore(
            node.copyWith({
              attributes: {
                ...node.attributes,
                blockComponentDelta: delta
                  .slice(0, selection.endIndex)
                  .toJson(),
              },
            })
          );
          node.unlink();
        } else {
          node.updateAttributes({
            ...node.attributes,
            blockComponentDelta: delta
              .slice(0, selection.endIndex)
              .toJson(),
          });
        }
      }
    }

    return res;
  }

  getNodeAtPath(path: Path): Node | null {
    return this.document.nodeAtPath(path);
  }

  /// The current selection areas's rect in editor.
  selectionRects(): DOMRect[] {
    const selection = this.selection;
    if (selection == null) {
      return [];
    }

    const nodes = this.getNodesInSelection(selection);
    const rects: DOMRect[] = [];

    if (selection.isCollapsed && nodes.length === 1) {
      const selectable = nodes[0].selectable;
      if (selectable != null) {
        const rect = selectable.getCursorRectInPosition(
          selection.end,
          { shiftWithBaseOffset: true }
        );
        if (rect != null) {
          rects.push(
            selectable.transformRectToGlobal(
              rect,
              { shiftWithBaseOffset: true }
            )
          );
        }
      }
    } else {
      for (const node of nodes) {
        const selectable = node.selectable;
        if (selectable == null) {
          continue;
        }
        const nodeRects = selectable.getRectsInSelection(
          selection,
          { shiftWithBaseOffset: true }
        );
        if (nodeRects.length === 0) {
          continue;
        }
        const renderBox = node.renderBox;
        if (renderBox == null) {
          continue;
        }
        for (const rect of nodeRects) {
          const globalOffset = renderBox.localToGlobal(rect.topLeft);
          rects.push(globalOffset); // Simplified for TypeScript
        }
      }
    }

    return rects;
  }

  cancelSubscription(): void {
    this._documentRuleSubscription?.();
    this._documentRuleSubscription = null;
  }

  updateAutoScroller(
    scrollableState: any
  ): void {
    if (this.scrollableState !== scrollableState) {
      this.autoScroller?.stopAutoScroll();
      // AutoScroller implementation would need to be ported to TypeScript
      // this.autoScroller = new AutoScroller(
      //   scrollableState,
      //   {
      //     velocityScalar: 50, // Simplified for TypeScript
      //     onScrollViewScrolled: this._notifyScrollViewScrolledListeners.bind(this)
      //   }
      // );
      this.scrollableState = scrollableState;
    }
  }

  private _recordRedoOrUndo(
    options: ApplyOptions,
    transaction: Transaction,
    skipDebounce: boolean
  ): void {
    if (options.recordUndo) {
      const undoItem = this.undoManager.getUndoHistoryItem();
      undoItem.addAll(transaction.operations);
      if (undoItem.beforeSelection == null &&
          transaction.beforeSelection != null) {
        undoItem.beforeSelection = transaction.beforeSelection;
      }
      undoItem.afterSelection = transaction.afterSelection;
      if (skipDebounce && this.undoManager.undoStack.length > 0) {
        console.debug('Seal history item');
        const last = this.undoManager.undoStack[this.undoManager.undoStack.length - 1];
        last.seal();
      } else {
        this._debouncedSealHistoryItem();
      }
    } else if (options.recordRedo) {
      const redoItem = new HistoryItem();
      redoItem.addAll(transaction.operations);
      redoItem.beforeSelection = transaction.beforeSelection;
      redoItem.afterSelection = transaction.afterSelection;
      this.undoManager.redoStack.push(redoItem);
    }
  }

  private _debouncedSealHistoryItem(): void {
    if (this.disableSealTimer) {
      return;
    }
    if (this._debouncedSealHistoryItemTimer) {
      clearTimeout(this._debouncedSealHistoryItemTimer);
    }
    this._debouncedSealHistoryItemTimer = setTimeout(() => {
      if (this.undoManager.undoStack.length > 0) {
        console.debug('Seal history item');
        const last = this.undoManager.undoStack[this.undoManager.undoStack.length - 1];
        last.seal();
      }
    }, this.minHistoryItemDuration);
  }

  private _applyTransactionInLocal(transaction: Transaction): void {
    for (const op of transaction.operations) {
      console.debug('apply op (local):', op);

      if (op.type === 'insert') {
        this.document.insert(op.path, op.nodes);
      } else if (op.type === 'update') {
        // ignore the update operation if the attributes are the same.
        if (!this._mapEquals(op.attributes, op.oldAttributes)) {
          this.document.update(op.path, op.attributes);
        }
      } else if (op.type === 'delete') {
        this.document.delete(op.path, op.nodes.length);
      } else if (op.type === 'updateText') {
        this.document.updateText(op.path, op.delta);
      }
    }
  }

  private _applyTransactionFromRemote(transaction: Transaction): Selection | null {
    let selection = this.selection;

    for (const op of transaction.operations) {
      console.debug('apply op (remote):', op);

      if (op.type === 'insert') {
        this.document.insert(op.path, op.nodes);
        if (selection != null) {
          if (this._pathLessOrEqual(op.path, selection.start.path)) {
            selection = {
              start: {
                ...selection.start,
                path: this._nextNPath(selection.start.path, op.nodes.length)
              },
              end: {
                ...selection.end,
                path: this._nextNPath(selection.end.path, op.nodes.length)
              }
            };
          }
        }
      } else if (op.type === 'update') {
        this.document.update(op.path, op.attributes);
      } else if (op.type === 'delete') {
        this.document.delete(op.path, op.nodes.length);
        if (selection != null) {
          if (this._pathLessOrEqual(op.path, selection.start.path)) {
            selection = {
              start: {
                ...selection.start,
                path: this._previousPath(selection.start.path)
              },
              end: {
                ...selection.end,
                path: this._previousPath(selection.end.path)
              }
            };
          }
        }
      } else if (op.type === 'updateText') {
        this.document.updateText(op.path, op.delta);
      }
    }

    return selection;
  }

  private _mapEquals(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private _pathLessOrEqual(a: Path, b: Path): boolean {
    // Simplified path comparison - would need proper implementation
    return JSON.stringify(a) <= JSON.stringify(b);
  }

  private _nextNPath(path: Path, n: number): Path {
    // Simplified path manipulation - would need proper implementation
    return [...path, n];
  }

  private _previousPath(path: Path): Path {
     // Simplified path manipulation - would need proper implementation
     return path.slice(0, -1);
   }

   private _notifyTransactionListeners(value: EditorTransactionValue): void {
     this._transactionListeners.forEach(listener => listener(value));
   }

   private _notifyScrollViewScrolledListeners(): void {
     this._onScrollViewScrolledListeners.forEach(listener => listener());
   }
 }
