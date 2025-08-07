import { EdgeDraggingAutoScroller } from '../../../../flutter/scrollable_helpers';

export interface AutoScrollerService {
  startAutoScroll(
    offset: { x: number; y: number },
    options?: {
      edgeOffset?: number;
      direction?: 'up' | 'down' | 'left' | 'right';
      duration?: number;
    }
  ): void;
  
  stopAutoScroll(): void;
}

export class AutoScroller extends EdgeDraggingAutoScroller implements AutoScrollerService {
  private static readonly DEFAULT_AUTO_SCROLL_VELOCITY_SCALAR = 7;
  private lastOffset?: { x: number; y: number };

  constructor(
    scrollable: HTMLElement,
    options?: {
      onScrollViewScrolled?: () => void;
      velocityScalar?: number;
    }
  ) {
    super(scrollable, {
      onScrollViewScrolled: options?.onScrollViewScrolled,
      velocityScalar: options?.velocityScalar ?? AutoScroller.DEFAULT_AUTO_SCROLL_VELOCITY_SCALAR,
    });
  }

  startAutoScroll(
    offset: { x: number; y: number },
    options: {
      edgeOffset?: number;
      direction?: 'up' | 'down' | 'left' | 'right';
      duration?: number;
    } = {}
  ): void {
    const { edgeOffset = 200, direction, duration } = options;

    if (direction === 'up') {
      return this.startAutoScrollIfNecessary(
        {
          left: offset.x,
          top: offset.y,
          width: 1,
          height: edgeOffset,
        },
        duration
      );
    }

    this.lastOffset = offset;
    const dragTarget = {
      left: offset.x - edgeOffset / 2,
      top: offset.y - edgeOffset / 2,
      width: edgeOffset,
      height: edgeOffset,
    };

    this.startAutoScrollIfNecessary(dragTarget, duration);
  }

  stopAutoScroll(): void {
    this.lastOffset = undefined;
    super.stopAutoScroll();
  }

  continueToAutoScroll(): void {
    if (this.lastOffset) {
      this.startAutoScroll(this.lastOffset);
    }
  }
}