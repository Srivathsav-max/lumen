import { EditorState } from '../../types';

// Platform detection utilities
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isDesktopOrWeb = () => {
  return !isMobile();
};

// Offset interface
interface Offset {
  x: number;
  y: number;
}

// FloatingCursorDragState enum
enum FloatingCursorDragState {
  Start = 'Start',
  Update = 'Update',
  End = 'End',
}

// RawFloatingCursorPoint interface
interface RawFloatingCursorPoint {
  state: FloatingCursorDragState;
  offset?: Offset;
  startLocation?: Offset;
}

// HandleType enum
enum HandleType {
  collapsed = 'collapsed',
}

// DragStartDetails interface
interface DragStartDetails {
  globalPosition: Offset;
  localPosition: Offset;
}

// DragUpdateDetails interface
interface DragUpdateDetails {
  globalPosition: Offset;
}

// DragEndDetails interface
interface DragEndDetails {}

// MobileSelectionDragMode enum
enum MobileSelectionDragMode {
  cursor = 'cursor',
}

// Global variables
let _cursorOffset: Offset | null = null;
let disableMagnifier = false;

// Mock HandleType.collapsed.key object
const collapsedHandleKey = {
  currentContext: null as any, // This would be a DOM element in web context
};

// Mock selection service
interface SelectionService {
  onPanStart(details: DragStartDetails, mode: MobileSelectionDragMode): void;
  onPanUpdate(details: DragUpdateDetails, mode: MobileSelectionDragMode): void;
  onPanEnd(details: DragEndDetails, mode: MobileSelectionDragMode): void;
}

export const onFloatingCursorUpdate = async (
  point: RawFloatingCursorPoint,
  editorState: EditorState
): Promise<void> => {
  console.debug(
    `onFloatingCursorUpdate: ${point.state}, ${point.offset ? `${point.offset.x},${point.offset.y}` : 'null'}`
  );

  // support updating the cursor position via the space bar on iOS/Android.
  if (isDesktopOrWeb()) {
    return;
  }

  const selectionService = editorState.service?.selectionService as SelectionService;
  if (!selectionService) {
    console.warn('Selection service not available');
    return;
  }

  switch (point.state) {
    case FloatingCursorDragState.Start:
      const context = collapsedHandleKey.currentContext;
      if (!context) {
        console.debug('onFloatingCursorUpdateStart: context is null');
        return;
      }

      console.debug(
        `onFloatingCursorUpdateStart: ${point.startLocation ? `${point.startLocation.x},${point.startLocation.y}` : 'null'}`
      );

      // get global offset of the cursor.
      const rect = context.getBoundingClientRect();
      const offset: Offset = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
      };
      const size = { width: rect.width, height: rect.height };
      _cursorOffset = {
        x: offset.x + size.width / 2,
        y: offset.y + size.height / 2,
      };
      disableMagnifier = true;
      selectionService.onPanStart(
        {
          globalPosition: _cursorOffset,
          localPosition: { x: 0, y: 0 },
        },
        MobileSelectionDragMode.cursor
      );
      break;

    case FloatingCursorDragState.Update:
      const updateContext = collapsedHandleKey.currentContext;
      if (!updateContext) {
        console.debug('onFloatingCursorUpdateUpdate: context is null');
        return;
      } else {
        console.debug('onFloatingCursorUpdateUpdate: context is not null');
      }
      if (!_cursorOffset || !point.offset) {
        return;
      }

      console.debug(
        `onFloatingCursorUpdateUpdate: ${point.offset.x},${point.offset.y}`
      );

      disableMagnifier = true;
      selectionService.onPanUpdate(
        {
          globalPosition: {
            x: _cursorOffset.x + point.offset.x,
            y: _cursorOffset.y + point.offset.y,
          },
        },
        MobileSelectionDragMode.cursor
      );
      break;

    case FloatingCursorDragState.End:
      console.debug(
        `onFloatingCursorUpdateEnd: ${point.offset ? `${point.offset.x},${point.offset.y}` : 'null'}`
      );

      _cursorOffset = null;
      disableMagnifier = false;
      selectionService.onPanEnd(
        {},
        MobileSelectionDragMode.cursor
      );
      break;
  }
};