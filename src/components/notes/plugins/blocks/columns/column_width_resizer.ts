// Column width resizer component for resizable columns
import { ColumnsBlockConstants } from './columns_block_constant';

export interface Node {
  attributes: Record<string, any>;
  rect: { width: number; height: number };
  parent?: Node;
  children: Node[];
}

export interface EditorState {
  transaction: Transaction;
  apply(transaction: Transaction, options?: ApplyOptions): void;
}

export interface Transaction {
  updateNode(node: Node, attributes: Record<string, any>): void;
}

export interface ApplyOptions {
  inMemoryUpdate?: boolean;
}

export interface DragStartDetails {
  globalPosition: { dx: number; dy: number };
}

export interface DragUpdateDetails {
  delta: { dx: number; dy: number };
}

export interface DragEndDetails {
  velocity: { pixelsPerSecond: { dx: number; dy: number } };
}

export class ColumnBlockKeys {
  static readonly width = 'width';
}

export class ColumnsBlockKeys {
  static readonly columnCount = 'columnCount';
}

export interface ColumnWidthResizerProps {
  columnNode: Node;
  editorState: EditorState;
  onDragStart?: (details: DragStartDetails) => void;
  onDragUpdate?: (details: DragUpdateDetails) => void;
  onDragEnd?: (details: DragEndDetails) => void;
}

export class ColumnWidthResizer {
  private columnNode: Node;
  private editorState: EditorState;
  private isDragging = false;
  private element: HTMLElement;

  constructor(props: ColumnWidthResizerProps) {
    this.columnNode = props.columnNode;
    this.editorState = props.editorState;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.style.width = `${ColumnsBlockConstants.columnWidthResizerWidth}px`;
    container.style.backgroundColor = ColumnsBlockConstants.columnWidthResizerColor;
    container.style.cursor = 'col-resize';
    container.style.userSelect = 'none';
    container.style.height = '100%';

    let startX = 0;
    let startWidth = 0;

    const handleMouseDown = (e: MouseEvent) => {
      this.isDragging = true;
      startX = e.clientX;
      startWidth = this.columnNode.attributes[ColumnBlockKeys.width] ?? this.columnNode.rect.width;
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      this._onHorizontalDragStart({
        globalPosition: { dx: e.clientX, dy: e.clientY }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - startX;
      this._onHorizontalDragUpdate({
        delta: { dx: deltaX, dy: 0 }
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!this.isDragging) return;

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      this._onHorizontalDragEnd({
        velocity: { pixelsPerSecond: { dx: 0, dy: 0 } }
      });
    };

    container.addEventListener('mousedown', handleMouseDown);
    return container;
  }

  private _onHorizontalDragStart(details: DragStartDetails): void {
    this.isDragging = true;
  }

  private _onHorizontalDragUpdate(details: DragUpdateDetails): void {
    if (!this.isDragging) {
      return;
    }

    // Update the column width in memory
    const columnNode = this.columnNode;
    const rect = columnNode.rect;
    const width = columnNode.attributes[ColumnBlockKeys.width] ?? rect.width;
    const newWidth = width + details.delta.dx;
    const transaction = this.editorState.transaction;
    
    transaction.updateNode(columnNode, {
      ...columnNode.attributes,
      [ColumnBlockKeys.width]: Math.max(
        ColumnsBlockConstants.minimumColumnWidth,
        newWidth
      )
    });

    const columnsNode = columnNode.parent;
    if (columnsNode) {
      transaction.updateNode(columnsNode, {
        ...columnsNode.attributes,
        [ColumnsBlockKeys.columnCount]: columnsNode.children.length
      });
    }

    this.editorState.apply(transaction, { inMemoryUpdate: true });
  }

  private _onHorizontalDragEnd(details: DragEndDetails): void {
    if (!this.isDragging) {
      return;
    }

    // Apply the transaction again to make sure the width is updated
    const transaction = this.editorState.transaction;
    transaction.updateNode(this.columnNode, {
      ...this.columnNode.attributes
    });
    this.editorState.apply(transaction);

    this.isDragging = false;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}