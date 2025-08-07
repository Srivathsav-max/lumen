import type { ContextMenuItem } from './context_menu';
import type { EditorState } from '../../core/core';

// Handler functions (matching Flutter copy_paste_handler.dart)
const handleCut = (editorState: EditorState) => {
  // Implementation would handle cutting selected text
};

const handleCopy = (editorState: EditorState) => {
  // Implementation would handle copying selected text
};

const handlePaste = (editorState: EditorState) => {
  // Implementation would handle pasting text
};

// Standard context menu items (matching Flutter standardContextMenuItems exactly)
export const standardContextMenuItems: ContextMenuItem[][] = [
  [
    // cut
    {
      name: 'Cut', // Would use localization: AppFlowyEditorL10n.current.cut
      handler: handleCut,
      enabled: true,
    },
    // copy
    {
      name: 'Copy', // Would use localization: AppFlowyEditorL10n.current.copy
      handler: handleCopy,
      enabled: true,
    },
    // paste
    {
      name: 'Paste', // Would use localization: AppFlowyEditorL10n.current.paste
      handler: handlePaste,
      enabled: true,
    },
  ],
];