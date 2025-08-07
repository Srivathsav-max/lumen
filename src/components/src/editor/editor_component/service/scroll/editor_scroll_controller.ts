import { EditorState } from '../../../editor_state';
import { 
  ItemScrollController, 
  ScrollOffsetController, 
  ItemPositionsListener, 
  ScrollOffsetListener,
  ItemPosition 
} from '../../../../flutter/scrollable_positioned_list/scrollable_positioned_list';

/**
 * This class controls the scroll behavior of the editor.
 * 
 * It must be provided in the widget tree above the PageComponent.
 * 
 * You can use offsetNotifier to get the current scroll offset.
 * And, you can use visibleRangeNotifier to get the first level visible items.
 * 
 * If the shrinkWrap is true, the scrollController must not be null
 * and the editor should be wrapped in a SingleChildScrollView.
 */
export class EditorScrollController {
  public readonly editorState: EditorState;
  public readonly shrinkWrap: boolean;
  
  // Provide the current scroll offset
  public readonly offsetNotifier = new ValueNotifier<number>(0);
  
  // Provide the first level visible items
  public readonly visibleRangeNotifier = new ValueNotifier<[number, number]>([-1, -1]);
  
  // These values are required by SingleChildScrollView
  public scrollController?: HTMLElement;
  private shouldDisposeScrollController = false;
  
  // These values are required by ScrollablePositionedList
  private _itemScrollController?: ItemScrollController;
  private _scrollOffsetController?: ScrollOffsetController;
  private _itemPositionsListener?: ItemPositionsListener;
  private _scrollOffsetListener?: ScrollOffsetListener;
  private _scrollOffsetSubscription?: () => void;

  constructor(options: {
    editorState: EditorState;
    shrinkWrap?: boolean;
    scrollController?: HTMLElement;
  }) {
    this.editorState = options.editorState;
    this.shrinkWrap = options.shrinkWrap ?? false;

    if (this.shrinkWrap) {
      this.initializeShrinkWrapMode(options.scrollController);
    } else {
      this.initializeScrollablePositionedListMode();
    }
  }

  private initializeShrinkWrapMode(scrollController?: HTMLElement): void {
    const updateVisibleRange = () => {
      this.visibleRangeNotifier.value = [
        0,
        this.editorState.document.root.children.length - 1,
      ];
    };

    updateVisibleRange();
    this.editorState.document.root.addListener(updateVisibleRange);

    this.shouldDisposeScrollController = !scrollController;
    this.scrollController = scrollController || this.createScrollController();
    
    // Listen to the scroll offset
    this.scrollController.addEventListener('scroll', () => {
      this.offsetNotifier.value = this.scrollController!.scrollTop;
    });
  }

  private initializeScrollablePositionedListMode(): void {
    this._itemScrollController = new ItemScrollController();
    this._scrollOffsetController = new ScrollOffsetController();
    this._itemPositionsListener = ItemPositionsListener.create();
    this._scrollOffsetListener = ScrollOffsetListener.create();

    // Listen to the scroll offset
    this._scrollOffsetListener.addListener((delta) => {
      // The value from changes is the delta offset, so we add it to the current
      // offset to get the total offset
      this.offsetNotifier.value = this.offsetNotifier.value + delta;
    });

    this._itemPositionsListener.addListener(this.listenItemPositions.bind(this));
  }

  private createScrollController(): HTMLElement {
    const element = document.createElement('div');
    element.style.overflowY = 'auto';
    element.style.height = '100%';
    return element;
  }

  get itemScrollController(): ItemScrollController {
    if (this.shrinkWrap) {
      throw new Error('ItemScrollController is not supported when shrinkWrap is true');
    }
    return this._itemScrollController!;
  }

  get scrollOffsetController(): ScrollOffsetController {
    if (this.shrinkWrap) {
      throw new Error('ScrollOffsetController is not supported when shrinkWrap is true');
    }
    return this._scrollOffsetController!;
  }

  get itemPositionsListener(): ItemPositionsListener {
    if (this.shrinkWrap) {
      throw new Error('ItemPositionsListener is not supported when shrinkWrap is true');
    }
    return this._itemPositionsListener!;
  }

  get scrollOffsetListener(): ScrollOffsetListener {
    if (this.shrinkWrap) {
      throw new Error('ScrollOffsetListener is not supported when shrinkWrap is true');
    }
    return this._scrollOffsetListener!;
  }

  dispose(): void {
    if (this.shouldDisposeScrollController && this.scrollController) {
      // Clean up scroll controller if we created it
      this.scrollController.remove();
    }

    if (!this.shrinkWrap) {
      this._scrollOffsetSubscription?.();
      this._itemPositionsListener?.removeListener(this.listenItemPositions);
      (this._itemPositionsListener as any)?.dispose?.();
    }

    this.offsetNotifier.dispose();
    this.visibleRangeNotifier.dispose();
  }

  async animateTo(options: {
    offset: number;
    duration: number;
    curve?: string;
  }): Promise<void> {
    const { offset, duration, curve = 'linear' } = options;

    if (this.shrinkWrap && this.scrollController) {
      const maxScroll = this.scrollController.scrollHeight - this.scrollController.clientHeight;
      const clampedOffset = Math.max(0, Math.min(offset, maxScroll));
      
      return new Promise((resolve) => {
        this.scrollController!.scrollTo({
          top: clampedOffset,
          behavior: 'smooth'
        });
        setTimeout(resolve, duration);
      });
    } else if (this._scrollOffsetController) {
      await this._scrollOffsetController.animateTo({
        offset: Math.max(0, offset),
        duration,
        curve,
      });
    }
  }

  jumpTo(options: { offset: number }): void {
    const { offset } = options;

    if (this.shrinkWrap && this.scrollController) {
      const maxScroll = this.scrollController.scrollHeight - this.scrollController.clientHeight;
      const clampedOffset = Math.max(0, Math.min(offset, maxScroll));
      this.scrollController.scrollTop = clampedOffset;
      return;
    }

    const index = Math.floor(offset);
    const [start, end] = this.visibleRangeNotifier.value;

    if (index < start || index > end) {
      this._itemScrollController?.jumpTo({
        index: Math.max(0, index),
        alignment: 0,
      });
    }
  }

  jumpToTop(): void {
    if (this.shrinkWrap && this.scrollController) {
      this.scrollController.scrollTop = 0;
    } else {
      this._itemScrollController?.jumpTo({ index: 0, alignment: 0 });
    }
  }

  jumpToBottom(): void {
    if (this.shrinkWrap && this.scrollController) {
      this.scrollController.scrollTop = this.scrollController.scrollHeight;
    } else {
      this._itemScrollController?.jumpTo({
        index: this.editorState.document.root.children.length - 1,
        alignment: 0,
      });
    }
  }

  // Listen to the visible item positions
  private listenItemPositions(positions: ItemPosition[]): void {
    if (positions.length === 0) {
      this.visibleRangeNotifier.value = [-1, -1];
      return;
    }

    // Determine the first visible item by finding the item with the
    // smallest trailing edge that is greater than 0
    const visiblePositions = positions.filter(position => position.itemTrailingEdge > 0);
    if (visiblePositions.length === 0) {
      this.visibleRangeNotifier.value = [-1, -1];
      return;
    }

    const min = visiblePositions.reduce(
      (min, position) => position.itemTrailingEdge < min.itemTrailingEdge ? position : min
    ).index;

    // Determine the last visible item by finding the item with the
    // greatest leading edge that is less than 1
    const leadingVisiblePositions = positions.filter(position => position.itemLeadingEdge < 1);
    if (leadingVisiblePositions.length === 0) {
      this.visibleRangeNotifier.value = [min, min];
      return;
    }

    let max = leadingVisiblePositions.reduce(
      (max, position) => position.itemLeadingEdge > max.itemLeadingEdge ? position : max
    ).index;

    // Filter the header and footer
    if (this.editorState.showHeader) {
      max--;
    }

    if (this.editorState.showFooter && max >= this.editorState.document.root.children.length) {
      max--;
    }

    // Notify the listeners
    this.visibleRangeNotifier.value = [min, max];
  }
}

/**
 * A simple value notifier implementation
 */
class ValueNotifier<T> {
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
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this._value);
      } catch (error) {
        console.error('Error in ValueNotifier listener:', error);
      }
    }
  }

  dispose(): void {
    this.listeners = [];
  }
}

/**
 * Extension for ValidIndexedValueNotifier
 */
export const ValidIndexedValueNotifierUtils = {
  isValid(value: [number, number]): boolean {
    return value[0] >= 0 && value[1] >= 0 && value[0] <= value[1];
  }
};