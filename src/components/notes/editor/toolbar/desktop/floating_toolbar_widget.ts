import { EditorState, Selection } from '../../../core/editor_state';
import { Component, ComponentChild } from '../../../core/component';
import { ToolbarItem } from '../../../core/toolbar';
import { PropertyValueNotifier } from '../../../core/notifier';

export const floatingToolbarContainerKey = 'appflowy_editor_floating_toolbar_container';
export const floatingToolbarItemPrefixKey = 'appflowy_editor_floating_toolbar_item';

export type ToolbarTooltipBuilder = (
  context: any,
  id: string,
  message: string,
  child: ComponentChild,
) => ComponentChild;

export type PlaceHolderItemBuilder = (context: any) => ToolbarItem;

interface FloatingToolbarWidgetProps {
  backgroundColor?: string;
  toolbarActiveColor: string;
  toolbarIconColor?: string;
  toolbarElevation?: number;
  toolbarShadowColor?: string;
  items: ToolbarItem[];
  editorState: EditorState;
  textDirection: 'ltr' | 'rtl';
  floatingToolbarHeight: number;
  tooltipBuilder?: ToolbarTooltipBuilder;
  placeHolderBuilder?: PlaceHolderItemBuilder;
  padding?: string;
  decoration?: any;
}

interface FloatingToolbarWidgetState {
  // Add any state properties if needed
}

export class FloatingToolbarWidget extends Component<FloatingToolbarWidgetProps, FloatingToolbarWidgetState> {
  private selectionNotifier: PropertyValueNotifier<Selection | null>;

  constructor(props: FloatingToolbarWidgetProps) {
    super(props);
    this.selectionNotifier = props.editorState.selectionNotifier;
  }

  componentDidMount(): void {
    this.selectionNotifier.addListener(this.onSelectionChanged);
  }

  componentWillUnmount(): void {
    this.selectionNotifier.removeListener(this.onSelectionChanged);
  }

  componentDidUpdate(prevProps: FloatingToolbarWidgetProps): void {
    if (this.props.editorState !== prevProps.editorState) {
      prevProps.editorState.selectionNotifier.removeListener(this.onSelectionChanged);
      this.selectionNotifier = this.props.editorState.selectionNotifier;
      this.selectionNotifier.addListener(this.onSelectionChanged);
    }
  }

  render(): ComponentChild {
    const activeItems = this.computeActiveItems();
    if (activeItems.length === 0) {
      return null;
    }

    return {
      tag: 'div',
      style: {
        borderRadius: '8px',
        backgroundColor: this.props.backgroundColor || 'black',
        boxShadow: this.props.toolbarShadowColor 
          ? `0 ${this.props.toolbarElevation || 0}px 10px ${this.props.toolbarShadowColor}`
          : undefined,
        padding: this.props.padding || '0 8px',
        ...this.props.decoration,
      },
      children: [
        {
          tag: 'div',
          key: floatingToolbarContainerKey,
          style: {
            height: `${this.props.floatingToolbarHeight}px`,
            display: 'flex',
            alignItems: 'flex-start',
            minWidth: 'min-content',
            direction: this.props.textDirection,
          },
          children: activeItems.map((item, index) => ({
            tag: 'div',
            key: `${floatingToolbarItemPrefixKey}_${item.id}_${index}`,
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            children: [
              item.builder!(
                {},
                this.props.editorState,
                this.props.toolbarActiveColor,
                this.props.toolbarIconColor,
                this.props.tooltipBuilder,
              ),
            ],
          })),
        },
      ],
    };
  }

  private onSelectionChanged = (): void => {
    this.forceUpdate();
  };

  private computeActiveItems(): ToolbarItem[] {
    const activeItems = this.props.items
        .filter((e) => e.isActive?.(this.props.editorState) ?? false);
    
    if (activeItems.length === 0) {
      return [];
    }

    // sort by group.
    activeItems.sort((a, b) => a.group - b.group);

    // insert the divider.
    const result: ToolbarItem[] = [];
    let currentGroup = -1;
    
    for (const item of activeItems) {
      if (currentGroup !== -1 && currentGroup !== item.group) {
        const placeholderItem = this.props.placeHolderBuilder?.({}) || this.getPlaceholderItem();
        result.push(placeholderItem);
      }
      result.push(item);
      currentGroup = item.group;
    }

    return result;
  }

  private getPlaceholderItem(): ToolbarItem {
    return new ToolbarItem({
      id: 'placeholder',
      group: -1,
      builder: () => ({
        tag: 'div',
        style: {
          width: '1px',
          height: '20px',
          backgroundColor: '#ccc',
          margin: '0 4px',
        },
      }),
    });
  }
}