import { StatefulWidget, State, Widget, BuildContext, Key, Color, ValueNotifier, WidgetsBindingObserver, Offset, Rect, OverlayEntry, Overlay, Positioned, Container, BoxDecoration, BorderRadius, RenderBox } from '../../../../flutter/widgets';
import { EditorState } from '../../../editor_state';
import { Selection } from '../../../selection';
import { Node } from '../../../node';
import { Position } from '../../../selection/position';
import { AppFlowySelectionService, SelectionGestureInterceptor } from '../../../service/selection_service';
import { MobileSelectionDragMode } from './mobile_selection_service';
import { SelectionGestureDetector } from '../../../../service/selection/selection_gesture';
import { SelectionUpdateReason } from '../../../selection/selection_update_reason';
import { EditorScrollController } from '../scroll/editor_scroll_controller';
import { HardwareKeyboard } from '../../../../flutter/services';
import { CursorStyle } from '../../../render/selection/cursor_style';
import { ContextMenu, ContextMenuItem } from '../../../../service/context_menu/context_menu';
import { AppFlowyDropTargetStyle } from '../../../service/drop_target_style';
import { DragAreaBuilder, DragTargetNodeInterceptor, DropTargetRenderData, DragAreaBuilderData } from '../../../service/drag_target';
import { Debounce } from '../../../util/debounce';

export class DesktopSelectionServiceWidget extends StatefulWidget {
  readonly child: Widget;
  readonly cursorColor: Color;
  readonly selectionColor: Color;
  readonly contextMenuItems?: ContextMenuItem[][];
  readonly dropTargetStyle: AppFlowyDropTargetStyle;

  constructor(options: {
    key?: Key;
    cursorColor?: Color;
    selectionColor?: Color;
    contextMenuItems?: ContextMenuItem[][];
    child: Widget;
    dropTargetStyle?: AppFlowyDropTargetStyle;
  }) {
    super(options.key);
    this.child = options.child;
    this.cursorColor = options.cursorColor ?? new Color(0xFF00BCF0);
    this.selectionColor = options.selectionColor ?? new Color(0xFF00BCF0);
    this.contextMenuItems = options.contextMenuItems;
    this.dropTargetStyle = options.dropTargetStyle ?? new AppFlowyDropTargetStyle();
  }

  createState(): State<StatefulWidget> {
    return new DesktopSelectionServiceWidgetState();
  }
}

class DesktopSelectionServiceWidgetState extends State<DesktopSelectionServiceWidget>
  implements WidgetsBindingObserver, AppFlowySelectionService {

  get selectionRects(): Rect[] {
    return this.editorState.selectionRects();
  }

  private readonly _selectionAreas: OverlayEntry[] = [];
  private readonly _cursorAreas: OverlayEntry[] = [];
  private readonly _contextMenuAreas: OverlayEntry[] = [];

  currentSelection = new ValueNotifier<Selection | undefined>(undefined);

  get currentSelectedNodes(): Node[] {
    return this.editorState.getSelectedNodes();
  }

  private readonly _interceptors: SelectionGestureInterceptor[] = [];

  /// Pan
  private _panStartOffset?: Offset;
  private _panStartScrollDy?: number;
  private _panStartPosition?: Position;

  private _dropTargetEntry?: OverlayEntry;

  private editorState!: EditorState;

  initState(): void {
    super.initState();

    // WidgetsBinding.instance.addObserver(this);
    this.editorState = this.context.read<EditorState>();
    this.editorState.selectionNotifier.addListener(() => this._updateSelection());
  }

  didChangeMetrics(): void {
    super.didChangeMetrics();

    // Need to refresh the selection when the metrics changed.
    if (this.currentSelection.value) {
      Debounce.debounce(
        'didChangeMetrics - update selection ',
        100,
        () => this.updateSelection(this.currentSelection.value!),
      );
    }
  }

  dispose(): void {
    this.clearSelection();
    // WidgetsBinding.instance.removeObserver(this);
    this.editorState.selectionNotifier.removeListener(() => this._updateSelection());
    this.currentSelection.dispose();
    this.removeDropTarget();
    super.dispose();
  }

  build(context: BuildContext): Widget {
    return new SelectionGestureDetector({
      onPanStart: (details) => this._onPanStart(details),
      onPanUpdate: (details) => this._onPanUpdate(details),
      onPanEnd: (details) => this._onPanEnd(details),
      onTapDown: (details) => this._onTapDown(details),
      onSecondaryTapDown: (details) => this._onSecondaryTapDown(details),
      onDoubleTapDown: (details) => this._onDoubleTapDown(details),
      onTripleTapDown: (details) => this._onTripleTapDown(details),
      child: this.widget.child,
    });
  }

  updateSelection(selection?: Selection): void {
    this.currentSelection.value = selection;
    this.editorState.updateSelectionWithReason(
      selection,
      SelectionUpdateReason.uiEvent,
    );
  }

  clearSelection(): void {
    this.currentSelection.value = undefined;
    this._clearSelection();
  }

  private _clearSelection(): void {
    this.clearCursor();
    // clear selection areas
    this._selectionAreas.forEach(overlay => overlay.remove());
    this._selectionAreas.length = 0;

    // clear context menu
    this._clearContextMenu();
  }

  clearCursor(): void {
    // clear cursor areas
    this._cursorAreas.forEach(overlay => overlay.remove());
    this._cursorAreas.length = 0;
  }

  private _clearContextMenu(): void {
    this._contextMenuAreas.forEach(overlay => overlay.remove());
    this._contextMenuAreas.length = 0;
  }

  getNodeInOffset(offset: Offset): Node | undefined {
    const sortedNodes = this.editorState.getVisibleNodes(
      this.context.read<EditorScrollController>(),
    );

    if (sortedNodes.length === 0) {
      return undefined;
    }

    return this.editorState.getNodeInOffset(
      sortedNodes,
      offset,
      0,
      sortedNodes.length - 1,
    );
  }

  getPositionInOffset(offset: Offset): Position | undefined {
    const node = this.getNodeInOffset(offset);
    const selectable = node?.selectable;
    if (!selectable) {
      this.clearSelection();
      return undefined;
    }
    return selectable.getPositionInOffset(offset);
  }

  onPanStart(details: any, mode: MobileSelectionDragMode): Selection | undefined {
    throw new Error('UnimplementedError');
  }

  onPanUpdate(details: any, mode: MobileSelectionDragMode): Selection | undefined {
    throw new Error('UnimplementedError');
  }

  onPanEnd(details: any, mode: MobileSelectionDragMode): void {
    throw new Error('UnimplementedError');
  }

  private _onTapDown(details: any): void {
    this._clearContextMenu();

    const canTap = this._interceptors.every(
      element => element.canTap?.(details) ?? true,
    );
    if (!canTap) {
      return this.updateSelection(undefined);
    }

    const offset = details.globalPosition;
    const node = this.getNodeInOffset(offset);
    const selectable = node?.selectable;
    if (!selectable) {
      // Clear old start offset
      this._panStartOffset = undefined;
      return this.clearSelection();
    }

    const position = selectable.getPositionInOffset(offset);
    let selection: Selection | undefined;

    if (HardwareKeyboard.instance.isShiftPressed && this._panStartPosition) {
      selection = new Selection({ start: this._panStartPosition, end: position });
    } else {
      selection = selectable.cursorStyle === CursorStyle.verticalLine
        ? Selection.collapsed(position)
        : new Selection({ start: selectable.start(), end: selectable.end() });

      // Reset old start offset
      this._panStartPosition = position;
    }

    this.updateSelection(selection);
  }

  private _onDoubleTapDown(details: any): void {
    const canDoubleTap = this._interceptors.every(
      interceptor => interceptor.canDoubleTap?.(details) ?? true,
    );

    if (!canDoubleTap) {
      return this.updateSelection(undefined);
    }

    const offset = details.globalPosition;
    const node = this.getNodeInOffset(offset);
    const selection = node?.selectable?.getWordBoundaryInOffset(offset);
    if (!selection) {
      this.clearSelection();
      return;
    }
    this.updateSelection(selection);
  }

  private _onTripleTapDown(details: any): void {
    const offset = details.globalPosition;
    const node = this.getNodeInOffset(offset);
    const selectable = node?.selectable;
    if (!selectable) {
      this.clearSelection();
      return;
    }
    const selection = new Selection({
      start: selectable.start(),
      end: selectable.end(),
    });
    this.updateSelection(selection);
  }

  private _onSecondaryTapDown(details: any): void {
    // if selection is null, or
    // selection.isCollapsed and the selected node is TextNode.
    // try to select the word.
    const selection = this.editorState.selectionNotifier.value;
    if (!selection ||
        (selection.isCollapsed === true &&
            this.currentSelectedNodes[0].delta !== undefined)) {
      this._onDoubleTapDown(details);
    }

    this._showContextMenu(details);
  }

  private _onPanStart(details: any): void {
    this.clearSelection();

    const canPanStart = this._interceptors.every(
      interceptor => interceptor.canPanStart?.(details) ?? true,
    );

    if (!canPanStart) {
      return;
    }

    this._panStartOffset = details.globalPosition;
    this._panStartScrollDy = this.editorState.service.scrollService?.dy;

    this._panStartPosition = this.getNodeInOffset(this._panStartOffset!)
      ?.selectable
      ?.getPositionInOffset(this._panStartOffset!);
  }

  private _onPanUpdate(details: any): void {
    const canPanUpdate = this._interceptors.every(
      interceptor => interceptor.canPanUpdate?.(details) ?? true,
    );

    if (!canPanUpdate) {
      return;
    }

    if (!this._panStartOffset ||
        this._panStartScrollDy === undefined ||
        !this._panStartPosition) {
      return;
    }

    const panEndOffset = details.globalPosition;
    const dy = this.editorState.service.scrollService?.dy;
    const panStartOffset = dy === undefined
      ? this._panStartOffset
      : this._panStartOffset.translate(0, this._panStartScrollDy - dy);

    // this one maybe redundant.
    const last = this.getNodeInOffset(panEndOffset)?.selectable;

    // compute the selection in range.
    if (last) {
      const start = this._panStartPosition;
      const end = last.getSelectionInRange(panStartOffset, panEndOffset).end;
      const selection = new Selection({ start, end });

      if (!selection.equals(this.currentSelection.value)) {
        this.updateSelection(selection);
      }
    }

    this.editorState.service.scrollService?.startAutoScroll(
      panEndOffset,
      { edgeOffset: 100 }
    );
  }

  private _onPanEnd(details: any): void {
    const canPanEnd = this._interceptors
      .every(interceptor => interceptor.canPanEnd?.(details) ?? true);

    if (!canPanEnd) {
      return;
    }

    this._panStartPosition = undefined;

    this.editorState.service.scrollService?.stopAutoScroll();
  }

  private _updateSelection(): void {
    const selection = this.editorState.selectionNotifier.value;
    if (!selection) {
      this.clearSelection();
    }
  }

  private _showContextMenu(details: any): void {
    this._clearContextMenu();

    // Don't trigger the context menu if there are no items
    if (!this.widget.contextMenuItems || this.widget.contextMenuItems.length === 0) {
      return;
    }

    // only shows around the selection area.
    if (this.selectionRects.length === 0) {
      return;
    }

    const isHitSelectionAreas = this.currentSelection.value?.isCollapsed === true ||
      this.selectionRects.some(element => {
        const threshold = 20;
        const scaledArea = Rect.fromCenter({
          center: element.center,
          width: element.width + threshold,
          height: element.height + threshold,
        });
        return scaledArea.contains(details.globalPosition);
      });
    if (!isHitSelectionAreas) {
      return;
    }

    // For now, only support the text node.
    if (!this.currentSelectedNodes.every(element => element.delta !== undefined)) {
      return;
    }

    const baseOffset = this.editorState.renderBox?.localToGlobal(Offset.zero) ?? Offset.zero;
    const offset = details.localPosition.add(new Offset(10, 10)).add(baseOffset);
    const contextMenu = new OverlayEntry({
      builder: (context) => new ContextMenu({
        position: offset,
        editorState: this.editorState,
        items: this.widget.contextMenuItems!,
        onPressed: () => this._clearContextMenu(),
      }),
    });

    this._contextMenuAreas.push(contextMenu);
    Overlay.of(this.context, { rootOverlay: true }).insert(contextMenu);
  }

  registerGestureInterceptor(interceptor: SelectionGestureInterceptor): void {
    this._interceptors.push(interceptor);
  }

  unregisterGestureInterceptor(key: string): void {
    const index = this._interceptors.findIndex(element => element.key === key);
    if (index !== -1) {
      this._interceptors.splice(index, 1);
    }
  }

  removeDropTarget(): void {
    this._dropTargetEntry?.remove();
    this._dropTargetEntry = undefined;
  }

  renderDropTargetForOffset(
    offset: Offset,
    options?: {
      builder?: DragAreaBuilder;
      interceptor?: DragTargetNodeInterceptor;
    }
  ): void {
    this.removeDropTarget();

    let node = this.getNodeInOffset(offset);
    if (!node) {
      return;
    }

    if (options?.interceptor) {
      node = options.interceptor(this.context, node);
    }

    const selectable = node.selectable;
    if (!selectable) {
      return;
    }

    const blockRect = selectable.getBlockRect();
    const startOffset = blockRect.topLeft;
    const endOffset = blockRect.bottomLeft;

    const renderBox = selectable.context.findRenderObject() as RenderBox;
    const globalStartOffset = renderBox.localToGlobal(startOffset);
    const globalEndOffset = renderBox.localToGlobal(endOffset);

    const topDistance = globalStartOffset.subtract(offset).distanceSquared;
    const bottomDistance = globalEndOffset.subtract(offset).distanceSquared;

    const isCloserToStart = topDistance < bottomDistance;

    this._dropTargetEntry = new OverlayEntry({
      builder: (context) => {
        if (options?.builder && node) {
          return options.builder(
            context,
            new DragAreaBuilderData({
              targetNode: node,
              dragOffset: offset,
            }),
          );
        }

        const overlayRenderBox = Overlay.of(context).context.findRenderObject() as RenderBox;
        const editorRenderBox = selectable.context.findRenderObject() as RenderBox;

        const editorOffset = editorRenderBox.localToGlobal(
          Offset.zero,
          { ancestor: overlayRenderBox }
        );

        const indicatorTop = (isCloserToStart ? startOffset.dy : endOffset.dy) + editorOffset.dy;

        const width = blockRect.topRight.dx - startOffset.dx;
        return new Positioned({
          top: indicatorTop,
          left: startOffset.dx + editorOffset.dx,
          child: new Container({
            height: this.widget.dropTargetStyle.height,
            width: width,
            margin: this.widget.dropTargetStyle.margin,
            constraints: this.widget.dropTargetStyle.constraints,
            decoration: new BoxDecoration({
              borderRadius: BorderRadius.circular(this.widget.dropTargetStyle.borderRadius),
              color: this.widget.dropTargetStyle.color,
            }),
          }),
        });
      },
    });

    Overlay.of(this.context).insert(this._dropTargetEntry!);
  }

  getDropTargetRenderData(
    offset: Offset,
    options?: {
      interceptor?: DragTargetNodeInterceptor;
    }
  ): DropTargetRenderData | undefined {
    let node = this.getNodeInOffset(offset);

    if (!node) {
      return undefined;
    }

    if (options?.interceptor) {
      node = options.interceptor(this.context, node);
    }

    const selectable = node.selectable;
    if (!selectable) {
      return undefined;
    }

    const blockRect = selectable.getBlockRect();
    const startRect = blockRect.topLeft;
    const endRect = blockRect.bottomLeft;

    const renderBox = selectable.context.findRenderObject() as RenderBox;
    const globalStartRect = renderBox.localToGlobal(startRect);
    const globalEndRect = renderBox.localToGlobal(endRect);

    const topDistance = globalStartRect.subtract(offset).distanceSquared;
    const bottomDistance = globalEndRect.subtract(offset).distanceSquared;

    const isCloserToStart = topDistance < bottomDistance;

    const dropPath = isCloserToStart ? node.path : node.path.next;

    return new DropTargetRenderData({
      dropPath: dropPath,
      cursorNode: node,
    });
  }
}