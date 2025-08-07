import { Node, Selection } from '../../../../core/editor_state';
import { Component, ComponentChild } from '../../../../core/component';
import { SelectableMixin } from '../mixins';
import { BlockSelectionArea, BlockSelectionType } from './block_selection_area';
import { RemoteBlockSelectionsArea } from './remote_block_selection_area';
import { RemoteSelection } from './remote_selection';

interface BlockSelectionContainerProps {
  // get the cursor rect, selection rects or block rect from the delegate
  delegate: SelectableMixin;
  // get the selection from the listenable
  listenable: { value: Selection | null; addListener: (fn: () => void) => void; removeListener: (fn: () => void) => void };
  // remote selection
  remoteSelection?: { value: RemoteSelection[]; addListener: (fn: () => void) => void; removeListener: (fn: () => void) => void };
  // the color of the cursor
  cursorColor?: string;
  // the color of the selection
  selectionColor?: string;
  // the color of the background of the block
  blockColor?: string;
  // the node of the block
  node: Node;
  supportTypes?: BlockSelectionType[];
  // the selection area should above the block component
  selectionAboveBlock?: boolean;
  children: ComponentChild[];
}

export class BlockSelectionContainer extends Component<BlockSelectionContainerProps> {
  render(): ComponentChild {
    const {
      delegate,
      listenable,
      remoteSelection,
      cursorColor = '#000000',
      selectionColor = '#2196F3',
      blockColor = '#2196F3',
      node,
      supportTypes = [BlockSelectionType.cursor, BlockSelectionType.selection],
      selectionAboveBlock = false,
      children,
    } = this.props;

    const blockSelectionArea = new BlockSelectionArea({
      node,
      delegate,
      listenable,
      cursorColor,
      selectionColor,
      blockColor,
      supportTypes: supportTypes.filter(
        (element) => element !== BlockSelectionType.cursor,
      ),
    });

    const stackChildren: ComponentChild[] = [];

    // Remote selections (non-cursor)
    if (remoteSelection) {
      stackChildren.push(
        new RemoteBlockSelectionsArea({
          node,
          delegate,
          remoteSelections: remoteSelection,
          supportTypes: supportTypes.filter(
            (element) => element !== BlockSelectionType.cursor,
          ),
        }),
      );
    }

    // Block selection or selection area (below content)
    if (!selectionAboveBlock) {
      stackChildren.push(blockSelectionArea);
    }

    // Main content
    stackChildren.push(...children);

    // Block selection or selection area (above content)
    if (selectionAboveBlock) {
      stackChildren.push(blockSelectionArea);
    }

    // Remote cursor
    if (supportTypes.includes(BlockSelectionType.cursor) && remoteSelection) {
      stackChildren.push(
        new RemoteBlockSelectionsArea({
          node,
          delegate,
          remoteSelections: remoteSelection,
          supportTypes: [BlockSelectionType.cursor],
        }),
      );
    }

    // Local cursor
    if (supportTypes.includes(BlockSelectionType.cursor)) {
      stackChildren.push(
        new BlockSelectionArea({
          node,
          delegate,
          listenable,
          cursorColor,
          selectionColor,
          blockColor,
          supportTypes: [BlockSelectionType.cursor],
        }),
      );
    }

    return {
      tag: 'div',
      style: {
        position: 'relative',
        overflow: 'visible',
        // In RTL mode, if the alignment is topStart,
        // the selection will be on the opposite side of the block component.
        textAlign: this.getTextDirection() === 'ltr' ? 'left' : 'right',
      },
      children: stackChildren,
    };
  }

  private getTextDirection(): 'ltr' | 'rtl' {
    // In a real implementation, this would get the text direction from context
    // For now, default to ltr
    return 'ltr';
  }
}