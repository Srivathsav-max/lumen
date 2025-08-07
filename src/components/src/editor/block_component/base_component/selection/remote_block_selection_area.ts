import { Node, Selection } from '../../../../core/editor_state';
import { Component, ComponentChild } from '../../../../core/component';
import { SelectableMixin } from '../mixins';
import { BlockSelectionType, Rect } from './block_selection_area';
import { SelectionAreaPaint } from './selection_area_painter';
import { Cursor } from '../../../../render/selection/cursor';
import { RemoteSelection } from './remote_selection';
import { deepEqual } from '../../../../core/utils';

interface RemoteBlockSelectionsAreaProps {
  node: Node;
  delegate: SelectableMixin;
  remoteSelections: { value: RemoteSelection[]; addListener: (fn: () => void) => void; removeListener: (fn: () => void) => void };
  supportTypes?: BlockSelectionType[];
}

export class RemoteBlockSelectionsArea extends Component<RemoteBlockSelectionsAreaProps> {
  render(): ComponentChild {
    const supportTypes = this.props.supportTypes || [
      BlockSelectionType.cursor,
      BlockSelectionType.selection,
    ];

    const child: ComponentChild = { tag: 'div', style: { display: 'none' } };
    const selections = this.props.remoteSelections.value
        .filter((e) => this.nodeInSelection(this.props.node, e.selection.normalized));
    
    if (selections.length === 0) {
      return child;
    }

    return {
      tag: 'div',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
      },
      children: selections.map((e, index) => 
        new RemoteBlockSelectionArea({
          key: index.toString(),
          node: this.props.node,
          delegate: this.props.delegate,
          remoteSelection: e,
          supportTypes,
        }),
      ),
    };
  }

  private nodeInSelection(node: Node, selection: Selection): boolean {
    // Simplified implementation - in real code this would be more complex
    return true; // placeholder
  }
}

/// [RemoteBlockSelectionArea] is a widget that renders the selection area or the cursor of a block from remote.
interface RemoteBlockSelectionAreaProps {
  key?: string;
  node: Node;
  delegate: SelectableMixin;
  remoteSelection: RemoteSelection;
  supportTypes?: BlockSelectionType[];
}

interface RemoteBlockSelectionAreaState {
  // keep the previous cursor rect to avoid unnecessary rebuild
  prevCursorRect: Rect | null;
  // keep the previous selection rects to avoid unnecessary rebuild
  prevSelectionRects: Rect[] | null;
  // keep the block selection rect to avoid unnecessary rebuild
  prevBlockRect: Rect | null;
}

export class RemoteBlockSelectionArea extends Component<RemoteBlockSelectionAreaProps, RemoteBlockSelectionAreaState> {
  constructor(props: RemoteBlockSelectionAreaProps) {
    super(props);
    this.state = {
      prevCursorRect: null,
      prevSelectionRects: null,
      prevBlockRect: null,
    };
  }

  componentDidMount(): void {
    requestAnimationFrame(() => {
      this._updateSelectionIfNeeded();
    });
  }

  render(): ComponentChild {
    const supportTypes = this.props.supportTypes || [
      BlockSelectionType.cursor,
      BlockSelectionType.selection,
    ];

    const child: ComponentChild = { tag: 'div', style: { display: 'none' } };
    const selection = this.props.remoteSelection.selection;
    
    if (selection.isCollapsed) {
      // show the cursor when the selection is collapsed
      if (!supportTypes.includes(BlockSelectionType.cursor) ||
          !this.state.prevCursorRect) {
        return child;
      }
      const shouldBlink = false;
      return {
        tag: 'div',
        style: {
          position: 'relative',
          overflow: 'visible',
        },
        children: [
          new Cursor({
            rect: this.state.prevCursorRect,
            shouldBlink,
            cursorStyle: this.props.delegate.cursorStyle,
            color: this.props.remoteSelection.cursorColor,
          }),
          this.props.remoteSelection.builder?.(
            {},
            this.props.remoteSelection,
            this.state.prevCursorRect,
          ) || child,
        ],
      };
    } else {
      // show the selection area when the selection is not collapsed
      if (!supportTypes.includes(BlockSelectionType.selection) ||
          !this.state.prevSelectionRects ||
          this.state.prevSelectionRects.length === 0 ||
          (this.state.prevSelectionRects.length === 1 &&
              this.state.prevSelectionRects[0].width === 0)) {
        return child;
      }
      return {
        tag: 'div',
        style: {
          position: 'relative',
          overflow: 'visible',
        },
        children: [
          new SelectionAreaPaint({
            rects: this.state.prevSelectionRects,
            selectionColor: this.props.remoteSelection.selectionColor,
          }),
          ...(this.pathEquals(selection.start.path, this.props.node.path) && this.props.remoteSelection.builder
            ? [this.props.remoteSelection.builder(
                {},
                this.props.remoteSelection,
                this.state.prevSelectionRects[0],
              )]
            : [child]
          ),
        ],
      };
    }
  }

  private _updateSelectionIfNeeded(): void {
    const selection = this.props.remoteSelection.selection.normalized;
    const path = this.props.node.path;

    // the current path is in the selection
    if (this.pathInSelection(path, selection)) {
      const supportTypes = this.props.supportTypes || [
        BlockSelectionType.cursor,
        BlockSelectionType.selection,
      ];

      if (supportTypes.includes(BlockSelectionType.cursor) &&
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

  private pathInSelection(path: number[], selection: Selection): boolean {
    // Simplified implementation - in real code this would be more complex
    return true; // placeholder
  }

  private pathEquals(path1: number[], path2: number[]): boolean {
    return path1.length === path2.length && path1.every((val, index) => val === path2[index]);
  }
}