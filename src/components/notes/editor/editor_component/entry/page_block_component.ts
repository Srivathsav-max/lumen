import { EditorState } from '../../editor_state';
import { Node } from '../../node';
import { BlockComponentBuilder, BlockComponentContext, BlockComponentWidget } from '../block_component_builder';
import { BlockComponentConfiguration } from '../block_component_configuration';
import { ScrollablePositionedList } from '../../../flutter/scrollable_positioned_list/scrollable_positioned_list';

export class PageBlockKeys {
  static readonly type = 'page';
}

export interface PageNodeOptions {
  children: Node[];
  attributes?: Record<string, any>;
}

export function pageNode(options: PageNodeOptions): Node {
  return new Node({
    type: PageBlockKeys.type,
    children: options.children,
    attributes: options.attributes ?? {},
  });
}

export class PageBlockComponentBuilder extends BlockComponentBuilder {
  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    return new PageBlockComponent({
      key: blockComponentContext.node.key,
      node: blockComponentContext.node,
      header: blockComponentContext.header,
      footer: blockComponentContext.footer,
      wrapper: blockComponentContext.wrapper,
    });
  }
}

interface PageBlockComponentProps {
  key?: string;
  node: Node;
  showActions?: boolean;
  actionBuilder?: () => HTMLElement;
  actionTrailingBuilder?: () => HTMLElement;
  configuration?: BlockComponentConfiguration;
  header?: HTMLElement;
  footer?: HTMLElement;
  wrapper?: (context: any, options: { node: Node; child: HTMLElement }) => HTMLElement;
}

export class PageBlockComponent extends BlockComponentWidget {
  private props: PageBlockComponentProps;
  private element: HTMLElement;

  constructor(props: PageBlockComponentProps) {
    super();
    this.props = {
      configuration: new BlockComponentConfiguration(),
      ...props
    };
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const editorState = EditorState.getInstance();
    const scrollController = editorState.scrollController;
    const items = this.props.node.children;

    if (!scrollController || scrollController.shrinkWrap) {
      return this.createSingleChildScrollView(editorState, items);
    } else {
      return this.createScrollablePositionedList(editorState, items, scrollController);
    }
  }

  private createSingleChildScrollView(editorState: EditorState, items: Node[]): HTMLElement {
    const container = document.createElement('div');
    container.className = 'page-block-component single-child-scroll';
    container.style.overflowY = 'auto';
    container.style.height = '100%';

    const column = document.createElement('div');
    column.style.display = 'flex';
    column.style.flexDirection = 'column';

    // Add header if present
    if (this.props.header) {
      column.appendChild(this.props.header);
    }

    // Add items
    items.forEach(item => {
      let child = editorState.renderer.build(item);
      
      if (this.props.wrapper) {
        child = this.props.wrapper(null, { node: item, child });
      }

      const itemContainer = document.createElement('div');
      itemContainer.style.maxWidth = editorState.editorStyle.maxWidth 
        ? `${editorState.editorStyle.maxWidth}px` 
        : 'none';
      
      this.applyPadding(itemContainer, editorState.editorStyle.padding);
      itemContainer.appendChild(child);
      column.appendChild(itemContainer);
    });

    // Add footer if present
    if (this.props.footer) {
      column.appendChild(this.props.footer);
    }

    container.appendChild(column);
    return container;
  }

  private createScrollablePositionedList(
    editorState: EditorState, 
    items: Node[], 
    scrollController: any
  ): HTMLElement {
    let extentCount = 0;
    if (this.props.header) extentCount++;
    if (this.props.footer) extentCount++;

    const scrollableList = new ScrollablePositionedList({
      shrinkWrap: scrollController.shrinkWrap,
      scrollDirection: 'vertical',
      itemCount: items.length + extentCount,
      itemBuilder: (index: number) => {
        if (this.props.header && index === 0) {
          return this.createIgnoreGestureWrapper(this.props.header);
        }

        if (this.props.footer && index === (items.length - 1) + extentCount) {
          return this.createIgnoreGestureWrapper(this.props.footer);
        }

        const nodeIndex = index - (this.props.header ? 1 : 0);
        const node = items[nodeIndex];
        let child = editorState.renderer.build(node);
        
        if (this.props.wrapper) {
          child = this.props.wrapper(null, { node, child });
        }

        const center = document.createElement('div');
        center.style.display = 'flex';
        center.style.justifyContent = 'center';

        const container = document.createElement('div');
        container.style.maxWidth = editorState.editorStyle.maxWidth 
          ? `${editorState.editorStyle.maxWidth}px` 
          : 'none';
        
        this.applyPadding(container, editorState.editorStyle.padding);
        container.appendChild(child);
        center.appendChild(container);

        return center;
      },
      itemScrollController: scrollController.itemScrollController,
      scrollOffsetController: scrollController.scrollOffsetController,
      itemPositionsNotifier: scrollController.itemPositionsListener,
    });

    return scrollableList.getElement();
  }

  private createIgnoreGestureWrapper(element: HTMLElement): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'ignore-editor-selection-gesture';
    wrapper.style.pointerEvents = 'none';
    wrapper.appendChild(element);
    return wrapper;
  }

  private applyPadding(element: HTMLElement, padding: any): void {
    if (padding) {
      if (padding.top !== undefined) element.style.paddingTop = `${padding.top}px`;
      if (padding.bottom !== undefined) element.style.paddingBottom = `${padding.bottom}px`;
      if (padding.left !== undefined) element.style.paddingLeft = `${padding.left}px`;
      if (padding.right !== undefined) element.style.paddingRight = `${padding.right}px`;
    }
  }

  build(): HTMLElement {
    return this.element;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}