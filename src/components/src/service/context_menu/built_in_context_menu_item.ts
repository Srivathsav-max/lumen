import { AppFlowyEditorL10n } from '../../editor/l10n/appflowy_editor_l10n';
import { handleCut, handleCopy, handlePaste } from '../internal_key_event_handlers/copy_paste_handler';
import { ContextMenuItemImpl } from './context_menu';

export const standardContextMenuItems = [
  [
    // cut
    new ContextMenuItemImpl({
      getName: () => AppFlowyEditorL10n.current.cut,
      onPressed: (editorState) => {
        handleCut(editorState);
      },
    }),
    // copy
    new ContextMenuItemImpl({
      getName: () => AppFlowyEditorL10n.current.copy,
      onPressed: (editorState) => {
        handleCopy(editorState);
      },
    }),
    // paste
    new ContextMenuItemImpl({
      getName: () => AppFlowyEditorL10n.current.paste,
      onPressed: (editorState) => {
        handlePaste(editorState);
      },
    }),
  ],
];