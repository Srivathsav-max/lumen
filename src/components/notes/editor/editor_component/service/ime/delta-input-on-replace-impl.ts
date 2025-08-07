import { EditorState, Selection, Position, CharacterShortcutEvent } from '../../types';
import { executeCharacterShortcutEvent } from './character-shortcut-event-helper';
import { onInsert } from './delta-input-on-insert-impl';

// Platform detection utility
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// TextRange interface
interface TextRange {
  start: number;
  end: number;
}

// TextSelection interface
interface TextSelection {
  baseOffset: number;
  extentOffset: number;
}

// TextEditingDeltaReplacement interface
interface TextEditingDeltaReplacement {
  oldText: string;
  replacementText: string;
  replacedRange: TextRange;
  selection: TextSelection;
  composing: TextRange;
}

// TextEditingDeltaInsertion interface
interface TextEditingDeltaInsertion {
  oldText: string;
  textInserted: string;
  insertionOffset: number;
  selection: TextSelection;
  composing: TextRange;
}

export const onReplace = async (
  replacement: TextEditingDeltaReplacement,
  editorState: EditorState,
  characterShortcutEvents: CharacterShortcutEvent[]
): Promise<void> => {
  console.debug('onReplace:', replacement);

  // delete the selection
  const selection = editorState.selection;
  if (!selection) {
    return;
  }

  if (selection.isSingle) {
    const execution = await executeCharacterShortcutEvent(
      editorState,
      replacement.replacementText,
      characterShortcutEvents
    );

    if (execution) {
      return;
    }

    let modifiedReplacement = replacement;
    if (isIOS()) {
      // remove the trailing '\n' when pressing the return key
      if (replacement.replacementText.endsWith('\n')) {
        modifiedReplacement = {
          oldText: replacement.oldText,
          replacementText: replacement.replacementText.substring(
            0,
            replacement.replacementText.length - 1
          ),
          replacedRange: replacement.replacedRange,
          selection: replacement.selection,
          composing: replacement.composing,
        };
      }
    }

    const nodes = editorState.getNodesInSelection?.(selection);
    if (!nodes || nodes.length === 0) {
      return;
    }
    
    const node = nodes[0];
    const transaction = editorState.transaction;
    const start = modifiedReplacement.replacedRange.start;
    const length = modifiedReplacement.replacedRange.end - start;
    const afterSelection = new Selection(
      new Position(
        node.path,
        modifiedReplacement.selection.baseOffset
      ),
      new Position(
        node.path,
        modifiedReplacement.selection.extentOffset
      )
    );
    
    if (transaction) {
      transaction.replaceText?.(node, start, length, modifiedReplacement.replacementText);
      transaction.afterSelection = afterSelection;
      await editorState.apply?.(transaction);
    }
  } else {
    await editorState.deleteSelection?.(selection);
    // insert the replacement
    const insertion = toInsertion(replacement);
    await onInsert(
      insertion,
      editorState,
      characterShortcutEvents
    );
  }
};

// Extension method equivalent - convert TextEditingDeltaReplacement to TextEditingDeltaInsertion
const toInsertion = (replacement: TextEditingDeltaReplacement): TextEditingDeltaInsertion => {
  const text = replacement.oldText.substring(0, replacement.replacedRange.start) +
    replacement.oldText.substring(replacement.replacedRange.end);
  
  return {
    oldText: text,
    textInserted: replacement.replacementText,
    insertionOffset: replacement.replacedRange.start,
    selection: replacement.selection,
    composing: replacement.composing,
  };
};