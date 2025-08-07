import { EditorState } from '../../../core/editor_state';
import { Attributes } from '../../../core/attributes';
import { KeyEventResult } from '../../service/shortcuts/command_shortcut_event';
import { outdentCommand } from './outdent_command';
import { convertToParagraphCommand } from './convert_to_paragraph_command';

export async function insertNewLineInType(
  editorState: EditorState,
  type: string,
  attributes: Attributes = {},
): Promise<boolean> {
  // check if the shift key is pressed, if so, we should return false to let the system handle it.
  const isShiftPressed = this.isShiftKeyPressed();
  if (isShiftPressed) {
    return false;
  }

  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) {
    return false;
  }

  const node = editorState.getNodeAtPath(selection.end.path);
  const delta = node?.delta;
  if (node?.type !== type || !delta) {
    return false;
  }

  if (selection.startIndex === 0 && delta.isEmpty) {
    // clear the style
    if (node && node.path.length > 1) {
      return KeyEventResult.ignored !== outdentCommand.execute(editorState);
    }
    return KeyEventResult.ignored !==
        convertToParagraphCommand.execute(editorState);
  }

  await editorState.insertNewLine({
    nodeBuilder: (node) => node.copyWith({
      type,
      attributes: {
        ...node.attributes,
        ...attributes,
      },
    }),
  });
  return true;
}

// Helper function to check if shift key is pressed
function isShiftKeyPressed(): boolean {
  // In a real implementation, this would check the current keyboard state
  // For now, return false as a placeholder
  return false;
}