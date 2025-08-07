/**
 * AppFlowyEditor TypeScript library
 * Main entry point for the AppFlowy Editor components and utilities
 */

// Main editor component (full Flutter-compatible version)
export { AppFlowyEditor, type AppFlowyEditorProps } from './editor/editor_component/service/editor';

// Core exports (selective to avoid conflicts)
export type {
    EditorState,
    Node,
    Document,
    Position,
    Selection,
    TextInsert,
    Delta,
    Attributes
} from './core/core';

// Extensions (selective to avoid conflicts)
export {
    TextAlign,
    Alignment,
    AppFlowyTextAlign,
    ColorExtension,
    TextSpanExtensions,
    TextStyleExtensions
} from './extensions/extensions';

export type {
    TextStyle,
    TextSpan
} from './extensions/extensions';

// Rich text components 
export { AppFlowyRichText } from './editor/block_component/rich_text/appflowy_rich_text';
export { AppFlowyRichTextKeys } from './editor/block_component/rich_text/appflowy_rich_text_keys';
