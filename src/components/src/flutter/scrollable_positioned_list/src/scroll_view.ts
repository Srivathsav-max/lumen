import { CustomScrollView, BuildContext, ViewportOffset, AxisDirection, Widget, Key, Axis, ScrollController, ScrollPhysics, DragStartBehavior } from '../../../../flutter/widgets';
import { CustomShrinkWrappingViewport } from './wrapping';
import { UnboundedViewport } from './viewport';

/**
 * A version of CustomScrollView that allows does not constrict the extents
 * to be within 0 and 1. See CustomScrollView for more information.
 */
export class UnboundedCustomScrollView extends CustomScrollView {
  private readonly _shrinkWrap: boolean;
  // CustomScrollView enforces constraints on CustomScrollView.anchor, so
  // we need our own version.
  private readonly _anchor: number;

  constructor(options: {
    key?: Key;
    scrollDirection?: Axis;
    reverse?: boolean;
    controller?: ScrollController;
    primary?: boolean;
    physics?: ScrollPhysics;
    shrinkWrap?: boolean;
    center?: Key;
    anchor?: number;
    cacheExtent?: number;
    slivers?: Widget[];
    semanticChildCount?: number;
    dragStartBehavior?: DragStartBehavior;
  }) {
    super({
      key: options.key,
      scrollDirection: options.scrollDirection,
      reverse: options.reverse,
      controller: options.controller,
      primary: options.primary,
      physics: options.physics,
      shrinkWrap: false, // Always pass false to super
      center: options.center,
      cacheExtent: options.cacheExtent,
      slivers: options.slivers,
      semanticChildCount: options.semanticChildCount,
      dragStartBehavior: options.dragStartBehavior,
    });
    
    this._shrinkWrap = options.shrinkWrap ?? false;
    this._anchor = options.anchor ?? 0.0;
  }

  get anchor(): number {
    return this._anchor;
  }

  /// Build the viewport.
  protected buildViewport(
    context: BuildContext,
    offset: ViewportOffset,
    axisDirection: AxisDirection,
    slivers: Widget[],
  ): Widget {
    if (this._shrinkWrap) {
      return new CustomShrinkWrappingViewport({
        axisDirection,
        offset,
        slivers,
        cacheExtent: this.cacheExtent,
        center: this.center,
        anchor: this.anchor,
      });
    }
    return new UnboundedViewport({
      axisDirection,
      offset,
      slivers,
      cacheExtent: this.cacheExtent,
      center: this.center,
      anchor: this.anchor,
    });
  }
}