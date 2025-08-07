interface MobileSelectionGestureDetectorProps {
  child?: HTMLElement;
  onTapUp?: (event: PointerEvent) => void;
  onDoubleTapUp?: (event: PointerEvent) => void;
  onTripleTapUp?: (event: PointerEvent) => void;
  onSecondaryTapUp?: (event: PointerEvent) => void;
  onPanStart?: (event: PointerEvent) => void;
  onPanUpdate?: (event: PointerEvent) => void;
  onPanEnd?: (event: PointerEvent) => void;
  onLongPressStart?: (event: PointerEvent) => void;
  onLongPressEnd?: (event: PointerEvent) => void;
  onLongPressMoveUpdate?: (event: PointerEvent) => void;
}

export class MobileSelectionGestureDetector {
  private props: MobileSelectionGestureDetectorProps;
  private element: HTMLElement;
  private isDoubleTap = false;
  private doubleTapTimer?: number;
  private tripleTapCount = 0;
  private tripleTapTimer?: number;
  private longPressTimer?: number;
  private isDragging = false;
  private isLongPressing = false;
  private startPosition?: { x: number; y: number };

  private readonly kDoubleTapTimeout = 300; // milliseconds
  private readonly kTripleTapTimeout = 500; // milliseconds
  private readonly kLongPressTimeout = 500; // milliseconds
  private readonly kDragThreshold = 10; // pixels

  constructor(props: MobileSelectionGestureDetectorProps) {
    this.props = props;
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'mobile-selection-gesture-detector';
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.touchAction = 'none'; // Prevent default touch behaviors
    
    if (this.props.child) {
      container.appendChild(this.props.child);
    }
    
    return container;
  }

  private setupEventListeners(): void {
    // Touch and pointer events
    this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.element.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.element.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.element.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
    
    // Context menu for secondary tap
    this.element.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    // Prevent default behaviors
    this.element.addEventListener('dragstart', (e) => e.preventDefault());
    this.element.addEventListener('selectstart', (e) => e.preventDefault());
  }

  private handlePointerDown(event: PointerEvent): void {
    if (event.button === 2) return; // Ignore right-click for primary gestures
    
    this.isDragging = false;
    this.isLongPressing = false;
    this.startPosition = { x: event.clientX, y: event.clientY };
    
    // Start long press timer
    this.clearLongPressTimer();
    this.longPressTimer = window.setTimeout(() => {
      if (!this.isDragging && this.props.onLongPressStart) {
        this.isLongPressing = true;
        this.props.onLongPressStart(event);
      }
    }, this.kLongPressTimeout);
    
    this.element.setPointerCapture(event.pointerId);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.element.hasPointerCapture(event.pointerId)) return;
    
    // Check if we've moved enough to start dragging
    if (!this.isDragging && this.startPosition) {
      const deltaX = Math.abs(event.clientX - this.startPosition.x);
      const deltaY = Math.abs(event.clientY - this.startPosition.y);
      
      if (deltaX > this.kDragThreshold || deltaY > this.kDragThreshold) {
        this.isDragging = true;
        this.clearLongPressTimer();
        
        if (this.props.onPanStart) {
          this.props.onPanStart(event);
        }
      }
    }
    
    if (this.isDragging && this.props.onPanUpdate) {
      this.props.onPanUpdate(event);
    }
    
    if (this.isLongPressing && this.props.onLongPressMoveUpdate) {
      this.props.onLongPressMoveUpdate(event);
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    if (!this.element.hasPointerCapture(event.pointerId)) return;
    
    this.element.releasePointerCapture(event.pointerId);
    this.clearLongPressTimer();
    
    if (this.isLongPressing) {
      if (this.props.onLongPressEnd) {
        this.props.onLongPressEnd(event);
      }
    } else if (this.isDragging) {
      if (this.props.onPanEnd) {
        this.props.onPanEnd(event);
      }
    } else {
      // Handle tap gestures
      this.handleTapGesture(event);
    }
    
    this.isDragging = false;
    this.isLongPressing = false;
    this.startPosition = undefined;
  }

  private handlePointerCancel(event: PointerEvent): void {
    this.clearLongPressTimer();
    
    if (this.isLongPressing && this.props.onLongPressEnd) {
      this.props.onLongPressEnd(event);
    } else if (this.isDragging && this.props.onPanEnd) {
      this.props.onPanEnd(event);
    }
    
    this.isDragging = false;
    this.isLongPressing = false;
    this.startPosition = undefined;
  }

  private handleTapGesture(event: PointerEvent): void {
    if (this.tripleTapCount === 2) {
      this.tripleTapCount = 0;
      this.clearTripleTapTimer();
      if (this.props.onTripleTapUp) {
        this.props.onTripleTapUp(event);
      }
    } else if (this.isDoubleTap) {
      this.isDoubleTap = false;
      this.clearDoubleTapTimer();
      if (this.props.onDoubleTapUp) {
        this.props.onDoubleTapUp(event);
      }
      this.tripleTapCount++;
    } else {
      if (this.props.onTapUp) {
        this.props.onTapUp(event);
      }

      this.isDoubleTap = true;
      this.clearDoubleTapTimer();
      this.doubleTapTimer = window.setTimeout(() => {
        this.isDoubleTap = false;
        this.doubleTapTimer = undefined;
      }, this.kDoubleTapTimeout);

      this.tripleTapCount = 1;
      this.clearTripleTapTimer();
      this.tripleTapTimer = window.setTimeout(() => {
        this.tripleTapCount = 0;
        this.tripleTapTimer = undefined;
      }, this.kTripleTapTimeout);
    }
  }

  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    if (this.props.onSecondaryTapUp) {
      // Convert MouseEvent to PointerEvent-like object
      const pointerEvent = new PointerEvent('pointerup', {
        clientX: event.clientX,
        clientY: event.clientY,
        button: 2,
        buttons: 0,
        pointerId: -1,
        bubbles: true,
        cancelable: true
      });
      this.props.onSecondaryTapUp(pointerEvent);
    }
  }

  private clearDoubleTapTimer(): void {
    if (this.doubleTapTimer !== undefined) {
      window.clearTimeout(this.doubleTapTimer);
      this.doubleTapTimer = undefined;
    }
  }

  private clearTripleTapTimer(): void {
    if (this.tripleTapTimer !== undefined) {
      window.clearTimeout(this.tripleTapTimer);
      this.tripleTapTimer = undefined;
    }
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== undefined) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.clearDoubleTapTimer();
    this.clearTripleTapTimer();
    this.clearLongPressTimer();
    
    // Remove all event listeners
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('pointercancel', this.handlePointerCancel);
    this.element.removeEventListener('contextmenu', this.handleContextMenu);
  }
}