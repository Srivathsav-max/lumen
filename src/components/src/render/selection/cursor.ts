// Cursor component for text editing with blinking animation
import { CursorStyle } from './selectable';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CursorProps {
  rect: Rect;
  color: string;
  blinkingInterval?: number; // seconds
  shouldBlink?: boolean;
  cursorStyle?: CursorStyle;
}

export class Cursor {
  private props: CursorProps;
  private element: HTMLElement;
  private showCursor = true;
  private timer?: NodeJS.Timeout;

  constructor(props: CursorProps) {
    this.props = {
      blinkingInterval: 0.5,
      shouldBlink: true,
      cursorStyle: CursorStyle.verticalLine,
      ...props
    };

    this.element = this.createElement();
    this.initTimer();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: ${this.props.rect.left}px;
      top: ${this.props.rect.top}px;
      width: ${this.props.rect.width}px;
      height: ${this.props.rect.height}px;
      pointer-events: none;
      z-index: 100;
    `;

    const cursor = this.buildCursor();
    container.appendChild(cursor);

    return container;
  }

  private buildCursor(): HTMLElement {
    const cursor = document.createElement('div');
    let color = this.props.color;
    
    if (this.props.shouldBlink && !this.showCursor) {
      color = 'transparent';
    }

    switch (this.props.cursorStyle) {
      case CursorStyle.verticalLine:
        cursor.style.cssText = `
          width: 100%;
          height: 100%;
          background-color: ${color};
        `;
        break;

      case CursorStyle.borderLine:
        cursor.style.cssText = `
          width: 100%;
          height: 100%;
          border: 2px solid ${color};
          background-color: transparent;
          box-sizing: border-box;
        `;
        break;

      case CursorStyle.cover:
        const alpha = this.parseColorAlpha(color, 0.2);
        cursor.style.cssText = `
          width: ${this.props.rect.width}px;
          height: ${this.props.rect.height}px;
          background-color: ${this.addAlphaToColor(color, alpha)};
        `;
        break;
    }

    return cursor;
  }

  private parseColorAlpha(color: string, defaultAlpha: number): number {
    // Simple alpha extraction - would need more comprehensive color parsing
    if (color.startsWith('rgba')) {
      const match = color.match(/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return defaultAlpha;
  }

  private addAlphaToColor(color: string, alpha: number): string {
    // Convert color to rgba with alpha
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    
    if (color.startsWith('rgba(')) {
      return color.replace(/,\s*[^)]+\)/, `, ${alpha})`);
    }
    
    // Fallback for named colors
    return `rgba(0, 0, 0, ${alpha})`;
  }

  private initTimer(): void {
    if (!this.props.shouldBlink) {
      return;
    }

    this.timer = setInterval(() => {
      this.showCursor = !this.showCursor;
      this.updateCursor();
    }, this.props.blinkingInterval! * 1000);
  }

  private updateCursor(): void {
    const cursor = this.element.firstChild as HTMLElement;
    if (cursor) {
      cursor.remove();
      const newCursor = this.buildCursor();
      this.element.appendChild(newCursor);
    }
  }

  /**
   * Force the cursor widget to show for a while
   */
  show(): void {
    this.showCursor = true;
    this.updateCursor();
    
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.initTimer();
  }

  /**
   * Hide the cursor
   */
  hide(): void {
    this.showCursor = false;
    this.updateCursor();
  }

  /**
   * Update cursor position and size
   */
  updateRect(newRect: Rect): void {
    this.props.rect = newRect;
    
    this.element.style.left = `${newRect.left}px`;
    this.element.style.top = `${newRect.top}px`;
    this.element.style.width = `${newRect.width}px`;
    this.element.style.height = `${newRect.height}px`;
    
    this.updateCursor();
  }

  /**
   * Update cursor color
   */
  updateColor(newColor: string): void {
    this.props.color = newColor;
    this.updateCursor();
  }

  /**
   * Update cursor style
   */
  updateStyle(newStyle: CursorStyle): void {
    this.props.cursorStyle = newStyle;
    this.updateCursor();
  }

  /**
   * Start blinking animation
   */
  startBlinking(): void {
    this.props.shouldBlink = true;
    if (!this.timer) {
      this.initTimer();
    }
  }

  /**
   * Stop blinking animation
   */
  stopBlinking(): void {
    this.props.shouldBlink = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.showCursor = true;
    this.updateCursor();
  }

  /**
   * Get the cursor element
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.element.remove();
  }
}