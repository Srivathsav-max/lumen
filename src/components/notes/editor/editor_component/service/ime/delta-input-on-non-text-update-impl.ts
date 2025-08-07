import {
  EditorState,
  AppFlowyEditorLog,
  Selection,
  Position,
  CharacterShortcutEvent,
  SelectionUpdateReason,
  checkSingleCharacterFormatShouldBeApplied,
  handleFormatByWrappingWithSingleCharacter,
  FormatStyleByWrappingWithSingleChar,
} from '../../appflowy-editor';

export interface TextEditingDeltaNonTextUpdate {
  selection: {
    start: number;
    end: number;
    isCollapsed: boolean;
  };
  composing: {
    start: number;
    end: number;
    isCollapsed: boolean;
  };
}

export interface TextRange {
  start: number;
  end: number;
  isCollapsed: boolean;
}

// Platform detection utilities
const PlatformExtension = {
  get isWindows(): boolean {
    return navigator.platform.indexOf('Win') > -1;
  },
  get isLinux(): boolean {
    return navigator.platform.indexOf('Linux') > -1;
  },
  get isMacOS(): boolean {
    return navigator.platform.indexOf('Mac') > -1;
  },
  get isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  },
  get isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },
};

const TextRangeEmpty: TextRange = {
  start: 0,
  end: 0,
  isCollapsed: true,
};

export const onNonTextUpdate = async (
  nonTextUpdate: TextEditingDeltaNonTextUpdate,
  editorState: EditorState,
  characterShortcutEvents: CharacterShortcutEvent[],
): Promise<void> => {
  AppFlowyEditorLog.input.debug(`onNonTextUpdate: ${JSON.stringify(nonTextUpdate)}`);

  // update the selection on Windows
  //
  // when typing characters with CJK IME on Windows, a non-text update is sent
  // with the selection range.
  const selection = editorState.selection;

  if (await checkIfBacktickPressed(editorState, nonTextUpdate)) {
    return;
  }

  if (PlatformExtension.isWindows) {
    if (selection &&
        nonTextUpdate.composing.isCollapsed &&
        nonTextUpdate.selection.isCollapsed) {
      editorState.selection = Selection.collapsed(
        new Position({
          path: selection.start.path,
          offset: nonTextUpdate.selection.start,
        })
      );
    }
  } else if (PlatformExtension.isLinux) {
    if (selection) {
      editorState.updateSelectionWithReason(
        Selection.collapsed(
          new Position({
            path: selection.start.path,
            offset: nonTextUpdate.selection.start,
          })
        )
      );
    }
  } else if (PlatformExtension.isMacOS) {
    if (selection) {
      editorState.updateSelectionWithReason(
        Selection.collapsed(
          new Position({
            path: selection.start.path,
            offset: nonTextUpdate.selection.start,
          })
        )
      );
    }
  } else if (PlatformExtension.isAndroid) {
    // on some Android keyboards (e.g. Gboard), they use non-text update to update the selection when moving cursor
    // by space bar.
    // for the another keyboards (e.g. system keyboard), they will trigger the
    // `onFloatingCursor` event instead.
    AppFlowyEditorLog.input.debug(`[Android] onNonTextUpdate: ${JSON.stringify(nonTextUpdate)}`);
    if (selection) {
      const nonTextUpdateStart = nonTextUpdate.selection.start;
      const selectionStart = selection.start.offset;
      if (nonTextUpdateStart !== selectionStart) {
        editorState.updateSelectionWithReason(
          Selection.collapsed(
            new Position({
              path: selection.start.path,
              offset: nonTextUpdateStart,
            })
          ),
          { reason: SelectionUpdateReason.uiEvent }
        );
      }
    }
  } else if (PlatformExtension.isIOS) {
    // on iOS, the cursor movement will trigger the `onFloatingCursor` event.
    // so we don't need to handle the non-text update here.
    AppFlowyEditorLog.input.debug(`[iOS] onNonTextUpdate: ${JSON.stringify(nonTextUpdate)}`);
  }
};

const checkIfBacktickPressed = async (
  editorState: EditorState,
  nonTextUpdate: TextEditingDeltaNonTextUpdate,
): Promise<boolean> => {
  // if the composing range is not empty, it means the user is typing a text,
  // so we don't need to handle the backtick pressed event
  if (!nonTextUpdate.composing.isCollapsed) {
    return false;
  }

  // if the selection is not collapsed, it means the user is not typing a text,
  // so we need to handle the backtick pressed event
  if (!nonTextUpdate.selection.isCollapsed) {
    return false;
  }

  const selection = editorState.selection;
  if (selection == null || !selection.isCollapsed) {
    AppFlowyEditorLog.input.debug('selection is null or not collapsed');
    return false;
  }

  const nodes = editorState.getNodesInSelection(selection);
  const node = nodes.length > 0 ? nodes[0] : null;
  if (node == null) {
    AppFlowyEditorLog.input.debug('node is null');
    return false;
  }

  // get last character of the node
  const plainText = node.delta?.toPlainText() || '';
  const lastCharacter = plainText.length > 0 ? plainText[plainText.length - 1] : null;
  if (lastCharacter !== '`') {
    AppFlowyEditorLog.input.debug('last character is not backtick');
    return false;
  }

  // check if the text should be formatted
  const [shouldApplyFormat] = checkSingleCharacterFormatShouldBeApplied({
    editorState: editorState,
    // check before the last character
    selection: selection.shift(-1),
    character: '`',
    formatStyle: FormatStyleByWrappingWithSingleChar.code,
  });

  if (!shouldApplyFormat) {
    AppFlowyEditorLog.input.debug('should not apply format');
    return false;
  }

  const transaction = editorState.transaction;
  const deltaLength = node.delta?.toPlainText().length || 0;
  transaction.deleteText(node, deltaLength - 1, 1);
  await editorState.apply(transaction);

  // remove the last backtick, and try to format the text to code block
  const isFormatted = handleFormatByWrappingWithSingleCharacter({
    editorState: editorState,
    character: '`',
    formatStyle: FormatStyleByWrappingWithSingleChar.code,
  });

  if (!isFormatted) {
    AppFlowyEditorLog.input.debug('format failed');
    // revert the transaction
    editorState.undoManager.undo();
  } else {
    editorState.sliceUpcomingAttributes = false;
  }

  return true;
};