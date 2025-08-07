import { EditorState } from '../../../editor_state';
import { Node } from '../../../node';
import { EditorScrollController } from '../scroll/editor_scroll_controller';
import { Offset, Rect } from '../../../../flutter/widgets';
import { AppFlowyEditorLog } from '../../../log';

declare module '../../../editor_state' {
  interface EditorState {
    getVisibleNodes(controller: EditorScrollController): Node[];
    getNodeInOffset(
      sortedNodes: Node[],
      offset: Offset,
      start: number,
      end: number,
    ): Node | undefined;
  }
}

// Extension methods for EditorState
EditorState.prototype.getVisibleNodes = function(controller: EditorScrollController): Node[] {
  const sortedNodes: Node[] = [];
  const positions = controller.visibleRangeNotifier.value;
  // https://github.com/AppFlowy-IO/AppFlowy/issues/3651
  const min = Math.max(positions[0] - 1, 0);
  const max = positions[1];
  if (min < 0 || max < 0) {
    return sortedNodes;
  }

  let i = -1;
  for (const child of this.document.root.children) {
    i++;
    if (min > i) {
      continue;
    }
    if (i > max) {
      break;
    }
    sortedNodes.push(child);
  }
  return sortedNodes;
};

EditorState.prototype.getNodeInOffset = function(
  sortedNodes: Node[],
  offset: Offset,
  start: number,
  end: number,
): Node | undefined {
  if (start < 0 && end >= sortedNodes.length) {
    return undefined;
  }

  let min = this._findCloseNode(
    sortedNodes,
    start,
    end,
    {
      match: (index, rect) => {
        const isMatch = rect.contains(offset);
        AppFlowyEditorLog.selection.debug(
          `findNodeInOffset: ${index}, rect: ${rect}, offset: ${offset}, isMatch: ${isMatch}`,
        );
        return isMatch;
      },
      compare: (index, rect) => rect.bottom <= offset.dy,
    }
  );

  const filteredNodes = [...sortedNodes].filter(n => n.rect.bottom === sortedNodes[min].rect.bottom);
  min = 0;
  if (filteredNodes.length > 1) {
    min = this._findCloseNode(
      sortedNodes,
      0,
      filteredNodes.length - 1,
      {
        match: (index, rect) => {
          const isMatch = rect.contains(offset);
          AppFlowyEditorLog.selection.debug(
            `findNodeInOffset: ${index}, rect: ${rect}, offset: ${offset}, isMatch: ${isMatch}`,
          );
          return isMatch;
        },
        compare: (index, rect) => rect.right <= offset.dx,
      }
    );
  }

  const node = filteredNodes[min];
  if (node.children.length > 0 &&
      node.children[0].renderBox !== undefined &&
      node.children[0].rect.top <= offset.dy) {
    const children = [...node.children].sort(
      (a, b) => a.rect.bottom !== b.rect.bottom
        ? a.rect.bottom - b.rect.bottom
        : a.rect.left - b.rect.left,
    );

    return this.getNodeInOffset(
      children,
      offset,
      0,
      children.length - 1,
    );
  }
  return node;
};

EditorState.prototype._findCloseNode = function(
  sortedNodes: Node[],
  start: number,
  end: number,
  options: {
    match?: (index: number, rect: Rect) => boolean;
    compare: (index: number, rect: Rect) => boolean;
  }
): number {
  const { match, compare } = options;
  
  for (let i = start; i <= end; i++) {
    const rect = sortedNodes[i].rect;
    if (match && match(i, rect)) {
      return i;
    }
  }

  let min = start;
  let max = end;
  while (min <= max) {
    const mid = min + ((max - min) >> 1);
    const rect = sortedNodes[mid].rect;
    if (compare(mid, rect)) {
      min = mid + 1;
    } else {
      max = mid - 1;
    }
  }

  return Math.max(start, Math.min(min, end));
};