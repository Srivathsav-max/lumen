import { Viewport, RenderViewport, RenderSliver, BuildContext, Key, AxisDirection, ScrollPosition, SliverGeometry, GrowthDirection, CacheExtentStyle, Rect, Axis, Size, ViewportOffset } from '../../../../flutter/rendering';
import { Widget } from '../../../../flutter/widgets';

/**
 * A render object that is bigger on the inside.
 *
 * Version of Viewport with some modifications to how extents are
 * computed to allow scroll extents outside 0 to 1. See Viewport
 * for more information.
 */
export class UnboundedViewport extends Viewport {
  // Viewport enforces constraints on Viewport.anchor, so we need our own
  // version.
  private readonly _anchor: number;

  constructor(options: {
    key?: Key;
    axisDirection?: AxisDirection;
    crossAxisDirection?: AxisDirection;
    anchor?: number;
    offset: ViewportOffset;
    center?: Key;
    cacheExtent?: number;
    slivers?: Widget[];
  }) {
    super({
      key: options.key,
      axisDirection: options.axisDirection,
      crossAxisDirection: options.crossAxisDirection,
      offset: options.offset,
      center: options.center,
      cacheExtent: options.cacheExtent,
      slivers: options.slivers,
    });
    this._anchor = options.anchor ?? 0.0;
  }

  get anchor(): number {
    return this._anchor;
  }

  createRenderObject(context: BuildContext): RenderViewport {
    return new UnboundedRenderViewport({
      axisDirection: this.axisDirection,
      crossAxisDirection: this.crossAxisDirection ?? 
        Viewport.getDefaultCrossAxisDirection(context, this.axisDirection),
      anchor: this.anchor,
      offset: this.offset,
      cacheExtent: this.cacheExtent,
    });
  }
}

/**
 * A render object that is bigger on the inside.
 *
 * Version of RenderViewport with some modifications to how extents are
 * computed to allow scroll extents outside 0 to 1. See RenderViewport
 * for more information.
 *
 * Differences from RenderViewport are marked with a //***** Differences
 * comment.
 */
export class UnboundedRenderViewport extends RenderViewport {
  private static readonly MAX_LAYOUT_CYCLES = 10;

  private _anchor: number;

  // Out-of-band data computed during layout.
  private _minScrollExtent!: number;
  private _maxScrollExtent!: number;
  private _hasVisualOverflow = false;

  /// This value is set during layout based on the CacheExtentStyle.
  ///
  /// When the style is CacheExtentStyle.viewport, it is the main axis extent
  /// of the viewport multiplied by the requested cache extent, which is still
  /// expressed in pixels.
  private _calculatedCacheExtent?: number;

  /// Creates a viewport for RenderSliver objects.
  constructor(options: {
    axisDirection?: AxisDirection;
    crossAxisDirection: AxisDirection;
    offset: ViewportOffset;
    anchor?: number;
    children?: RenderSliver[];
    center?: RenderSliver;
    cacheExtent?: number;
  }) {
    super({
      axisDirection: options.axisDirection,
      crossAxisDirection: options.crossAxisDirection,
      offset: options.offset,
      children: options.children,
      center: options.center,
      cacheExtent: options.cacheExtent,
    });
    this._anchor = options.anchor ?? 0.0;
  }

  get anchor(): number {
    return this._anchor;
  }

  set anchor(value: number) {
    if (value === this._anchor) return;
    this._anchor = value;
    this.markNeedsLayout();
  }

  performResize(): void {
    super.performResize();
    // TODO: Figure out why this override is needed as a result of
    // https://github.com/flutter/flutter/pull/61973 and see if it can be
    // removed somehow.
    switch (this.axis) {
      case Axis.vertical:
        this.offset.applyViewportDimension(this.size.height);
        break;
      case Axis.horizontal:
        this.offset.applyViewportDimension(this.size.width);
        break;
    }
  }

  describeSemanticsClip(child?: RenderSliver): Rect {
    if (this._calculatedCacheExtent === undefined) {
      return this.semanticBounds;
    }

    switch (this.axis) {
      case Axis.vertical:
        return Rect.fromLTRB(
          this.semanticBounds.left,
          this.semanticBounds.top - this._calculatedCacheExtent,
          this.semanticBounds.right,
          this.semanticBounds.bottom + this._calculatedCacheExtent,
        );
      default:
        return Rect.fromLTRB(
          this.semanticBounds.left - this._calculatedCacheExtent,
          this.semanticBounds.top,
          this.semanticBounds.right + this._calculatedCacheExtent,
          this.semanticBounds.bottom,
        );
    }
  }

  performLayout(): void {
    if (!this.center) {
      console.assert(!this.firstChild);
      this._minScrollExtent = 0.0;
      this._maxScrollExtent = 0.0;
      this._hasVisualOverflow = false;
      this.offset.applyContentDimensions(0.0, 0.0);
      return;
    }
    console.assert(this.center.parent === this);

    let mainAxisExtent: number;
    let crossAxisExtent: number;
    switch (this.axis) {
      case Axis.vertical:
        mainAxisExtent = this.size.height;
        crossAxisExtent = this.size.width;
        break;
      case Axis.horizontal:
        mainAxisExtent = this.size.width;
        crossAxisExtent = this.size.height;
        break;
    }

    const centerOffsetAdjustment = this.center.centerOffsetAdjustment;

    let correction: number;
    let count = 0;
    do {
      correction = this._attemptLayout(
        mainAxisExtent,
        crossAxisExtent,
        this.offset.pixels + centerOffsetAdjustment,
      );
      if (correction !== 0.0) {
        this.offset.correctBy(correction);
      } else {
        // *** Difference from RenderViewport.
        const top = this._minScrollExtent + mainAxisExtent * this.anchor;
        const bottom = this._maxScrollExtent - mainAxisExtent * (1.0 - this.anchor);
        const maxScrollOffset = Math.max(Math.min(0.0, top), bottom);
        const minScrollOffset = Math.min(top, maxScrollOffset);
        if (this.offset.applyContentDimensions(minScrollOffset, maxScrollOffset)) {
          break;
        }
        // *** End of difference from RenderViewport.
      }
      count += 1;
    } while (count < UnboundedRenderViewport.MAX_LAYOUT_CYCLES);
    
    console.assert(() => {
      if (count >= UnboundedRenderViewport.MAX_LAYOUT_CYCLES) {
        console.assert(count !== 1);
        throw new Error(
          'A RenderViewport exceeded its maximum number of layout cycles.\\n' +
          'RenderViewport render objects, during layout, can retry if either their ' +
          'slivers or their ViewportOffset decide that the offset should be corrected ' +
          'to take into account information collected during that layout.\\n' +
          `In the case of this RenderViewport object, however, this happened ${count} ` +
          'times and still there was no consensus on the scroll offset. This usually ' +
          'indicates a bug. Specifically, it means that one of the following three ' +
          'problems is being experienced by the RenderViewport object:\\n' +
          ' * One of the RenderSliver children or the ViewportOffset have a bug such' +
          ' that they always think that they need to correct the offset regardless.\\n' +
          ' * Some combination of the RenderSliver children and the ViewportOffset' +
          ' have a bad interaction such that one applies a correction then another' +
          ' applies a reverse correction, leading to an infinite loop of corrections.\\n' +
          ' * There is a pathological case that would eventually resolve, but it is' +
          ' so complicated that it cannot be resolved in any reasonable number of' +
          ' layout passes.'
        );
      }
      return true;
    });
  }

  private _attemptLayout(
    mainAxisExtent: number,
    crossAxisExtent: number,
    correctedOffset: number,
  ): number {
    console.assert(!isNaN(mainAxisExtent));
    console.assert(mainAxisExtent >= 0.0);
    console.assert(isFinite(crossAxisExtent));
    console.assert(crossAxisExtent >= 0.0);
    console.assert(isFinite(correctedOffset));
    
    this._minScrollExtent = 0.0;
    this._maxScrollExtent = 0.0;
    this._hasVisualOverflow = false;

    // centerOffset is the offset from the leading edge of the RenderViewport
    // to the zero scroll offset (the line between the forward slivers and the
    // reverse slivers).
    const centerOffset = mainAxisExtent * this.anchor - correctedOffset;
    const reverseDirectionRemainingPaintExtent = Math.max(0.0, Math.min(centerOffset, mainAxisExtent));
    const forwardDirectionRemainingPaintExtent = Math.max(0.0, Math.min(mainAxisExtent - centerOffset, mainAxisExtent));

    switch (this.cacheExtentStyle) {
      case CacheExtentStyle.pixel:
        this._calculatedCacheExtent = this.cacheExtent;
        break;
      case CacheExtentStyle.viewport:
        this._calculatedCacheExtent = mainAxisExtent * this.cacheExtent!;
        break;
    }

    const fullCacheExtent = mainAxisExtent + 2 * this._calculatedCacheExtent!;
    const centerCacheOffset = centerOffset + this._calculatedCacheExtent!;
    const reverseDirectionRemainingCacheExtent = Math.max(0.0, Math.min(centerCacheOffset, fullCacheExtent));
    const forwardDirectionRemainingCacheExtent = Math.max(0.0, Math.min(fullCacheExtent - centerCacheOffset, fullCacheExtent));

    const leadingNegativeChild = this.childBefore(this.center!);

    if (leadingNegativeChild) {
      // negative scroll offsets
      const result = this.layoutChildSequence({
        child: leadingNegativeChild,
        scrollOffset: Math.max(mainAxisExtent, centerOffset) - mainAxisExtent,
        overlap: 0.0,
        layoutOffset: forwardDirectionRemainingPaintExtent,
        remainingPaintExtent: reverseDirectionRemainingPaintExtent,
        mainAxisExtent,
        crossAxisExtent,
        growthDirection: GrowthDirection.reverse,
        advance: (child) => this.childBefore(child),
        remainingCacheExtent: reverseDirectionRemainingCacheExtent,
        cacheOrigin: Math.max(-this._calculatedCacheExtent!, Math.min(0.0, mainAxisExtent - centerOffset)),
      });
      if (result !== 0.0) return -result;
    }

    // positive scroll offsets
    return this.layoutChildSequence({
      child: this.center,
      scrollOffset: Math.max(0.0, -centerOffset),
      overlap: leadingNegativeChild === null ? Math.min(0.0, -centerOffset) : 0.0,
      layoutOffset: centerOffset >= mainAxisExtent
        ? centerOffset
        : reverseDirectionRemainingPaintExtent,
      remainingPaintExtent: forwardDirectionRemainingPaintExtent,
      mainAxisExtent,
      crossAxisExtent,
      growthDirection: GrowthDirection.forward,
      advance: (child) => this.childAfter(child),
      remainingCacheExtent: forwardDirectionRemainingCacheExtent,
      cacheOrigin: Math.max(-this._calculatedCacheExtent!, Math.min(0.0, centerOffset)),
    });
  }

  get hasVisualOverflow(): boolean {
    return this._hasVisualOverflow;
  }

  updateOutOfBandData(
    growthDirection: GrowthDirection,
    childLayoutGeometry: SliverGeometry,
  ): void {
    switch (growthDirection) {
      case GrowthDirection.forward:
        this._maxScrollExtent += childLayoutGeometry.scrollExtent;
        break;
      case GrowthDirection.reverse:
        this._minScrollExtent -= childLayoutGeometry.scrollExtent;
        break;
    }
    if (childLayoutGeometry.hasVisualOverflow) {
      this._hasVisualOverflow = true;
    }
  }
}