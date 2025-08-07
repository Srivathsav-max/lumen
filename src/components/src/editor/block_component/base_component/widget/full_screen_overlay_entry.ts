import { Component, ComponentChild } from '../../../../core/component';

export type WidgetBuilder = (context: any) => ComponentChild;

interface FullScreenOverlayEntryProps {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  builder: WidgetBuilder;
  tapToDismiss?: boolean;
  dismissCallback?: () => void;
}

export class FullScreenOverlayEntry {
  private top?: number;
  private bottom?: number;
  private left?: number;
  private right?: number;
  private builder: WidgetBuilder;
  private tapToDismiss: boolean;
  private dismissCallback?: () => void;
  private _entry?: OverlayEntry;

  constructor(props: FullScreenOverlayEntryProps) {
    this.top = props.top;
    this.bottom = props.bottom;
    this.left = props.left;
    this.right = props.right;
    this.builder = props.builder;
    this.tapToDismiss = props.tapToDismiss ?? true;
    this.dismissCallback = props.dismissCallback;
  }

  build(): OverlayEntry {
    this._entry?.remove();
    this._entry = new OverlayEntry({
      builder: (context) => {
        const size = this.getMediaQuerySize(context);
        return {
          tag: 'div',
          style: {
            width: `${size.width}px`,
            height: `${size.height}px`,
            position: 'relative',
          },
          children: [
            {
              tag: 'div',
              style: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                cursor: 'default',
              },
              onClick: () => {
                if (this.tapToDismiss) {
                  // remove this from the overlay when tapped the opaque layer
                  this._entry?.remove();
                  this._entry = undefined;
                  this.dismissCallback?.();
                }
              },
            },
            {
              tag: 'div',
              style: {
                position: 'absolute',
                ...(this.top !== undefined && { top: `${this.top}px` }),
                ...(this.bottom !== undefined && { bottom: `${this.bottom}px` }),
                ...(this.left !== undefined && { left: `${this.left}px` }),
                ...(this.right !== undefined && { right: `${this.right}px` }),
                backgroundColor: 'transparent',
              },
              children: [this.builder(context)],
            },
          ],
        };
      },
    });
    return this._entry;
  }

  private getMediaQuerySize(context: any): { width: number; height: number } {
    // In a real implementation, this would get the actual screen size
    // For now, return a default size
    return { width: window.innerWidth, height: window.innerHeight };
  }
}

// Simple OverlayEntry implementation
interface OverlayEntryProps {
  builder: (context: any) => ComponentChild;
}

class OverlayEntry {
  private builder: (context: any) => ComponentChild;
  private element?: HTMLElement;

  constructor(props: OverlayEntryProps) {
    this.builder = props.builder;
  }

  remove(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = undefined;
    }
  }

  // In a real implementation, this would be called by the overlay system
  mount(context: any): HTMLElement {
    if (this.element) {
      this.remove();
    }
    
    // This is a simplified implementation
    // In practice, you'd need a proper component rendering system
    this.element = document.createElement('div');
    this.element.style.position = 'fixed';
    this.element.style.top = '0';
    this.element.style.left = '0';
    this.element.style.zIndex = '9999';
    
    return this.element;
  }
}