// Position extension for cursor movement and selection operations
export enum SelectionRange {
  character = 'character',
  word = 'word'
}

export interface Position {
  path: number[];
  offset: number;
}

export interface EditorState {
  document: any;
  selection: any;
  service: any;
  editorStyle: any;
  selectionRects(): any[];
}

export interface Node {
  renderBox?: any;
  selectable?: any;
  delta?: any;
  type: string;
  previous?: Node;
  next?: Node;
}

export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  topLeft: { dx: number; dy: number };
  topRight: { dx: number; dy: number };
  bottomLeft: { dx: number; dy: number };
  bottomRight: { dx: number; dy: number };
}

export interface Offset {
  dx: number;
  dy: number;
}

export class PositionExtension {
  /**
   * Move cursor horizontally (left/right)
   */
  static moveHorizontal(
    position: Position,
    editorState: EditorState,
    options: {
      forward?: boolean;
      selectionRange?: SelectionRange;
    } = {}
  ): Position | null {
    const { forward = true, selectionRange = SelectionRange.character } = options;
    
    const node = editorState.document.nodeAtPath(position.path);
    if (!node) {
      return null;
    }

    if (forward && position.offset === 0) {
      const previousEnd = node.previous?.selectable?.end();
      if (previousEnd) {
        return previousEnd;
      }
      return null;
    } else if (!forward) {
      const end = node.selectable?.end();
      if (end && position.offset >= end.offset) {
        return node.next?.selectable?.start();
      }
    }

    switch (selectionRange) {
      case SelectionRange.character:
        const delta = node.delta;
        if (delta) {
          return {
            path: position.path,
            offset: forward
              ? delta.prevRunePosition(position.offset)
              : delta.nextRunePosition(position.offset)
          };
        }
        return { path: position.path, offset: position.offset };

      case SelectionRange.word:
        const wordDelta = node.delta;
        if (wordDelta) {
          const result = forward
            ? node.selectable?.getWordBoundaryInPosition({
                path: position.path,
                offset: wordDelta.prevRunePosition(position.offset)
              })
            : node.selectable?.getWordBoundaryInPosition(position);
          
          if (result) {
            return forward ? result.start : result.end;
          }
        }
        return { path: position.path, offset: position.offset };
    }
  }

  /**
   * Move cursor vertically (up/down)
   */
  static moveVertical(
    position: Position,
    editorState: EditorState,
    options: { upwards?: boolean } = {}
  ): Position | null {
    const { upwards = true } = options;
    
    const node = editorState.document.nodeAtPath(position.path);
    const nodeRenderBox = node?.renderBox;
    const nodeSelectable = node?.selectable;
    
    if (!node || !nodeRenderBox || !nodeSelectable) {
      return position;
    }

    const editorSelection = editorState.selection;
    const rects = editorState.selectionRects();
    
    if (rects.length === 0 || !editorSelection) {
      return null;
    }

    const caretRect = rects.reduce((current: Rect, next: Rect) => {
      if (editorSelection.isBackward) {
        return current.bottom > next.bottom ? current : next;
      }
      return current.top <= next.top ? current : next;
    });

    // The offset of outermost part of the caret
    const caretOffset: Offset = editorSelection.isBackward
      ? upwards
        ? caretRect.topRight
        : caretRect.bottomRight
      : upwards
        ? caretRect.topLeft
        : caretRect.bottomLeft;

    const nodeConfig = editorState.service.rendererService
      .blockComponentBuilder(node.type)?.configuration;
    
    if (!nodeConfig) {
      console.warn('Block Configuration should not be null');
      return position;
    }

    const padding = nodeConfig.padding(node);
    const nodeRect = nodeSelectable.getBlockRect();
    const nodeHeight = nodeRect.height;
    const textHeight = nodeHeight - padding.vertical;
    const caretHeight = caretRect.height;

    // Minimum (acceptable) font size
    const minFontSize = 1.0;
    const remainingMultilineHeight = textHeight - caretHeight;

    // Linear search for a new position
    let newOffset = caretOffset;
    let newPosition: Position | null = null;
    
    for (let y = minFontSize; y < remainingMultilineHeight + minFontSize; y += minFontSize) {
      newOffset = {
        dx: caretOffset.dx,
        dy: caretOffset.dy + (upwards ? -y : y)
      };

      newPosition = editorState.service.selectionService.getPositionInOffset(newOffset);

      if (newPosition && !this.positionsEqual(newPosition, position)) {
        return newPosition;
      }
    }

    // Handle case where no new position found in multiline
    const globalVerticalPadding = editorState.editorStyle.padding.vertical;
    const maxSkip = upwards
      ? padding.top + globalVerticalPadding
      : padding.bottom + globalVerticalPadding;

    newOffset = {
      dx: newOffset.dx,
      dy: newOffset.dy + (upwards ? -maxSkip : maxSkip)
    };

    const nodeHeightOffset = nodeRenderBox.localToGlobal({ dx: 0, dy: nodeHeight });
    newOffset = {
      dx: newOffset.dx,
      dy: Math.min(newOffset.dy, nodeHeightOffset.dy)
    };

    newPosition = editorState.service.selectionService.getPositionInOffset(newOffset);

    if (newPosition && !this.positionsEqual(newPosition, position)) {
      return newPosition;
    }

    // Handle edge cases
    let offset = editorSelection.end.offset;
    const nodePath = editorSelection.end.path;
    let neighbourPath = upwards ? this.previousPath(nodePath) : this.nextPath(nodePath);
    
    if (this.pathsEqual(neighbourPath, nodePath)) {
      const last = neighbourPath.pop();
      if (last !== undefined) {
        neighbourPath = upwards ? neighbourPath : [...neighbourPath, last + 1];
      }
    }

    if (neighbourPath.length > 0 && !this.pathsEqual(neighbourPath, nodePath)) {
      const neighbour = editorState.document.nodeAtPath(neighbourPath);
      const selectable = neighbour?.selectable;
      
      if (selectable) {
        const start = selectable.start().offset;
        const end = selectable.end().offset;
        offset = Math.max(start, Math.min(offset, end));
        return { path: neighbourPath, offset };
      }
    }

    const delta = node.delta;
    if (delta) {
      if (upwards) {
        return { path: position.path, offset: 0 };
      } else {
        return { path: position.path, offset: delta.length };
      }
    }

    return position;
  }

  private static positionsEqual(pos1: Position, pos2: Position): boolean {
    return pos1.offset === pos2.offset && this.pathsEqual(pos1.path, pos2.path);
  }

  private static pathsEqual(path1: number[], path2: number[]): boolean {
    if (path1.length !== path2.length) return false;
    return path1.every((val, index) => val === path2[index]);
  }

  private static previousPath(path: number[]): number[] {
    const newPath = [...path];
    if (newPath.length > 0) {
      newPath[newPath.length - 1] = Math.max(0, newPath[newPath.length - 1] - 1);
    }
    return newPath;
  }

  private static nextPath(path: number[]): number[] {
    const newPath = [...path];
    if (newPath.length > 0) {
      newPath[newPath.length - 1] = newPath[newPath.length - 1] + 1;
    }
    return newPath;
  }
}