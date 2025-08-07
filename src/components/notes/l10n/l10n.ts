// Simplified localization for AppFlowy Editor
// This is a basic implementation - in a real app you'd use a proper i18n library

export class AppFlowyEditorLocalizations {
  private static _current: AppFlowyEditorLocalizations = new AppFlowyEditorLocalizations();

  static get current(): AppFlowyEditorLocalizations {
    return AppFlowyEditorLocalizations._current;
  }

  static setCurrent(localizations: AppFlowyEditorLocalizations): void {
    AppFlowyEditorLocalizations._current = localizations;
  }

  // Text formatting
  get bold(): string { return 'Bold'; }
  get italic(): string { return 'Italic'; }
  get underline(): string { return 'Underline'; }
  get strikethrough(): string { return 'Strikethrough'; }
  get code(): string { return 'Code'; }

  // Block types
  get bulletedList(): string { return 'Bulleted List'; }
  get numberedList(): string { return 'Numbered List'; }
  get checkbox(): string { return 'Checkbox'; }
  get quote(): string { return 'Quote'; }
  get heading1(): string { return 'H1'; }
  get heading2(): string { return 'H2'; }
  get heading3(): string { return 'H3'; }
  get text(): string { return 'Text'; }
  get image(): string { return 'Image'; }
  get divider(): string { return 'Divider'; }
  get table(): string { return 'Table'; }

  // Colors
  get color(): string { return 'Color'; }
  get highlight(): string { return 'Highlight'; }
  get backgroundColor(): string { return 'Background Color'; }
  get textColor(): string { return 'Text Color'; }
  get highlightColor(): string { return 'Highlight Color'; }

  // Font colors
  get fontColorDefault(): string { return 'Default'; }
  get fontColorGray(): string { return 'Gray'; }
  get fontColorBrown(): string { return 'Brown'; }
  get fontColorOrange(): string { return 'Orange'; }
  get fontColorYellow(): string { return 'Yellow'; }
  get fontColorGreen(): string { return 'Green'; }
  get fontColorBlue(): string { return 'Blue'; }
  get fontColorPurple(): string { return 'Purple'; }
  get fontColorPink(): string { return 'Pink'; }
  get fontColorRed(): string { return 'Red'; }

  // Background colors
  get backgroundColorDefault(): string { return 'Default background'; }
  get backgroundColorGray(): string { return 'Gray background'; }
  get backgroundColorBrown(): string { return 'Brown background'; }
  get backgroundColorOrange(): string { return 'Orange background'; }
  get backgroundColorYellow(): string { return 'Yellow background'; }
  get backgroundColorGreen(): string { return 'Green background'; }
  get backgroundColorBlue(): string { return 'Blue background'; }
  get backgroundColorPurple(): string { return 'Purple background'; }
  get backgroundColorPink(): string { return 'Pink background'; }
  get backgroundColorRed(): string { return 'Red background'; }

  // Actions
  get done(): string { return 'Done'; }
  get cancel(): string { return 'Cancel'; }
  get cut(): string { return 'Cut'; }
  get copy(): string { return 'Copy'; }
  get paste(): string { return 'Paste'; }
  get link(): string { return 'Link'; }
  get openLink(): string { return 'Open link'; }
  get copyLink(): string { return 'Copy link'; }
  get removeLink(): string { return 'Remove link'; }
  get editLink(): string { return 'Edit link'; }

  // Placeholders
  get listItemPlaceholder(): string { return 'List item'; }
  get toDoPlaceholder(): string { return 'To-do'; }
  get slashPlaceHolder(): string { return 'Enter a / to insert a block, or start typing'; }

  // Find and replace
  get find(): string { return 'Find'; }
  get replace(): string { return 'Replace'; }
  get replaceAll(): string { return 'Replace all'; }
  get previousMatch(): string { return 'Previous match'; }
  get nextMatch(): string { return 'Next match'; }
  get closeFind(): string { return 'Close'; }
  get caseSensitive(): string { return 'Case sensitive'; }
  get regex(): string { return 'Regex'; }
  get noFindResult(): string { return 'No result'; }

  // Text direction
  get ltr(): string { return 'LTR'; }
  get rtl(): string { return 'RTL'; }
  get auto(): string { return 'Auto'; }

  // Text alignment
  get textAlignLeft(): string { return 'Align Left'; }
  get textAlignCenter(): string { return 'Align Center'; }
  get textAlignRight(): string { return 'Align Right'; }

  // Table actions
  get colAddBefore(): string { return 'Add before'; }
  get colAddAfter(): string { return 'Add after'; }
  get colRemove(): string { return 'Remove'; }
  get colDuplicate(): string { return 'Duplicate'; }
  get colClear(): string { return 'Clear Content'; }
  get rowAddBefore(): string { return 'Add before'; }
  get rowAddAfter(): string { return 'Add after'; }
  get rowRemove(): string { return 'Remove'; }
  get rowDuplicate(): string { return 'Duplicate'; }
  get rowClear(): string { return 'Clear Content'; }

  // Image
  get uploadImage(): string { return 'Upload'; }
  get urlImage(): string { return 'URL'; }
  get chooseImage(): string { return 'Choose an image'; }
  get loading(): string { return 'Loading'; }
  get imageLoadFailed(): string { return 'Could not load the image'; }

  // URLs and links
  get urlHint(): string { return 'URL'; }
  get addYourLink(): string { return 'Add your link'; }
  get linkText(): string { return 'Text'; }
  get linkTextHint(): string { return 'Please enter text'; }
  get linkAddressHint(): string { return 'Please enter URL'; }
  get incorrectLink(): string { return 'Incorrect Link'; }

  // Custom colors
  get customColor(): string { return 'Custom color'; }
  get hexValue(): string { return 'Hex value'; }
  get opacity(): string { return 'Opacity'; }
  get resetToDefaultColor(): string { return 'Reset to default color'; }
  get clearHighlightColor(): string { return 'Clear highlight color'; }
}