import { EditorState } from '../../editor_state';
import { Position } from '../../core/location/position';
import { Selection } from '../../core/location/selection';
import { Node } from '../../core/document/node';
import { NodeIterator } from '../../core/document/node_iterator';
import { SearchAlgorithm, BoyerMoore } from './search_algorithm';
import { AppFlowyRichTextKeys } from '../block_component/rich_text/appflowy_rich_text_keys';

export class SearchStyle {
  selectedHighlightColor: string;
  unselectedHighlightColor: string;

  constructor(options: {
    selectedHighlightColor?: string;
    unselectedHighlightColor?: string;
  } = {}) {
    this.selectedHighlightColor = options.selectedHighlightColor ?? '#FFB931';
    this.unselectedHighlightColor = options.unselectedHighlightColor ?? '#ECBC5F60';
  }
}

export class SearchService {
  editorState: EditorState;
  style: SearchStyle;
  matchedPositions: Position[] = [];
  searchAlgorithm: SearchAlgorithm = new BoyerMoore();
  queriedPattern: string = '';
  selectedIndex: number = 0;

  constructor(options: {
    editorState: EditorState;
    style: SearchStyle;
  }) {
    this.editorState = options.editorState;
    this.style = options.style;
  }

  /**
   * Finds the pattern in editorState.document and stores it in matchedPositions.
   * Calls the highlightMatch method to highlight the pattern if it is found.
   */
  findAndHighlight(pattern: string, options: { unHighlight?: boolean } = {}): void {
    const { unHighlight = false } = options;

    if (this.queriedPattern !== pattern) {
      // This means we have a new pattern, but before we highlight the new matches,
      // let's unhighlight the old pattern
      this.findAndHighlight(this.queriedPattern, { unHighlight: true });
      this.matchedPositions = [];
      this.queriedPattern = pattern;
    }

    if (pattern === '') return;

    // Traversing all the nodes
    for (const node of this.getAllNodes()) {
      // matches list will contain the offsets where the desired word is found
      const matches = this.searchAlgorithm
        .searchMethod(pattern, node.delta!.toPlainText())
        .map(match => match.start);

      // We will store this list of offsets along with their path in a list of positions
      for (const matchedOffset of matches) {
        this.matchedPositions.push(new Position({
          path: node.path,
          offset: matchedOffset
        }));
      }
    }

    // Finally we will highlight all the matches
    this.highlightAllMatches(pattern.length, { unHighlight });
    this.selectedIndex = -1;
  }

  private getAllNodes(): Node[] {
    const contents = this.editorState.document.root.children;
    if (contents.length === 0) return [];

    const firstNode = contents.find(el => el.delta !== null);
    const lastNode = contents.reverse().find(el => el.delta !== null);

    if (!firstNode || !lastNode) return [];

    // Iterate within all the text nodes of the document
    const nodes = new NodeIterator({
      document: this.editorState.document,
      startNode: firstNode,
      endNode: lastNode
    }).toArray();

    return nodes.filter(node => node.delta !== null);
  }

  private highlightAllMatches(patternLength: number, options: { unHighlight?: boolean } = {}): void {
    const { unHighlight = false } = options;

    for (const match of this.matchedPositions) {
      const start = new Position({ path: match.path, offset: match.offset });
      const end = new Position({
        path: match.path,
        offset: match.offset + patternLength
      });

      const selection = new Selection({ start, end });
      if (!unHighlight) {
        this.editorState.selection = selection;
      }
    }
  }

  private async selectWordAtPosition(start: Position, isNavigating: boolean = false): Promise<void> {
    const end = new Position({
      path: start.path,
      offset: start.offset + this.queriedPattern.length
    });

    const selection = new Selection({ start, end });
    this.applySelectedHighlightColor(selection, { isSelected: true });
  }

  /**
   * This method takes in a boolean parameter moveUp, if set to true,
   * the match located above the current selected match is newly selected.
   * Otherwise the match below the current selected match is newly selected.
   */
  navigateToMatch(options: { moveUp?: boolean } = {}): void {
    const { moveUp = false } = options;

    if (this.matchedPositions.length === 0) return;

    // Let's change the highlight color to indicate that the current match is not selected
    if (this.selectedIndex > -1) {
      const currentMatch = this.matchedPositions[this.selectedIndex];
      const end = new Position({
        path: currentMatch.path,
        offset: currentMatch.offset + this.queriedPattern.length
      });

      const selection = new Selection({ start: currentMatch, end });
      this.applySelectedHighlightColor(selection);
    }

    if (moveUp) {
      this.selectedIndex = this.selectedIndex - 1 < 0 
        ? this.matchedPositions.length - 1 
        : this.selectedIndex - 1;
    } else {
      this.selectedIndex = (this.selectedIndex + 1) < this.matchedPositions.length 
        ? this.selectedIndex + 1 
        : 0;
    }

    const match = this.matchedPositions[this.selectedIndex];
    this.selectWordAtPosition(match, true);
  }

  /**
   * Replaces the current selected word with replaceText.
   * After replacing the selected word, this method selects the next
   * matched word if that exists.
   */
  replaceSelectedWord(replaceText: string): void {
    if (replaceText === '' || 
        this.queriedPattern === '' || 
        this.matchedPositions.length === 0) {
      return;
    }

    if (this.selectedIndex === -1) {
      this.selectedIndex++;
    }

    const position = this.matchedPositions[this.selectedIndex];
    this.selectWordAtPosition(position);

    // Unhighlight the selected word before it is replaced
    const selection = this.editorState.selection!;
    this.editorState.formatDelta(selection, {
      [AppFlowyRichTextKeys.findBackgroundColor]: null
    });
    this.editorState.undoManager.forgetRecentUndo();

    const textNode = this.editorState.getNodeAtPath(position.path)!;
    const transaction = this.editorState.transaction;
    transaction.replaceText(
      textNode,
      position.offset,
      this.queriedPattern.length,
      replaceText
    );

    this.editorState.apply(transaction);

    this.matchedPositions = [];
    this.findAndHighlight(this.queriedPattern);
  }

  /**
   * Replaces all the found occurrences of pattern with replaceText
   */
  replaceAllMatches(replaceText: string): void {
    if (replaceText === '' || 
        this.queriedPattern === '' || 
        this.matchedPositions.length === 0) {
      return;
    }

    this.highlightAllMatches(this.queriedPattern.length, { unHighlight: true });
    
    for (const match of [...this.matchedPositions].reverse()) {
      const node = this.editorState.getNodeAtPath(match.path)!;

      const transaction = this.editorState.transaction;
      transaction.replaceText(
        node,
        match.offset,
        this.queriedPattern.length,
        replaceText
      );

      this.editorState.apply(transaction);
    }
    
    this.matchedPositions = [];
  }

  private applySelectedHighlightColor(
    selection: Selection, 
    options: { isSelected?: boolean } = {}
  ): void {
    const { isSelected = false } = options;
    
    const color = isSelected
      ? this.style.selectedHighlightColor
      : this.style.unselectedHighlightColor;

    this.editorState.formatDelta(selection, {
      [AppFlowyRichTextKeys.findBackgroundColor]: color
    }, { withUpdateSelection: false });
  }
}

// Helper function to convert color to hex (simplified implementation)
declare global {
  interface String {
    toHex(): string;
  }
}

String.prototype.toHex = function(): string {
  // Simple implementation - in a real app you'd want a proper color conversion
  return this.toString();
};