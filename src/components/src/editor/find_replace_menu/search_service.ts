// Search service for finding and replacing text patterns in the editor
import { SearchAlgorithm, BoyerMoore, Match } from './search_algorithm';

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Position {
  path: number[];
  offset: number;
}

export interface Selection {
  start: Position;
  end: Position;
}

export interface Node {
  path: number[];
  delta?: any;
}

export interface EditorState {
  document: any;
  selection: Selection | null;
  formatDelta(selection: Selection, attributes: Record<string, any>, options?: any): void;
  undoManager: any;
  getNodeAtPath(path: number[]): Node | null;
  transaction: any;
  apply(transaction: any): void;
}

export class SearchStyle {
  selectedHighlightColor: Color;
  unselectedHighlightColor: Color;

  constructor(options: {
    selectedHighlightColor?: Color;
    unselectedHighlightColor?: Color;
  } = {}) {
    this.selectedHighlightColor = options.selectedHighlightColor || {
      r: 1.0, g: 0.725, b: 0.192, a: 1.0 // #FFB931
    };
    this.unselectedHighlightColor = options.unselectedHighlightColor || {
      r: 0.925, g: 0.737, b: 0.373, a: 0.376 // #60ECBC5F
    };
  }
}

export class SearchService {
  private editorState: EditorState;
  private style: SearchStyle;
  private matchedPositions: Position[] = [];
  private searchAlgorithm: SearchAlgorithm = new BoyerMoore();
  private queriedPattern: string = '';
  private selectedIndex: number = 0;

  constructor(editorState: EditorState, style: SearchStyle) {
    this.editorState = editorState;
    this.style = style;
  }

  /**
   * Finds the pattern in editorState.document and stores it in matchedPositions.
   * Calls the highlightMatch method to highlight the pattern if it is found.
   */
  findAndHighlight(pattern: string, options: { unHighlight?: boolean } = {}): void {
    const { unHighlight = false } = options;

    if (this.queriedPattern !== pattern) {
      // New pattern - unhighlight old pattern first
      this.findAndHighlight(this.queriedPattern, { unHighlight: true });
      this.matchedPositions = [];
      this.queriedPattern = pattern;
    }

    if (pattern.length === 0) return;

    // Traverse all nodes
    for (const node of this._getAllNodes()) {
      if (!node.delta) continue;
      
      const text = node.delta.toPlainText();
      const matches = this.searchAlgorithm.searchMethod(pattern, text);
      
      // Store positions of matches
      for (const match of matches) {
        this.matchedPositions.push({
          path: node.path,
          offset: match.start
        });
      }
    }

    // Highlight all matches
    this._highlightAllMatches(pattern.length, unHighlight);
    this.selectedIndex = -1;
  }

  private _getAllNodes(): Node[] {
    const contents = this.editorState.document.root.children;
    if (!contents || contents.length === 0) return [];

    const firstNode = contents.find((el: Node) => el.delta != null);
    const lastNode = contents.reverse().find((el: Node) => el.delta != null);
    
    if (!firstNode || !lastNode) return [];

    // Get all text nodes between first and last
    const nodes: Node[] = [];
    // This would need to be implemented based on your NodeIterator
    // For now, returning all nodes with delta
    return contents.filter((node: Node) => node.delta != null);
  }

  private _highlightAllMatches(patternLength: number, unHighlight: boolean = false): void {
    for (const match of this.matchedPositions) {
      const start: Position = { path: match.path, offset: match.offset };
      const end: Position = {
        path: match.path,
        offset: match.offset + patternLength
      };

      const selection: Selection = { start, end };
      if (!unHighlight) {
        this.editorState.selection = selection;
      }
    }
  }

  private async _selectWordAtPosition(start: Position, isNavigating: boolean = false): Promise<void> {
    const end: Position = {
      path: start.path,
      offset: start.offset + this.queriedPattern.length
    };

    const selection: Selection = { start, end };
    this._applySelectedHighlightColor(selection, { isSelected: true });
  }

  /**
   * Navigate to the next/previous match
   * @param moveUp - If true, move to previous match; if false, move to next match
   */
  navigateToMatch(options: { moveUp?: boolean } = {}): void {
    const { moveUp = false } = options;
    
    if (this.matchedPositions.length === 0) return;

    // Change highlight color of current match to indicate it's not selected
    if (this.selectedIndex > -1) {
      const currentMatch = this.matchedPositions[this.selectedIndex];
      const end: Position = {
        path: currentMatch.path,
        offset: currentMatch.offset + this.queriedPattern.length
      };

      const selection: Selection = { start: currentMatch, end };
      this._applySelectedHighlightColor(selection);
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
    this._selectWordAtPosition(match, true);
  }

  /**
   * Replace the currently selected word with replaceText
   */
  replaceSelectedWord(replaceText: string): void {
    if (!replaceText || !this.queriedPattern || this.matchedPositions.length === 0) {
      return;
    }

    if (this.selectedIndex === -1) {
      this.selectedIndex++;
    }

    const position = this.matchedPositions[this.selectedIndex];
    this._selectWordAtPosition(position);

    // Unhighlight the selected word before replacement
    const selection = this.editorState.selection!;
    this.editorState.formatDelta(selection, {
      findBackgroundColor: null
    });
    this.editorState.undoManager.forgetRecentUndo();

    const textNode = this.editorState.getNodeAtPath(position.path)!;
    const transaction = this.editorState.transaction.replaceText(
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
   * Replace all found occurrences of pattern with replaceText
   */
  replaceAllMatches(replaceText: string): void {
    if (!replaceText || !this.queriedPattern || this.matchedPositions.length === 0) {
      return;
    }

    this._highlightAllMatches(this.queriedPattern.length, true);
    
    // Process matches in reverse order to maintain correct offsets
    for (const match of [...this.matchedPositions].reverse()) {
      const node = this.editorState.getNodeAtPath(match.path)!;
      const transaction = this.editorState.transaction.replaceText(
        node,
        match.offset,
        this.queriedPattern.length,
        replaceText
      );

      this.editorState.apply(transaction);
    }
    
    this.matchedPositions = [];
  }

  private _applySelectedHighlightColor(
    selection: Selection, 
    options: { isSelected?: boolean } = {}
  ): void {
    const { isSelected = false } = options;
    
    const color = isSelected
      ? this._colorToHex(this.style.selectedHighlightColor)
      : this._colorToHex(this.style.unselectedHighlightColor);
      
    this.editorState.formatDelta(selection, {
      findBackgroundColor: color
    }, { withUpdateSelection: false });
  }

  private _colorToHex(color: Color): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`;
  }
}