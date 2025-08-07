import { StatefulWidget, State, Widget, BuildContext, Key, VoidCallback, Column, MainAxisAlignment, CrossAxisAlignment, Padding, EdgeInsets, Row, SizedBox, TextField, FocusNode, TextEditingController, Container, BoxConstraints, Alignment, Text, Icon, Icons, Colors } from '../../../flutter/widgets';
import { EditorState } from '../editor_state';
import { FindReplaceStyle, FindReplaceLocalizations } from '../find_replace_style';
import { SearchServiceV3 } from './search_service_v3';
import { FindAndReplaceMenuIconButton } from './find_replace_menu_icon_button';
import { AppFlowyEditorLocalizations } from '../l10n/appflowy_editor_localizations';
import { AppFlowyEditorL10n } from '../l10n/appflowy_editor_l10n';
import { EditorSvg } from '../render/svg';
import { InputDecoration, OutlineInputBorder } from '../../../flutter/material';

const ICON_BUTTON_SIZE = 30;

export class FindAndReplaceMenuWidget extends StatefulWidget {
  readonly editorState: EditorState;
  readonly onDismiss: VoidCallback;

  /// Whether to show the replace menu or not
  readonly showReplaceMenu: boolean;

  /// The style of the find and replace menu
  ///
  /// only works for SearchService, not for SearchServiceV2
  readonly style: FindReplaceStyle;
  readonly showRegexButton: boolean;
  readonly showCaseSensitiveButton: boolean;

  /// The localizations of the find and replace menu
  readonly localizations?: FindReplaceLocalizations;

  /// The default text to search for
  readonly defaultFindText: string;

  /// Whether the search should be case sensitive or not
  readonly caseSensitive: boolean;

  constructor(options: {
    key?: Key;
    localizations?: FindReplaceLocalizations;
    defaultFindText?: string;
    caseSensitive?: boolean;
    onDismiss: VoidCallback;
    editorState: EditorState;
    showReplaceMenu: boolean;
    style: FindReplaceStyle;
    showRegexButton?: boolean;
    showCaseSensitiveButton?: boolean;
  }) {
    super(options.key);
    this.editorState = options.editorState;
    this.onDismiss = options.onDismiss;
    this.showReplaceMenu = options.showReplaceMenu;
    this.style = options.style;
    this.showRegexButton = options.showRegexButton ?? true;
    this.showCaseSensitiveButton = options.showCaseSensitiveButton ?? true;
    this.localizations = options.localizations;
    this.defaultFindText = options.defaultFindText ?? '';
    this.caseSensitive = options.caseSensitive ?? false;
  }

  createState(): State<StatefulWidget> {
    return new FindAndReplaceMenuWidgetState();
  }
}

class FindAndReplaceMenuWidgetState extends State<FindAndReplaceMenuWidget> {
  queriedPattern = '';
  showRegexButton = true;
  showCaseSensitiveButton = true;
  showReplaceMenu = false;

  searchService!: SearchServiceV3;

  initState(): void {
    super.initState();
    this.showReplaceMenu = this.widget.showReplaceMenu;
    this.showRegexButton = this.widget.showRegexButton;
    this.showCaseSensitiveButton = this.widget.showCaseSensitiveButton;

    this.searchService = new SearchServiceV3({
      editorState: this.widget.editorState,
    });
  }

  build(context: BuildContext): Widget {
    return new Column({
      mainAxisAlignment: MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        new Padding({
          padding: EdgeInsets.symmetric({ vertical: 8.0 }),
          child: new FindMenu({
            onDismiss: this.widget.onDismiss,
            editorState: this.widget.editorState,
            style: this.widget.style,
            searchService: this.searchService,
            defaultFindText: this.widget.defaultFindText,
            caseSensitive: this.widget.caseSensitive,
            localizations: this.widget.localizations,
            showReplaceMenu: this.showReplaceMenu,
            onShowReplace: (value) => this.setState(() => {
              this.showReplaceMenu = value;
            }),
          }),
        }),
        this.showReplaceMenu
          ? new Padding({
              padding: EdgeInsets.only({ bottom: 8.0 }),
              child: new ReplaceMenu({
                editorState: this.widget.editorState,
                searchService: this.searchService,
                localizations: this.widget.localizations,
              }),
            })
          : new SizedBox({ width: 0, height: 0 }),
      ],
    });
  }
}

export class FindMenu extends StatefulWidget {
  readonly editorState: EditorState;
  readonly onDismiss: VoidCallback;

  /// The style of the find and replace menu
  ///
  /// only works for SearchService, not for SearchServiceV2
  readonly style: FindReplaceStyle;

  /// The localizations of the find and replace menu
  readonly localizations?: FindReplaceLocalizations;

  /// The default text to search for
  readonly defaultFindText: string;

  /// Whether the search should be case sensitive or not
  readonly caseSensitive: boolean;

  /// Whether to show the replace menu or not
  readonly showReplaceMenu: boolean;

  readonly showRegexButton: boolean;
  readonly showCaseSensitiveButton: boolean;

  readonly onShowReplace: (showReplaceMenu: boolean) => void;

  readonly searchService: SearchServiceV3;

  constructor(options: {
    key?: Key;
    localizations?: FindReplaceLocalizations;
    defaultFindText?: string;
    caseSensitive?: boolean;
    showReplaceMenu?: boolean;
    onDismiss: VoidCallback;
    editorState: EditorState;
    style: FindReplaceStyle;
    searchService: SearchServiceV3;
    onShowReplace: (showReplaceMenu: boolean) => void;
    showRegexButton?: boolean;
    showCaseSensitiveButton?: boolean;
  }) {
    super(options.key);
    this.editorState = options.editorState;
    this.onDismiss = options.onDismiss;
    this.style = options.style;
    this.localizations = options.localizations;
    this.defaultFindText = options.defaultFindText ?? '';
    this.caseSensitive = options.caseSensitive ?? false;
    this.showReplaceMenu = options.showReplaceMenu ?? false;
    this.showRegexButton = options.showRegexButton ?? true;
    this.showCaseSensitiveButton = options.showCaseSensitiveButton ?? true;
    this.onShowReplace = options.onShowReplace;
    this.searchService = options.searchService;
  }

  createState(): State<StatefulWidget> {
    return new FindMenuState();
  }
}

class FindMenuState extends State<FindMenu> {
  readonly findTextFieldFocusNode = new FocusNode();
  readonly findTextEditingController = new TextEditingController();

  message = AppFlowyEditorLocalizations.current.emptySearchBoxHint;

  showReplaceMenu = false;
  caseSensitive = false;

  showRegexButton = true;
  showCaseSensitiveButton = true;

  initState(): void {
    super.initState();

    this.showReplaceMenu = this.widget.showReplaceMenu;
    this.caseSensitive = this.widget.caseSensitive;

    this.showRegexButton = this.widget.showRegexButton;
    this.showCaseSensitiveButton = this.widget.showCaseSensitiveButton;

    this.widget.searchService.matchWrappers.addListener(() => this._setState());
    this.widget.searchService.currentSelectedIndex.addListener(() => this._setState());

    this.findTextEditingController.addListener(() => this._searchPattern());

    // WidgetsBinding.instance.addPostFrameCallback(() => {
    //   this.findTextFieldFocusNode.requestFocus();
    // });
  }

  dispose(): void {
    this.widget.searchService.matchWrappers.removeListener(() => this._setState());
    this.widget.searchService.currentSelectedIndex.removeListener(() => this._setState());
    this.widget.searchService.dispose();
    this.findTextEditingController.removeListener(() => this._searchPattern());
    this.findTextEditingController.dispose();

    super.dispose();
  }

  build(context: BuildContext): Widget {
    // the selectedIndex from searchService is 0-based
    const selectedIndex = this.widget.searchService.selectedIndex + 1;
    const matches = this.widget.searchService.matchWrappers.value;
    return new Row({
      children: [
        // expand/collapse button
        new FindAndReplaceMenuIconButton({
          icon: new Icon(
            this.showReplaceMenu ? Icons.expand_less : Icons.expand_more,
          ),
          onPressed: () => {
            this.widget.onShowReplace(!this.showReplaceMenu);
            this.setState(() => {
              this.showReplaceMenu = !this.showReplaceMenu;
            });
          },
        }),
        // find text field
        new SizedBox({
          width: 200,
          height: 30,
          child: new TextField({
            key: new Key('findTextField'),
            focusNode: this.findTextFieldFocusNode,
            controller: this.findTextEditingController,
            onSubmitted: (_) => {
              this.widget.searchService.navigateToMatch();

              // after update selection or navigate to match, the editor
              //  will request focus, here's a workaround to request the
              //  focus back to the findTextField
              setTimeout(() => {
                if (this.context.mounted) {
                  // FocusScope.of(this.context).requestFocus(
                  //   this.findTextFieldFocusNode,
                  // );
                }
              }, 50);
            },
            decoration: buildInputDecoration(
              this.widget.localizations?.find ?? AppFlowyEditorL10n.current.find,
            ),
          }),
        }),
        // the count of matches
        new Container({
          constraints: new BoxConstraints({ minWidth: 80 }),
          padding: EdgeInsets.symmetric({ horizontal: 8.0 }),
          alignment: Alignment.centerLeft,
          child: new Text(
            matches.length === 0 ? this.message : `${selectedIndex} of ${matches.length}`,
          ),
        }),
        // previous match button
        new FindAndReplaceMenuIconButton({
          iconButtonKey: new Key('previousMatchButton'),
          onPressed: () => {
            // work around to request focus back to the input field
            setTimeout(() => {
              if (this.context.mounted) {
                // FocusScope.of(this.context).requestFocus(
                //   this.findTextFieldFocusNode,
                // );
              }
            }, 10);
            this.widget.searchService.navigateToMatch({ moveUp: true });
          },
          icon: new Icon(Icons.arrow_upward),
          tooltip: this.widget.localizations?.previousMatch ??
            AppFlowyEditorL10n.current.previousMatch,
        }),
        // next match button
        new FindAndReplaceMenuIconButton({
          iconButtonKey: new Key('nextMatchButton'),
          onPressed: () => {
            setTimeout(() => {
              if (this.context.mounted) {
                // FocusScope.of(this.context).requestFocus(
                //   this.findTextFieldFocusNode,
                // );
              }
            }, 10);
            this.widget.searchService.navigateToMatch();
          },
          icon: new Icon(Icons.arrow_downward),
          tooltip: this.widget.localizations?.nextMatch ??
            AppFlowyEditorL10n.current.nextMatch,
        }),
        new FindAndReplaceMenuIconButton({
          iconButtonKey: new Key('closeButton'),
          onPressed: this.widget.onDismiss,
          icon: new Icon(Icons.close),
          tooltip: this.widget.localizations?.close ??
            AppFlowyEditorL10n.current.closeFind,
        }),
        // regex button
        ...(this.showRegexButton ? [
          new FindAndReplaceMenuIconButton({
            key: new Key('findRegexButton'),
            onPressed: () => {
              this.setState(() => {
                this.widget.searchService.regex = !this.widget.searchService.regex;
              });
              this._searchPattern();
            },
            icon: new EditorSvg({
              name: 'regex',
              width: 20,
              height: 20,
              color: this.widget.searchService.regex ? Colors.black : Colors.grey,
            }),
            tooltip: AppFlowyEditorL10n.current.regex,
          }),
        ] : []),
        // case sensitive button
        ...(this.showCaseSensitiveButton ? [
          new FindAndReplaceMenuIconButton({
            key: new Key('caseSensitiveButton'),
            onPressed: () => {
              this.setState(() => {
                this.widget.searchService.caseSensitive =
                  !this.widget.searchService.caseSensitive;
              });
              this._searchPattern();
            },
            icon: new EditorSvg({
              name: 'case_sensitive',
              width: 20,
              height: 20,
              color: this.widget.searchService.caseSensitive
                ? Colors.black
                : Colors.grey,
            }),
            tooltip: AppFlowyEditorL10n.current.caseSensitive,
          }),
        ] : []),
      ],
    });
  }

  private _searchPattern(): void {
    let error: string;

    // the following line needs to be executed even if
    // findTextEditingController.text.isEmpty, otherwise the previous
    // matches will persist
    error = this.widget.searchService.findAndHighlight(this.findTextEditingController.text);

    switch (error) {
      case 'Regex':
        this.message = AppFlowyEditorLocalizations.current.regexError;
        break;
      case 'Empty':
        this.message = AppFlowyEditorLocalizations.current.emptySearchBoxHint;
        break;
      default:
        this.message = this.widget.localizations?.noResult ??
          AppFlowyEditorLocalizations.current.noFindResult;
    }

    this._setState();
  }

  private _setState(): void {
    this.setState(() => {});
  }
}

export class ReplaceMenu extends StatefulWidget {
  readonly editorState: EditorState;

  /// The localizations of the find and replace menu
  readonly localizations?: FindReplaceLocalizations;

  readonly searchService: SearchServiceV3;

  constructor(options: {
    key?: Key;
    editorState: EditorState;
    searchService: SearchServiceV3;
    localizations?: FindReplaceLocalizations;
  }) {
    super(options.key);
    this.editorState = options.editorState;
    this.searchService = options.searchService;
    this.localizations = options.localizations;
  }

  createState(): State<StatefulWidget> {
    return new ReplaceMenuState();
  }
}

class ReplaceMenuState extends State<ReplaceMenu> {
  readonly replaceTextFieldFocusNode = new FocusNode();
  readonly replaceTextEditingController = new TextEditingController();

  build(context: BuildContext): Widget {
    return new Row({
      children: [
        // placeholder for aligning the replace menu
        new SizedBox({
          width: ICON_BUTTON_SIZE,
        }),
        new SizedBox({
          width: 200,
          height: 30,
          child: new TextField({
            key: new Key('replaceTextField'),
            focusNode: this.replaceTextFieldFocusNode,
            autofocus: false,
            controller: this.replaceTextEditingController,
            onSubmitted: (_) => {
              this._replaceSelectedWord();

              setTimeout(() => {
                if (this.context.mounted) {
                  // FocusScope.of(this.context).requestFocus(
                  //   this.replaceTextFieldFocusNode,
                  // );
                }
              }, 50);
            },
            decoration: buildInputDecoration(
              this.widget.localizations?.replace ??
                AppFlowyEditorL10n.current.replace,
            ),
          }),
        }),
        new FindAndReplaceMenuIconButton({
          iconButtonKey: new Key('replaceSelectedButton'),
          onPressed: () => this._replaceSelectedWord(),
          icon: new Icon(Icons.find_replace),
          tooltip: this.widget.localizations?.replace ??
            AppFlowyEditorL10n.current.replace,
        }),
        new FindAndReplaceMenuIconButton({
          iconButtonKey: new Key('replaceAllButton'),
          onPressed: () => this.widget.searchService.replaceAllMatches(
            this.replaceTextEditingController.text,
          ),
          icon: new Icon(Icons.change_circle_outlined),
          tooltip: this.widget.localizations?.replaceAll ??
            AppFlowyEditorL10n.current.replaceAll,
        }),
      ],
    });
  }

  private _replaceSelectedWord(): void {
    this.widget.searchService.replaceSelectedWord(this.replaceTextEditingController.text);
  }
}

function buildInputDecoration(hintText: string): InputDecoration {
  return new InputDecoration({
    contentPadding: EdgeInsets.symmetric({ horizontal: 8 }),
    border: new OutlineInputBorder(),
    hintText: hintText,
  });
}