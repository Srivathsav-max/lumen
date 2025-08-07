import { Node } from '../../../core/document/node';
import { Position } from '../../../core/location/position';
import { Selection } from '../../../core/location/selection';

export interface DragAreaBuilderData {
  targetNode: Node;
  dragOffset: { x: number; y: number };
}

export type DragAreaBuilder = (
  context: any,
  data: DragAreaBuilderData
) => any; // Widget equivalent

export type DragTargetNodeInterceptor = (
  context: any,
  node: Node
) => Node;

export interface TapDownDetails {
  globalPosition: { x: number; y: number };
  localPosition: { x: number; y: number };
}

export interface DragStartDetails {
  globalPosition: { x: number; y: number };
  localPosition: { x: number; y: number };
}

export interface DragUpdateDetails {
  globalPosition: { x: number; y: number };
  localPosition: { x: number; y: number };
  delta: { x: number; y: number };
}

export interface DragEndDetails {
  velocity: { x: number; y: number };
}

export enum MobileSelectionDragMode {
  leftHandler = 'leftHandler',
  rightHandler = 'rightHandler',
  cursor = 'cursor'
}

/// [AppFlowySelectionService] is responsible for processing
/// the [Selection] changes and updates.
///
/// Usually, this service can be obtained by the following code.
/// ```typescript
/// const selectionService = editorState.service.selectionService;
///
/// /** get current selection value*/
/// const selection = selectionService.currentSelection.value;
///
/// /** get current selected nodes*/
/// const nodes = selectionService.currentSelectedNodes;
/// ```
export abstract class AppFlowySelectionService {
  /// The current [Selection] in editor.
  ///
  /// The value is null if there is no nodes are selected.
  abstract get currentSelection(): { value: Selection | null };

  /// The current selected [Node]s in editor.
  ///
  /// The order of the result is determined according to the [currentSelection].
  /// The result are ordered from back to front if the selection is forward.
  /// The result are ordered from front to back if the selection is backward.
  ///
  /// For example, Here is an array of selected nodes, `[n1, n2, n3]`.
  /// The result will be `[n3, n2, n1]` if the selection is forward,
  ///   and `[n1, n2, n3]` if the selection is backward.
  ///
  /// Returns empty result if there is no nodes are selected.
  abstract get currentSelectedNodes(): Node[];

  /// Updates the selection.
  ///
  /// The editor will update selection area and toolbar area
  /// if the [selection] is not collapsed,
  /// otherwise, will update the cursor area.
  abstract updateSelection(selection: Selection | null): void;

  /// Clears the selection area, cursor area and the popup list area.
  abstract clearSelection(): void;

  /// Clears the cursor area.
  abstract clearCursor(): void;

  /// Returns the [Node] containing to the [offset].
  ///
  /// [offset] must be under the global coordinate system.
  abstract getNodeInOffset(offset: { x: number; y: number }): Node | null;

  /// Returns the [Position] closest to the [offset].
  ///
  /// Returns null if there is no nodes are selected.
  ///
  /// [offset] must be under the global coordinate system.
  abstract getPositionInOffset(offset: { x: number; y: number }): Position | null;

  /// The current selection areas's rect in editor.
  abstract get selectionRects(): DOMRect[];

  abstract registerGestureInterceptor(interceptor: SelectionGestureInterceptor): void;
  abstract unregisterGestureInterceptor(key: string): void;

  /// The functions below are only for mobile.
  abstract onPanStart(
    details: DragStartDetails,
    mode: MobileSelectionDragMode
  ): Selection | null;

  abstract onPanUpdate(
    details: DragUpdateDetails,
    mode: MobileSelectionDragMode
  ): Selection | null;

  abstract onPanEnd(
    details: DragEndDetails,
    mode: MobileSelectionDragMode
  ): void;

  /// Draws a horizontal line between the nearest nodes to the [offset].
  ///
  /// The [offset] must be under the global coordinate system.
  ///
  /// Should call [removeDropTarget] to remove the line once drop is done.
  ///
  /// If [builder] is provided, the line will be drawn by [builder].
  /// Otherwise, the line will be drawn by default [DropTargetStyle].
  ///
  /// If [interceptor] is provided, the node will be intercepted by [interceptor].
  abstract renderDropTargetForOffset(
    offset: { x: number; y: number },
    options?: {
      builder?: DragAreaBuilder;
      interceptor?: DragTargetNodeInterceptor;
    }
  ): void;

  /// Removes the horizontal line drawn by [renderDropTargetForOffset].
  abstract removeDropTarget(): void;

  /// Returns the [DropTargetRenderData] for the [offset].
  abstract getDropTargetRenderData(
    offset: { x: number; y: number },
    options?: {
      interceptor?: DragTargetNodeInterceptor;
    }
  ): DropTargetRenderData | null;
}

export class SelectionGestureInterceptor {
  public readonly key: string;
  public canTap?: (details: TapDownDetails) => boolean;
  public canDoubleTap?: (details: TapDownDetails) => boolean;
  public canPanStart?: (details: DragStartDetails) => boolean;
  public canPanUpdate?: (details: DragUpdateDetails) => boolean;
  public canPanEnd?: (details: DragEndDetails) => boolean;

  constructor(options: {
    key: string;
    canTap?: (details: TapDownDetails) => boolean;
    canDoubleTap?: (details: TapDownDetails) => boolean;
    canPanStart?: (details: DragStartDetails) => boolean;
    canPanUpdate?: (details: DragUpdateDetails) => boolean;
    canPanEnd?: (details: DragEndDetails) => boolean;
  }) {
    this.key = options.key;
    this.canTap = options.canTap;
    this.canDoubleTap = options.canDoubleTap;
    this.canPanStart = options.canPanStart;
    this.canPanUpdate = options.canPanUpdate;
    this.canPanEnd = options.canPanEnd;
  }
}

/// Data returned when calling [AppFlowySelectionService.getDropTargetRenderData]
///
/// Includes the position (path) which the drop target is rendered for
/// and the [Node] which the cursor is directly hovering over.
export class DropTargetRenderData {
  /// The path which the drop is rendered for,
  /// this is the position in which any content should be
  /// inserted into.
  public readonly dropPath?: number[];

  /// The [Node] which the cursor is directly hovering over,
  /// this node __might__ be at same position as [dropPath] but might also
  /// be another [Node] depending on distance to top/bottom of the [Node] to the
  /// cursors offset.
  ///
  /// This is useful in case you want to cancel or pause the drop
  /// for specific [Node]s, in case they as example implement their
  /// own drop logic.
  public readonly cursorNode?: Node;

  constructor(options: { dropPath?: number[]; cursorNode?: Node } = {}) {
    this.dropPath = options.dropPath;
    this.cursorNode = options.cursorNode;
  }

  toString(): string {
    return `DropTargetRenderData(dropPath: ${JSON.stringify(this.dropPath)}, cursorNode: ${this.cursorNode})`;
  }
}