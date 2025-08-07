export type ToolbarItemEventHandler = (
  editorState: any,
  context: any
) => void;

export type ToolbarItemValidator = (editorState: any) => boolean;

export type ToolbarItemHighlightCallback = (editorState: any) => boolean;

export type ToolbarTooltipBuilder = (message: string) => any;

export interface ToolbarItemOptions {
  id: string;
  group: number;
  type?: number;
  tooltipsMessage?: string;
  iconBuilder?: (isHighlight: boolean) => any;
  validator?: ToolbarItemValidator;
  highlightCallback?: ToolbarItemHighlightCallback;
  handler?: ToolbarItemEventHandler;
  itemBuilder?: (context: any, editorState: any) => any;
  isActive?: (editorState: any) => boolean;
  builder?: (
    context: any,
    editorState: any,
    highlightColor: string,
    iconColor?: string,
    tooltipBuilder?: ToolbarTooltipBuilder
  ) => any;
}

export class ToolbarItem {
  public readonly id: string;
  public readonly group: number;
  public readonly type: number;
  public readonly tooltipsMessage: string;
  public readonly validator?: ToolbarItemValidator;
  public readonly iconBuilder?: (isHighlight: boolean) => any;
  public readonly handler?: ToolbarItemEventHandler;
  public readonly highlightCallback?: ToolbarItemHighlightCallback;
  public readonly itemBuilder?: (context: any, editorState: any) => any;
  public readonly isActive?: (editorState: any) => boolean;
  public readonly builder?: (
    context: any,
    editorState: any,
    highlightColor: string,
    iconColor?: string,
    tooltipBuilder?: ToolbarTooltipBuilder
  ) => any;

  constructor(options: ToolbarItemOptions) {
    this.id = options.id;
    this.group = options.group;
    this.type = options.type ?? 1;
    this.tooltipsMessage = options.tooltipsMessage ?? '';
    this.validator = options.validator;
    this.iconBuilder = options.iconBuilder;
    this.handler = options.handler;
    this.highlightCallback = options.highlightCallback;
    this.itemBuilder = options.itemBuilder;
    this.isActive = options.isActive;
    this.builder = options.builder;
  }

  static divider(): ToolbarItem {
    return new ToolbarItem({
      id: 'divider',
      type: -1,
      group: -1,
      iconBuilder: (_) => ({ type: 'svg', name: 'toolbar/divider' }),
      validator: (editorState) => true,
      handler: (editorState, context) => {},
      highlightCallback: (editorState) => false,
    });
  }

  equals(other: ToolbarItem): boolean {
    return this.id === other.id;
  }

  hashCode(): number {
    return this.id.length; // Simple hash based on id length
  }
}

// Block type constants - these would be imported from the actual block components
const ParagraphBlockKeys = { type: 'paragraph' };
const NumberedListBlockKeys = { type: 'numbered_list' };
const BulletedListBlockKeys = { type: 'bulleted_list' };
const QuoteBlockKeys = { type: 'quote' };
const TodoListBlockKeys = { type: 'todo_list' };
const HeadingBlockKeys = { type: 'heading' };

export const toolbarItemWhiteList = new Set([
  ParagraphBlockKeys.type,
  NumberedListBlockKeys.type,
  BulletedListBlockKeys.type,
  QuoteBlockKeys.type,
  TodoListBlockKeys.type,
  HeadingBlockKeys.type,
]);

export function onlyShowInSingleSelectionAndTextType(editorState: any): boolean {
  const selection = editorState.selection;
  if (!selection || !selection.isSingle) {
    return false;
  }
  
  const node = editorState.getNodeAtPath(selection.start.path);
  if (!node) {
    return false;
  }
  
  return node.delta != null && toolbarItemWhiteList.has(node.type);
}

export function onlyShowInTextType(editorState: any): boolean {
  const selection = editorState.selection;
  if (!selection) {
    return false;
  }
  
  const nodes = editorState.getNodesInSelection(selection);
  return nodes.every((node: any) => 
    node.delta != null && toolbarItemWhiteList.has(node.type)
  );
}