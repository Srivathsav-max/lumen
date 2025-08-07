import { StatefulWidget, State, Widget, BuildContext, Key, ValueKey, TickerProviderStateMixin, AnimationController, ProxyAnimation, AlwaysStoppedAnimation, ReverseAnimation, FadeTransition, NotificationListener, ScrollNotification, LayoutBuilder, BoxConstraints, Listener, PointerDownEvent, Stack, ScrollController, ScrollPhysics, Axis, EdgeInsets, IndexedWidgetBuilder, TweenSequence, TweenSequenceItem, ConstantTween, Tween, Curves, Curve, Duration, Completer, SchedulerBinding } from '../../../../flutter/widgets';
import { ItemPositionsNotifier, ItemPosition } from './item_positions_notifier';
import { PositionedList } from './positioned_list';
import { PostMountCallback } from './post_mount_callback';
import { ScrollOffsetNotifier } from './scroll_offset_notifier';
import { PageStorage } from '../../../../flutter/page_storage';

/// Number of screens to scroll when scrolling a long distance.
const SCREEN_SCROLL_COUNT = 2;

/**
 * A scrollable list of widgets similar to ListView, except scroll control
 * and position reporting is based on index rather than pixel offset.
 *
 * ScrollablePositionedList lays out children in the same way as ListView.
 *
 * The list can be displayed with the item at initialScrollIndex positioned
 * at a particular initialAlignment.
 *
 * The itemScrollController can be used to scroll or jump to particular items
 * in the list. The itemPositionsNotifier can be used to get a list of items
 * currently laid out by the list.
 *
 * The scrollOffsetListener can be used to get updates about scroll position
 * changes.
 *
 * All other parameters are the same as specified in ListView.
 */
export class ScrollablePositionedList extends StatefulWidget {
  /// Number of items the itemBuilder can produce.
  readonly itemCount: number;

  /// Called to build children for the list with 0 <= index < itemCount.
  readonly itemBuilder: IndexedWidgetBuilder;

  /// Called to build separators for between each item in the list.
  /// Called with 0 <= index < itemCount - 1.
  readonly separatorBuilder?: IndexedWidgetBuilder;

  /// Controller for jumping or scrolling to an item.
  readonly itemScrollController?: ItemScrollController;

  /// Notifier that reports the items laid out in the list after each frame.
  readonly itemPositionsNotifier?: ItemPositionsNotifier;

  readonly scrollOffsetController?: ScrollOffsetController;

  /// Notifier that reports the changes to the scroll offset.
  readonly scrollOffsetNotifier?: ScrollOffsetNotifier;

  /// Index of an item to initially align within the viewport.
  readonly initialScrollIndex: number;

  /// Determines where the leading edge of the item at initialScrollIndex
  /// should be placed.
  ///
  /// See ItemScrollController.jumpTo for an explanation of alignment.
  readonly initialAlignment: number;

  /// The axis along which the scroll view scrolls.
  ///
  /// Defaults to Axis.vertical.
  readonly scrollDirection: Axis;

  /// Whether the view scrolls in the reading direction.
  ///
  /// Defaults to false.
  ///
  /// See ScrollView.reverse.
  readonly reverse: boolean;

  /// Whether the extent of the scroll view in the scrollDirection should be
  /// determined by the contents being viewed.
  ///
  /// Defaults to false.
  ///
  /// See ScrollView.shrinkWrap.
  readonly shrinkWrap: boolean;

  /// How the scroll view should respond to user input.
  ///
  /// For example, determines how the scroll view continues to animate after the
  /// user stops dragging the scroll view.
  ///
  /// See ScrollView.physics.
  readonly physics?: ScrollPhysics;

  /// The number of children that will contribute semantic information.
  ///
  /// See ScrollView.semanticChildCount for more information.
  readonly semanticChildCount?: number;

  /// The amount of space by which to inset the children.
  readonly padding?: EdgeInsets;

  /// Whether to wrap each child in an IndexedSemantics.
  ///
  /// See SliverChildBuilderDelegate.addSemanticIndexes.
  readonly addSemanticIndexes: boolean;

  /// Whether to wrap each child in an AutomaticKeepAlive.
  ///
  /// See SliverChildBuilderDelegate.addAutomaticKeepAlives.
  readonly addAutomaticKeepAlives: boolean;

  /// Whether to wrap each child in a RepaintBoundary.
  ///
  /// See SliverChildBuilderDelegate.addRepaintBoundaries.
  readonly addRepaintBoundaries: boolean;

  /// The minimum cache extent used by the underlying scroll lists.
  /// See ScrollView.cacheExtent.
  ///
  /// Note that the ScrollablePositionedList uses two lists to simulate long
  /// scrolls, so using the ScrollController.scrollTo method may result
  /// in builds of widgets that would otherwise already be built in the
  /// cache extent.
  readonly minCacheExtent?: number;

  /// Create a ScrollablePositionedList whose items are provided by itemBuilder.
  static builder(options: {
    itemCount: number;
    itemBuilder: IndexedWidgetBuilder;
    key?: Key;
    itemScrollController?: ItemScrollController;
    shrinkWrap?: boolean;
    itemPositionsListener?: ItemPositionsNotifier;
    scrollOffsetController?: ScrollOffsetController;
    scrollOffsetListener?: ScrollOffsetNotifier;
    initialScrollIndex?: number;
    initialAlignment?: number;
    scrollDirection?: Axis;
    reverse?: boolean;
    physics?: ScrollPhysics;
    semanticChildCount?: number;
    padding?: EdgeInsets;
    addSemanticIndexes?: boolean;
    addAutomaticKeepAlives?: boolean;
    addRepaintBoundaries?: boolean;
    minCacheExtent?: number;
  }): ScrollablePositionedList {
    return new ScrollablePositionedList({
      ...options,
      shrinkWrap: options.shrinkWrap ?? false,
      initialScrollIndex: options.initialScrollIndex ?? 0,
      initialAlignment: options.initialAlignment ?? 0,
      scrollDirection: options.scrollDirection ?? Axis.vertical,
      reverse: options.reverse ?? false,
      addSemanticIndexes: options.addSemanticIndexes ?? true,
      addAutomaticKeepAlives: options.addAutomaticKeepAlives ?? true,
      addRepaintBoundaries: options.addRepaintBoundaries ?? true,
    });
  }

  /// Create a ScrollablePositionedList whose items are provided by
  /// itemBuilder and separators provided by separatorBuilder.
  static separated(options: {
    itemCount: number;
    itemBuilder: IndexedWidgetBuilder;
    separatorBuilder: IndexedWidgetBuilder;
    key?: Key;
    shrinkWrap?: boolean;
    itemScrollController?: ItemScrollController;
    itemPositionsListener?: ItemPositionsNotifier;
    scrollOffsetController?: ScrollOffsetController;
    scrollOffsetListener?: ScrollOffsetNotifier;
    initialScrollIndex?: number;
    initialAlignment?: number;
    scrollDirection?: Axis;
    reverse?: boolean;
    physics?: ScrollPhysics;
    semanticChildCount?: number;
    padding?: EdgeInsets;
    addSemanticIndexes?: boolean;
    addAutomaticKeepAlives?: boolean;
    addRepaintBoundaries?: boolean;
    minCacheExtent?: number;
  }): ScrollablePositionedList {
    console.assert(options.separatorBuilder !== undefined);
    return new ScrollablePositionedList({
      ...options,
      shrinkWrap: options.shrinkWrap ?? false,
      initialScrollIndex: options.initialScrollIndex ?? 0,
      initialAlignment: options.initialAlignment ?? 0,
      scrollDirection: options.scrollDirection ?? Axis.vertical,
      reverse: options.reverse ?? false,
      addSemanticIndexes: options.addSemanticIndexes ?? true,
      addAutomaticKeepAlives: options.addAutomaticKeepAlives ?? true,
      addRepaintBoundaries: options.addRepaintBoundaries ?? true,
    });
  }

  constructor(options: {
    itemCount: number;
    itemBuilder: IndexedWidgetBuilder;
    separatorBuilder?: IndexedWidgetBuilder;
    key?: Key;
    itemScrollController?: ItemScrollController;
    shrinkWrap?: boolean;
    itemPositionsNotifier?: ItemPositionsNotifier;
    scrollOffsetController?: ScrollOffsetController;
    scrollOffsetNotifier?: ScrollOffsetNotifier;
    initialScrollIndex?: number;
    initialAlignment?: number;
    scrollDirection?: Axis;
    reverse?: boolean;
    physics?: ScrollPhysics;
    semanticChildCount?: number;
    padding?: EdgeInsets;
    addSemanticIndexes?: boolean;
    addAutomaticKeepAlives?: boolean;
    addRepaintBoundaries?: boolean;
    minCacheExtent?: number;
  }) {
    super(options.key);
    this.itemCount = options.itemCount;
    this.itemBuilder = options.itemBuilder;
    this.separatorBuilder = options.separatorBuilder;
    this.itemScrollController = options.itemScrollController;
    this.itemPositionsNotifier = options.itemPositionsNotifier;
    this.scrollOffsetController = options.scrollOffsetController;
    this.scrollOffsetNotifier = options.scrollOffsetNotifier;
    this.initialScrollIndex = options.initialScrollIndex ?? 0;
    this.initialAlignment = options.initialAlignment ?? 0;
    this.scrollDirection = options.scrollDirection ?? Axis.vertical;
    this.reverse = options.reverse ?? false;
    this.shrinkWrap = options.shrinkWrap ?? false;
    this.physics = options.physics;
    this.semanticChildCount = options.semanticChildCount;
    this.padding = options.padding;
    this.addSemanticIndexes = options.addSemanticIndexes ?? true;
    this.addAutomaticKeepAlives = options.addAutomaticKeepAlives ?? true;
    this.addRepaintBoundaries = options.addRepaintBoundaries ?? true;
    this.minCacheExtent = options.minCacheExtent;
  }

  createState(): State<StatefulWidget> {
    return new ScrollablePositionedListState();
  }
}

/**
 * Controller to jump or scroll to a particular position in a
 * ScrollablePositionedList.
 */
export class ItemScrollController {
  private scrollableListState?: ScrollablePositionedListState;

  /// Whether any ScrollablePositionedList objects are attached this object.
  ///
  /// If `false`, then jumpTo and scrollTo must not be called.
  get isAttached(): boolean {
    return this.scrollableListState !== undefined;
  }

  /// Immediately, without animation, reconfigure the list so that the item at
  /// index's leading edge is at the given alignment.
  ///
  /// The alignment specifies the desired position for the leading edge of the
  /// item. The alignment is expected to be a value in the range [0.0, 1.0]
  /// and represents a proportion along the main axis of the viewport.
  ///
  /// For a vertically scrolling view that is not reversed:
  /// * 0 aligns the top edge of the item with the top edge of the view.
  /// * 1 aligns the top edge of the item with the bottom of the view.
  /// * 0.5 aligns the top edge of the item with the center of the view.
  ///
  /// For a horizontally scrolling view that is not reversed:
  /// * 0 aligns the left edge of the item with the left edge of the view
  /// * 1 aligns the left edge of the item with the right edge of the view.
  /// * 0.5 aligns the left edge of the item with the center of the view.
  jumpTo(options: { index: number; alignment?: number }): void {
    const { index, alignment = 0 } = options;
    this.scrollableListState!.jumpTo({ index, alignment });
  }

  /// Animate the list over duration using the given curve such that the
  /// item at index ends up with its leading edge at the given alignment.
  /// See jumpTo for an explanation of alignment.
  ///
  /// The duration must be greater than 0; otherwise, use jumpTo.
  ///
  /// When item position is not available, because it's too far, the scroll
  /// is composed into three phases:
  ///
  /// 1. The currently displayed list view starts scrolling.
  /// 2. Another list view, which scrolls with the same speed, fades over the
  ///    first one and shows items that are close to the scroll target.
  /// 3. The second list view scrolls and stops on the target.
  ///
  /// The opacityAnimationWeights can be used to apply custom weights to these
  /// three stages of this animation. The default weights, [40, 20, 40], are
  /// good with default Curves.linear. Different weights might be better for
  /// other cases. For example, if you use Curves.easeOut, consider setting
  /// opacityAnimationWeights to [20, 20, 60].
  ///
  /// See TweenSequenceItem.weight for more info.
  async scrollTo(options: {
    index: number;
    alignment?: number;
    duration: Duration;
    curve?: Curve;
    opacityAnimationWeights?: number[];
  }): Promise<void> {
    const {
      index,
      alignment = 0,
      duration,
      curve = Curves.linear,
      opacityAnimationWeights = [40, 20, 40],
    } = options;

    console.assert(this.scrollableListState !== undefined);
    console.assert(opacityAnimationWeights.length === 3);
    console.assert(duration.inMilliseconds > 0);

    return this.scrollableListState!.scrollTo({
      index,
      alignment,
      duration,
      curve,
      opacityAnimationWeights,
    });
  }

  attach(scrollableListState: ScrollablePositionedListState): void {
    console.assert(this.scrollableListState === undefined);
    this.scrollableListState = scrollableListState;
  }

  detach(): void {
    this.scrollableListState = undefined;
  }
}

/**
 * Controller to scroll a certain number of pixels relative to the current
 * scroll offset.
 *
 * Scrolls offset pixels relative to the current scroll offset. offset can
 * be positive or negative.
 *
 * This is an experimental API and is subject to change.
 * Behavior may be ill-defined in some cases. Please file bugs.
 */
export class ScrollOffsetController {
  private scrollableListState?: ScrollablePositionedListState;

  async animateScroll(options: {
    offset: number;
    duration: Duration;
    curve?: Curve;
  }): Promise<void> {
    const { offset, duration, curve = Curves.linear } = options;
    const currentPosition = this.scrollableListState!.primary.scrollController.offset;
    const newPosition = currentPosition + offset;
    await this.scrollableListState!.primary.scrollController.animateTo({
      offset: newPosition,
      duration,
      curve,
    });
  }

  async animateTo(options: {
    offset: number;
    duration: Duration;
    curve?: Curve;
  }): Promise<void> {
    const { offset, duration, curve = Curves.linear } = options;
    await this.scrollableListState!.primary.scrollController.animateTo({
      offset,
      duration,
      curve,
    });
  }

  jumpTo(options: { offset: number }): void {
    const { offset } = options;
    this.scrollableListState!.primary.scrollController.jumpTo(offset);
  }

  attach(scrollableListState: ScrollablePositionedListState): void {
    console.assert(this.scrollableListState === undefined);
    this.scrollableListState = scrollableListState;
  }

  detach(): void {
    this.scrollableListState = undefined;
  }
}

class ScrollablePositionedListState extends State<ScrollablePositionedList>
  implements TickerProviderStateMixin {
  /// Details for the primary (active) ListView.
  primary = new ListDisplayDetails(new ValueKey('Ping'));

  /// Details for the secondary (transitional) ListView that is temporarily
  /// shown when scrolling a long distance.
  secondary = new ListDisplayDetails(new ValueKey('Pong'));

  readonly opacity = new ProxyAnimation(new AlwaysStoppedAnimation<number>(0));

  startAnimationCallback: () => void = () => {};

  private isTransitioning = false;

  private animationController?: AnimationController;

  private previousOffset = 0;

  initState(): void {
    super.initState();
    const initialPosition = PageStorage.maybeOf(this.context)?.readState(this.context) as ItemPosition | undefined;
    this.primary.target = initialPosition?.index ?? this.widget.initialScrollIndex;
    this.primary.alignment = initialPosition?.itemLeadingEdge ?? this.widget.initialAlignment;
    
    if (this.widget.itemCount > 0 && this.primary.target > this.widget.itemCount - 1) {
      this.primary.target = this.widget.itemCount - 1;
    }
    
    this.widget.itemScrollController?.attach(this);
    this.widget.scrollOffsetController?.attach(this);
    this.primary.itemPositionsNotifier.itemPositions.addListener(() => this.updatePositions());
    this.secondary.itemPositionsNotifier.itemPositions.addListener(() => this.updatePositions());
    
    this.primary.scrollController.addListener(() => {
      const currentOffset = this.primary.scrollController.offset;
      const offsetChange = currentOffset - this.previousOffset;
      this.previousOffset = currentOffset;
      
      if (!this.isTransitioning || 
          (this.widget.scrollOffsetNotifier?.recordProgrammaticScrolls ?? false)) {
        this.widget.scrollOffsetNotifier?.changeController.add(offsetChange);
      }
    });
  }

  activate(): void {
    super.activate();
    this.widget.itemScrollController?.attach(this);
    this.widget.scrollOffsetController?.attach(this);
  }

  deactivate(): void {
    this.widget.itemScrollController?.detach();
    this.widget.scrollOffsetController?.detach();
    super.deactivate();
  }

  dispose(): void {
    this.primary.itemPositionsNotifier.itemPositions.removeListener(() => this.updatePositions());
    this.secondary.itemPositionsNotifier.itemPositions.removeListener(() => this.updatePositions());
    this.animationController?.dispose();
    this.primary.itemPositionsNotifier.itemPositions.dispose();
    this.secondary.itemPositionsNotifier.itemPositions.dispose();
    
    if (this.secondary.scrollController.hasClients) {
      this.secondary.scrollController.dispose();
    }
    super.dispose();
  }

  didUpdateWidget(oldWidget: ScrollablePositionedList): void {
    super.didUpdateWidget(oldWidget);
    
    if (oldWidget.itemScrollController?.scrollableListState === this) {
      oldWidget.itemScrollController?.detach();
    }
    if (this.widget.itemScrollController?.scrollableListState !== this) {
      this.widget.itemScrollController?.detach();
      this.widget.itemScrollController?.attach(this);
    }

    if (this.widget.itemCount === 0) {
      this.setState(() => {
        this.primary.target = 0;
        this.secondary.target = 0;
      });
    } else {
      if (this.primary.target > this.widget.itemCount - 1) {
        this.setState(() => {
          this.primary.target = this.widget.itemCount - 1;
        });
      }
      if (this.secondary.target > this.widget.itemCount - 1) {
        this.setState(() => {
          this.secondary.target = this.widget.itemCount - 1;
        });
      }
    }
  }

  build(context: BuildContext): Widget {
    return new LayoutBuilder({
      builder: (context, constraints) => {
        const cacheExtent = this.cacheExtent(constraints);
        const child = new Listener({
          onPointerDown: (_: PointerDownEvent) => this.stopScroll({ canceled: true }),
          child: new Stack({
            children: [
              new PostMountCallback({
                key: this.primary.key,
                callback: this.startAnimationCallback,
                child: new FadeTransition({
                  opacity: new ReverseAnimation(this.opacity),
                  child: new NotificationListener<ScrollNotification>({
                    onNotification: (_) => this.isTransitioning,
                    child: new PositionedList({
                      itemBuilder: this.widget.itemBuilder,
                      separatorBuilder: this.widget.separatorBuilder,
                      itemCount: this.widget.itemCount,
                      positionedIndex: this.primary.target,
                      controller: this.primary.scrollController,
                      itemPositionsNotifier: this.primary.itemPositionsNotifier,
                      scrollDirection: this.widget.scrollDirection,
                      reverse: this.widget.reverse,
                      cacheExtent,
                      alignment: this.primary.alignment,
                      physics: this.widget.physics,
                      shrinkWrap: this.widget.shrinkWrap,
                      addSemanticIndexes: this.widget.addSemanticIndexes,
                      semanticChildCount: this.widget.semanticChildCount,
                      padding: this.widget.padding,
                      addAutomaticKeepAlives: this.widget.addAutomaticKeepAlives,
                      addRepaintBoundaries: this.widget.addRepaintBoundaries,
                    }),
                  }),
                }),
              }),
              ...(this.isTransitioning ? [
                new PostMountCallback({
                  key: this.secondary.key,
                  callback: this.startAnimationCallback,
                  child: new FadeTransition({
                    opacity: this.opacity,
                    child: new NotificationListener<ScrollNotification>({
                      onNotification: (_) => false,
                      child: new PositionedList({
                        itemBuilder: this.widget.itemBuilder,
                        separatorBuilder: this.widget.separatorBuilder,
                        itemCount: this.widget.itemCount,
                        itemPositionsNotifier: this.secondary.itemPositionsNotifier,
                        positionedIndex: this.secondary.target,
                        controller: this.secondary.scrollController,
                        scrollDirection: this.widget.scrollDirection,
                        reverse: this.widget.reverse,
                        cacheExtent,
                        alignment: this.secondary.alignment,
                        physics: this.widget.physics,
                        shrinkWrap: this.widget.shrinkWrap,
                        addSemanticIndexes: this.widget.addSemanticIndexes,
                        semanticChildCount: this.widget.semanticChildCount,
                        padding: this.widget.padding,
                        addAutomaticKeepAlives: this.widget.addAutomaticKeepAlives,
                        addRepaintBoundaries: this.widget.addRepaintBoundaries,
                      }),
                    }),
                  }),
                }),
              ] : []),
            ],
          }),
        });
        return child;
      },
    });
  }

  private cacheExtent(constraints: BoxConstraints): number {
    return Math.max(
      (this.widget.scrollDirection === Axis.vertical
        ? constraints.maxHeight
        : constraints.maxWidth) * SCREEN_SCROLL_COUNT,
      this.widget.minCacheExtent ?? 0,
    );
  }

  jumpTo(options: { index: number; alignment: number }): void {
    let { index, alignment } = options;
    this.stopScroll({ canceled: true });
    
    if (index > this.widget.itemCount - 1) {
      index = this.widget.itemCount - 1;
    }
    
    this.setState(() => {
      this.primary.scrollController.jumpTo(0);
      this.primary.target = index;
      this.primary.alignment = alignment;
    });
  }

  async scrollTo(options: {
    index: number;
    alignment: number;
    duration: Duration;
    curve?: Curve;
    opacityAnimationWeights: number[];
  }): Promise<void> {
    let { index, alignment, duration, curve = Curves.linear, opacityAnimationWeights } = options;
    
    if (index > this.widget.itemCount - 1) {
      index = this.widget.itemCount - 1;
    }
    
    if (this.isTransitioning) {
      const scrollCompleter = new Completer<void>();
      this.stopScroll({ canceled: true });
      SchedulerBinding.instance.addPostFrameCallback(async (_) => {
        await this.startScroll({
          index,
          alignment,
          duration,
          curve,
          opacityAnimationWeights,
        });
        scrollCompleter.complete();
      });
      await scrollCompleter.future;
    } else {
      await this.startScroll({
        index,
        alignment,
        duration,
        curve,
        opacityAnimationWeights,
      });
    }
  }

  private async startScroll(options: {
    index: number;
    alignment: number;
    duration: Duration;
    curve?: Curve;
    opacityAnimationWeights: number[];
  }): Promise<void> {
    const { index, alignment, duration, curve = Curves.linear, opacityAnimationWeights } = options;
    const direction = index > this.primary.target ? 1 : -1;
    const itemPosition = this.primary.itemPositionsNotifier.itemPositions.value
      .find((itemPosition: ItemPosition) => itemPosition.index === index);

    if (itemPosition) {
      // Scroll directly.
      const localScrollAmount = itemPosition.itemLeadingEdge *
        this.primary.scrollController.position.viewportDimension;
      await this.primary.scrollController.animateTo({
        offset: this.primary.scrollController.offset +
          localScrollAmount -
          alignment * this.primary.scrollController.position.viewportDimension,
        duration,
        curve,
      });
    } else {
      const scrollAmount = SCREEN_SCROLL_COUNT *
        this.primary.scrollController.position.viewportDimension;
      const startCompleter = new Completer<void>();
      const endCompleter = new Completer<void>();
      
      this.startAnimationCallback = () => {
        SchedulerBinding.instance.addPostFrameCallback((_) => {
          this.startAnimationCallback = () => {};
          this.animationController?.dispose();
          this.animationController = new AnimationController({
            vsync: this,
            duration,
          });
          this.animationController!.forward();
          this.opacity.parent = this.opacityAnimation(opacityAnimationWeights)
            .animate(this.animationController!);
          this.secondary.scrollController.jumpTo(
            -direction *
              (SCREEN_SCROLL_COUNT *
                  this.primary.scrollController.position.viewportDimension -
                alignment *
                  this.secondary.scrollController.position.viewportDimension),
          );

          startCompleter.complete(
            this.primary.scrollController.animateTo({
              offset: this.primary.scrollController.offset + direction * scrollAmount,
              duration,
              curve,
            }),
          );
          endCompleter.complete(
            this.secondary.scrollController.animateTo({
              offset: 0,
              duration,
              curve,
            }),
          );
        });
      };
      
      this.setState(() => {
        // TODO: startScroll can be re-entrant, which invalidates this assert.
        // console.assert(!this.isTransitioning);
        this.secondary.target = index;
        this.secondary.alignment = alignment;
        this.isTransitioning = true;
      });
      
      await Promise.all([startCompleter.future, endCompleter.future]);
      this.stopScroll();
    }
  }

  private stopScroll(options: { canceled?: boolean } = {}): void {
    const { canceled = false } = options;
    
    if (!this.isTransitioning) {
      return;
    }

    if (canceled) {
      if (this.primary.scrollController.hasClients) {
        this.primary.scrollController.jumpTo(this.primary.scrollController.offset);
      }
      if (this.secondary.scrollController.hasClients) {
        this.secondary.scrollController.jumpTo(this.secondary.scrollController.offset);
      }
    }

    if (this.mounted) {
      this.setState(() => {
        if (this.opacity.value >= 0.5) {
          // Secondary ListView is more visible than the primary; make it the
          // new primary.
          const temp = this.primary;
          this.primary = this.secondary;
          this.secondary = temp;
        }
        this.isTransitioning = false;
        this.opacity.parent = new AlwaysStoppedAnimation<number>(0);
      });
    }
  }

  private opacityAnimation(opacityAnimationWeights: number[]): TweenSequence<number> {
    const startOpacity = 0.0;
    const endOpacity = 1.0;
    return new TweenSequence<number>([
      new TweenSequenceItem<number>({
        tween: new ConstantTween<number>(startOpacity),
        weight: opacityAnimationWeights[0],
      }),
      new TweenSequenceItem<number>({
        tween: new Tween<number>({ begin: startOpacity, end: endOpacity }),
        weight: opacityAnimationWeights[1],
      }),
      new TweenSequenceItem<number>({
        tween: new ConstantTween<number>(endOpacity),
        weight: opacityAnimationWeights[2],
      }),
    ]);
  }

  private updatePositions(): void {
    const itemPositions = this.primary.itemPositionsNotifier.itemPositions.value
      .filter((position: ItemPosition) =>
        position.itemLeadingEdge < 1 && position.itemTrailingEdge > 0,
      );
    
    if (itemPositions.length > 0) {
      PageStorage.maybeOf(this.context)?.writeState(
        this.context,
        itemPositions.reduce(
          (value, element) =>
            value.itemLeadingEdge < element.itemLeadingEdge ? value : element,
        ),
      );
    }
    
    if (this.widget.itemPositionsNotifier) {
      this.widget.itemPositionsNotifier.itemPositions.value = itemPositions;
    }
  }
}

class ListDisplayDetails {
  readonly itemPositionsNotifier = new ItemPositionsNotifier();
  readonly scrollController = new ScrollController({ keepScrollOffset: false });

  /// The index of the item to scroll to.
  target = 0;

  /// The desired alignment for target.
  ///
  /// See ItemScrollController.jumpTo for an explanation of alignment.
  alignment = 0;

  readonly key: Key;

  constructor(key: Key) {
    this.key = key;
  }

  dispose(): void {
    this.itemPositionsNotifier.itemPositions.dispose();
  }
}