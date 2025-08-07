import { Position, Selection } from '../../../core/editor_state';
import { SelectableMixin } from '../base_component/mixins';

export interface Offset {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DefaultSelectableMixin {
  forwardKey: string;
  containerKey: string;
  blockComponentKey: string;
  forward: SelectableMixin;
  
  baseOffset(options?: { shiftWithBaseOffset?: boolean }): Offset;
  getBlockRect(options?: { shiftWithBaseOffset?: boolean }): Rect;
  getPositionInOffset(start: Offset): Position;
  getCursorRectInPosition(position: Position, options?: { shiftWithBaseOffset?: boolean }): Rect | null;
  getRectsInSelection(selection: Selection, options?: { shiftWithBaseOffset?: boolean }): Rect[];
  getSelectionInRange(start: Offset, end: Offset): Selection;
  localToGlobal(offset: Offset, options?: { shiftWithBaseOffset?: boolean }): Offset;
  getWordEdgeInOffset(offset: Offset): Selection | null;
  getWordBoundaryInOffset(offset: Offset): Selection | null;
  getWordBoundaryInPosition(position: Position): Selection | null;
  start(): Position;
  end(): Position;
  textDirection(): 'ltr' | 'rtl';
}

export class DefaultSelectableMixinImpl implements DefaultSelectableMixin {
  constructor(
    public forwardKey: string,
    public containerKey: string,
    public blockComponentKey: string,
    public forward: SelectableMixin,
  ) {}

  baseOffset(options: { shiftWithBaseOffset?: boolean } = {}): Offset {
    if (options.shiftWithBaseOffset) {
      const parentElement = document.querySelector(`[key="${this.containerKey}"]`);
      const childElement = document.querySelector(`[key="${this.forwardKey}"]`);
      if (parentElement && childElement) {
        const parentRect = parentElement.getBoundingClientRect();
        const childRect = childElement.getBoundingClientRect();
        return {
          x: childRect.left - parentRect.left,
          y: childRect.top - parentRect.top,
        };
      }
    }
    return { x: 0, y: 0 };
  }

  getBlockRect(options: { shiftWithBaseOffset?: boolean } = {}): Rect {
    const parentElement = document.querySelector(`[key="${this.containerKey}"]`);
    const childElement = document.querySelector(`[key="${this.blockComponentKey}"]`);
    
    if (parentElement && childElement) {
      const parentRect = parentElement.getBoundingClientRect();
      const childRect = childElement.getBoundingClientRect();
      const offset = {
        x: childRect.left - parentRect.left,
        y: childRect.top - parentRect.top,
      };
      
      if (options.shiftWithBaseOffset) {
        return {
          left: offset.x,
          top: offset.y,
          width: parentRect.width - offset.x,
          height: parentRect.height - offset.y,
        };
      }
      return {
        left: 0,
        top: 0,
        width: parentRect.width - offset.x,
        height: parentRect.height - offset.y,
      };
    }
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  getPositionInOffset(start: Offset): Position {
    return this.forward.getPositionInOffset(start);
  }

  getCursorRectInPosition(position: Position, options: { shiftWithBaseOffset?: boolean } = {}): Rect | null {
    const rect = this.forward.getCursorRectInPosition(position, options);
    if (!rect) return null;
    
    const baseOffset = this.baseOffset(options);
    return {
      left: rect.left + baseOffset.x,
      top: rect.top + baseOffset.y,
      width: rect.width,
      height: rect.height,
    };
  }

  getRectsInSelection(selection: Selection, options: { shiftWithBaseOffset?: boolean } = {}): Rect[] {
    const rects = this.forward.getRectsInSelection(selection, options);
    const baseOffset = this.baseOffset(options);
    
    return rects.map((rect) => ({
      left: rect.left + baseOffset.x,
      top: rect.top + baseOffset.y,
      width: rect.width,
      height: rect.height,
    }));
  }

  getSelectionInRange(start: Offset, end: Offset): Selection {
    return this.forward.getSelectionInRange(start, end);
  }

  localToGlobal(offset: Offset, options: { shiftWithBaseOffset?: boolean } = {}): Offset {
    const globalOffset = this.forward.localToGlobal(offset, options);
    const baseOffset = this.baseOffset(options);
    
    return {
      x: globalOffset.x - baseOffset.x,
      y: globalOffset.y - baseOffset.y,
    };
  }

  getWordEdgeInOffset(offset: Offset): Selection | null {
    return this.forward.getWordEdgeInOffset?.(offset) || null;
  }

  getWordBoundaryInOffset(offset: Offset): Selection | null {
    return this.forward.getWordBoundaryInOffset?.(offset) || null;
  }

  getWordBoundaryInPosition(position: Position): Selection | null {
    return this.forward.getWordBoundaryInPosition?.(position) || null;
  }

  start(): Position {
    return this.forward.start();
  }

  end(): Position {
    return this.forward.end();
  }

  textDirection(): 'ltr' | 'rtl' {
    const forwardElement = document.querySelector(`[key="${this.forwardKey}"]`);
    if (forwardElement) {
      return this.forward.textDirection?.() || 'ltr';
    }
    return 'ltr';
  }
}