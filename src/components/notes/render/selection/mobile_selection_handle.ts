// Mobile selection handle for touch-based text selection
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
  topLeft: Offset;
}

export interface Offset {
  dx: number;
  dy: number;
}

export interface LayerLink {
  // Layer link for positioning
}

export enum HandleType {
  none = 'none',
  collapsed = 'collapsed',
  left = 'left',
  right = 'right'
}

export interface MobileSelectionHandleProps {
  layerLink: LayerLink;
  rect: Rect;
  handleType?: HandleType;
  handleColor?: string;
  handleBallWidth?: number;
  handleWidth?: number;
  enableHapticFeedbackOnAndroid?: boolean;
}

export class PlatformExtension {
  static get isIOS(): boolean {
    return typeof navigator !== 'undefined' && 
           /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  static get isAndroid(): boolean {
    return typeof navigator !== 'undefined' && 
           /Android/.test(navigator.userAgent);
  }

  static get isMobile(): boolean {
    return this.isIOS || this.isAndroid;
  }
}

export class MobileSelectionHandle {
  private props: MobileSelectionHandleProps;
  private element: HTMLElement;

  constructor(props: MobileSelectionHandleProps) {
    this.props = {
      handleType: HandleType.none,
      handleColor: '#000000',
      handleBallWidth: 6.0,
      handleWidth: 2.0,
      enableHapticFeedbackOnAndroid: true,
      ...props
    };
    
    if (this.props.handleType === HandleType.collapsed) {
      throw new Error('HandleType.collapsed is not supported for MobileSelectionHandle');
    }

    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const adjustedRect = this.calculateAdjustedRect();
    
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: ${adjustedRect.left}px;
      top: ${adjustedRect.top}px;
      width: ${adjustedRect.width}px;
      height: ${adjustedRect.height}px;
      pointer-events: auto;
      z-index: 1000;
    `;

    const dragHandle = this.createDragHandle(adjustedRect);
    container.appendChild(dragHandle);

    return container;
  }

  private calculateAdjustedRect(): Rect {
    const { rect, handleType, handleWidth, handleBallWidth } = this.props;
    let adjustedRect = rect;

    if (handleType !== HandleType.none) {
      if (PlatformExtension.isIOS) {
        // On iOS, the cursor will still be visible if the selection is not collapsed.
        // So, adding a threshold padding to avoid row overflow.
        const threshold = 0.25;
        adjustedRect = {
          left: rect.left - 2 * (handleWidth! + threshold),
          top: rect.top - handleBallWidth!,
          width: rect.width + 4 * (handleWidth! + threshold),
          height: rect.height + 2 * handleBallWidth!,
          topLeft: {
            dx: rect.left - 2 * (handleWidth! + threshold),
            dy: rect.top - handleBallWidth!
          }
        };
      } else if (PlatformExtension.isAndroid) {
        // On Android, normally the cursor will be hidden if the selection is not collapsed.
        // Extend the click area to make it easier to click.
        adjustedRect = {
          left: rect.left - 2 * handleBallWidth!,
          top: rect.top,
          width: rect.width + 4 * handleBallWidth!,
          // Enable clicking in the handle area outside the stack.
          height: rect.height + 2 * handleBallWidth!,
          topLeft: {
            dx: rect.left - 2 * handleBallWidth!,
            dy: rect.top
          }
        };
      }
    }

    return adjustedRect;
  }

  private createDragHandle(adjustedRect: Rect): HTMLElement {
    const dragHandle = new DragHandle({
      handleType: this.props.handleType!,
      handleColor: this.props.handleColor!,
      handleHeight: adjustedRect.height,
      handleWidth: this.props.handleWidth!,
      handleBallWidth: this.props.handleBallWidth!
    });

    return dragHandle.getElement();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  updateRect(newRect: Rect): void {
    this.props.rect = newRect;
    const adjustedRect = this.calculateAdjustedRect();
    
    this.element.style.left = `${adjustedRect.left}px`;
    this.element.style.top = `${adjustedRect.top}px`;
    this.element.style.width = `${adjustedRect.width}px`;
    this.element.style.height = `${adjustedRect.height}px`;

    // Update drag handle
    const dragHandle = this.element.firstChild as HTMLElement;
    if (dragHandle) {
      dragHandle.remove();
      const newDragHandle = this.createDragHandle(adjustedRect);
      this.element.appendChild(newDragHandle);
    }
  }

  destroy(): void {
    this.element.remove();
  }
}

interface DragHandleProps {
  handleType: HandleType;
  handleColor: string;
  handleHeight: number;
  handleWidth: number;
  handleBallWidth: number;
}

class DragHandle {
  private props: DragHandleProps;
  private element: HTMLElement;

  constructor(props: DragHandleProps) {
    this.props = props;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      pointer-events: auto;
    `;

    if (this.props.handleType === HandleType.none) {
      return container;
    }

    // Create handle line
    const handleLine = document.createElement('div');
    handleLine.style.cssText = `
      position: absolute;
      background-color: ${this.props.handleColor};
      width: ${this.props.handleWidth}px;
      height: ${this.props.handleHeight}px;
      left: 50%;
      top: 0;
      transform: translateX(-50%);
    `;

    // Create handle ball
    const handleBall = document.createElement('div');
    handleBall.style.cssText = `
      position: absolute;
      background-color: ${this.props.handleColor};
      width: ${this.props.handleBallWidth}px;
      height: ${this.props.handleBallWidth}px;
      border-radius: 50%;
      left: 50%;
      transform: translateX(-50%);
    `;

    // Position ball based on handle type
    if (this.props.handleType === HandleType.left) {
      handleBall.style.top = '0';
      handleBall.style.transform = 'translateX(-50%) translateY(-50%)';
    } else if (this.props.handleType === HandleType.right) {
      handleBall.style.bottom = '0';
      handleBall.style.transform = 'translateX(-50%) translateY(50%)';
    }

    // Add drag functionality
    this.addDragFunctionality(container);

    container.appendChild(handleLine);
    container.appendChild(handleBall);

    return container;
  }

  private addDragFunctionality(element: HTMLElement): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const handleStart = (clientX: number, clientY: number) => {
      isDragging = true;
      startX = clientX;
      startY = clientY;
      
      // Add haptic feedback on Android
      if (PlatformExtension.isAndroid && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
      
      element.style.cursor = 'grabbing';
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      
      // Emit drag event (would need event system)
      this.onDrag?.(deltaX, deltaY);
    };

    const handleEnd = () => {
      if (!isDragging) return;
      
      isDragging = false;
      element.style.cursor = 'grab';
      
      // Emit drag end event
      this.onDragEnd?.();
    };

    // Mouse events
    element.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
      handleMove(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', handleEnd);

    // Touch events
    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    });

    document.addEventListener('touchend', handleEnd);

    element.style.cursor = 'grab';
  }

  // Event handlers (would be connected to selection system)
  private onDrag?: (deltaX: number, deltaY: number) => void;
  private onDragEnd?: () => void;

  setDragHandlers(onDrag: (deltaX: number, deltaY: number) => void, onDragEnd: () => void): void {
    this.onDrag = onDrag;
    this.onDragEnd = onDragEnd;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}