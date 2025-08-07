import { EditorState } from '../../../../../editor_state';
import { Selection } from '../../../../../selection';

/**
 * If prefixCharacter is null or empty, character is used
 */
export async function handleDoubleCharacterReplacement(options: {
  editorState: EditorState;
  character: string;
  replacement: string;
  prefixCharacter?: string;
}): Promise<boolean> {
  const { editorState, character, replacement, prefixCharacter } = options;
  
  console.assert(character.length === 1);

  let selection = editorState.selection;
  if (!selection) {
    return false;
  }

  if (!selection.isCollapsed) {
    await editorState.deleteSelection(selection);
    selection = editorState.selection;
    if (!selection) {
      return false;
    }
  }

  const node = editorState.getNodeAtPath(selection.end.path);
  const delta = node?.delta;
  if (!node || !delta || delta.isEmpty) {
    return false;
  }

  if (selection.end.offset > 0) {
    const plain = delta.toPlainText();

    const expectedPrevious = 
      (prefixCharacter === undefined || prefixCharacter === '') 
        ? character 
        : prefixCharacter;

    const previousCharacter = plain[selection.end.offset - 1];
    if (previousCharacter !== expectedPrevious) {
      return false;
    }

    const replace = editorState.transaction;
    replace.replaceText(
      node,
      selection.end.offset - 1,
      1,
      replacement,
    );

    await editorState.apply(replace);

    return true;
  }

  return false;
}