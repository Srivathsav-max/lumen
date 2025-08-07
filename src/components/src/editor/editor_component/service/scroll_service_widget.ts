import { EditorState } from '../../editor_state';
import { EditorScrollController } from './scroll/editor_scroll_controller';
import { AppFlowyScrollService } from '../../scroll/scroll_service';
import { DesktopScrollService } from './scroll/desktop_scroll_service';
import { MobileScrollService } from './scroll/mobile_scroll_service';
import { SelectionUpdateReason } from '../../selection/selection_update_reason';
import { KeyboardHeightObserver } from '../../../infra/keyboard_height_observer';

interface ScrollServiceWidgetProps {
  editorScrollController: EditorScrollController;
  child: HTMLElement;
}

export class ScrollServiceWidget implements AppFlowyScrollService {
  private props: ScrollServiceWidgetProps;
  private element: HTMLElement;
  private forwardService: AppFlowyScrollService;
  private editorState: EditorState;
  private scrollController: HTMLElement;
  private offset = 0;

  constructor(props: ScrollServiceWidgetProps) {
    this.props = props;
    this.editorState = EditorState.getInstance();
    this.scrollController = this.createScrollController();
    this.editorState.selectionNotifier.addListener(this.onSelectionChanged.bind(this));
    this.element = this.createElement();
  }

  private createScrollController(): HTMLElement {
    const element = document.createElement('div');
    element.style.overflowY = 'auto';
    element.style.height = '100%';
    return element;
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'scroll-service-widget';
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';

    if (this.isDesktopOrWeb()) {
      this.forwardService = this.buildDesktopScrollService();
    } else if (this.isMobile()) {
      this.forwardService = this.buildMobileScrollService();
    } else {
      throw new Error('Unsupported platform');
    }

    container.appendChild(this.forwardService.getElement());
    return container;
  }

  private buildDesktopScrollService(): DesktopScrollService {
    return new DesktopScrollService({
      editorState: this.editorState,
      editorScrollController: this.props.editorScrollController,
      child: this.props.child,
    });
  }

  private buildMobileScrollService(): MobileScrollService {
    return new MobileScrollService({
      editorState: this.editorState,
      editorScrollController: this.props.editorScrollController,
      child: this.props.child,
    });
  }

  private isDesktopOrWeb(): boolean {
    return !(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }

  private isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private onSelectionChanged(): void {
    // Should auto scroll after the cursor or selection updated
    const selection = this.editorState.selection;
    if (!selection || 
        [SelectionUpdateReason.selectAll, SelectionUpdateReason.searchHighlight]
          .includes(this.editorState.selectionUpdateReason)) {
      return;
    }

    // Use setTimeout to simulate post-frame callback
    setTimeout(() => {
      const selectionRects = this.editorState.selectionRects();
      const endTouchPoint = selectionRects[selectionRects.length - 1];

      if (this.isMobile()) {
        // Soft keyboard handling
        // Workaround: wait for the soft keyboard to show up
        const duration = KeyboardHeightObserver.currentKeyboardHeight === 0 ? 250 : 0;

        setTimeout(() => {
          if (!endTouchPoint) {
            this.jumpTo(selection.end.path[0]);
          } else {
            this.startAutoScroll(
              { x: endTouchPoint.right, y: endTouchPoint.bottom },
              {
                edgeOffset: this.editorState.autoScrollEdgeOffset,
                duration: 0,
              }
            );
          }
        }, duration);
      } else {
        if (!endTouchPoint) {
          // Check if the selection is valid
          const node = this.editorState.getNodeAtPath(selection.end.path);
          if (!node) return;
          
          this.jumpTo(selection.end.path[0]);
        } else {
          this.startAutoScroll(
            { x: endTouchPoint.right, y: endTouchPoint.bottom },
            {
              edgeOffset: this.editorState.autoScrollEdgeOffset,
              duration: 0,
            }
          );
        }
      }
    }, 0);
  }

  // Delegate all methods to the forward service
  disable(): void {
    this.forwardService.disable();
  }

  get dy(): number {
    return this.forwardService.dy;
  }

  enable(): void {
    this.forwardService.enable();
  }

  get maxScrollExtent(): number {
    return this.forwardService.maxScrollExtent;
  }

  get minScrollExtent(): number {
    return this.forwardService.minScrollExtent;
  }

  get onePageHeight(): number | undefined {
    return this.forwardService.onePageHeight;
  }

  get page(): number | undefined {
    return this.forwardService.page;
  }

  scrollTo(dy: number, options: { duration?: number } = {}): void {
    this.forwardService.scrollTo(dy, options);
  }

  jumpTo(index: number): void {
    this.forwardService.jumpTo(index);
  }

  jumpToTop(): void {
    this.forwardService.jumpToTop();
  }

  jumpToBottom(): void {
    this.forwardService.jumpToBottom();
  }

  startAutoScroll(
    offset: { x: number; y: number },
    options: {
      edgeOffset?: number;
      direction?: 'up' | 'down' | 'left' | 'right';
      duration?: number;
    } = {}
  ): void {
    this.forwardService.startAutoScroll(offset, options);
  }

  stopAutoScroll(): void {
    this.forwardService.stopAutoScroll();
  }

  goBallistic(velocity: number): void {
    this.forwardService.goBallistic(velocity);
  }

  get scrollController(): HTMLElement {
    return this.scrollController;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.editorState.selectionNotifier.removeListener(this.onSelectionChanged);
    this.forwardService.destroy?.();
  }
}