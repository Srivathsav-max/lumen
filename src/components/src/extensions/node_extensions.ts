import { Node } from '../core/document/node';
import { Selection } from '../core/location/selection';
import { Delta } from '../core/document/text_delta';
import { Path, pathLessThanOrEqual } from '../core/document/path';

export interface NodeExtensions {
  renderBox: DOMElement | null;
  context: any | null;
  selectable: SelectableMixin | null;
  level: number;
  rect: DOMRect;
}

export interface SelectableMixin {
  getCursorRectInPosition(position: any, options?: any): DOMRect | null;
  transformRectToGlobal(rect: DOMRect, options?: any): DOMRect;
  getRectsInSelection(selection: Selection, options?: any): DOMRect[];
}

// Extend Node class with additional methods
declare module '../core/document/node' {
  interface Node extends NodeExtensions {}
}

// Implementation of extensions as functions that can be mixed in
export function getNodeRenderBox(node: Node): DOMElement | null {
  // In a web environment, this would get the DOM element
  // For now, returning null as placeholder
  return null;
}

export function getNodeContext(node: Node): any | null {
  // In a web environment, this would get the React context or similar
  return null;
}

export function getNodeSelectable(node: Node): SelectableMixin | null {
  // This would return the selectable interface implementation
  return null;
}

export function getNodeLevel(node: Node): number {
  let level = 0;
  let parent = node.parent;
  while (parent !== null) {
    level++;
    parent = parent.parent;
  }
  return level;
}

export function nodeInSelection(node: Node, selection: Selection): boolean {
  const normalizedSelection = selection.normalized;
  return pathLessThanOrEqual(normalizedSelection.start.path, node.path) &&
         pathLessThanOrEqual(node.path, normalizedSelection.end.path);
}

export function getNodeRect(node: Node): DOMRect {
  const renderBox = getNodeRenderBox(node);
  if (renderBox) {
    const rect = renderBox.getBoundingClientRect();
    return rect;
  }
  return new DOMRect(0, 0, 0, 0);
}

export function findPreviousNodeWhere(
  node: Node, 
  test: (element: Node) => boolean
): Node | null {
  let previous = node.previous;
  while (previous !== null) {
    const last = findLastChildWhere(previous, test);
    if (last !== null) {
      return last;
    }
    if (test(previous)) {
      return previous;
    }
    previous = previous.previous;
  }
  
  const parent = node.parent;
  if (parent !== null) {
    if (test(parent)) {
      return parent;
    }
    return findPreviousNodeWhere(parent, test);
  }
  return null;
}

export function findLastChildWhere(
  node: Node, 
  test: (element: Node) => boolean
): Node | null {
  const children = [...node.children].reverse();
  for (const child of children) {
    if (child.children.length > 0) {
      const last = findLastChildWhere(child, test);
      if (last !== null) {
        return last;
      }
    }
    if (test(child)) {
      return child;
    }
  }
  return null;
}

export function findNodeDownward(
  node: Node, 
  test: (element: Node) => boolean
): Node | null {
  const children = [...node.children];
  for (const child of children) {
    if (test(child)) {
      return child;
    }
    if (child.children.length > 0) {
      const found = findNodeDownward(child, test);
      if (found !== null) {
        return found;
      }
    }
  }
  
  const next = node.next;
  if (next !== null) {
    if (test(next)) {
      return next;
    }
    return findNodeDownward(next, test);
  }
  return null;
}

export function nodeAllSatisfyInSelection(
  node: Node,
  selection: Selection,
  test: (delta: Delta) => boolean
): boolean {
  if (selection.isCollapsed) {
    return false;
  }

  const normalizedSelection = selection.normalized;
  let delta = node.delta;
  if (!delta) {
    return false;
  }

  delta = delta.slice(normalizedSelection.startIndex, normalizedSelection.endIndex);
  return test(delta);
}

export function nodeIsParentOf(node: Node, otherNode: Node): boolean {
  let parent = otherNode.parent;
  while (parent !== null) {
    if (parent.id === node.id) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

export function findNodeParent(
  node: Node, 
  test: (element: Node) => boolean
): Node | null {
  if (test(node)) {
    return node;
  }
  const parent = node.parent;
  return parent ? findNodeParent(parent, test) : null;
}

// Extensions for Node arrays
export function normalizeNodes<T extends Node>(nodes: T[]): T[] {
  if (nodes.length === 0) {
    return nodes;
  }

  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  
  if (pathLessThanOrEqual(last.path, first.path)) {
    return [...nodes].reverse();
  }

  return nodes;
}

export function nodesAllSatisfyInSelection<T extends Node>(
  nodes: T[],
  selection: Selection,
  test: (delta: Delta) => boolean
): boolean {
  if (selection.isCollapsed) {
    return false;
  }

  const normalizedSelection = selection.normalized;
  const normalizedNodes = normalizeNodes(nodes);

  if (normalizedNodes.length === 1) {
    return nodeAllSatisfyInSelection(normalizedNodes[0], selection, test);
  }

  for (let i = 0; i < normalizedNodes.length; i++) {
    const node = normalizedNodes[i];
    let delta = node.delta;
    if (!delta || delta.length === 0) {
      continue;
    }

    if (i === 0) {
      delta = delta.slice(normalizedSelection.start.offset);
    } else if (i === normalizedNodes.length - 1) {
      delta = delta.slice(0, normalizedSelection.end.offset);
    }
    
    if (!test(delta)) {
      return false;
    }
  }

  return true;
}