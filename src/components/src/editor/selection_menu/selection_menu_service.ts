import React from 'react';
import { EditorState, Position, Selection } from '../../core';
import { SelectionMenuWidget } from './selection_menu_widget';
import { SelectionMenuItem, SelectionMenuStyle } from './selection_menu_widget';

export interface SelectionMenuService {
  offset: { x: number; y: number };
  alignment: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  style: SelectionMenuStyle;
  show(): Promise<void>;
  dismiss(): void;
  getPosition(): { left?: number; top?: number; right?: number; bottom?: number };
}

export interface SelectionMenuProps {
  context: React.Context<any>;
  editorState: EditorState;
  selectionMenuItems: SelectionMenuItem[];
  deleteSlashByDefault?: boolean;
  deleteKeywordsByDefault?: boolean;
  style?: SelectionMenuStyle;
  itemCountFilter?: number;
  singleColumn?: boolean;
  menuHeight?: number;
  menuWidth?: number;
}

export class SelectionMenu implements SelectionMenuService {
  private selectionMenuEntry: HTMLElement | null = null;
  private selectionUpdateByInner = false;
  private _offset = { x: 0, y: 0 };
  private _alignment: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' = 'topLeft';

  constructor(
    private props: SelectionMenuProps
  ) {}

  get offset() {
    return this._offset;
  }

  get alignment() {
    return this._alignment;
  }

  get style() {
    return this.props.style || SelectionMenuStyle.light;
  }

  dismiss(): void {
    if (this.selectionMenuEntry) {
      this.props.editorState.service.keyboardService?.enable();
      this.props.editorState.service.scrollService?.enable();
      
      document.body.removeChild(this.selectionMenuEntry);
      this.selectionMenuEntry = null;
    }

    // Remove selection change listener
    const selectionService = this.props.editorState.service.selectionService;
    if (selectionService) {
      this.props.editorState.selection = this.props.editorState.selection;
      selectionService.currentSelection.removeListener(this.onSelectionChange);
    }
  }

  async show(): Promise<void> {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        this.showInternal();
        resolve();
      });
    });
  }

  private showInternal(): void {
    this.dismiss();

    const selectionService = this.props.editorState.service.selectionService;
    const selectionRects = selectionService.selectionRects;
    if (!selectionRects || selectionRects.length === 0) {
      return;
    }

    this.calculateSelectionMenuOffset(selectionRects[0]);
    const { left, top, right, bottom } = this.getPosition();

    const editorRect = this.props.editorState.renderBox?.getBoundingClientRect();
    if (!editorRect) return;

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1000;
      pointer-events: auto;
    `;

    // Create menu container
    const menuContainer = document.createElement('div');
    menuContainer.style.cssText = `
      position: absolute;
      ${left !== undefined ? `left: ${left}px;` : ''}
      ${top !== undefined ? `top: ${top}px;` : ''}
      ${right !== undefined ? `right: ${right}px;` : ''}
      ${bottom !== undefined ? `bottom: ${bottom}px;` : ''}
    `;

    overlay.appendChild(menuContainer);
    document.body.appendChild(overlay);
    this.selectionMenuEntry = overlay;

    // Handle click outside to dismiss
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.dismiss();
      }
    });

    // Render React component
    const menuItems = this.props.selectionMenuItems.map(item => ({
      ...item,
      deleteSlash: this.props.deleteSlashByDefault ?? true,
      deleteKeywords: this.props.deleteKeywordsByDefault ?? false,
      onSelected: () => this.dismiss(),
    }));

    // Disable editor services
    this.props.editorState.service.keyboardService?.disable(true);
    this.props.editorState.service.scrollService?.disable();
    
    // Add selection change listener
    selectionService.currentSelection.addListener(this.onSelectionChange);
  }

  private onSelectionChange = (): void => {
    const selectionService = this.props.editorState.service.selectionService;
    if (!selectionService?.currentSelection.value) {
      return;
    }

    if (this.selectionUpdateByInner) {
      this.selectionUpdateByInner = false;
      return;
    }

    this.dismiss();
  };

  getPosition(): { left?: number; top?: number; right?: number; bottom?: number } {
    let left: number | undefined, top: number | undefined;
    let right: number | undefined, bottom: number | undefined;

    switch (this.alignment) {
      case 'topLeft':
        left = this.offset.x;
        top = this.offset.y;
        break;
      case 'bottomLeft':
        left = this.offset.x;
        bottom = this.offset.y;
        break;
      case 'topRight':
        right = this.offset.x;
        top = this.offset.y;
        break;
      case 'bottomRight':
        right = this.offset.x;
        bottom = this.offset.y;
        break;
    }

    return { left, top, right, bottom };
  }

  private calculateSelectionMenuOffset(rect: DOMRect): void {
    const menuOffset = { x: 0, y: 10 };
    const editorRect = this.props.editorState.renderBox?.getBoundingClientRect();
    if (!editorRect) return;

    const editorHeight = editorRect.height;
    const editorWidth = editorRect.width;
    const menuHeight = this.props.menuHeight || 300;
    const menuWidth = this.props.menuWidth || 300;

    // Show below by default
    this._alignment = 'topLeft';
    const bottomRight = { x: rect.right, y: rect.bottom };
    const topRight = { x: rect.right, y: rect.top };
    let offset = { x: bottomRight.x + menuOffset.x, y: bottomRight.y + menuOffset.y };
    
    this._offset = {
      x: offset.x,
      y: offset.y,
    };

    // Show above if not enough space below
    if (offset.y + menuHeight >= editorRect.top + editorHeight) {
      offset = { x: topRight.x, y: topRight.y - menuOffset.y };
      this._alignment = 'bottomLeft';

      this._offset = {
        x: offset.x,
        y: editorHeight + editorRect.top - offset.y,
      };
    }

    // Adjust horizontal position
    if (this._offset.x + menuWidth < editorRect.left + editorWidth) {
      // Keep current position
    } else if (offset.x - editorRect.left > menuWidth) {
      // Show on left
      this._alignment = this._alignment === 'topLeft' ? 'topRight' : 'bottomRight';
      this._offset = {
        x: editorWidth - this._offset.x + editorRect.left,
        y: this._offset.y,
      };
    }
  }
}

// Standard selection menu items
export const standardSelectionMenuItems: SelectionMenuItem[] = [
  {
    getName: () => 'Text',
    icon: (editorState, isSelected, style) => (
      <span style={{ color: isSelected ? style.selectionMenuItemSelectedIconColor : style.selectionMenuItemIconColor }}>
        T
      </span>
    ),
    keywords: ['text'],
    handler: (editorState, _, __) => {
      // Insert paragraph node
      console.log('Insert text paragraph');
    },
  },
  {
    getName: () => 'Heading 1',
    icon: (editorState, isSelected, style) => (
      <span style={{ color: isSelected ? style.selectionMenuItemSelectedIconColor : style.selectionMenuItemIconColor }}>
        H1
      </span>
    ),
    keywords: ['heading 1', 'h1'],
    handler: (editorState, _, __) => {
      // Insert heading 1
      console.log('Insert heading 1');
    },
  },
  {
    getName: () => 'Heading 2',
    icon: (editorState, isSelected, style) => (
      <span style={{ color: isSelected ? style.selectionMenuItemSelectedIconColor : style.selectionMenuItemIconColor }}>
        H2
      </span>
    ),
    keywords: ['heading 2', 'h2'],
    handler: (editorState, _, __) => {
      // Insert heading 2
      console.log('Insert heading 2');
    },
  },
  {
    getName: () => 'Heading 3',
    icon: (editorState, isSelected, style) => (
      <span style={{ color: isSelected ? style.selectionMenuItemSelectedIconColor : style.selectionMenuItemIconColor }}>
        H3
      </span>
    ),
    keywords: ['heading 3', 'h3'],
    handler: (editorState, _, __) => {
      // Insert heading 3
      console.log('Insert heading 3');
    },
  },
  {
    getName: () => 'Image',
    icon: (editorState, isSelected, style) => (
      <span style={{ color: isSelected ? style.selectionMenuItemSelectedIconColor : style.selectionMenuItemIconColor }}>
        📷
      </span>
    ),
    keywords: ['image'],
    handler: (editorState, menuService, context) => {
      // Show image menu
      console.log('Show image menu');
    },
  },
  {
    getName: () => 'Bulleted List',
    icon: (editorState, isSelected, style) => (
      <span style={{ color: isSelected ? style.selectionMenuItemSelectedIconColor : style.selectionMenuItemIconColor }}>
        •
      </span>
    ),
    keywords: ['bulleted list', 'list', 'unordered list'],
    handler: (editorState, _, __) => {
      // Insert bulleted list
      console.log('Insert bulleted list');
    },
  },
  {
    getName: () => 'Numbered List',
    icon: (editorState, isSelected, style) => (
      <span style={{ color: isSelected ? style.selectionMenuItemSelectedIconColor : style.selectionMenuItemIconColor }}>
        1.
      </span>
    ),
    keywords: ['numbered list', 'list', 'ordered list'],
    handler: (editorState, _, __) => {
      // Insert numbered list
      console.log('Insert numbered list');
    },
  },
  {
    getName: () => 'Checkbox',
    icon: (editorState, isSelected, style) => (
      <span style={{ color: isSelected ? style.selectionMenuItemSelectedIconColor : style.selectionMenuItemIconColor }}>
        ☐
      </span>
    ),
    keywords: ['todo list', 'list', 'checkbox list'],
    handler: (editorState, _, __) => {
      // Insert checkbox
      console.log('Insert checkbox');
    },
  },
  {
    getName: () => 'Quote',
    icon: (editorState, isSelected, style) => (
      <span style={{ color: isSelected ? style.selectionMenuItemSelectedIconColor : style.selectionMenuItemIconColor }}>
        "
      </span>
    ),
    keywords: ['quote', 'refer'],
    handler: (editorState, _, __) => {
      // Insert quote
      console.log('Insert quote');
    },
  },
];

export const singleColumnVisibleMenuItems: SelectionMenuItem[] = [
  standardSelectionMenuItems[0], // Text
  standardSelectionMenuItems[1], // Heading 1
  standardSelectionMenuItems[2], // Heading 2
];