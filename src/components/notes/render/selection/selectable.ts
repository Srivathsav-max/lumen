// Selectable mixin interface for editor selection handling
export interface Position {
  path: number[];
  offset?: number;
}

export interface Selection {
  start: Position;
  end: Position;
  isCollapsed: boolean;
  isBackward?: boolean;
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
}

export interface Offset {
  dx: number;
  dy: number;
}

export interface TextSelection {
  start: number;
  end: number;
  isCollapsed: boolean;
}

export enum CursorStyle {
  verticalLine = 'verticalLine',
  borderLine = 'borderLine',
  cover = 'cover'
}

export enum TextDirection {
  ltr = 'ltr',
  rtl = 'rtl'
}

/**
 * SelectableMixin is used for the editor to calculate the position
 * and size of the selection.
 * 
 * The widget returned by NodeWidgetBuilder must implement SelectableMixin,
 * otherwise the AppFlowySelectionService will not work properly.
 */
export interface SelectableMixin {
  /**
   * Returns the Rect representing the block selection in current widget.
   * Normally, the rect should not include the action menu area.
   */
  getBlockRect(options?: { shiftWithBaseOffset?: boolean }): Rect;

  /**
   * Returns the Selection surrounded by start and end in current widget.
   * start and end are the offsets under the global coordinate system.
   */
  getSelectionInRange(start: Offset, end: Offset): Selection;

  /**
   * Returns a List of the Rect area within selection in current widget.
   * The return result must be a List of the Rect under the local coordinate system.
   */
  getRectsInSelection(
    selection: Selection,
    options?: { shiftWithBaseOffset?: boolean }
  ): Rect[];

  /**
   * Returns Position for the offset in current widget.
   * start is the offset of the global coordination system.
   */
  getPositionInOffset(start: Offset): Position;

  /**
   * Returns Rect for the position in current widget.
   * The return result must be an offset of the local coordinate system.
   */
  getCursorRectInPosition?(
    position: Position,
    options?: { shiftWithBaseOffset?: boolean }
  ): Rect | null;

  /**
   * Return global offset from local offset.
   */
  localToGlobal(
    offset: Offset,
    options?: { shiftWithBaseOffset?: boolean }
  ): Offset;

  /**
   * Start position of the selectable element
   */
  start(): Position;

  /**
   * End position of the selectable element
   */
  end(): Position;

  /**
   * For TextNode only.
   * Only the widget rendered by TextNode need to implement the detail,
   * and the rest can return null.
   */
  getTextSelectionInSelection?(selection: Selection): TextSelection | null;

  /**
   * For TextNode only.
   * Only the widget rendered by TextNode need to implement the detail,
   * and the rest can return null.
   */
  getWordEdgeInOffset?(start: Offset): Selection | null;

  /**
   * For TextNode only.
   * Only the widget rendered by TextNode need to implement the detail,
   * and the rest can return null.
   */
  getWordBoundaryInOffset?(start: Offset): Selection | null;

  /**
   * For TextNode only.
   * Only the widget rendered by TextNode need to implement the detail,
   * and the rest can return null.
   */
  getWordBoundaryInPosition?(position: Position): Selection | null;

  /**
   * Whether the cursor should blink
   */
  shouldCursorBlink?: boolean;

  /**
   * Style of the cursor
   */
  cursorStyle?: CursorStyle;

  /**
   * Text direction for the selectable element
   */
  textDirection?(): TextDirection;
}

/**
 * Base implementation of SelectableMixin with common functionality
 */
export abstract class BaseSelectableMixin implements SelectableMixin {
  protected element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  abstract getBlockRect(options?: { shiftWithBaseOffset?: boolean }): Rect;
  abstract getSelectionInRange(start: Offset, end: Offset): Selection;
  abstract getRectsInSelection(
    selection: Selection,
    options?: { shiftWithBaseOffset?: boolean }
  ): Rect[];
  abstract getPositionInOffset(start: Offset): Position;
  abstract start(): Position;
  abstract end(): Position;

  getCursorRectInPosition(
    position: Position,
    options?: { shiftWithBaseOffset?: boolean }
  ): Rect | null {
    return null;
  }

  localToGlobal(
    offset: Offset,
    options: { shiftWithBaseOffset?: boolean } = {}
  ): Offset {
    const rect = this.element.getBoundingClientRect();
    return {
      dx: rect.left + offset.dx,
      dy: rect.top + offset.dy
    };
  }

  getTextSelectionInSelection(selection: Selection): TextSelection | null {
    return null;
  }

  getWordEdgeInOffset(start: Offset): Selection | null {
    return null;
  }

  getWordBoundaryInOffset(start: Offset): Selection | null {
    return null;
  }

  getWordBoundaryInPosition(position: Position): Selection | null {
    return null;
  }

  get shouldCursorBlink(): boolean {
    return true;
  }

  get cursorStyle(): CursorStyle {
    return CursorStyle.verticalLine;
  }

  textDirection(): TextDirection {
    return TextDirection.ltr;
  }

  /**
   * Transform a local rect to global coordinates
   */
  transformRectToGlobal(
    rect: Rect,
    options: { shiftWithBaseOffset?: boolean } = {}
  ): Rect {
    const topLeft = this.localToGlobal(rect.topLeft, options);
    return {
      left: topLeft.dx,
      top: topLeft.dy,
      right: topLeft.dx + rect.width,
      bottom: topLeft.dy + rect.height,
      width: rect.width,
      height: rect.height,
      topLeft,
      bottomRight: {
        dx: topLeft.dx + rect.width,
        dy: topLeft.dy + rect.height
      }
    };
  }

  /**
   * Create a rect from coordinates
   */
  protected createRect(left: number, top: number, width: number, height: number): Rect {
    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      topLeft: { dx: left, dy: top },
      bottomRight: { dx: left + width, dy: top + height }
    };
  }

  /**
   * Create an offset from coordinates
   */
  protected createOffset(dx: number, dy: number): Offset {
    return { dx, dy };
  }

  /**
   * Create a position from path and offset
   */
  protected createPosition(path: number[], offset?: number): Position {
    return { path, offset };
  }

  /**
   * Create a selection from start and end positions
   */
  protected createSelection(start: Position, end: Position): Selection {
    const isCollapsed = this.positionsEqual(start, end);
    return {
      start,
      end,
      isCollapsed,
      isBackward: this.isBackwardSelection(start, end)
    };
  }

  /**
   * Check if two positions are equal
   */
  protected positionsEqual(pos1: Position, pos2: Position): boolean {
    return this.pathsEqual(pos1.path, pos2.path) && pos1.offset === pos2.offset;
  }

  /**
   * Check if two paths are equal
   */
  protected pathsEqual(path1: number[], path2: number[]): boolean {
    if (path1.length !== path2.length) return false;
    return path1.every((val, index) => val === path2[index]);
  }

  /**
   * Check if selection is backward (end comes before start)
   */
  protected isBackwardSelection(start: Position, end: Position): boolean {
    // Compare paths first
    for (let i = 0; i < Math.min(start.path.length, end.path.length); i++) {
      if (start.path[i] > end.path[i]) return true;
      if (start.path[i] < end.path[i]) return false;
    }
    
    // If paths are equal up to the shorter length, compare by path length
    if (start.path.length > end.path.length) return true;
    if (start.path.length < end.path.length) return false;
    
    // If paths are identical, compare offsets
    return (start.offset || 0) > (end.offset || 0);
  }
}