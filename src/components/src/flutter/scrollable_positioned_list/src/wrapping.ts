import { MultiChildRenderObjectWidget, RenderSliver, BuildContext, Key, AxisDirection, ViewportOffset, CacheExtentStyle, Clip, Widget, Element, MultiChildRenderObjectElement, ElementVisitor, DiagnosticPropertiesBuilder, EnumProperty, DoubleProperty, DiagnosticsProperty, SemanticsTag, RenderObject, SliverPhysicalContainerParentData, GrowthDirection, RenderViewportBase, BoxConstraints, Size, Axis, SliverGeometry, FlutterError, ErrorSummary, ErrorDescription, ErrorHint, DiagnosticsNode } from '../../../../flutter/widgets';
import { Viewport } from '../../../../flutter/rendering';
import { Directionality, TextDirection, debugCheckHasDirectionality, textDirectionToAxisDirection } from '../../../../flutter/material';

/**
 * A widget that is bigger on the inside and shrink wraps its children in the
 * main axis.
 *
 * ShrinkWrappingViewport displays a subset of its children according to its
 * own dimensions and the given offset. As the offset varies, different
 * children are visible through the viewport.
 *
 * ShrinkWrappingViewport differs from Viewport in that Viewport expands
 * to fill the main axis whereas ShrinkWrappingViewport sizes itself to match
 * its children in the main axis. This shrink wrapping behavior is expensive
 * because the children, and hence the viewport, could potentially change size
 * whenever the offset changes (e.g., because of a collapsing header).
 *
 * ShrinkWrappingViewport cannot contain box children directly. Instead, use
 * a SliverList, SliverFixedExtentList, SliverGrid, or a
 * SliverToBoxAdapter, for example.
 *
 * See also:
 *
 *  * ListView, PageView, GridView, and CustomScrollView, which combine
 *    Scrollable and ShrinkWrappingViewport into widgets that are easier to
 *    use.
 *  * SliverToBoxAdapter, which allows a box widget to be placed inside a
 *    sliver context (the opposite of this widget).
 *  * Viewport, a viewport that does not shrink-wrap its contents.
 */
export class CustomShrinkWrappingViewport extends CustomViewport {
  // Viewport enforces constraints on Viewport.anchor, so we need our own
  // version.
  private readonly _anchor: number;

  /// Creates a widget that is bigger on the inside and shrink wraps its
  /// children in the main axis.
  ///
  /// The viewport listens to the offset, which means you do not need to
  /// rebuild this widget when the offset changes.
  ///
  /// The offset argument must not be null.
  constructor(options: {
    key?: Key;
    axisDirection?: AxisDirection;
    crossAxisDirection?: AxisDirection;
    anchor?: number;
    offset: ViewportOffset;
    children?: RenderSliver[];
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

  createRenderObject(context: BuildContext): CustomRenderShrinkWrappingViewport {
    return new CustomRenderShrinkWrappingViewport({
      axisDirection: this.axisDirection,
      crossAxisDirection: this.crossAxisDirection ??
        Viewport.getDefaultCrossAxisDirection(context, this.axisDirection),
      offset: this.offset,
      anchor: this.anchor,
      cacheExtent: this.cacheExtent,
    });
  }

  updateRenderObject(
    context: BuildContext,
    renderObject: CustomRenderShrinkWrappingViewport,
  ): void {
    renderObject.axisDirection = this.axisDirection;
    renderObject.crossAxisDirection = this.crossAxisDirection ??
      Viewport.getDefaultCrossAxisDirection(context, this.axisDirection);
    renderObject.anchor = this.anchor;
    renderObject.offset = this.offset;
    renderObject.cacheExtent = this.cacheExtent;
    renderObject.cacheExtentStyle = this.cacheExtentStyle;
    renderObject.clipBehavior = this.clipBehavior;
  }
}

/**
 * A render object that is bigger on the inside and shrink wraps its children
 * in the main axis.
 *
 * RenderShrinkWrappingViewport displays a subset of its children according
 * to its own dimensions and the given offset. As the offset varies, different
 * children are visible through the viewport.
 *
 * RenderShrinkWrappingViewport differs from RenderViewport in that
 * RenderViewport expands to fill the main axis whereas
 * RenderShrinkWrappingViewport sizes itself to match its children in the
 * main axis. This shrink wrapping behavior is expensive because the children,
 * and hence the viewport, could potentially change size whenever the offset
 * changes (e.g., because of a collapsing header).
 *
 * RenderShrinkWrappingViewport cannot contain RenderBox children directly.
 * Instead, use a RenderSliverList, RenderSliverFixedExtentList,
 * RenderSliverGrid, or a RenderSliverToBoxAdapter, for example.
 *
 * See also:
 *
 *  * RenderViewport, a viewport that does not shrink-wrap its contents.
 *  * RenderSliver, which explains more about the Sliver protocol.
 *  * RenderBox, which explains more about the Box protocol.
 *  * RenderSliverToBoxAdapter, which allows a RenderBox object to be
 *    placed inside a RenderSliver (the opposite of this class).
 */
export class CustomRenderShrinkWrappingViewport extends CustomRenderViewport {
  private _anchor: number;

  /// Creates a viewport (for RenderSliver objects) that shrink-wraps its
  /// contents.
  ///
  /// The offset must be specified. For testing purposes, consider passing a
  /// ViewportOffset.zero or ViewportOffset.fixed.
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

  get sizedByParent(): boolean {
    return false;
  }

  lastMainAxisExtent = -1;

  set anchor(value: number) {
    if (value === this._anchor) return;
    this._anchor = value;
    this.markNeedsLayout();
  }

  private _shrinkWrapExtent!: number;

  /// This value is set during layout based on the CacheExtentStyle.
  ///
  /// When the style is CacheExtentStyle.viewport, it is the main axis extent
  /// of the viewport multiplied by the requested cache extent, which is still
  /// expressed in pixels.
  private _calculatedCacheExtent?: number;

  /// While List in a wrapping container, eg. ListView，the mainAxisExtent will
  /// be infinite. This time need to change mainAxisExtent to this value.
  private readonly _maxMainAxisExtent = Number.MAX_SAFE_INTEGER;

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

    const constraints = this.constraints;
    if (!this.firstChild) {
      switch (this.axis) {
        case Axis.vertical:
          console.assert(constraints.hasBoundedWidth);
          this.size = new Size(constraints.maxWidth, constraints.minHeight);
          break;
        case Axis.horizontal:
          console.assert(constraints.hasBoundedHeight);
          this.size = new Size(constraints.minWidth, constraints.maxHeight);
          break;
      }
      this.offset.applyViewportDimension(0.0);
      this._maxScrollExtent = 0.0;
      this._shrinkWrapExtent = 0.0;
      this._hasVisualOverflow = false;
      this.offset.applyContentDimensions(0.0, 0.0);
      return;
    }

    let mainAxisExtent: number;
    const crossAxisExtent: number;
    switch (this.axis) {
      case Axis.vertical:
        console.assert(constraints.hasBoundedWidth);
        mainAxisExtent = constraints.maxHeight;
        crossAxisExtent = constraints.maxWidth;
        break;
      case Axis.horizontal:
        console.assert(constraints.hasBoundedHeight);
        mainAxisExtent = constraints.maxWidth;
        crossAxisExtent = constraints.maxHeight;
        break;
    }

    if (!isFinite(mainAxisExtent)) {
      mainAxisExtent = this._maxMainAxisExtent;
    }

    const centerOffsetAdjustment = this.center.centerOffsetAdjustment;

    let correction: number;
    let effectiveExtent: number;
    do {
      correction = this._attemptLayout(
        mainAxisExtent,
        crossAxisExtent,
        this.offset.pixels + centerOffsetAdjustment,
      );
      if (correction !== 0.0) {
        this.offset.correctBy(correction);
      } else {
        switch (this.axis) {
          case Axis.vertical:
            effectiveExtent = constraints.constrainHeight(this._shrinkWrapExtent);
            break;
          case Axis.horizontal:
            effectiveExtent = constraints.constrainWidth(this._shrinkWrapExtent);
            break;
        }
        // *** Difference from RenderViewport.
        const top = this._minScrollExtent + mainAxisExtent * this.anchor;
        const bottom = this._maxScrollExtent - mainAxisExtent * (1.0 - this.anchor);

        const maxScrollOffset = Math.max(Math.min(0.0, top), bottom);
        const minScrollOffset = Math.min(top, maxScrollOffset);

        const didAcceptViewportDimension = this.offset.applyViewportDimension(effectiveExtent);
        const didAcceptContentDimension = this.offset.applyContentDimensions(minScrollOffset, maxScrollOffset);
        if (didAcceptViewportDimension && didAcceptContentDimension) {
          break;
        }
      }
    } while (true);
    
    switch (this.axis) {
      case Axis.vertical:
        this.size = constraints.constrainDimensions(crossAxisExtent, effectiveExtent);
        break;
      case Axis.horizontal:
        this.size = constraints.constrainDimensions(effectiveExtent, crossAxisExtent);
        break;
    }
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
    this._shrinkWrapExtent = 0.0;

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
    this._shrinkWrapExtent += childLayoutGeometry.maxPaintExtent;
    this.growSize = this._shrinkWrapExtent;
  }

  labelForChild(index: number): string {
    return `child ${index}`;
  }
}

/**
 * A widget that is bigger on the inside.
 *
 * Viewport is the visual workhorse of the scrolling machinery. It displays a
 * subset of its children according to its own dimensions and the given
 * offset. As the offset varies, different children are visible through
 * the viewport.
 *
 * Viewport hosts a bidirectional list of slivers, anchored on a center
 * sliver, which is placed at the zero scroll offset. The center widget is
 * displayed in the viewport according to the anchor property.
 *
 * Slivers that are earlier in the child list than center are displayed in
 * reverse order in the reverse axisDirection starting from the center. For
 * example, if the axisDirection is AxisDirection.down, the first sliver
 * before center is placed above the center. The slivers that are later in
 * the child list than center are placed in order in the axisDirection. For
 * example, in the preceding scenario, the first sliver after center is
 * placed below the center.
 *
 * Viewport cannot contain box children directly. Instead, use a
 * SliverList, SliverFixedExtentList, SliverGrid, or a
 * SliverToBoxAdapter, for example.
 *
 * See also:
 *
 *  * ListView, PageView, GridView, and CustomScrollView, which combine
 *    Scrollable and Viewport into widgets that are easier to use.
 *  * SliverToBoxAdapter, which allows a box widget to be placed inside a
 *    sliver context (the opposite of this widget).
 *  * ShrinkWrappingViewport, a variant of Viewport that shrink-wraps its
 *    contents along the main axis.
 */
export abstract class CustomViewport extends MultiChildRenderObjectWidget {
  /// The direction in which the offset's ViewportOffset.pixels increases.
  ///
  /// For example, if the axisDirection is AxisDirection.down, a scroll
  /// offset of zero is at the top of the viewport and increases towards the
  /// bottom of the viewport.
  readonly axisDirection: AxisDirection;

  /// The direction in which child should be laid out in the cross axis.
  ///
  /// If the axisDirection is AxisDirection.down or AxisDirection.up, this
  /// property defaults to AxisDirection.left if the ambient Directionality
  /// is TextDirection.rtl and AxisDirection.right if the ambient
  /// Directionality is TextDirection.ltr.
  ///
  /// If the axisDirection is AxisDirection.left or AxisDirection.right,
  /// this property defaults to AxisDirection.down.
  readonly crossAxisDirection?: AxisDirection;

  /// The relative position of the zero scroll offset.
  ///
  /// For example, if anchor is 0.5 and the axisDirection is
  /// AxisDirection.down or AxisDirection.up, then the zero scroll offset is
  /// vertically centered within the viewport. If the anchor is 1.0, and the
  /// axisDirection is AxisDirection.right, then the zero scroll offset is
  /// on the left edge of the viewport.
  readonly anchor: number;

  /// Which part of the content inside the viewport should be visible.
  ///
  /// The ViewportOffset.pixels value determines the scroll offset that the
  /// viewport uses to select which part of its content to display. As the user
  /// scrolls the viewport, this value changes, which changes the content that
  /// is displayed.
  ///
  /// Typically a ScrollPosition.
  readonly offset: ViewportOffset;

  /// The first child in the GrowthDirection.forward growth direction.
  ///
  /// Children after center will be placed in the axisDirection relative to
  /// the center. Children before center will be placed in the opposite of
  /// the axisDirection relative to the center.
  ///
  /// The center must be the key of a child of the viewport.
  readonly center?: Key;

  /// See RenderViewportBase.cacheExtent
  ///
  /// See also:
  ///
  ///  * cacheExtentStyle, which controls the units of the cacheExtent.
  readonly cacheExtent?: number;

  /// See RenderViewportBase.cacheExtentStyle
  readonly cacheExtentStyle: CacheExtentStyle;

  /// See Material.clipBehavior
  ///
  /// Defaults to Clip.hardEdge.
  readonly clipBehavior: Clip;

  /// Creates a widget that is bigger on the inside.
  ///
  /// The viewport listens to the offset, which means you do not need to
  /// rebuild this widget when the offset changes.
  ///
  /// The offset argument must not be null.
  ///
  /// The cacheExtent must be specified if the cacheExtentStyle is
  /// not CacheExtentStyle.pixel.
  constructor(options: {
    key?: Key;
    axisDirection?: AxisDirection;
    crossAxisDirection?: AxisDirection;
    anchor?: number;
    offset: ViewportOffset;
    center?: Key;
    cacheExtent?: number;
    cacheExtentStyle?: CacheExtentStyle;
    clipBehavior?: Clip;
    slivers?: Widget[];
  }) {
    console.assert(
      options.center === undefined ||
      (options.slivers ?? []).filter((child: Widget) => child.key === options.center).length === 1,
    );
    console.assert(
      options.cacheExtentStyle !== CacheExtentStyle.viewport || options.cacheExtent !== undefined,
    );
    
    super({ children: options.slivers ?? [] });
    this.axisDirection = options.axisDirection ?? AxisDirection.down;
    this.crossAxisDirection = options.crossAxisDirection;
    this.anchor = options.anchor ?? 0.0;
    this.offset = options.offset;
    this.center = options.center;
    this.cacheExtent = options.cacheExtent;
    this.cacheExtentStyle = options.cacheExtentStyle ?? CacheExtentStyle.pixel;
    this.clipBehavior = options.clipBehavior ?? Clip.hardEdge;
  }

  /// Given a BuildContext and an AxisDirection, determine the correct cross
  /// axis direction.
  ///
  /// This depends on the Directionality if the `axisDirection` is vertical;
  /// otherwise, the default cross axis direction is downwards.
  static getDefaultCrossAxisDirection(
    context: BuildContext,
    axisDirection: AxisDirection,
  ): AxisDirection {
    switch (axisDirection) {
      case AxisDirection.up:
        console.assert(
          debugCheckHasDirectionality(
            context,
            'to determine the cross-axis direction when the viewport has an \\'up\\' axisDirection',
            'Alternatively, consider specifying the \\'crossAxisDirection\\' argument on the Viewport.',
          ),
        );
        return textDirectionToAxisDirection(Directionality.of(context));
      case AxisDirection.right:
        return AxisDirection.down;
      case AxisDirection.down:
        console.assert(
          debugCheckHasDirectionality(
            context,
            'to determine the cross-axis direction when the viewport has a \\'down\\' axisDirection',
            'Alternatively, consider specifying the \\'crossAxisDirection\\' argument on the Viewport.',
          ),
        );
        return textDirectionToAxisDirection(Directionality.of(context));
      case AxisDirection.left:
        return AxisDirection.down;
    }
  }

  abstract createRenderObject(context: BuildContext): CustomRenderViewport;

  createElement(): ViewportElement {
    return new ViewportElement(this);
  }

  debugFillProperties(properties: DiagnosticPropertiesBuilder): void {
    super.debugFillProperties(properties);
    properties.add(new EnumProperty<AxisDirection>('axisDirection', this.axisDirection));
    properties.add(
      new EnumProperty<AxisDirection>(
        'crossAxisDirection',
        this.crossAxisDirection,
        { defaultValue: undefined },
      ),
    );
    properties.add(new DoubleProperty('anchor', this.anchor));
    properties.add(new DiagnosticsProperty<ViewportOffset>('offset', this.offset));
    if (this.center) {
      properties.add(new DiagnosticsProperty<Key>('center', this.center));
    } else if (this.children.length > 0 && this.children[0].key) {
      properties.add(
        new DiagnosticsProperty<Key>(
          'center',
          this.children[0].key,
          { tooltip: 'implicit' },
        ),
      );
    }
    properties.add(new DiagnosticsProperty<number>('cacheExtent', this.cacheExtent));
    properties.add(
      new DiagnosticsProperty<CacheExtentStyle>(
        'cacheExtentStyle',
        this.cacheExtentStyle,
      ),
    );
  }
}

export class ViewportElement extends MultiChildRenderObjectElement {
  /// Creates an element that uses the given widget as its configuration.
  constructor(widget: CustomViewport) {
    super(widget);
  }

  get widget(): CustomViewport {
    return super.widget as CustomViewport;
  }

  get renderObject(): CustomRenderViewport {
    return super.renderObject as CustomRenderViewport;
  }

  mount(parent?: Element, newSlot?: any): void {
    super.mount(parent, newSlot);
    this._updateCenter();
  }

  update(newWidget: MultiChildRenderObjectWidget): void {
    super.update(newWidget);
    this._updateCenter();
  }

  private _updateCenter(): void {
    if (this.widget.center) {
      this.renderObject.center = this.children
        .find((element: Element) => element.widget.key === this.widget.center)
        ?.renderObject as RenderSliver | undefined;
    } else if (this.children.length > 0) {
      this.renderObject.center = this.children[0].renderObject as RenderSliver | undefined;
    } else {
      this.renderObject.center = undefined;
    }
  }

  debugVisitOnstageChildren(visitor: ElementVisitor): void {
    this.children
      .filter((e: Element) => {
        const renderSliver = e.renderObject! as RenderSliver;
        return renderSliver.geometry!.visible;
      })
      .forEach(visitor);
  }
}

export class CustomSliverPhysicalContainerParentData extends SliverPhysicalContainerParentData {
  /// The position of the child relative to the zero scroll offset.
  ///
  /// The number of pixels from from the zero scroll offset of the parent sliver
  /// (the line at which its SliverConstraints.scrollOffset is zero) to the
  /// side of the child closest to that offset. A layoutOffset can be null
  /// when it cannot be determined. The value will be set after layout.
  ///
  /// In a typical list, this does not change as the parent is scrolled.
  ///
  /// Defaults to null.
  layoutOffset?: number;

  growthDirection?: GrowthDirection;
}

/**
 * A render object that is bigger on the inside.
 *
 * RenderViewport is the visual workhorse of the scrolling machinery. It
 * displays a subset of its children according to its own dimensions and the
 * given offset. As the offset varies, different children are visible through
 * the viewport.
 *
 * RenderViewport hosts a bidirectional list of slivers, anchored on a
 * center sliver, which is placed at the zero scroll offset. The center
 * widget is displayed in the viewport according to the anchor property.
 *
 * Slivers that are earlier in the child list than center are displayed in
 * reverse order in the reverse axisDirection starting from the center. For
 * example, if the axisDirection is AxisDirection.down, the first sliver
 * before center is placed above the center. The slivers that are later in
 * the child list than center are placed in order in the axisDirection. For
 * example, in the preceding scenario, the first sliver after center is
 * placed below the center.
 *
 * RenderViewport cannot contain RenderBox children directly. Instead, use
 * a RenderSliverList, RenderSliverFixedExtentList, RenderSliverGrid, or
 * a RenderSliverToBoxAdapter, for example.
 *
 * See also:
 *
 *  * RenderSliver, which explains more about the Sliver protocol.
 *  * RenderBox, which explains more about the Box protocol.
 *  * RenderSliverToBoxAdapter, which allows a RenderBox object to be
 *    placed inside a RenderSliver (the opposite of this class).
 *  * RenderShrinkWrappingViewport, a variant of RenderViewport that
 *    shrink-wraps its contents along the main axis.
 */
export abstract class CustomRenderViewport extends RenderViewportBase<CustomSliverPhysicalContainerParentData> {
  /// If a RenderAbstractViewport overrides
  /// RenderObject.describeSemanticsConfiguration to add the SemanticsTag
  /// useTwoPaneSemantics to its SemanticsConfiguration, two semantics nodes
  /// will be used to represent the viewport with its associated scrolling
  /// actions in the semantics tree.
  ///
  /// Two semantics nodes (an inner and an outer node) are necessary to exclude
  /// certain child nodes (via the excludeFromScrolling tag) from the
  /// scrollable area for semantic purposes: The SemanticsNodes of children
  /// that should be excluded from scrolling will be attached to the outer node.
  /// The semantic scrolling actions and the SemanticsNodes of scrollable
  /// children will be attached to the inner node, which itself is a child of
  /// the outer node.
  ///
  /// See also:
  ///
  /// * RenderViewportBase.describeSemanticsConfiguration, which adds this
  ///   tag to its SemanticsConfiguration.
  static readonly useTwoPaneSemantics = new SemanticsTag('RenderViewport.twoPane');

  /// When a top-level SemanticsNode below a RenderAbstractViewport is
  /// tagged with excludeFromScrolling it will not be part of the scrolling
  /// area for semantic purposes.
  ///
  /// This behavior is only active if the RenderAbstractViewport
  /// tagged its SemanticsConfiguration with useTwoPaneSemantics.
  /// Otherwise, the excludeFromScrolling tag is ignored.
  ///
  /// As an example, a RenderSliver that stays on the screen within a
  /// Scrollable even though the user has scrolled past it (e.g. a pinned app
  /// bar) can tag its SemanticsNode with excludeFromScrolling to indicate
  /// that it should no longer be considered for semantic actions related to
  /// scrolling.
  static readonly excludeFromScrolling = new SemanticsTag('RenderViewport.excludeFromScrolling');

  private _center?: RenderSliver;

  /// Creates a viewport for RenderSliver objects.
  ///
  /// If the center is not specified, then the first child in the `children`
  /// list, if any, is used.
  ///
  /// The offset must be specified. For testing purposes, consider passing a
  /// ViewportOffset.zero or ViewportOffset.fixed.
  constructor(options: {
    axisDirection?: AxisDirection;
    crossAxisDirection: AxisDirection;
    offset: ViewportOffset;
    anchor?: number;
    children?: RenderSliver[];
    center?: RenderSliver;
    cacheExtent?: number;
    cacheExtentStyle?: CacheExtentStyle;
    clipBehavior?: Clip;
  }) {
    console.assert((options.anchor ?? 0.0) >= 0.0 && (options.anchor ?? 0.0) <= 1.0);
    console.assert(
      options.cacheExtentStyle !== CacheExtentStyle.viewport || options.cacheExtent !== undefined,
    );
    
    super({
      axisDirection: options.axisDirection,
      crossAxisDirection: options.crossAxisDirection,
      offset: options.offset,
      cacheExtent: options.cacheExtent,
      cacheExtentStyle: options.cacheExtentStyle,
      clipBehavior: options.clipBehavior,
    });
    
    this._center = options.center;
    this.addAll(options.children);
    if (!options.center && this.firstChild) {
      this._center = this.firstChild;
    }
  }

  setupParentData(child: RenderObject): void {
    if (!(child.parentData instanceof CustomSliverPhysicalContainerParentData)) {
      child.parentData = new CustomSliverPhysicalContainerParentData();
    }
  }

  /// The relative position of the zero scroll offset.
  ///
  /// For example, if anchor is 0.5 and the axisDirection is
  /// AxisDirection.down or AxisDirection.up, then the zero scroll offset is
  /// vertically centered within the viewport. If the anchor is 1.0, and the
  /// axisDirection is AxisDirection.right, then the zero scroll offset is
  /// on the left edge of the viewport.
  abstract get anchor(): number;

  abstract set anchor(value: number);

  /// The first child in the GrowthDirection.forward growth direction.
  ///
  /// This child that will be at the position defined by anchor when the
  /// ViewportOffset.pixels of offset is `0`.
  ///
  /// Children after center will be placed in the axisDirection relative to
  /// the center. Children before center will be placed in the opposite of
  /// the axisDirection relative to the center.
  ///
  /// The center must be a child of the viewport.
  get center(): RenderSliver | undefined {
    return this._center;
  }

  set center(value: RenderSliver | undefined) {
    if (value === this._center) return;
    this._center = value;
    this.markNeedsLayout();
  }

  get sizedByParent(): boolean {
    return true;
  }

  computeDryLayout(constraints: BoxConstraints): Size {
    console.assert(() => {
      if (!constraints.hasBoundedHeight || !constraints.hasBoundedWidth) {
        switch (this.axis) {
          case Axis.vertical:
            if (!constraints.hasBoundedHeight) {
              throw new FlutterError([
                new ErrorSummary('Vertical viewport was given unbounded height.'),
                new ErrorDescription(
                  'Viewports expand in the scrolling direction to fill their container. ' +
                  'In this case, a vertical viewport was given an unlimited amount of ' +
                  'vertical space in which to expand. This situation typically happens ' +
                  'when a scrollable widget is nested inside another scrollable widget.'
                ),
                new ErrorHint(
                  'If this widget is always nested in a scrollable widget there ' +
                  'is no need to use a viewport because there will always be enough ' +
                  'vertical space for the children. In this case, consider using a ' +
                  'Column instead. Otherwise, consider using the "shrinkWrap" property ' +
                  '(or a ShrinkWrappingViewport) to size the height of the viewport ' +
                  'to the sum of the heights of its children.'
                ),
              ]);
            }
            if (!constraints.hasBoundedWidth) {
              throw new FlutterError(
                'Vertical viewport was given unbounded width.\\n' +
                'Viewports expand in the cross axis to fill their container and ' +
                'constrain their children to match their extent in the cross axis. ' +
                'In this case, a vertical viewport was given an unlimited amount of ' +
                'horizontal space in which to expand. This situation typically happens ' +
                'when a scrollable widget is nested inside another scrollable widget.'
              );
            }
            break;
          case Axis.horizontal:
            if (!constraints.hasBoundedWidth) {
              throw new FlutterError([
                new ErrorSummary('Horizontal viewport was given unbounded width.'),
                new ErrorDescription(
                  'Viewports expand in the scrolling direction to fill their container. ' +
                  'In this case, a horizontal viewport was given an unlimited amount of ' +
                  'horizontal space in which to expand. This situation typically happens ' +
                  'when a scrollable widget is nested inside another scrollable widget.'
                ),
                new ErrorHint(
                  'If this widget is always nested in a scrollable widget there ' +
                  'is no need to use a viewport because there will always be enough ' +
                  'horizontal space for the children. In this case, consider using a ' +
                  'Row instead. Otherwise, consider using the "shrinkWrap" property ' +
                  '(or a ShrinkWrappingViewport) to size the width of the viewport ' +
                  'to the sum of the widths of its children.'
                ),
              ]);
            }
            if (!constraints.hasBoundedHeight) {
              throw new FlutterError(
                'Horizontal viewport was given unbounded height.\\n' +
                'Viewports expand in the cross axis to fill their container and ' +
                'constrain their children to match their extent in the cross axis. ' +
                'In this case, a horizontal viewport was given an unlimited amount of ' +
                'vertical space in which to expand. This situation typically happens ' +
                'when a scrollable widget is nested inside another scrollable widget.'
              );
            }
            break;
        }
      }
      return true;
    });
    return constraints.biggest;
  }
}