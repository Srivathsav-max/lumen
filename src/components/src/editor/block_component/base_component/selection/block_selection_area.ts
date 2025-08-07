import { Node, EditorState, Selection, SelectionType } from '../../../../core/editor_state';
import { Component, ComponentChild } from '../../../../core/component';
import { SelectableMixin } from '../mixins';
import { SelectionAreaPaint } from './selection_area_painter';
import { Cursor } from '../../../../render/selection/cursor';
import { MobileSelectionDragMode, selectionDragModeKey } from '../../../../service/selection/mobile_selection_service';
import { deepEqual } from '../../../../core/utils';

export enum BlockSelectionType {
  cursor = 'cursor',
  selection = 'selection',
  block = 'block',
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/// [BlockSelectionArea] is a widget that renders the selection area or the cursor of a block.
interface BlockSelectionAreaProps {
  // get the cursor rect or selection rects from the delegate
  delegate: SelectableMixin;
  // get the selection from the listenable
  listenable: { value: Selection | null; addListener: (fn: () => void) => void; removeListener: (fn: () => void) => void };
  // the color of the cursor
  cursorColor: string;
  // the color of the selection
  selectionColor: string;
  blockColor: string;
  // the node of the block
  node: Node;
  supportTypes?: BlockSelectionType[];
}

interface BlockSelectionAreaState {
  // keep the previous cursor rect to avoid unnecessary rebuild
  prevCursorRect: Rect | null;
  // keep the previous selection rects to avoid unnecessary rebuild
  prevSelectionRects: Rect[] | null;
  // keep the block selection rect to avoid unnecessary rebuild
  prevBlockRect: Rect | null;
}

export class BlockSelectionArea extends Component<BlockSelectionAreaProps, BlockSelectionAreaState> {
  // We need to keep the key to refresh the cursor status when typing continuously.
  private cursorKey: string;
  private updateListener: () => void;

  constructor(props: BlockSelectionAreaProps) {
    super(props);
    this.cursorKey = `cursor_${props.node.path.join('_')}`;
    this.state = {
      prevCursorRect: null,
      prevSelectionRects: null,
      prevBlockRect: null,
    };
    this.updateListener = () => this._clearCursorRect();
  }

  componentDidMount(): void {
    requestAnimationFrame(() => {
      this._updateSelectionIfNeeded();
    });
    this.props.listenable.addListener(this.updateListener);
  }

  componentWillUnmount(): void {
    this.props.listenable.removeListener(this.updateListener);
  }

  render(): ComponentChild {
    const supportTypes = this.props.supportTypes || [
      BlockSelectionType.cursor,
      BlockSelectionType.selection,
    ];

    const sizedBox: ComponentChild = { tag: 'div', style: { display: 'none' } };
    const selection = this.props.listenable.value?.normalized;

    if (!selection) {
      return sizedBox;
    }

    const path = this.props.node.path;
    if (!this.pathInSelection(path, selection)) {
      return sizedBox;
    }

    const editorState = this.getEditorState();
    if (editorState.selectionType === SelectionType.block) {
      if (!supportTypes.includes(BlockSelectionType.block) ||
          !this.pathInSelection(path, selection, true) ||
          !this.state.prevBlockRect) {
        return sizedBox;
      }
      const builder = editorState.service.rendererService
          .blockComponentBuilder(this.props.node.type);
      const padding = builder?.configuration.blockSelectionAreaMargin?.(
        this.props.node,
      );
      return {
        tag: 'div',
        style: {
          position: 'absolute',
          left: `${this.state.prevBlockRect.left}px`,
          top: `${this.state.prevBlockRect.top}px`,
          width: `${this.state.prevBlockRect.width}px`,
          height: `${this.state.prevBlockRect.height}px`,
          margin: padding ? `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px` : '0',
          backgroundColor: this.props.blockColor,
          borderRadius: '4px',
        },
      };
    }
    // show the cursor when the selection is collapsed
    else if (selection.isCollapsed) {
      if (!supportTypes.includes(BlockSelectionType.cursor) ||
          !this.state.prevCursorRect) {
        return sizedBox;
      }
      const dragMode = editorState.selectionExtraInfo?.[selectionDragModeKey];
      const shouldBlink = this.props.delegate.shouldCursorBlink &&
          dragMode !== MobileSelectionDragMode.cursor;
      return new Cursor({
        key: this.cursorKey,
        rect: this.state.prevCursorRect,
        shouldBlink,
        cursorStyle: this.props.delegate.cursorStyle,
        color: this.props.cursorColor,
      });
    } else {
      // show the selection area when the selection is not collapsed
      if (!supportTypes.includes(BlockSelectionType.selection) ||
          !this.state.prevSelectionRects ||
          this.state.prevSelectionRects.length === 0 ||
          (this.state.prevSelectionRects.length === 1 &&
              this.state.prevSelectionRects[0].width === 0)) {
        return sizedBox;
      }
      return new SelectionAreaPaint({
        rects: this.state.prevSelectionRects,
        selectionColor: this.props.selectionColor,
      });
    }
  }

  private _updateSelectionIfNeeded(): void {
    const selection = this.props.listenable.value?.normalized;
    const path = this.props.node.path;

    // the current path is in the selection
    if (selection && this.pathInSelection(path, selection)) {
      const supportTypes = this.props.supportTypes || [
        BlockSelectionType.cursor,
        BlockSelectionType.selection,
      ];

      if (supportTypes.includes(BlockSelectionType.block) &&
          this.getEditorState().selectionType === SelectionType.block) {
        if (!this.pathInSelection(path, selection, true)) {
          if (this.state.prevBlockRect) {
            this.setState({
              prevBlockRect: null,
              prevCursorRect: null,
              prevSelectionRects: null,
            });
          }
        } else {
          const rect = this.props.delegate.getBlockRect();
          if (this.state.prevBlockRect !== rect) {
            this.setState({
              prevBlockRect: rect,
              prevCursorRect: null,
              prevSelectionRects: null,
            });
          }
        }
      } else if (supportTypes.includes(BlockSelectionType.cursor) &&
          selection.isCollapsed) {
        const rect = this.props.delegate.getCursorRectInPosition(selection.start);
        if (this.state.prevCursorRect !== rect) {
          this.setState({
            prevCursorRect: rect,
            prevBlockRect: null,
            prevSelectionRects: null,
          });
        }
      } else if (supportTypes.includes(BlockSelectionType.selection)) {
        const rects = this.props.delegate.getRectsInSelection(selection);
        if (!deepEqual(rects, this.state.prevSelectionRects)) {
          this.setState({
            prevSelectionRects: rects,
            prevCursorRect: null,
            prevBlockRect: null,
          });
        }
      }
    } else if (this.state.prevBlockRect ||
        this.state.prevSelectionRects ||
        this.state.prevCursorRect) {
      this.setState({
        prevBlockRect: null,
        prevSelectionRects: null,
        prevCursorRect: null,
      });
    }

    requestAnimationFrame(() => {
      this._updateSelectionIfNeeded();
    });
  }

  private _clearCursorRect(): void {
    this.setState({ prevCursorRect: null });
  }

  private pathInSelection(path: number[], selection: Selection, isSameDepth: boolean = false): boolean {
    // Simplified implementation - in real code this would be more complex
    return true; // placeholder
  }

  private getEditorState(): EditorState {
    // In real implementation, this would get the editor state from context
    return {} as EditorState;
  }
}