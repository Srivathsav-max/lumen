import { Selection } from '../../core/location/selection';
import { Node } from '../../core/document/node';
import { Position } from '../../core/location/position';

// This would be mixed into EditorState class
export interface SelectableExtension {
  selection: Selection | null;
  getNodeAtPath(path: number[]): Node | null;
  getNodesInSelection(selection: Selection): Node[];
}

export class EditorStateSelectableExtension {
  /// Gets the selected text content
  static getSelectedText(editorState: SelectableExtension): string {
    const selection = editorState.selection;
    if (!selection || selection.isCollapsed) {
      return '';
    }

    const nodes = editorState.getNodesInSelection(selection);
    const textParts: string[] = [];

    for (const node of nodes) {
      const delta = node.delta;
      if (!delta) continue;

      let startIndex = 0;
      let endIndex = delta.length;

      if (node === nodes[0]) {
        startIndex = selection.startIndex;
      }
      if (node === nodes[nodes.length - 1]) {
        endIndex = selection.endIndex;
      }

      const slicedDelta = delta.slice(startIndex, endIndex);
      textParts.push(slicedDelta.toPlainText());
    }

    return textParts.join('\n');
  }

  /// Checks if the current selection contains only text
  static isTextOnlySelection(editorState: SelectableExtension): boolean {
    const selection = editorState.selection;
    if (!selection) return false;

    const nodes = editorState.getNodesInSelection(selection);
    return nodes.every(node => node.delta != null);
  }

  /// Gets the word boundary at the given position
  static getWordBoundaryAtPosition(
    editorState: SelectableExtension,
    position: Position
  ): Selection | null {
    const node = editorState.getNodeAtPath(position.path);
    if (!node || !node.delta) return null;

    const text = node.delta.toPlainText();
    const offset = position.offset;

    if (offset < 0 || offset > text.length) return null;

    // Find word boundaries
    const wordRegex = /\b/g;
    const boundaries: number[] = [0];
    
    let match;
    while ((match = wordRegex.exec(text)) !== null) {
      boundaries.push(match.index);
    }
    boundaries.push(text.length);

    // Find the word containing the offset
    let startIndex = 0;
    let endIndex = text.length;

    for (let i = 0; i < boundaries.length - 1; i++) {
      if (offset >= boundaries[i] && offset <= boundaries[i + 1]) {
        startIndex = boundaries[i];
        endIndex = boundaries[i + 1];
        break;
      }
    }

    return Selection.single({
      path: position.path,
      startOffset: startIndex,
      endOffset: endIndex,
    });
  }

  /// Gets the line boundary at the given position
  static getLineBoundaryAtPosition(
    editorState: SelectableExtension,
    position: Position
  ): Selection | null {
    const node = editorState.getNodeAtPath(position.path);
    if (!node || !node.delta) return null;

    // For now, treat each node as a single line
    return Selection.single({
      path: position.path,
      startOffset: 0,
      endOffset: node.delta.length,
    });
  }

  /// Checks if the selection spans multiple nodes
  static isMultiNodeSelection(editorState: SelectableExtension): boolean {
    const selection = editorState.selection;
    if (!selection) return false;

    return !selection.isSingle;
  }

  /// Gets the first selected node
  static getFirstSelectedNode(editorState: SelectableExtension): Node | null {
    const selection = editorState.selection;
    if (!selection) return null;

    return editorState.getNodeAtPath(selection.start.path);
  }

  /// Gets the last selected node
  static getLastSelectedNode(editorState: SelectableExtension): Node | null {
    const selection = editorState.selection;
    if (!selection) return null;

    return editorState.getNodeAtPath(selection.end.path);
  }
}