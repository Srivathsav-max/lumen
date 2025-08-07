import { EditorState } from '../../editor/editor_state';

export interface ContextMenuItem {
  getName(): string;
  onPressed(editorState: EditorState): void;
  isApplicable?(editorState: EditorState): boolean;
}

export class ContextMenuItemImpl implements ContextMenuItem {
  private _getName: () => string;
  public onPressed: (editorState: EditorState) => void;
  public isApplicable?: (editorState: EditorState) => boolean;

  constructor(options: {
    getName: () => string;
    onPressed: (editorState: EditorState) => void;
    isApplicable?: (editorState: EditorState) => boolean;
  }) {
    this._getName = options.getName;
    this.onPressed = options.onPressed;
    this.isApplicable = options.isApplicable;
  }

  getName(): string {
    return this._getName();
  }
}

interface ContextMenuProps {
  position: { x: number; y: number };
  editorState: EditorState;
  items: ContextMenuItem[][];
  onPressed: () => void;
}

export class ContextMenu {
  private props: ContextMenuProps;
  private element: HTMLElement;

  constructor(props: ContextMenuProps) {
    this.props = props;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'context-menu';
    container.style.position = 'absolute';
    container.style.top = `${this.props.position.y}px`;
    container.style.left = `${this.props.position.x}px`;
    container.style.padding = '8px 4px';
    container.style.minWidth = '140px';
    container.style.backgroundColor = 'white';
    container.style.borderRadius = '6px';
    container.style.boxShadow = '0 1px 5px rgba(0, 0, 0, 0.1)';
    container.style.zIndex = '1000';

    const column = document.createElement('div');
    column.style.display = 'flex';
    column.style.flexDirection = 'column';
    column.style.minWidth = 'min-content';

    for (let i = 0; i < this.props.items.length; i++) {
      for (let j = 0; j < this.props.items[i].length; j++) {
        const item = this.props.items[i][j];
        
        if (item.isApplicable && !item.isApplicable(this.props.editorState)) {
          continue;
        }

        if (j === 0 && i !== 0) {
          const divider = document.createElement('div');
          divider.style.height = '1px';
          divider.style.backgroundColor = '#e0e0e0';
          divider.style.margin = '4px 0';
          column.appendChild(divider);
        }

        const menuItem = this.createMenuItem(item);
        column.appendChild(menuItem);
      }
    }

    container.appendChild(column);
    return container;
  }

  private createMenuItem(item: ContextMenuItem): HTMLElement {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.style.padding = '8px';
    menuItem.style.cursor = 'pointer';
    menuItem.style.borderRadius = '6px';
    menuItem.style.fontSize = '14px';
    menuItem.style.textAlign = 'start';
    menuItem.style.transition = 'background-color 0.2s';

    menuItem.textContent = item.getName();

    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.backgroundColor = '#f0f0f0';
    });

    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.backgroundColor = 'transparent';
    });

    menuItem.addEventListener('click', () => {
      item.onPressed(this.props.editorState);
      this.props.onPressed();
    });

    return menuItem;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  show(): void {
    document.body.appendChild(this.element);
  }

  hide(): void {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  updatePosition(position: { x: number; y: number }): void {
    this.props.position = position;
    this.element.style.top = `${position.y}px`;
    this.element.style.left = `${position.x}px`;
  }
}