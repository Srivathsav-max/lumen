import { EditorState } from '../../../../editor_state';
import { CharacterShortcutEvent } from '../character_shortcut_event';
import { AppFlowyRichTextKeys } from '../../../../block_component/rich_text/rich_text_keys';

/**
 * Format the markdown link syntax to hyperlink
 */
export const formatMarkdownLinkToLink = new CharacterShortcutEvent({
  key: 'format the text surrounded by double asterisks to bold',
  character: ')',
  handler: async (editorState) => handleFormatMarkdownLinkToLink({ editorState }),
});

const linkRegex = /\[([^\]]*)\]\((.*?)\)/;

export function handleFormatMarkdownLinkToLink(options: {
  editorState: EditorState;
}): boolean {
  const { editorState } = options;
  const selection = editorState.selection;
  
  // If the selection is not collapsed or the cursor is at the first 5 index range, we don't need to format it.
  // We should return false to let the IME handle it.
  if (!selection || !selection.isCollapsed || selection.end.offset < 6) {
    return false;
  }

  const path = selection.end.path;
  const node = editorState.getNodeAtPath(path);
  const delta = node?.delta;
  
  // If the node doesn't contain the delta (which means it isn't a text), we don't need to format it.
  if (!node || !delta) {
    return false;
  }

  const slicedDelta = delta.slice(0, selection.end.offset);
  const plainText = `${slicedDelta.toPlainText()})`;

  // Determine if regex matches the plainText
  if (!linkRegex.test(plainText)) {
    return false;
  }

  const matches = Array.from(plainText.matchAll(new RegExp(linkRegex, 'g')));
  const lastMatch = matches[matches.length - 1];
  const title = lastMatch[1];
  const link = lastMatch[2];

  // If all the conditions are met, we should format the text to a link
  const transaction = editorState.transaction;
  transaction.deleteText(
    node,
    lastMatch.index!,
    lastMatch[0].length - 1,
  );
  transaction.insertText(
    node,
    lastMatch.index!,
    title,
    {
      attributes: {
        [AppFlowyRichTextKeys.href]: link,
      },
    }
  );
  editorState.apply(transaction);

  return true;
}