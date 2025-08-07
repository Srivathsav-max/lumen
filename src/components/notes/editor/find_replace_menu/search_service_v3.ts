import { EditorState } from '../editor_state';
import { SearchAlgorithm, DartBuiltIn } from './search_algorithm';
import { ValueNotifier } from '../../flutter/widgets';
import { Node } from '../node';
import { Selection } from '../selection';
import { Position } from '../selection/position';
import { Path } from '../node/path';
import { SelectionUpdateReason } from '../selection/selection_update_reason';

export const selectionExtraInfoDisableToolbar = 'selectionExtraInfoDisableToolbar';

export class SearchServiceV3 {
  readonly editorState: EditorState;

  // matchWrappers.value will contain a list of matchWrappers of the matched patterns
  // the position here consists of the match and the node path of
  // matched pattern. We will use this to traverse between the matched patterns.
  matchWrappers = new ValueNotifier<MatchWrapper[]>([]);
  searchAlgorithm: SearchAlgorithm = new DartBuiltIn();
  targetString = '';
  queriedPattern: RegExp = new RegExp('');

  private _regex = false;
  get regex(): boolean {
    return this._regex;
  }
  set regex(value: boolean) {
    this._regex = value;
    this.findAndHighlight(this.targetString);
  }

  private _caseSensitive = false;
  get caseSensitive(): boolean {
    return this._caseSensitive;
  }
  set caseSensitive(value: boolean) {
    this._caseSensitive = value;
    this.findAndHighlight(this.targetString);
  }

  private _selectedIndex = 0;
  get selectedIndex(): number {
    return this._selectedIndex;
  }
  set selectedIndex(index: number) {
    this._selectedIndex = this.matchWrappers.value.length === 0
      ? -1
      : Math.max(0, Math.min(index, this.matchWrappers.value.length - 1));
    this.currentSelectedIndex.value = this._selectedIndex;
  }

  currentSelectedIndex = new ValueNotifier(0);

  constructor(options: {
    editorState: EditorState;
  }) {
    this.editorState = options.editorState;
  }

  private _getPattern(targetString: string): RegExp {
    if (this.regex) {
      return new RegExp(targetString, this.caseSensitive ? '' : 'i');
    } else {
      return new RegExp(this._escapeRegExp(targetString), this.caseSensitive ? '' : 'i');
    }
  }

  private _escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private _getRegexReplaced(replaceText: string, match: RegExpMatchArray): string {
    let replacedText = replaceText;
    for (let i = 0; i <= (match.length - 1); i++) {
      replacedText = replacedText.replace(new RegExp(`\\\\${i}`, 'g'), match[i] || '');
    }
    return replacedText;
  }

  dispose(): void {
    this.matchWrappers.dispose();
    this.currentSelectedIndex.dispose();
  }

  // Public entry method for _findAndHighlight, do necessary checks
  // and clear previous highlights before calling the private method
  findAndHighlight(target: string): string {
    let pattern: RegExp;

    try {
      pattern = this._getPattern(target);
    } catch (error) {
      this.matchWrappers.value = [];
      return 'Regex';
    }

    if (this.queriedPattern.source !== pattern.source || this.queriedPattern.flags !== pattern.flags) {
      // this means we have a new pattern, but before we highlight the new matches,
      // lets unhighlight the old pattern
      this._findAndHighlight(this.queriedPattern, { unHighlight: true });
      this.matchWrappers.value = [];
      this.queriedPattern = pattern;
      this.targetString = target;
    }

    if (target.length === 0) return 'Empty';

    this._findAndHighlight(pattern);

    return '';
  }

  /// Finds the pattern in editorState.document and stores it in matchedPositions.
  /// Calls the highlightMatch method to highlight the pattern
  /// if it is found.
  private _findAndHighlight(
    pattern: RegExp,
    options: { unHighlight?: boolean } = {}
  ): void {
    const { unHighlight = false } = options;
    
    this.matchWrappers.value = this._getMatchWrappers({
      pattern: pattern,
      nodes: this.editorState.document.root.children,
    });

    if (this.matchWrappers.value.length === 0 || unHighlight) {
      this.editorState.updateSelectionWithReason(
        undefined,
        SelectionUpdateReason.searchHighlight,
        {
          extraInfo: {
            selectionExtraInfoDoNotAttachTextService: true,
          },
        }
      );
    } else {
      this.selectedIndex = this.selectedIndex;
      this._highlightCurrentMatch(pattern);
    }
  }

  private _getMatchWrappers(options: {
    pattern: RegExp;
    nodes?: Iterable<Node>;
  }): MatchWrapper[] {
    const { pattern, nodes = [] } = options;
    const result: MatchWrapper[] = [];
    
    for (const node of nodes) {
      if (node.delta) {
        const text = node.delta.toPlainText();
        const matches = this.searchAlgorithm.searchMethod(pattern, text);
        // we will store this list of offsets along with their path,
        // in a list of positions.
        for (const match of matches) {
          result.push(new MatchWrapper(match, node.path));
        }
      }
      result.push(...this._getMatchWrappers({ pattern, nodes: node.children }));
    }
    return result;
  }

  private _highlightCurrentMatch(pattern: RegExp): void {
    const matchWrapper = this.matchWrappers.value[this.selectedIndex];
    const { selection, path } = matchWrapper;

    this.editorState.scrollService?.jumpTo(path[0]);

    this.editorState.updateSelectionWithReason(
      selection,
      SelectionUpdateReason.searchHighlight,
      {
        extraInfo: {
          [selectionExtraInfoDisableToolbar]: true,
          selectionExtraInfoDoNotAttachTextService: true,
        },
      }
    );
  }

  /// This method takes in a boolean parameter moveUp, if set to true,
  /// the match located above the current selected match is newly selected.
  /// Otherwise the match below the current selected match is newly selected.
  navigateToMatch(options: { moveUp?: boolean } = {}): void {
    const { moveUp = false } = options;
    
    if (this.matchWrappers.value.length === 0) return;

    if (moveUp) {
      this.selectedIndex = this.selectedIndex <= 0
        ? this.matchWrappers.value.length - 1
        : this.selectedIndex - 1;
    } else {
      this.selectedIndex = this.selectedIndex >= this.matchWrappers.value.length - 1
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
        this.queriedPattern.source.length === 0 ||
        this.matchWrappers.value.length === 0) {
      return;
    }

    const matchWrap = this.matchWrappers.value[this.selectedIndex];
    const node = this.editorState.getNodeAtPath(matchWrap.path)!;

    let replaced: string;
    if (this.regex) {
      replaced = this._getRegexReplaced(replaceText, matchWrap.match as RegExpMatchArray);
    } else {
      replaced = replaceText;
    }

    const transaction = this.editorState.transaction;
    transaction.replaceText(
      node,
      matchWrap.selection.start.offset,
      matchWrap.selection.length,
      replaced,
    );
    await this.editorState.apply(transaction);

    this.matchWrappers.value = [];
    this._findAndHighlight(this.queriedPattern);
  }

  /// Replaces all the found occurrences of pattern with replaceText
  replaceAllMatches(replaceText: string): void {
    if (replaceText.length === 0 ||
        this.queriedPattern.source.length === 0 ||
        this.matchWrappers.value.length === 0) {
      return;
    }

    // _highlightAllMatches(queriedPattern.length, unHighlight: true);
    for (const matchWrap of [...this.matchWrappers.value].reverse()) {
      const node = this.editorState.getNodeAtPath(matchWrap.path)!;
      let replaced: string;
      if (this.regex) {
        replaced = this._getRegexReplaced(replaceText, matchWrap.match as RegExpMatchArray);
      } else {
        replaced = replaceText;
      }

      const transaction = this.editorState.transaction;
      transaction.replaceText(
        node,
        matchWrap.selection.startIndex,
        matchWrap.selection.length,
        replaced,
      );

      this.editorState.apply(transaction);
    }
    this.matchWrappers.value = [];
  }
}

export class MatchWrapper {
  readonly match: RegExpMatchArray;
  readonly path: Path;

  constructor(match: RegExpMatchArray, path: Path) {
    this.match = match;
    this.path = path;
  }

  get selection(): Selection {
    return new Selection({
      start: new Position({ path: this.path, offset: this.match.index! }),
      end: new Position({ path: this.path, offset: this.match.index! + this.match[0].length }),
    });
  }
}