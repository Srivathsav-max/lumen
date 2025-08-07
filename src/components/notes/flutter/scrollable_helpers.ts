// Scrollable helpers for scroll behavior and auto-scrolling functionality
export interface Tolerance {
  distance: number;
  time: number;
  velocity: number;
}

export enum AxisDirection {
  up = 'up',
  down = 'down',
  left = 'left',
  right = 'right'
}

export enum Axis {
  horizontal = 'horizontal',
  vertical = 'vertical'
}

export enum Clip {
  none = 'none',
  hardEdge = 'hardEdge',
  antiAlias = 'antiAlias',
  antiAliasWithSaveLayer = 'antiAliasWithSaveLayer'
}

export interface ScrollController {
  hasClients: boolean;
  positions: ScrollPosition[];
  position: ScrollPosition;
}

export interface ScrollPhysics {
  shouldAcceptUserOffset(position: ScrollPosition): boolean;
}

export interface ScrollPosition {
  pixels: number;
  viewportDimension: number;
  maxScrollExtent: number;
  minScrollExtent: number;
  hasPixels: boolean;
  context: { notificationContext: any };
  jumpTo(pixels: number): void;
  animateTo(pixels: number, options: { duration: number; curve: string }): Promise<void>;
  moveTo(pixels: number, options: { duration: number; curve: string }): void;
}

/**
 * Describes the aspects of a Scrollable widget to inform inherited widgets
 * like ScrollBehavior for decorating.
 */
export class ScrollableDetails {
  readonly direction: AxisDirection;
  readonly controller?: ScrollController;
  readonly physics?: ScrollPhysics;
  readonly decorationClipBehavior?: Clip;

  constructor(options: {
    direction: AxisDirection;
    controller?: ScrollController;
    physics?: ScrollPhysics;
    decorationClipBehavior?: Clip;
  }) {
    this.direction = options.direction;
    this.controller = options.controller;
    this.physics = options.physics;
    this.decorationClipBehavior = options.decorationClipBehavior;
  }

  static vertical(options: {
    reverse?: boolean;
    controller?: ScrollController;
    physics?: ScrollPhysics;
    decorationClipBehavior?: Clip;
  } = {}): ScrollableDetails {
    const { reverse = false, controller, physics, decorationClipBehavior } = options;
    return new ScrollableDetails({
      direction: reverse ? AxisDirection.up : AxisDirection.down,
      controller,
      physics,
      decorationClipBehavior
    });
  }

  static horizontal(options: {
    reverse?: boolean;
    controller?: ScrollController;
    physics?: ScrollPhysics;
    decorationClipBehavior?: Clip;
  } = {}): ScrollableDetails {
    const { reverse = false, controller, physics, decorationClipBehavior } = options;
    return new ScrollableDetails({
      direction: reverse ? AxisDirection.left : AxisDirection.right,
      controller,
      physics,
      decorationClipBehavior
    });
  }

  copyWith(options: {
    direction?: AxisDirection;
    controller?: ScrollController;
    physics?: ScrollPhysics;
    decorationClipBehavior?: Clip;
  } = {}): ScrollableDetails {
    return new ScrollableDetails({
      direction: options.direction ?? this.direction,
      controller: options.controller ?? this.controller,
      physics: options.physics ?? this.physics,
      decorationClipBehavior: options.decorationClipBehavior ?? this.decorationClipBehavior
    });
  }

  toString(): string {
    const description: string[] = [];
    description.push(`axisDirection: ${this.direction}`);

    if (this.controller) description.push(`scroll controller: ${this.controller}`);
    if (this.physics) description.push(`scroll physics: ${this.physics}`);
    if (this.decorationClipBehavior) description.push(`decorationClipBehavior: ${this.decorationClipBehavior}`);

    return `ScrollableDetails(${description.join(', ')})`;
  }

  equals(other: ScrollableDetails): boolean {
    return this.direction === other.direction &&
           this.controller === other.controller &&
           this.physics === other.physics &&
           this.decorationClipBehavior === other.decorationClipBehavior;
  }
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  topLeft: Offset;
  bottomRight: Offset;
  translate(dx: number, dy: number): Rect;
}

export interface Offset {
  dx: number;
  dy: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ScrollableState {
  axisDirection: AxisDirection;
  position: ScrollPosition;
  context: any;
  deltaToScrollOrigin: Offset;
  resolvedPhysics?: ScrollPhysics;
}

/**
 * An auto scroller that scrolls the scrollable if a drag gesture drags close to its edge.
 * The scroll velocity is controlled by the velocityScalar.
 */
export class EdgeDraggingAutoScroller {
  private static readonly _kDefaultAutoScrollVelocityScalar = 7;
  
  private scrollable: ScrollableState;
  private onScrollViewScrolled?: () => void;
  private velocityScalar: number;
  private _dragTargetRelatedToScrollOrigin!: Rect;
  private _scrolling = false;

  constructor(
    scrollable: ScrollableState,
    options: {
      onScrollViewScrolled?: () => void;
      velocityScalar?: number;
    } = {}
  ) {
    this.scrollable = scrollable;
    this.onScrollViewScrolled = options.onScrollViewScrolled;
    this.velocityScalar = options.velocityScalar ?? EdgeDraggingAutoScroller._kDefaultAutoScrollVelocityScalar;
  }

  get scrolling(): boolean {
    return this._scrolling;
  }

  private _offsetExtent(offset: Offset, scrollDirection: Axis): number {
    switch (scrollDirection) {
      case Axis.horizontal:
        return offset.dx;
      case Axis.vertical:
        return offset.dy;
    }
  }

  private _sizeExtent(size: Size, scrollDirection: Axis): number {
    switch (scrollDirection) {
      case Axis.horizontal:
        return size.width;
      case Axis.vertical:
        return size.height;
    }
  }

  private get _axisDirection(): AxisDirection {
    return this.scrollable.axisDirection;
  }

  private get _scrollDirection(): Axis {
    return this.axisDirectionToAxis(this._axisDirection);
  }

  private axisDirectionToAxis(direction: AxisDirection): Axis {
    switch (direction) {
      case AxisDirection.up:
      case AxisDirection.down:
        return Axis.vertical;
      case AxisDirection.left:
      case AxisDirection.right:
        return Axis.horizontal;
    }
  }

  /**
   * Starts the auto scroll if the dragTarget is close to the edge.
   */
  startAutoScrollIfNecessary(dragTarget: Rect, options: { duration?: number } = {}): void {
    const deltaToOrigin = this.scrollable.deltaToScrollOrigin;
    this._dragTargetRelatedToScrollOrigin = dragTarget.translate(deltaToOrigin.dx, deltaToOrigin.dy);
    
    if (this._scrolling) {
      // The change will be picked up in the next scroll
      return;
    }
    
    this._scroll(options);
  }

  /**
   * Stop any ongoing auto scrolling.
   */
  stopAutoScroll(): void {
    this._scrolling = false;
  }

  private async _scroll(options: { duration?: number } = {}): Promise<void> {
    // This would need to be implemented based on your specific scrolling context
    // For now, providing a basic structure
    this._scrolling = true;
    
    const overDragMax = 20.0;
    let newOffset: number | null = null;

    // Calculate scroll offset based on drag position
    // Implementation would depend on your specific scroll context

    if (newOffset == null || Math.abs(newOffset - this.scrollable.position.pixels) < 1.0) {
      this._scrolling = false;
      return;
    }

    const duration = options.duration ?? Math.round(1000 / this.velocityScalar);
    
    if (duration === 0) {
      this.scrollable.position.jumpTo(newOffset);
    } else {
      await this.scrollable.position.animateTo(newOffset, {
        duration,
        curve: 'linear'
      });
    }

    if (this.onScrollViewScrolled) {
      this.onScrollViewScrolled();
    }

    if (this._scrolling) {
      await this._scroll(options);
    }
  }
}

export enum ScrollIncrementType {
  line = 'line',
  page = 'page'
}

export interface ScrollIncrementDetails {
  type: ScrollIncrementType;
  metrics: ScrollPosition;
}

export type ScrollIncrementCalculator = (details: ScrollIncrementDetails) => number;