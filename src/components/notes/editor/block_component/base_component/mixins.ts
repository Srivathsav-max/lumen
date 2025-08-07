import { EditorState, Node, Position, Selection } from '../../../core/editor_state';
import { BlockComponentConfiguration } from './block_component_configuration';
import { TextDirection } from './text_direction_mixin';
import { Alignment } from './align_mixin';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Offset {
  x: number;
  y: number;
}

export enum CursorStyle {
  verticalLine = 'vertical-line',
  cover = 'cover',
}

// Base mixin interfaces
export interface SelectableMixin {
  shouldCursorBlink: boolean;
  cursorStyle: CursorStyle;
  start(): Position;
  end(): Position;
  getPositionInOffset(start: Offset): Position;
  getBlockRect(options?: { shiftWithBaseOffset?: boolean }): Rect;
  getCursorRectInPosition(position: Position, options?: { shiftWithBaseOffset?: boolean }): Rect | null;
  getRectsInSelection(selection: Selection, options?: { shiftWithBaseOffset?: boolean }): Rect[];
  getSelectionInRange(start: Offset, end: Offset): Selection;
  localToGlobal(offset: Offset, options?: { shiftWithBaseOffset?: boolean }): Offset;
}

export interface DefaultSelectableMixin extends SelectableMixin {
  // Default implementations can be provided here
}

export interface BlockComponentConfigurable {
  configuration: BlockComponentConfiguration;
  node: Node;
  padding: string;
  textStyleWithTextSpan(options?: { textSpan?: any }): any;
  placeholderTextStyleWithTextSpan(options?: { textSpan?: any }): any;
  placeholderText: string;
  textAlign: string;
}

export interface BlockComponentBackgroundColorMixin {
  node: Node;
  backgroundColor: string;
}

export interface NestedBlockComponentStatefulWidgetMixin {
  // Add nested block component specific methods
}

export interface BlockComponentTextDirectionMixin {
  editorState: EditorState;
  node: Node;
  lastDirection?: TextDirection;
  calculateTextDirection(layoutDirection?: TextDirection): TextDirection;
}

export interface BlockComponentAlignMixin {
  node: Node;
  alignment: Alignment | null;
}

// Helper functions for implementing mixins
export function createSelectableMixin(node: Node): SelectableMixin {
  return {
    shouldCursorBlink: true,
    cursorStyle: CursorStyle.verticalLine,
    start: () => new Position(node.path, 0),
    end: () => new Position(node.path, 1),
    getPositionInOffset: (start: Offset) => new Position(node.path, 0),
    getBlockRect: (options = {}) => ({ left: 0, top: 0, width: 0, height: 0 }),
    getCursorRectInPosition: (position: Position, options = {}) => null,
    getRectsInSelection: (selection: Selection, options = {}) => [],
    getSelectionInRange: (start: Offset, end: Offset) => Selection.single(node.path, 0, 1),
    localToGlobal: (offset: Offset, options = {}) => offset,
  };
}

export function createBlockComponentConfigurable(
  configuration: BlockComponentConfiguration,
  node: Node,
): BlockComponentConfigurable {
  return {
    configuration,
    node,
    get padding() { return configuration.padding(node); },
    textStyleWithTextSpan: (options = {}) => configuration.textStyle(node, options.textSpan),
    placeholderTextStyleWithTextSpan: (options = {}) => configuration.placeholderTextStyle(node, options.textSpan),
    get placeholderText() { return configuration.placeholderText(node); },
    get textAlign() { return configuration.textAlign(node); },
  };
}