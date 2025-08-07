// Column block component for handling individual columns in a columns layout
export interface Node {
  type: string;
  path: number[];
  children: Node[];
  attributes: Record<string, any>;
  key?: string;
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

export interface Size {
  width: number;
  height: number;
}

export interface BlockComponentConfiguration {
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface EditorState {
  renderer: {
    build(context: any, node: Node): HTMLElement;
  };
}

export function columnNode(options: {
  children?: Node[];
  width?: number;
} = {}): Node {
  const { children, width } = options;
  return {
    type: ColumnBlockKeys.type,
    path: [],
    children: children ?? [paragraphNode()],
    attributes: {
      [ColumnBlockKeys.width]: width
    }
  };
}

function paragraphNode(): Node {
  return {
    type: 'paragraph',
    path: [],
    children: [],
    attributes: {}
  };
}

export class ColumnBlockKeys {
  private constructor() {}
  
  static readonly type = 'column';
  static readonly width = 'width';
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

export class ColumnBlockComponentBuilder extends BlockComponentBuilder {
  constructor(options: { configuration?: BlockComponentConfiguration } = {}) {
    super(options);
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    return new ColumnBlockComponent({
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

export interface ColumnBlockComponentProps {
  node: Node;
  showActions?: boolean;
  actionBuilder?: (context: any, state: any) => HTMLElement | null;
  actionTrailingBuilder?: (context: any, state: any) => HTMLElement | null;
  configuration?: BlockComponentConfiguration;
}

export class ColumnBlockComponent implements BlockComponentWidget {
  node: Node;
  configuration: BlockComponentConfiguration;
  private showActions: boolean;
  private actionBuilder?: (context: any, state: any) => HTMLElement | null;
  private element: HTMLElement;
  private editorState?: EditorState;

  constructor(props: ColumnBlockComponentProps) {
    this.node = props.node;
    this.configuration = props.configuration ?? {};
    this.showActions = props.showActions ?? true;
    this.actionBuilder = props.actionBuilder;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.minHeight = 'min-content';
    container.style.alignItems = 'flex-start';

    // Apply padding if configured
    if (this.configuration.padding) {
      const p = this.configuration.padding;
      container.style.padding = `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
    }

    this.renderChildren(container);
    return container;
  }

  private renderChildren(container: HTMLElement): void {
    this.node.children.forEach(child => {
      const childElement = document.createElement('div');
      childElement.style.height = 'auto';
      childElement.style.minHeight = 'inherit';
      
      // This would need to be implemented based on your renderer
      if (this.editorState?.renderer) {
        const renderedChild = this.editorState.renderer.build(null, child);
        childElement.appendChild(renderedChild);
      }
      
      container.appendChild(childElement);
    });
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
  }

  destroy(): void {
    this.element.remove();
  }
}