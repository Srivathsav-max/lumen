import { Document } from './core/document/document';
import { Selection } from './core/location/selection';
import { Transaction, TransactionTime } from './core/transform/transaction';
import { UndoManager } from './history/undo_manager';
import { EditorService } from './editor/editor_component/service/editor_service';
import { AppFlowyScrollService } from './editor/editor_component/service/scroll_service';
import { AppFlowySelectionService } from './editor/editor_component/service/selection_service';
import { BlockComponentRendererService } from './editor/block_component/base_component/block_component_configuration';
import { SelectionMenuItem } from './editor/selection_menu/selection_menu';
import { ToolbarItem } from './render/toolbar/toolbar_item';
import { DocumentRule } from './core/document/rules/document_rule';
import { Node } from './core/document/node';
import { Position } from './core/location/position';
import { Path } from './core/document/path';
import { NodeIterator } from './core/document/node_iterator';
import { Attributes } from './core/document/attributes';
import { AppFlowyRichTextKeys } from './editor/block_component/rich_text/appflowy_rich_text_keys';

export interface EditorTransactionValue {
  time: TransactionTime;
  transaction: Transaction;
  options: ApplyOptions;
}

export class EditorStateDebugInfo {
  debugPaintSizeEnabled: boolean;

  constructor(options: { debugPaintSizeEnabled?: boolean } = {}) {
    this.debugPaintSizeEnabled = options.debugPaintSizeEnabled ?? false;
  }
}

export const selectionExtraInfoDoNotAttachTextService = 'selectionExtraInfoDoNotAttachTextService';

export class ApplyOptions {
  recordUndo: boolean;
  recordRedo: boolean;
  inMemoryUpdate: boolean;

  constructor(options: {
    recordUndo?: boolean;
    recordRedo?: boolean;
    inMemoryUpdate?: boolean;
  } = {}) {
    this.recordUndo = options.recordUndo ?? true;
    this.recordRedo = options.recordRedo ?? false;
    this.inMemoryUpdate = options.inMemoryUpdate ?? false;
  }
}

export enum SelectionUpdateReason {
  uiEvent = 'uiEvent',
  transaction = 'transaction',
  remote = 'remote',
  selectAll = 'selectAll',
  searchHighlight = 'searchHighlight'
}

export enum SelectionType {
  inline = 'inline',
  block = 'block'
}

export interface RemoteSelection {
  selection: Selection;
  userId: string;
  userColor: string;
}

export class PropertyValueNotifier<T> {
  private _value: T;
  private listeners: ((value: T) => void)[] = [];

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  set value(newValue: T) {
    if (this._value !== newValue) {
      this._value = newValue;
      this.notifyListeners();
    }
  }

  addListener(listener: (value: T) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (value: T) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this._value));
  }

  dispose(): void {
    this.listeners = [];
  }
}

export class EditorState {
  document: Document;
  minHistoryItemDuration: number;
  editableNotifier: PropertyValueNotifier<boolean>;
  disableAutoScroll: boolean = false;
  autoScrollEdgeOffset: number = 50;
  editorStyle: any; // EditorStyle type to be defined
  selectionNotifier: PropertyValueNotifier<Selection | null>;
  remoteSelections: PropertyValueNotifier<RemoteSelection[]>;
  service: EditorService;
  debugInfo: EditorStateDebugInfo;
  selectionMenuItems: SelectionMenuItem[] = [];
  toolbarItems: ToolbarItem[] = [];
  undoManager: UndoManager;
  showHeader: boolean = false;
  showFooter: boolean = false;
  enableAutoComplete: boolean = false;
  autoCompleteTextProvider: any = null;
  disableSealTimer: boolean = false;
  isDisposed: boolean = false;

  private _selectionType: SelectionType | null = null;
  private _selectionUpdateReason: SelectionUpdateReason = SelectionUpdateReason.uiEvent;
  private _toggledStyle: Attributes = {};
  private _sliceUpcomingAttributes: boolean = true;
  private _documentRules: DocumentRule[] = [];
  private _onScrollViewScrolledListeners: Set<() => void> = new Set();
  private _observers: ((value: EditorTransactionValue) => void)[] = [];
  private _asyncObservers: ((value: EditorTransactionValue) => void)[] = [];
  private _debouncedSealHistoryItemTimer: NodeJS.Timeout | null = null;
  private _subscription: (() => void) | null = null;

  selectionExtraInfo: any = null;
  autoScroller: any = null;
  scrollableState: any = null;
  toggledStyleNotifier: PropertyValueNotifier<Attributes>;
  onDispose: PropertyValueNotifier<number>;

  constructor(options: {
    document: Document;
    minHistoryItemDuration?: number;
    maxHistoryItemSize?: number;
  }) {
    this.document = options.document;
    this.minHistoryItemDuration = options.minHistoryItemDuration ?? 50;
    this.editableNotifier = new PropertyValueNotifier(true);
    this.selectionNotifier = new PropertyValueNotifier<Selection | null>(null);
    this.remoteSelections = new PropertyValueNotifier<RemoteSelection[]>([]);
    this.service = new EditorService();
    this.debugInfo = new EditorStateDebugInfo();
    this.undoManager = new UndoManager(options.maxHistoryItemSize ?? 200);
    this.undoManager.state = this;
    this.toggledStyleNotifier = new PropertyValueNotifier(this._toggledStyle);
    this.onDispose = new PropertyValueNotifier(0);
  }

  static blank(options: { withInitialText?: boolean } = {}): EditorState {
    return new EditorState({
      document: Document.blank(options.withInitialText ?? true)
    });
  }

  get editable(): boolean {
    return this.editableNotifier.value;
  }

  set editable(value: boolean) {
    if (value === this.editable) return;
    this.editableNotifier.value = value;
  }

  get selection(): Selection | null {
    return this.selectionNotifier.value;
  }

  set selection(value: Selection | null) {
    if (this.selectionNotifier.value !== value) {
      this._toggledStyle = {};
    }
    this.sliceUpcomingAttributes = true;
    this.selectionNotifier.value = value;
  }

  get selectionType(): SelectionType | null {
    return this._selectionType;
  }

  set selectionType(value: SelectionType | null) {
    if (value === this._selectionType) return;
    this._selectionType = value;
  }

  get selectionUpdateReason(): SelectionUpdateReason {
    return this._selectionUpdateReason;
  }

  get scrollService(): AppFlowyScrollService | null {
    return this.service.scrollService;
  }

  get selectionService(): AppFlowySelectionService {
    return this.service.selectionService;
  }

  get renderer(): BlockComponentRendererService {
    return this.service.rendererService;
  }

  set renderer(value: BlockComponentRendererService) {
    this.service.rendererService = value;
  }

  get toggledStyle(): Readonly<Attributes> {
    return { ...this._toggledStyle };
  }

  get sliceUpcomingAttributes(): boolean {
    return this._sliceUpcomingAttributes;
  }

  set sliceUpcomingAttributes(value: boolean) {
    if (value === this._sliceUpcomingAttributes) return;
    this._sliceUpcomingAttributes = value;
  }

  get transaction(): Transaction {
    const transaction = new Transaction(this.document);
    transaction.beforeSelection = this.selection;
    return transaction;
  }

  get documentRules(): DocumentRule[] {
    return this._documentRules;
  }

  set documentRules(value: DocumentRule[]) {
    this._documentRules = value;
    
    if (this._subscription) {
      this._subscription();
    }
    
    this._subscription = this.addAsyncObserver(async (value) => {
      for (const rule of this._documentRules) {
        if (rule.shouldApply(this, value)) {
          await rule.apply(this, value);
        }
      }
    });
  }

  updateToggledStyle(key: string, value: any): void {
    this._toggledStyle[key] = value;
    this.toggledStyleNotifier.value = { ...this._toggledStyle };
  }

  addScrollViewScrolledListener(callback: () => void): void {
    this._onScrollViewScrolledListeners.add(callback);
  }

  removeScrollViewScrolledListener(callback: () => void): void {
    this._onScrollViewScrolledListeners.delete(callback);
  }

  private notifyScrollViewScrolledListeners(): void {
    this._onScrollViewScrolledListeners.forEach(listener => listener());
  }

  addObserver(observer: (value: EditorTransactionValue) => void): () => void {
    this._observers.push(observer);
    return () => {
      const index = this._observers.indexOf(observer);
      if (index !== -1) {
        this._observers.splice(index, 1);
      }
    };
  }

  addAsyncObserver(observer: (value: EditorTransactionValue) => void): () => void {
    this._asyncObservers.push(observer);
    return () => {
      const index = this._asyncObservers.indexOf(observer);
      if (index !== -1) {
        this._asyncObservers.splice(index, 1);
      }
    };
  }

  async updateSelectionWithReason(
    selection: Selection | null,
    options: {
      reason?: SelectionUpdateReason;
      extraInfo?: any;
      customSelectionType?: SelectionType;
    } = {}
  ): Promise<void> {
    const { reason = SelectionUpdateReason.transaction, extraInfo, customSelectionType } = options;

    if (reason === SelectionUpdateReason.uiEvent) {
      this._selectionType = customSelectionType ?? SelectionType.inline;
    } else if (customSelectionType) {
      this._selectionType = customSelectionType;
    }

    this.selectionExtraInfo = extraInfo;
    this._selectionUpdateReason = reason;
    this.selection = selection;

    return Promise.resolve();
  }

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
      applyOptions = new ApplyOptions({ recordUndo: true }),
      withUpdateSelection = true,
      skipHistoryDebounce = false
    } = options;

    if (!this.editable || this.isDisposed) {
      return;
    }

    if (isRemote) {
      this._selectionUpdateReason = SelectionUpdateReason.remote;
      this.selection = this.applyTransactionFromRemote(transaction);
    } else {
      // Broadcast before
      const transactionValue: EditorTransactionValue = {
        time: TransactionTime.before,
        transaction,
        options: applyOptions
      };
      
      this._observers.forEach(observer => observer(transactionValue));
      this._asyncObservers.forEach(observer => observer(transactionValue));

      this.applyTransactionInLocal(transaction);

      // Broadcast after
      const afterTransactionValue: EditorTransactionValue = {
        time: TransactionTime.after,
        transaction,
        options: applyOptions
      };
      
      this._observers.forEach(observer => observer(afterTransactionValue));
      this._asyncObservers.forEach(observer => observer(afterTransactionValue));

      this.recordRedoOrUndo(applyOptions, transaction, skipHistoryDebounce);

      if (withUpdateSelection) {
        this._selectionUpdateReason = transaction.reason ?? SelectionUpdateReason.transaction;
        this._selectionType = transaction.customSelectionType ?? null;
        if (transaction.selectionExtraInfo) {
          this.selectionExtraInfo = transaction.selectionExtraInfo;
        }
        this.selection = transaction.afterSelection;
      }
    }
  }

  reload(): void {
    this.document.root.notify();
  }

  getNodesInSelection(selection: Selection): Node[] {
    const normalized = selection.normalized;
    const startNode = this.document.nodeAtPath(normalized.start.path);
    const endNode = this.document.nodeAtPath(normalized.end.path);

    if (startNode && endNode) {
      const nodes = new NodeIterator({
        document: this.document,
        startNode,
        endNode
      }).toArray();

      return selection.isForward ? nodes.reverse() : nodes;
    }

    return [];
  }

  getSelectedNodes(options: { selection?: Selection; withCopy?: boolean } = {}): Node[] {
    const { selection = this.selection, withCopy = true } = options;
    let result: Node[] = [];
    
    if (!selection) return result;

    const nodes = this.getNodesInSelection(selection);
    for (const node of nodes) {
      if (!result.some(element => element.isParentOf(node))) {
        result.push(node);
      }
    }

    if (withCopy) {
      result = result.map(node => node.copyWith());
    }

    // Handle delta slicing for first and last nodes
    if (result.length > 0) {
      const firstNode = result[0];
      const delta = firstNode.delta;
      if (delta) {
        firstNode.updateAttributes({
          ...firstNode.attributes,
          blockComponentDelta: delta.slice(
            selection.startIndex,
            selection.isSingle ? selection.endIndex : delta.length
          ).toJson()
        });
      }

      if (!selection.isSingle) {
        let lastNode = result[result.length - 1];
        while (lastNode.children.length > 0) {
          lastNode = lastNode.children[lastNode.children.length - 1];
        }
        
        const lastDelta = lastNode.delta;
        if (lastDelta) {
          if (lastNode.parent) {
            const newNode = lastNode.copyWith({
              attributes: {
                ...lastNode.attributes,
                blockComponentDelta: lastDelta.slice(0, selection.endIndex).toJson()
              }
            });
            lastNode.insertBefore(newNode);
            lastNode.unlink();
          } else {
            lastNode.updateAttributes({
              ...lastNode.attributes,
              blockComponentDelta: lastDelta.slice(0, selection.endIndex).toJson()
            });
          }
        }
      }
    }

    return result;
  }

  getNodeAtPath(path: Path): Node | null {
    return this.document.nodeAtPath(path);
  }

  selectionRects(): DOMRect[] {
    const selection = this.selection;
    if (!selection) return [];

    const nodes = this.getNodesInSelection(selection);
    const rects: DOMRect[] = [];

    if (selection.isCollapsed && nodes.length === 1) {
      const selectable = nodes[0].selectable;
      if (selectable) {
        const rect = selectable.getCursorRectInPosition(selection.end, true);
        if (rect) {
          rects.push(selectable.transformRectToGlobal(rect, true));
        }
      }
    } else {
      for (const node of nodes) {
        const selectable = node.selectable;
        if (!selectable) continue;

        const nodeRects = selectable.getRectsInSelection(selection, true);
        if (nodeRects.length === 0) continue;

        const renderBox = node.renderBox;
        if (!renderBox) continue;

        for (const rect of nodeRects) {
          const globalRect = new DOMRect(
            rect.left + renderBox.offsetLeft,
            rect.top + renderBox.offsetTop,
            rect.width,
            rect.height
          );
          rects.push(globalRect);
        }
      }
    }

    return rects;
  }

  dispose(): void {
    this.isDisposed = true;
    this._observers = [];
    this._asyncObservers = [];
    
    if (this._debouncedSealHistoryItemTimer) {
      clearTimeout(this._debouncedSealHistoryItemTimer);
    }
    
    this.onDispose.value += 1;
    this.onDispose.dispose();
    this.document.dispose();
    this.selectionNotifier.dispose();
    
    if (this._subscription) {
      this._subscription();
    }
    
    this._onScrollViewScrolledListeners.clear();
  }

  private applyTransactionInLocal(transaction: Transaction): void {
    for (const op of transaction.operations) {
      if (op.type === 'insert') {
        this.document.insert(op.path, op.nodes);
      } else if (op.type === 'update') {
        if (JSON.stringify(op.attributes) !== JSON.stringify(op.oldAttributes)) {
          this.document.update(op.path, op.attributes);
        }
      } else if (op.type === 'delete') {
        this.document.delete(op.path, op.nodes.length);
      } else if (op.type === 'updateText') {
        this.document.updateText(op.path, op.delta);
      }
    }
  }

  private applyTransactionFromRemote(transaction: Transaction): Selection | null {
    let selection = this.selection;

    for (const op of transaction.operations) {
      if (op.type === 'insert') {
        this.document.insert(op.path, op.nodes);
        if (selection && op.path <= selection.start.path) {
          selection = new Selection({
            start: selection.start.copyWith({
              path: selection.start.path.nextNPath(op.nodes.length)
            }),
            end: selection.end.copyWith({
              path: selection.end.path.nextNPath(op.nodes.length)
            })
          });
        }
      } else if (op.type === 'update') {
        this.document.update(op.path, op.attributes);
      } else if (op.type === 'delete') {
        this.document.delete(op.path, op.nodes.length);
        if (selection && op.path <= selection.start.path) {
          selection = new Selection({
            start: selection.start.copyWith({
              path: selection.start.path.previous
            }),
            end: selection.end.copyWith({
              path: selection.end.path.previous
            })
          });
        }
      } else if (op.type === 'updateText') {
        this.document.updateText(op.path, op.delta);
      }
    }

    return selection;
  }

  private recordRedoOrUndo(
    options: ApplyOptions,
    transaction: Transaction,
    skipDebounce: boolean
  ): void {
    if (options.recordUndo) {
      const undoItem = this.undoManager.getUndoHistoryItem();
      undoItem.addAll(transaction.operations);
      if (!undoItem.beforeSelection && transaction.beforeSelection) {
        undoItem.beforeSelection = transaction.beforeSelection;
      }
      undoItem.afterSelection = transaction.afterSelection;
      
      if (skipDebounce && this.undoManager.undoStack.length > 0) {
        const last = this.undoManager.undoStack[this.undoManager.undoStack.length - 1];
        last.seal();
      } else {
        this.debouncedSealHistoryItem();
      }
    } else if (options.recordRedo) {
      const redoItem = this.undoManager.createHistoryItem();
      redoItem.addAll(transaction.operations);
      redoItem.beforeSelection = transaction.beforeSelection;
      redoItem.afterSelection = transaction.afterSelection;
      this.undoManager.redoStack.push(redoItem);
    }
  }

  private debouncedSealHistoryItem(): void {
    if (this.disableSealTimer) return;
    
    if (this._debouncedSealHistoryItemTimer) {
      clearTimeout(this._debouncedSealHistoryItemTimer);
    }
    
    this._debouncedSealHistoryItemTimer = setTimeout(() => {
      if (this.undoManager.undoStack.length > 0) {
        const last = this.undoManager.undoStack[this.undoManager.undoStack.length - 1];
        last.seal();
      }
    }, this.minHistoryItemDuration);
  }
}