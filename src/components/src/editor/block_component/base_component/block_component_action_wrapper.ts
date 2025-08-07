import { Node } from '../../../core/editor_state';
import { Component, ComponentChild } from '../../../core/component';
import { BlockComponentActionContainer } from '../../editor_component/service/renderer/block_component_action';
import { forceShowBlockAction } from '../../../core/constants';

export type BlockComponentActionBuilder = (
  context: any,
  state: BlockComponentActionState,
) => ComponentChild;

export type BlockComponentActionTrailingBuilder = (
  context: any,
  state: BlockComponentActionState,
) => ComponentChild;

export interface BlockComponentActionState {
  alwaysShowActions: boolean;
}

interface BlockComponentActionWrapperProps {
  node: Node;
  children: ComponentChild[];
  actionBuilder: BlockComponentActionBuilder;
  actionTrailingBuilder?: BlockComponentActionTrailingBuilder;
}

interface BlockComponentActionWrapperState {
  showActions: boolean;
  alwaysShowActions: boolean;
}

export class BlockComponentActionWrapper extends Component<BlockComponentActionWrapperProps, BlockComponentActionWrapperState>
  implements BlockComponentActionState {
  
  private isDisposed = false;

  constructor(props: BlockComponentActionWrapperProps) {
    super(props);
    this.state = {
      showActions: false,
      alwaysShowActions: false,
    };
  }

  get alwaysShowActions(): boolean {
    return this.state.alwaysShowActions;
  }

  set alwaysShowActions(alwaysShowActions: boolean) {
    if (this.isDisposed) {
      return;
    }
    this.setState({ alwaysShowActions });
    if (!alwaysShowActions && this.state.showActions) {
      this.setState({ showActions: false });
    }
  }

  componentDidMount(): void {
    if (forceShowBlockAction) {
      this.alwaysShowActions = true;
      this.setState({ showActions: true });
    }
  }

  componentWillUnmount(): void {
    this.isDisposed = true;
  }

  render(): ComponentChild {
    return {
      tag: 'div',
      onMouseEnter: () => this.setState({ showActions: true }),
      onMouseLeave: () => this.setState({ showActions: this.state.alwaysShowActions }),
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        minWidth: 'min-content',
      },
      children: [
        new BlockComponentActionContainer({
          node: this.props.node,
          showActions: this.state.showActions,
          actionBuilder: () => this.props.actionBuilder({}, this),
        }),
        ...(this.props.actionTrailingBuilder 
          ? [this.props.actionTrailingBuilder({}, this)]
          : []
        ),
        {
          tag: 'div',
          style: { flex: '1' },
          children: this.props.children,
        },
      ],
    };
  }
}