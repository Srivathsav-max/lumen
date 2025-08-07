import { EditorState, Selection } from '../../../core';
import { AppFlowyRichTextKeys } from '../../block_component/rich_text/appflowy_rich_text_keys';

export function formatHighlightColor(
  editorState: EditorState,
  selection: Selection | null,
  color: string | null,
  options: { withUpdateSelection?: boolean } = {}
): void {
  const { withUpdateSelection = false } = options;
  
  editorState.formatDelta(
    selection,
    { [AppFlowyRichTextKeys.backgroundColor]: color },
    { withUpdateSelection }
  );
}

export function formatFontColor(
  editorState: EditorState,
  selection: Selection | null,
  color: string | null,
  options: { withUpdateSelection?: boolean } = {}
): void {
  const { withUpdateSelection = false } = options;
  
  editorState.formatDelta(
    selection,
    { [AppFlowyRichTextKeys.textColor]: color },
    { withUpdateSelection }
  );
}