import type { EditorState } from '../../core/core';

// Context menu item interface (matching Flutter ContextMenuItem exactly)
export interface ContextMenuItem {
  name: string; // getName in Flutter
  handler?: (editorState: EditorState) => void; // onPressed in Flutter
  enabled?: boolean;
  icon?: React.ReactNode;
}