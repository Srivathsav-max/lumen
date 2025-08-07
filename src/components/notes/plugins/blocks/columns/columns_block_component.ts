// Columns block component for handling multi-column layouts
import { ColumnWidthResizer } from './column_width_resizer';
import { ColumnsBlockConstants } from './columns_block_constant';
import { ColumnBlockKeys, columnNode } from './column_block_component';

export interface Node {
  type: string;
  path: number[];
  children: Node[];
  attributes: Record<string, any>;
  key?: string;
  id?: string;
}

export interface Position {
  path: number[];
  offset?: number;
}

export interface Selection {
  start: Position;
  end: Position;
  isCollapsed: boolean;
  static collapsed(position: Position): Selection;
  static single(options: { path: number[]; startOffset: number; endOffset: number }): Selection;
  static invalid(): Selection;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Offset {
  dx: number;
  dy: number;
}

export interface BlockComponentConfiguration {
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface EditorState {
  renderer: {
    build(context: any, node: Node): HTMLElement;
  };
}

function paragraphNode(options: { text?: string } = {}): Node {
  return {
    type: 'paragraph',
    path: [],
    children: [],
    attributes: {
      text: options.text ?? ''
    }
  };
}

export function columnsNode(options: { children?: Node[] } = {}): Node {
  const { children } = options;
  
  const defaultChildren = children ?? [
    columnNode({
      children: [paragraphNode({ text: 'Column 0' })]
    }),
    columnNode({
      children: [paragraphNode({ text: 'Column 1' })]
    })
  ];

  return {
    type: ColumnsBlockKeys.type,
    path: [],
    children: defaultChildren,
    attributes: {}
  };
}

export class ColumnsBlockKeys {
  private constructor() {}
  
  static readonly type = 'columns';
  static readonly columnCount = 'column_count';
}

export interface BlockComponentContext {
  node: Node;
}

export interface BlockComponentWidget {
  node: Node;
  configuration: BlockComponentConfiguration;
}

export abstract class BlockComponentBuilder {
  protected configuration: BlockComponentConfiguration;

  constructor(options: { configuration?: BlockComponentConfiguration } = {}) {
    this.configuration = options.configuration ?? {};
  }

  abstract build(blockComponentContext: BlockComponentContext): BlockComponentWidget;

  protected showActions(node: Node): boolean {
    return true;
  }

  protected actionBuilder(context: BlockComponentContext, state: any): HTMLElement | null {
    return null;
  }

  abstract get validate(): (node: Node) => boolean;
}

export class ColumnsBlockComponentBuilder extends BlockComponentBuilder {
  constructor(options: { configuration?: BlockComponentConfiguration } = {}) {
    super(options);
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    return new ColumnsBlockComponent({
      node,
      showActions: this.showActions(node),
      configuration: this.configuration,
      actionBuilder: (_, state) => this.actionBuilder(blockComponentContext, state)
    });
  }

  get validate(): (node: Node) => boolean {
    return (node) => node.children.length > 0;
  }
}

export interface ColumnsBlockComponentProps {
  node: Node;
  showActions?: boolean;
  actionBuilder?: (context: any, state: any) => HTMLElement | null;
  actionTrailingBuilder?: (context: any, state: any) => HTMLElement | null;
  configuration?: BlockComponentConfiguration;
}

export class ColumnsBlockComponent implements BlockComponentWidget {
  node: Node;
  configuration: BlockComponentConfiguration;
  private showActions: boolean;
  private actionBuilder?: (context: any, state: any) => HTMLElement | null;
  private element: HTMLElement;
  private editorState?: EditorState;
  private columnResizers: ColumnWidthResizer[] = [];

  constructor(props: ColumnsBlockComponentProps) {
    this.node = props.node;
    this.configuration = props.configuration ?? {};
    this.showActions = props.showActions ?? true;
    this.actionBuilder = props.actionBuilder;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    
    // Apply padding if configured
    if (this.configuration.padding) {
      const p = this.configuration.padding;
      container.style.padding = `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
    }

    const columnsContainer = document.createElement('div');
    columnsContainer.style.display = 'flex';
    columnsContainer.style.minWidth = 'min-content';
    columnsContainer.style.alignItems = 'stretch';
    columnsContainer.style.minHeight = 'inherit';

    this.buildChildren(columnsContainer);
    container.appendChild(columnsContainer);
    
    return container;
  }

  private buildChildren(container: HTMLElement): void {
    // Clear existing resizers
    this.columnResizers.forEach(resizer => resizer.destroy());
    this.columnResizers = [];

    for (let i = 0; i < this.node.children.length; i++) {
      const childNode = this.node.children[i];
      const width = childNode.attributes[ColumnBlockKeys.width] as number | undefined;
      
      const childContainer = document.createElement('div');
      
      if (width != null) {
        const clampedWidth = Math.max(width, ColumnsBlockConstants.minimumColumnWidth);
        childContainer.style.width = `${clampedWidth}px`;
        childContainer.style.flexShrink = '0';
      } else {
        childContainer.style.flex = '1';
      }

      // Render child content
      if (this.editorState?.renderer) {
        const renderedChild = this.editorState.renderer.build(null, childNode);
        childContainer.appendChild(renderedChild);
      }

      container.appendChild(childContainer);

      // Add column resizer between columns (except after the last column)
      if (i !== this.node.children.length - 1 && this.editorState) {
        const resizer = new ColumnWidthResizer({
          columnNode: childNode,
          editorState: this.editorState
        });
        
        this.columnResizers.push(resizer);
        container.appendChild(resizer.getElement());
      }
    }
  }

  // Selectable mixin methods
  start(): Position {
    return { path: this.node.path };
  }

  end(): Position {
    return { path: this.node.path, offset: 1 };
  }

  getPositionInOffset(start: Offset): Position {
    return this.end();
  }

  get shouldCursorBlink(): boolean {
    return false;
  }

  get cursorStyle(): string {
    return 'cover';
  }

  getBlockRect(options: { shiftWithBaseOffset?: boolean } = {}): Rect {
    const rects = this.getRectsInSelection({
      start: { path: [] },
      end: { path: [] },
      isCollapsed: false
    } as Selection);
    return rects[0];
  }

  getCursorRectInPosition(
    position: Position,
    options: { shiftWithBaseOffset?: boolean } = {}
  ): Rect | null {
    const selection = {
      start: position,
      end: position,
      isCollapsed: true
    } as Selection;
    
    const rects = this.getRectsInSelection(selection, options);
    return rects.length > 0 ? rects[0] : null;
  }

  getRectsInSelection(
    selection: Selection,
    options: { shiftWithBaseOffset?: boolean } = {}
  ): Rect[] {
    const rect = this.element.getBoundingClientRect();
    return [{
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    }];
  }

  getSelectionInRange(start: Offset, end: Offset): Selection {
    return {
      start: { path: this.node.path, offset: 0 },
      end: { path: this.node.path, offset: 1 },
      isCollapsed: false
    } as Selection;
  }

  localToGlobal(offset: Offset, options: { shiftWithBaseOffset?: boolean } = {}): Offset {
    const rect = this.element.getBoundingClientRect();
    return {
      dx: rect.left + offset.dx,
      dy: rect.top + offset.dy
    };
  }

  getElement(): HTMLElement {
    return this.element;
  }

  setEditorState(editorState: EditorState): void {
    this.editorState = editorState;
    // Rebuild children with the new editor state
    const container = this.element.querySelector('div');
    if (container) {
      container.innerHTML = '';
      this.buildChildren(container);
    }
  }

  destroy(): void {
    this.columnResizers.forEach(resizer => resizer.destroy());
    this.columnResizers = [];
    this.element.remove();
  }
}