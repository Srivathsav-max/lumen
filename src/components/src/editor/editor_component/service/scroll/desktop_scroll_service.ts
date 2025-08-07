import { EditorState } from '../../../editor_state';
import { EditorScrollController } from './editor_scroll_controller';
import { AppFlowyScrollService } from '../../../scroll/scroll_service';

export class DesktopScrollService implements AppFlowyScrollService {
  private editorState: EditorState;
  private editorScrollController: EditorScrollController;
  private element: HTMLElement;

  constructor(options: {
    editorState: EditorState;
    editorScrollController: EditorScrollController;
    child: HTMLElement;
  }) {
    this.editorState = options.editorState;
    this.editorScrollController = options.editorScrollController;
    this.element = this.createElement(options.child);
  }

  private createElement(child: HTMLElement): HTMLElement {
    const container = document.createElement('div');
    container.className = 'desktop-scroll-service';
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.appendChild(child);
    return container;
  }

  get dy(): number {
    return this.editorScrollController.offsetNotifier.value;
  }

  get onePageHeight(): number | undefined {
    const rect = this.element.getBoundingClientRect();
    return rect.height || undefined;
  }

  get maxScrollExtent(): number {
    if (this.editorState.scrollableState) {
      const scrollable = this.editorState.scrollableState;
      return scrollable.scrollHeight - scrollable.clientHeight;
    }
    return 0;
  }

  get minScrollExtent(): number {
    return 0;
  }

  get page(): number | undefined {
    if (this.onePageHeight !== undefined) {
      const scrollExtent = this.maxScrollExtent - this.minScrollExtent;
      return Math.ceil(scrollExtent / this.onePageHeight);
    }
    return undefined;
  }

  scrollTo(
    dy: number,
    options: { duration?: number } = {}
  ): void {
    const { duration = 150 } = options;
    const clampedDy = Math.max(
      this.minScrollExtent,
      Math.min(dy, this.maxScrollExtent)
    );
    
    this.editorScrollController.animateTo({
      offset: clampedDy,
      duration,
    });
  }

  jumpToTop(): void {
    this.editorScrollController.jumpToTop();
  }

  jumpToBottom(): void {
    this.editorScrollController.jumpToBottom();
  }

  jumpTo(index: number): void {
    this.editorScrollController.jumpTo({ offset: index });
  }

  disable(): void {
    console.debug('disable scroll service');
  }

  enable(): void {
    console.debug('enable scroll service');
  }

  startAutoScroll(
    offset: { x: number; y: number },
    options: {
      edgeOffset?: number;
      direction?: 'up' | 'down' | 'left' | 'right';
      duration?: number;
    } = {}
  ): void {
    if (this.editorState.disableAutoScroll) {
      return;
    }

    const autoScroller = this.editorState.autoScroller;
    if (autoScroller) {
      autoScroller.startAutoScroll(offset, options);
    }
  }

  stopAutoScroll(): void {
    if (this.editorState.disableAutoScroll) {
      return;
    }

    const autoScroller = this.editorState.autoScroller;
    if (autoScroller) {
      autoScroller.stopAutoScroll();
    }
  }

  goBallistic(velocity: number): void {
    throw new Error('goBallistic is not implemented');
  }

  get scrollController(): HTMLElement {
    throw new Error('scrollController getter is not implemented');
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    // Clean up any resources if needed
  }
}