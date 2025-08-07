import { StatefulWidget, State, Widget, BuildContext, Key, Color, Size, ValueNotifier, WidgetsBindingObserver, Stack, Clip, ValueListenableBuilder, SizedBox, RenderBox, Timer, Offset, Rect, Colors } from '../../../../flutter/widgets';
import { EditorState } from '../../../editor_state';
import { Selection } from '../../../selection';
import { Node } from '../../../node';
import { Position } from '../../../selection/position';
import { AppFlowySelectionService, SelectionGestureInterceptor } from '../../../service/selection_service';
import { MobileMagnifier } from './mobile_magnifier';
import { PlatformExtension } from '../../../util/platform_extension';
import { MobileBasicHandle } from '../../../../render/selection/mobile_basic_handle';
import { MobileCollapsedHandle } from '../../../../render/selection/mobile_collapsed_handle';
import { MobileSelectionHandle, HandleType } from '../../../../render/selection/mobile_selection_handle';
import { MobileSelectionGestureDetector } from '../../../../service/selection/mobile_selection_gesture';
import { SelectionUpdateReason } from '../../../selection/selection_update_reason';
import { SelectionType } from '../../../selection/selection_type';
import { AppFlowyEditorLog } from '../../../log';
import { EditorScrollController } from '../scroll/editor_scroll_controller';
import { HapticFeedback } from '../../../../flutter/services';
import { DragAreaBuilder, DragTargetNodeInterceptor, DropTargetRenderData } from '../../../service/drag_target';
import { StreamController } from '../../../../dart/async';

/// only used in mobile
///
/// this will notify the developers when the selection is not collapsed.
export const appFlowyEditorOnTapSelectionArea = new StreamController<number>();

export enum MobileSelectionDragMode {
  none = 'none',
  leftSelectionHandle = 'leftSelectionHandle',
  rightSelectionHandle = 'rightSelectionHandle',
  cursor = 'cursor',
}

export enum MobileSelectionHandlerType {
  leftHandle = 'leftHandle',
  rightHandle = 'rightHandle',
  cursorHandle = 'cursorHandle',
}

// the value type is MobileSelectionDragMode
export const selectionDragModeKey = 'selection_drag_mode';
export let disableIOSSelectWordEdgeOnTap = false;
export let disableMagnifier = false;

export class MobileSelectionServiceWidget extends StatefulWidget {
  readonly child: Widget;
  readonly cursorColor: Color;
  readonly selectionColor: Color;

  /// Show the magnifier or not.
  ///
  /// only works on iOS or Android.
  readonly showMagnifier: boolean;

  readonly magnifierSize: Size;

  constructor(options: {
    key?: Key;
    cursorColor?: Color;
    selectionColor?: Color;
    showMagnifier?: boolean;
    magnifierSize?: Size;
    child: Widget;
  }) {
    super(options.key);
    this.child = options.child;
    this.cursorColor = options.cursorColor ?? new Color(0xFF00BCF0);
    this.selectionColor = options.selectionColor ?? Color.fromARGB(53, 111, 201, 231);
    this.showMagnifier = options.showMagnifier ?? true;
    this.magnifierSize = options.magnifierSize ?? new Size(72, 48);
  }

  createState(): State<StatefulWidget> {
    return new MobileSelectionServiceWidgetState();
  }
}

class MobileSelectionServiceWidgetState extends State<MobileSelectionServiceWidget>
  implements WidgetsBindingObserver, AppFlowySelectionService {
  
  readonly selectionRects: Rect[] = [];
  currentSelection = new ValueNotifier<Selection | undefined>(undefined);
  currentSelectedNodes: Node[] = [];

  private readonly _interceptors: SelectionGestureInterceptor[] = [];
  private readonly _lastPanOffset = new ValueNotifier<Offset | undefined>(undefined);

  // the selection from editorState will be updated directly, but the cursor
  // or selection area depends on the layout of the text, so we need to update
  // the selection after the layout.
  private readonly selectionNotifierAfterLayout = new ValueNotifier<Selection | undefined>(undefined);

  /// Pan
  private _panStartOffset?: Offset;
  private _panStartScrollDy?: number;
  private _panStartSelection?: Selection;
  private _isPanStartHorizontal?: boolean;

  dragMode = MobileSelectionDragMode.none;

  updateSelectionByTapUp = false;

  private editorState!: EditorState;

  isCollapsedHandleVisible = false;

  collapsedHandleTimer?: Timer;

  initState(): void {
    super.initState();

    // WidgetsBinding.instance.addObserver(this);
    this.editorState = this.context.read<EditorState>();
    this.editorState.selectionNotifier.addListener(() => this._updateSelection());
  }

  dispose(): void {
    this.clearSelection();
    // WidgetsBinding.instance.removeObserver(this);
    this.selectionNotifierAfterLayout.dispose();
    this.editorState.selectionNotifier.removeListener(() => this._updateSelection());
    this.collapsedHandleTimer?.cancel();

    super.dispose();
  }

  build(context: BuildContext): Widget {
    const stack = new Stack({
      clipBehavior: Clip.none,
      children: [
        this.widget.child,

        // magnifier for zoom in the text.
        ...(this.widget.showMagnifier ? [this._buildMagnifier()] : []),

        // the handles for expanding the selection area.
        this._buildLeftHandle(),
        this._buildRightHandle(),
        this._buildCollapsedHandle(),
      ],
    });

    return PlatformExtension.isIOS
      ? new MobileSelectionGestureDetector({
          onTapUp: (details) => this._onTapUpIOS(details),
          onDoubleTapUp: (details) => this._onDoubleTapUp(details),
          onTripleTapUp: (details) => this._onTripleTapUp(details),
          onLongPressStart: (details) => this._onLongPressStartIOS(details),
          onLongPressMoveUpdate: (details) => this._onLongPressUpdateIOS(details),
          onLongPressEnd: (details) => this._onLongPressEndIOS(details),
          child: stack,
        })
      : new MobileSelectionGestureDetector({
          onTapUp: (details) => this._onTapUpAndroid(details),
          onDoubleTapUp: (details) => this._onDoubleTapUp(details),
          onTripleTapUp: (details) => this._onTripleTapUp(details),
          onLongPressStart: (details) => this._onLongPressStartAndroid(details),
          onLongPressMoveUpdate: (details) => this._onLongPressUpdateAndroid(details),
          onLongPressEnd: (details) => this._onLongPressEndAndroid(details),
          onPanUpdate: (details) => this._onPanUpdateAndroid(details),
          onPanEnd: (details) => this._onPanEndAndroid(details),
          child: stack,
        });
  }

  private _buildMagnifier(): Widget {
    return new ValueListenableBuilder({
      valueListenable: this._lastPanOffset,
      builder: (_, offset, __) => {
        if (!offset || disableMagnifier) {
          return new SizedBox({ width: 0, height: 0 });
        }
        const renderBox = this.context.findRenderObject() as RenderBox;
        const local = renderBox.globalToLocal(offset);
        return new MobileMagnifier({
          size: this.widget.magnifierSize,
          offset: local,
        });
      },
    });
  }

  private _buildCollapsedHandle(): Widget {
    return new ValueListenableBuilder({
      valueListenable: this.selectionNotifierAfterLayout,
      builder: (context, selection, _) => {
        if (!selection || !selection.isCollapsed) {
          this.isCollapsedHandleVisible = false;
          return new SizedBox({ width: 0, height: 0 });
        }

        // on Android, the drag handle should be updated when typing text.
        if (PlatformExtension.isAndroid &&
            this.editorState.selectionUpdateReason !== SelectionUpdateReason.uiEvent) {
          this.isCollapsedHandleVisible = false;
          return new SizedBox({ width: 0, height: 0 });
        }

        if (selection.isCollapsed &&
            [
              MobileSelectionDragMode.leftSelectionHandle,
              MobileSelectionDragMode.rightSelectionHandle,
            ].includes(this.dragMode)) {
          this.isCollapsedHandleVisible = false;
          return new SizedBox({ width: 0, height: 0 });
        }

        selection = selection.normalized;

        const node = this.editorState.getNodeAtPath(selection.start.path);
        const selectable = node?.selectable;
        const rect = selectable?.getCursorRectInPosition(
          selection.start,
          { shiftWithBaseOffset: true }
        );

        if (!node || !rect) {
          this.isCollapsedHandleVisible = false;
          return new SizedBox({ width: 0, height: 0 });
        }

        this.isCollapsedHandleVisible = true;

        this._clearCollapsedHandleOnAndroid();

        const editorStyle = this.editorState.editorStyle;
        return new MobileCollapsedHandle({
          layerLink: node.layerLink,
          rect: rect,
          handleColor: editorStyle.dragHandleColor,
          handleWidth: editorStyle.mobileDragHandleWidth,
          handleBallWidth: editorStyle.mobileDragHandleBallSize.width,
          enableHapticFeedbackOnAndroid: editorStyle.enableHapticFeedbackOnAndroid,
          onDragging: (isDragging) => {
            if (isDragging) {
              this.collapsedHandleTimer?.cancel();
              this.collapsedHandleTimer = undefined;
            } else {
              this._clearCollapsedHandleOnAndroid();
            }
          },
        });
      },
    });
  }

  private _buildLeftHandle(): Widget {
    return this._buildHandle(HandleType.left);
  }

  private _buildRightHandle(): Widget {
    return this._buildHandle(HandleType.right);
  }

  private _buildHandle(handleType: HandleType): Widget {
    if (![HandleType.left, HandleType.right].includes(handleType)) {
      throw new Error('showLeftHandle and showRightHandle cannot be same.');
    }

    return new ValueListenableBuilder({
      valueListenable: this.selectionNotifierAfterLayout,
      builder: (context, selection, _) => {
        if (!selection) {
          return new SizedBox({ width: 0, height: 0 });
        }

        if (selection.isCollapsed &&
            [
              MobileSelectionDragMode.none,
              MobileSelectionDragMode.cursor,
            ].includes(this.dragMode)) {
          return new SizedBox({ width: 0, height: 0 });
        }

        const isCollapsedWhenDraggingHandle = selection.isCollapsed &&
          [
            MobileSelectionDragMode.leftSelectionHandle,
            MobileSelectionDragMode.rightSelectionHandle,
          ].includes(this.dragMode);

        selection = selection.normalized;

        const node = this.editorState.getNodeAtPath(
          handleType === HandleType.left
            ? selection.start.path
            : selection.end.path,
        );
        const selectable = node?.selectable;

        // get the cursor rect when the selection is collapsed.
        const rects = isCollapsedWhenDraggingHandle
          ? [
              selectable?.getCursorRectInPosition(
                selection.start,
                { shiftWithBaseOffset: true }
              ) ?? Rect.zero,
            ]
          : selectable?.getRectsInSelection(
              selection,
              { shiftWithBaseOffset: true }
            );

        if (!node || !rects || rects.length === 0) {
          return new SizedBox({ width: 0, height: 0 });
        }

        const editorStyle = this.editorState.editorStyle;
        return new MobileSelectionHandle({
          layerLink: node.layerLink,
          rect: handleType === HandleType.left ? rects[0] : rects[rects.length - 1],
          handleType: handleType,
          handleColor: isCollapsedWhenDraggingHandle
            ? Colors.transparent
            : editorStyle.dragHandleColor,
          handleWidth: editorStyle.mobileDragHandleWidth,
          handleBallWidth: editorStyle.mobileDragHandleBallSize.width,
          enableHapticFeedbackOnAndroid: editorStyle.enableHapticFeedbackOnAndroid,
        });
      },
    });
  }

  // The collapsed handle will be dismissed when no user interaction is detected.
  private _clearCollapsedHandleOnAndroid(): void {
    if (!PlatformExtension.isAndroid) {
      return;
    }
    this.collapsedHandleTimer?.cancel();
    this.collapsedHandleTimer = new Timer(
      this.editorState.editorStyle.autoDismissCollapsedHandleDuration,
      () => {
        if (this.isCollapsedHandleVisible) {
          this.editorState.updateSelectionWithReason(
            this.editorState.selection,
            SelectionUpdateReason.transaction,
          );
        }
      },
    );
  }

  updateSelection(selection?: Selection): void {
    if (this.currentSelection.value === selection) {
      return;
    }

    this._clearSelection();

    if (selection) {
      if (!selection.isCollapsed) {
        // updates selection area.
        AppFlowyEditorLog.selection.debug('update cursor area, ' + selection.toString());
        this._updateSelectionAreas(selection);
      }
    }

    this.currentSelection.value = selection;
    this.editorState.updateSelectionWithReason(
      selection,
      SelectionUpdateReason.uiEvent,
      {
        customSelectionType: SelectionType.inline,
        extraInfo: {
          [selectionDragModeKey]: this.dragMode,
          selectionExtraInfoDoNotAttachTextService:
            this.dragMode === MobileSelectionDragMode.cursor,
        },
      }
    );
  }

  clearSelection(): void {
    this.currentSelectedNodes = [];
    this.currentSelection.value = undefined;

    this._clearSelection();
  }

  private _clearPanVariables(): void {
    this._panStartOffset = undefined;
    this._panStartSelection = undefined;
    this._panStartScrollDy = undefined;
    this._lastPanOffset.value = undefined;
  }

  clearCursor(): void {
    this._clearSelection();
  }

  private _clearSelection(): void {
    this.selectionRects.length = 0;
  }

  getNodeInOffset(offset: Offset): Node | undefined {
    const sortedNodes = this.editorState.getVisibleNodes(
      this.context.read<EditorScrollController>(),
    );

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

  registerGestureInterceptor(interceptor: SelectionGestureInterceptor): void {
    this._interceptors.push(interceptor);
  }

  unregisterGestureInterceptor(key: string): void {
    const index = this._interceptors.findIndex(element => element.key === key);
    if (index !== -1) {
      this._interceptors.splice(index, 1);
    }
  }

  private _updateSelection(): void {
    const selection = this.editorState.selection;

    // WidgetsBinding.instance.addPostFrameCallback(() => {
    //   if (this.mounted) this.selectionNotifierAfterLayout.value = selection;
    // });

    if (this.currentSelection.value !== selection) {
      this.clearSelection();
      return;
    }

    if (selection) {
      if (!selection.isCollapsed) {
        // updates selection area.
        AppFlowyEditorLog.selection.debug('update cursor area, ' + selection.toString());
        // WidgetsBinding.instance.addPostFrameCallback(() => {
        //   this.selectionRects.length = 0;
        //   this._clearSelection();
        //   this._updateSelectionAreas(selection);
        // });
      }
    }
  }

  onPanStart(details: any, mode: MobileSelectionDragMode): Selection | undefined {
    this._panStartOffset = details.globalPosition.translate(-3.0, 0);
    this._panStartScrollDy = this.editorState.service.scrollService?.dy;

    const selection = this.editorState.selection;
    this._panStartSelection = selection;

    this.dragMode = mode;

    return selection;
  }

  onPanUpdate(details: any, mode: MobileSelectionDragMode): Selection | undefined {
    if (!this._panStartOffset || this._panStartScrollDy === undefined) {
      return undefined;
    }

    // only support selection mode now.
    if (!this.editorState.selection ||
        this.dragMode === MobileSelectionDragMode.none) {
      return undefined;
    }

    const panEndOffset = details.globalPosition;

    const dy = this.editorState.service.scrollService?.dy;
    const panStartOffset = dy === undefined
      ? this._panStartOffset
      : this._panStartOffset.translate(0, this._panStartScrollDy! - dy);
    const end = this.getNodeInOffset(panEndOffset)
      ?.selectable
      ?.getSelectionInRange(panStartOffset, panEndOffset)
      .end;

    let newSelection: Selection | undefined;

    if (end) {
      if (this.dragMode === MobileSelectionDragMode.leftSelectionHandle) {
        newSelection = new Selection({
          start: this._panStartSelection!.normalized.end,
          end: end,
        }).normalized;
      } else if (this.dragMode === MobileSelectionDragMode.rightSelectionHandle) {
        newSelection = new Selection({
          start: this._panStartSelection!.normalized.start,
          end: end,
        }).normalized;
      } else if (this.dragMode === MobileSelectionDragMode.cursor) {
        newSelection = Selection.collapsed(end);
      }
      this._lastPanOffset.value = panEndOffset;
    }

    if (newSelection) {
      this.updateSelection(newSelection);
    }

    return newSelection;
  }

  onPanEnd(details: any, mode: MobileSelectionDragMode): void {
    this._clearPanVariables();
    this.dragMode = MobileSelectionDragMode.none;

    this.editorState.updateSelectionWithReason(
      this.editorState.selection,
      SelectionUpdateReason.uiEvent,
      {
        extraInfo: {
          selectionExtraInfoDoNotAttachTextService: false,
        },
      }
    );
  }

  private _onTapUpIOS(details: any): void {
    const offset = details.globalPosition;

    // if the tap happens on a selection area, don't change the selection
    if (this._isClickOnSelectionArea(offset)) {
      appFlowyEditorOnTapSelectionArea.add(0);
      return;
    }

    this.clearSelection();

    let selection: Selection | undefined;
    if (disableIOSSelectWordEdgeOnTap) {
      const position = this.getPositionInOffset(offset);
      if (position) {
        selection = Selection.collapsed(position);
      }
    } else {
      // get the word edge closest to offset
      const node = this.getNodeInOffset(offset);
      selection = node?.selectable?.getWordEdgeInOffset(offset);
    }

    if (!selection) {
      return;
    }

    this.editorState.updateSelectionWithReason(
      selection,
      SelectionUpdateReason.uiEvent,
      {
        customSelectionType: SelectionType.inline,
        extraInfo: undefined,
      }
    );
  }

  private _onDoubleTapUp(details: any): void {
    const offset = details.globalPosition;
    const node = this.getNodeInOffset(offset);
    // select word boundary closest to offset
    const selection = node?.selectable?.getWordBoundaryInOffset(offset);
    if (!selection) {
      this.clearSelection();
      return;
    }
    this.updateSelection(selection);
  }

  private _onTripleTapUp(details: any): void {
    const offset = details.globalPosition;
    const node = this.getNodeInOffset(offset);
    // select node closest to offset
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

  private _onLongPressStartIOS(details: any): void {
    const offset = details.globalPosition;
    this._panStartOffset = offset;
    this._panStartScrollDy = this.editorState.service.scrollService?.dy;
    this.dragMode = MobileSelectionDragMode.cursor;

    // make a collapsed selection at offset with magnifier
    const position = this.getPositionInOffset(offset);
    if (!position) {
      return;
    }

    const selection = Selection.collapsed(position);
    this._lastPanOffset.value = offset;
    this.updateSelection(selection);
  }

  private _onLongPressUpdateIOS(details: any): void {
    if (!this._panStartOffset || this._panStartScrollDy === undefined) {
      return;
    }

    // make a collapsed selection at offset with magnifier
    const offset = details.globalPosition;
    const position = this.getPositionInOffset(offset);
    if (!position) {
      return;
    }

    const selection = Selection.collapsed(position);
    this._lastPanOffset.value = offset;
    this.updateSelection(selection);
  }

  private _onLongPressEndIOS(details: any): void {
    this._clearPanVariables();
    this.dragMode = MobileSelectionDragMode.none;

    this.editorState.updateSelectionWithReason(
      this.editorState.selection,
      SelectionUpdateReason.uiEvent,
      {
        customSelectionType: SelectionType.inline,
        extraInfo: {
          selectionExtraInfoDoNotAttachTextService: false,
        },
      }
    );
  }

  private _onTapUpAndroid(details: any): void {
    const offset = details.globalPosition;

    this.clearSelection();

    // make a collapsed selection at offset
    const position = this.getPositionInOffset(offset);
    if (!position) {
      return;
    }

    this.editorState.updateSelectionWithReason(
      Selection.collapsed(position),
      SelectionUpdateReason.uiEvent,
      {
        customSelectionType: SelectionType.inline,
        extraInfo: undefined,
      }
    );
  }

  private _onLongPressStartAndroid(details: any): void {
    const offset = details.globalPosition;
    this._panStartOffset = offset;
    this._panStartScrollDy = this.editorState.service.scrollService?.dy;
    const node = this.getNodeInOffset(offset);
    // select word boundary closest to offset
    const selection = node?.selectable?.getWordBoundaryInOffset(offset);
    if (!selection) {
      this.clearSelection();
      return;
    }

    if (this.editorState.editorStyle.enableHapticFeedbackOnAndroid) {
      HapticFeedback.mediumImpact();
    }

    this.dragMode = MobileSelectionDragMode.cursor;
    this._panStartSelection = selection;
    this._lastPanOffset.value = offset;

    this.editorState.updateSelectionWithReason(
      selection,
      SelectionUpdateReason.uiEvent,
      {
        extraInfo: {
          selectionExtraInfoDisableFloatingToolbar: true,
        },
      }
    );
  }

  private _onLongPressUpdateAndroid(details: any): void {
    if (!this._panStartOffset || this._panStartScrollDy === undefined) {
      return;
    }
    if (!this.editorState.selection ||
        this.dragMode === MobileSelectionDragMode.none) {
      return;
    }

    const offset = details.globalPosition;
    this._lastPanOffset.value = offset;

    const wordBoundary = this.getNodeInOffset(offset)?.selectable?.getWordBoundaryInOffset(offset);

    let newSelection: Selection | undefined;

    // extend selection from _panStartSelection to word boundary closest to offset
    if (wordBoundary) {
      if (wordBoundary.end.path > this._panStartSelection!.end.path ||
          wordBoundary.end.path.equals(this._panStartSelection!.end.path) &&
              wordBoundary.end.offset > this._panStartSelection!.end.offset) {
        newSelection = new Selection({
          start: this._panStartSelection!.start,
          end: wordBoundary.end,
        }).normalized;
      } else if (wordBoundary.start.path < this._panStartSelection!.start.path ||
          wordBoundary.start.path.equals(this._panStartSelection!.start.path) &&
              wordBoundary.start.offset < this._panStartSelection!.start.offset) {
        newSelection = new Selection({
          start: this._panStartSelection!.end,
          end: wordBoundary.start,
        }).normalized;
      } else {
        newSelection = this._panStartSelection;
      }
    }

    if (newSelection) {
      this.editorState.updateSelectionWithReason(
        newSelection,
        SelectionUpdateReason.uiEvent,
        {
          extraInfo: {
            selectionExtraInfoDisableFloatingToolbar: true,
          },
        }
      );
    }
  }

  private _onLongPressEndAndroid(details: any): void {
    this._clearPanVariables();
    this.dragMode = MobileSelectionDragMode.none;

    this.editorState.updateSelectionWithReason(
      this.editorState.selection,
      SelectionUpdateReason.uiEvent,
      {
        extraInfo: {
          selectionExtraInfoDoNotAttachTextService: false,
        },
      }
    );
  }

  private _onPanUpdateAndroid(details: any): void {
    // if current pan gesture is not initially horizontal, return
    if (this._isPanStartHorizontal === false) {
      return;
    }
    // first call to onPanUpdate to determine if current pan gesture is horizontal
    // if not, disable future calls in the guard clause above
    if (Math.abs(details.delta.dx) < Math.abs(details.delta.dy) &&
        (!this._panStartOffset || this._panStartScrollDy === undefined)) {
      this._isPanStartHorizontal = false;
      return;
    }
    // first successful call to onPanUpdate, initialize pan variables
    const offset = details.globalPosition;
    if (!this._panStartOffset || this._panStartScrollDy === undefined) {
      this._panStartOffset = offset;
      this._panStartScrollDy = this.editorState.service.scrollService?.dy;
      this.dragMode = MobileSelectionDragMode.cursor;
    }

    const position = this.getPositionInOffset(offset);

    this._lastPanOffset.value = offset;
    if (!position) {
      return;
    }

    const selection = Selection.collapsed(position);

    if (this.editorState.editorStyle.enableHapticFeedbackOnAndroid) {
      HapticFeedback.lightImpact();
    }
    this.updateSelection(selection);
  }

  private _onPanEndAndroid(details: any): void {
    this._clearPanVariables();
    this.dragMode = MobileSelectionDragMode.none;
    this._isPanStartHorizontal = undefined;

    this.editorState.updateSelectionWithReason(
      this.editorState.selection,
      SelectionUpdateReason.uiEvent,
      {
        extraInfo: {
          selectionExtraInfoDoNotAttachTextService: false,
          selectionExtraInfoDisableFloatingToolbar: true,
        },
      }
    );
  }

  // delete this function in the future.
  private _updateSelectionAreas(selection: Selection): void {
    const nodes = this.editorState.getNodesInSelection(selection);

    this.currentSelectedNodes = nodes;

    const backwardNodes = selection.isBackward ? nodes : [...nodes].reverse();
    const normalizedSelection = selection.normalized;
    console.assert(normalizedSelection.isBackward);

    AppFlowyEditorLog.selection.debug('update selection areas, ' + normalizedSelection.toString());

    for (let i = 0; i < backwardNodes.length; i++) {
      const node = backwardNodes[i];

      const selectable = node.selectable;
      if (!selectable) {
        continue;
      }

      let newSelection = normalizedSelection.copyWith();

      /// In the case of multiple selections,
      ///  we need to return a new selection for each selected node individually.
      ///
      /// < > means selected.
      /// text: abcd<ef
      /// text: ghijkl
      /// text: mn>opqr
      ///
      if (!normalizedSelection.isSingle) {
        if (i === 0) {
          newSelection = newSelection.copyWith({ end: selectable.end() });
        } else if (i === nodes.length - 1) {
          newSelection = newSelection.copyWith({ start: selectable.start() });
        } else {
          newSelection = new Selection({
            start: selectable.start(),
            end: selectable.end(),
          });
        }
      }

      const rects = selectable.getRectsInSelection(
        newSelection,
        { shiftWithBaseOffset: true }
      );
      for (const rect of rects) {
        const selectionRect = selectable.transformRectToGlobal(
          rect,
          { shiftWithBaseOffset: true }
        );
        this.selectionRects.push(selectionRect);
      }
    }
  }

  private _isClickOnSelectionArea(point: Offset): boolean {
    for (const rect of this.selectionRects) {
      if (rect.contains(point)) {
        return true;
      }
    }
    return false;
  }

  removeDropTarget(): void {
    // Do nothing on mobile
  }

  renderDropTargetForOffset(
    offset: Offset,
    options?: {
      builder?: DragAreaBuilder;
      interceptor?: DragTargetNodeInterceptor;
    }
  ): void {
    // Do nothing on mobile
  }

  getDropTargetRenderData(
    offset: Offset,
    options?: {
      interceptor?: DragTargetNodeInterceptor;
    }
  ): DropTargetRenderData | undefined {
    return undefined;
  }
}