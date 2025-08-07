import { EditorState } from '../editor_state';
import { SearchAlgorithm, BoyerMoore } from './search_algorithm';
import { ValueNotifier } from '../../flutter/widgets';
import { Node } from '../node';
import { Selection } from '../selection';
import { Position } from '../selection/position';
import { SelectionUpdateReason } from '../selection/selection_update_reason';

export const selectionExtraInfoDisableToolbar = 'selectionExtraInfoDisableToolbar';

export class SearchServiceV2 {
  readonly editorState: EditorState;

  //matchedPositions.value will contain a list of positions of the matched patterns
  //the position here consists of the node and the starting offset of the
  //matched pattern. We will use this to traverse between the matched patterns.
  matchedPositions = new ValueNotifier<Position[]>([]);
  searchAlgorithm: SearchAlgorithm = new BoyerMoore();
  queriedPattern = '';
  
  private _caseSensitive = false;
  get caseSensitive(): boolean {
    return this._caseSensitive;
  }
  set caseSensitive(value: boolean) {
    this._caseSensitive = value;
    this.findAndHighlight(this.queriedPattern);
  }

  private _selectedIndex = 0;
  get selectedIndex(): number {
    return this._selectedIndex;
  }
  set selectedIndex(index: number) {
    this._prevSelectedIndex = this._selectedIndex;
    this._selectedIndex = this.matchedPositions.value.length === 0
      ? -1
      : Math.max(0, Math.min(index, this.matchedPositions.value.length - 1));
    this.currentSelectedIndex.value = this._selectedIndex;
  }

  // only used for scrolling to the first or the last match.
  private _prevSelectedIndex = 0;

  currentSelectedIndex = new ValueNotifier(0);

  constructor(options: {
    editorState: EditorState;
  }) {
    this.editorState = options.editorState;
  }

  dispose(): void {
    this.matchedPositions.dispose();
    this.currentSelectedIndex.dispose();
  }

  findAndHighlight(
    pattern: string,
    options: { unHighlight?: boolean } = {}
  ): void {
    const { unHighlight = false } = options;
    
    if (this.queriedPattern !== pattern) {
      this.matchedPositions.value = [];
      this.queriedPattern = pattern;
    }

    if (pattern.length === 0) return;

    this.matchedPositions.value = this._getMatchedPositions({
      pattern: pattern,
      nodes: this.editorState.document.root.children,
    });

    if (this.matchedPositions.value.length > 0) {
      this.selectedIndex = this.selectedIndex;
      this._highlightCurrentMatch(pattern);
    } else {
      this.editorState.updateSelectionWithReason(undefined);
    }
  }

  private _getMatchedPositions(options: {
    pattern: string;
    nodes?: Iterable<Node>;
  }): Position[] {
    const { pattern, nodes = [] } = options;
    const result: Position[] = [];
    
    for (const node of nodes) {
      if (node.delta) {
        const text = node.delta.toPlainText();
        const matches = this.searchAlgorithm.searchMethod(
          this.caseSensitive ? pattern : pattern.toLowerCase(),
          this.caseSensitive ? text : text.toLowerCase(),
        ).map(e => e.index!);
        
        // we will store this list of offsets along with their path,
        // in a list of positions.
        for (const matchedOffset of matches) {
          result.push(new Position({ path: node.path, offset: matchedOffset }));
        }
      }
      result.push(...this._getMatchedPositions({ pattern, nodes: node.children }));
    }
    return result;
  }

  private _highlightCurrentMatch(pattern: string): void {
    const start = this.matchedPositions.value[this.selectedIndex];
    const end = new Position({
      path: start.path,
      offset: start.offset + pattern.length,
    });

    // https://github.com/google/flutter.widgets/issues/151
    // there's a bug in the scrollable_positioned_list package
    // we can't scroll to the index without animation.
    // so we just scroll the position if the index is the first or the last.
    const length = this.matchedPositions.value.length - 1;
    if (this._prevSelectedIndex !== this.selectedIndex &&
        ((this._prevSelectedIndex === length && this.selectedIndex === 0) ||
         (this._prevSelectedIndex === 0 && this.selectedIndex === length))) {
      this.editorState.scrollService?.jumpTo(start.path[0]);
    }

    this.editorState.updateSelectionWithReason(
      new Selection({ start, end }),
      SelectionUpdateReason.uiEvent,
      {
        extraInfo: {
          [selectionExtraInfoDisableToolbar]: true,
        },
      }
    );
  }

  /// This method takes in a boolean parameter moveUp, if set to true,
  /// the match located above the current selected match is newly selected.
  /// Otherwise the match below the current selected match is newly selected.
  navigateToMatch(options: { moveUp?: boolean } = {}): void {
    const { moveUp = false } = options;
    
    if (this.matchedPositions.value.length === 0) return;

    if (moveUp) {
      this.selectedIndex = this.selectedIndex <= 0
        ? this.matchedPositions.value.length - 1
        : this.selectedIndex - 1;
    } else {
      this.selectedIndex = this.selectedIndex >= this.matchedPositions.value.length - 1
        ? 0
        : this.selectedIndex + 1;
    }

    this._highlightCurrentMatch(this.queriedPattern);
  }

  /// Replaces the current selected word with replaceText.
  /// After replacing the selected word, this method selects the next
  /// matched word if that exists.
  async replaceSelectedWord(replaceText: string): Promise<void> {
    if (replaceText.length === 0 ||
        this.queriedPattern.length === 0 ||
        this.matchedPositions.value.length === 0) {
      return;
    }

    const start = this.matchedPositions.value[this.selectedIndex];
    const node = this.editorState.getNodeAtPath(start.path)!;
    const transaction = this.editorState.transaction;
    transaction.replaceText(
      node,
      start.offset,
      this.queriedPattern.length,
      replaceText,
    );
    await this.editorState.apply(transaction);

    this.matchedPositions.value = [];
    this.findAndHighlight(this.queriedPattern);
  }

  /// Replaces all the found occurrences of pattern with replaceText
  replaceAllMatches(replaceText: string): void {
    if (replaceText.length === 0 ||
        this.queriedPattern.length === 0 ||
        this.matchedPositions.value.length === 0) {
      return;
    }

    // _highlightAllMatches(queriedPattern.length, unHighlight: true);
    for (const match of [...this.matchedPositions.value].reverse()) {
      const node = this.editorState.getNodeAtPath(match.path)!;

      const transaction = this.editorState.transaction;
      transaction.replaceText(
        node,
        match.offset,
        this.queriedPattern.length,
        replaceText,
      );

      this.editorState.apply(transaction);
    }
    this.matchedPositions.value = [];
  }
}