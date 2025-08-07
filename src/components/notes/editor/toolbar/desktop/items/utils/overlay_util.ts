import { EditorState } from '../../../../../editor_state';

export interface ButtonStyle {
  backgroundColor: string;
  hoverBackgroundColor: string;
}

export function buildOverlayButtonStyle(context: HTMLElement): ButtonStyle {
  const theme = getComputedStyle(context);
  return {
    backgroundColor: 'transparent',
    hoverBackgroundColor: theme.getPropertyValue('--hover-color') || '#f0f0f0'
  };
}

export interface BoxDecoration {
  backgroundColor: string;
  borderRadius: string;
  boxShadow: string;
}

export function buildOverlayDecoration(context: HTMLElement): BoxDecoration {
  const theme = getComputedStyle(context);
  return {
    backgroundColor: theme.getPropertyValue('--card-color') || '#ffffff',
    borderRadius: '6px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
  };
}

export class EditorOverlayTitle {
  private text: string;

  constructor(options: { text: string }) {
    this.text = options.text;
  }

  render(): HTMLElement {
    const element = document.createElement('div');
    element.style.paddingLeft = '8px';
    element.style.fontWeight = 'bold';
    element.textContent = this.text;
    return element;
  }
}

export function positionFromRect(
  rect: DOMRect,
  editorState: EditorState
): { top?: number; bottom?: number; left: number } {
  const left = rect.left + 10;
  let top: number | undefined;
  let bottom: number | undefined;
  
  const offset = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  const editorRect = editorState.renderBox?.getBoundingClientRect();
  if (!editorRect) {
    return { top: rect.bottom + 5, left };
  }
  
  const editorOffset = { x: editorRect.left, y: editorRect.top };
  const editorHeight = editorRect.height;
  const threshold = editorOffset.y + editorHeight - 200;
  
  if (offset.y > threshold) {
    bottom = editorOffset.y + editorHeight - rect.top - 5;
  } else {
    top = rect.bottom + 5;
  }

  return { top, bottom, left };
}

export function basicOverlay(
  context: HTMLElement,
  options: {
    width?: number;
    height?: number;
    children: HTMLElement[];
  }
): HTMLElement {
  const { width, height, children } = options;
  
  const container = document.createElement('div');
  const decoration = buildOverlayDecoration(context);
  
  container.style.cssText = `
    ${width ? `width: ${width}px;` : ''}
    ${height ? `height: ${height}px;` : ''}
    background-color: ${decoration.backgroundColor};
    border-radius: ${decoration.borderRadius};
    box-shadow: ${decoration.boxShadow};
    padding: 6px 4px;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  `;
  
  // Hide scrollbars
  const style = document.createElement('style');
  style.textContent = `
    .overlay-container::-webkit-scrollbar {
      display: none;
    }
  `;
  container.appendChild(style);
  container.className = 'overlay-container';
  
  const scrollContainer = document.createElement('div');
  scrollContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  `;
  
  children.forEach(child => scrollContainer.appendChild(child));
  container.appendChild(scrollContainer);
  
  return container;
}