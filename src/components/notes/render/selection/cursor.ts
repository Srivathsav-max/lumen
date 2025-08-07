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
    
    // Apply bounds checking and coordinate validation during creation
    const left = Math.max(0, Math.round(this.props.rect.left));
    const top = Math.max(0, Math.round(this.props.rect.top));
    const width = Math.max(1, Math.round(this.props.rect.width));
    const height = Math.max(1, Math.round(this.props.rect.height));
    
    container.style.cssText = `
      position: absolute;
      left: ${left}px;
      top: ${top}px;
      width: ${width}px;
      height: ${height}px;
      pointer-events: none;
      z-index: 1000;
      transform-origin: top left;
      will-change: transform;
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
    // Validate rect coordinates and dimensions
    if (!newRect || !isFinite(newRect.left) || !isFinite(newRect.top) ||
        !isFinite(newRect.width) || !isFinite(newRect.height)) {
      console.warn('Invalid cursor rect provided:', newRect);
      return;
    }
    
    // Apply bounds checking to prevent negative or invalid positions
    const left = Math.max(0, Math.round(newRect.left));
    const top = Math.max(0, Math.round(newRect.top));
    const width = Math.max(1, Math.round(newRect.width));
    const height = Math.max(1, Math.round(newRect.height));
    
    // Additional bounds checking for viewport constraints
    const maxLeft = Math.max(0, window.innerWidth - width);
    const maxTop = Math.max(0, window.innerHeight - height);
    
    const clampedLeft = Math.min(left, maxLeft);
    const clampedTop = Math.min(top, maxTop);
    
    this.props.rect = {
      left: clampedLeft,
      top: clampedTop,
      width: width,
      height: height
    };
    
    this.element.style.left = `${clampedLeft}px`;
    this.element.style.top = `${clampedTop}px`;
    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
    
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