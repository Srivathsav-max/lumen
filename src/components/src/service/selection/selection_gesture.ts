interface SelectionGestureDetectorProps {
  child?: HTMLElement;
  onTapDown?: (event: PointerEvent) => void;
  onDoubleTapDown?: (event: PointerEvent) => void;
  onTripleTapDown?: (event: PointerEvent) => void;
  onSecondaryTapDown?: (event: PointerEvent) => void;
  onPanStart?: (event: PointerEvent) => void;
  onPanUpdate?: (event: PointerEvent) => void;
  onPanEnd?: (event: PointerEvent) => void;
  enablePanImmediate?: boolean;
}

export class SelectionGestureDetector {
  private props: SelectionGestureDetectorProps;
  private element: HTMLElement;
  private isDoubleTap = false;
  private doubleTapTimer?: number;
  private tripleTapCount = 0;
  private tripleTapTimer?: number;
  private isDragging = false;

  private readonly kDoubleTapTimeout = 300; // milliseconds
  private readonly kTripleTapTimeout = 500; // milliseconds

  constructor(props: SelectionGestureDetectorProps) {
    this.props = {
      enablePanImmediate: true,
      ...props
    };
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'selection-gesture-detector';
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    
    if (this.props.child) {
      container.appendChild(this.props.child);
    }
    
    return container;
  }

  private setupEventListeners(): void {
    // Primary tap handling
    this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.element.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.element.addEventListener('pointerup', this.handlePointerUp.bind(this));
    
    // Secondary tap (right-click)
    this.element.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    // Prevent default drag behavior
    this.element.addEventListener('dragstart', (e) => e.preventDefault());
  }

  private handlePointerDown(event: PointerEvent): void {
    if (event.button === 2) return; // Ignore right-click for primary gestures
    
    this.isDragging = false;
    
    if (this.props.enablePanImmediate && this.props.onPanStart) {
      this.props.onPanStart(event);
    }
    
    this.element.setPointerCapture(event.pointerId);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.element.hasPointerCapture(event.pointerId)) return;
    
    if (!this.isDragging) {
      this.isDragging = true;
      if (!this.props.enablePanImmediate && this.props.onPanStart) {
        this.props.onPanStart(event);
      }
    }
    
    if (this.props.onPanUpdate) {
      this.props.onPanUpdate(event);
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    if (!this.element.hasPointerCapture(event.pointerId)) return;
    
    this.element.releasePointerCapture(event.pointerId);
    
    if (this.isDragging) {
      if (this.props.onPanEnd) {
        this.props.onPanEnd(event);
      }
    } else {
      // Handle tap gestures
      this.handleTapGesture(event);
    }
    
    this.isDragging = false;
  }

  private handleTapGesture(event: PointerEvent): void {
    if (this.tripleTapCount === 2) {
      this.tripleTapCount = 0;
      this.clearTripleTapTimer();
      if (this.props.onTripleTapDown) {
        this.props.onTripleTapDown(event);
      }
    } else if (this.isDoubleTap) {
      this.isDoubleTap = false;
      this.clearDoubleTapTimer();
      if (this.props.onDoubleTapDown) {
        this.props.onDoubleTapDown(event);
      }
      this.tripleTapCount++;
    } else {
      if (this.props.onTapDown) {
        this.props.onTapDown(event);
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
    if (this.props.onSecondaryTapDown) {
      // Convert MouseEvent to PointerEvent-like object
      const pointerEvent = new PointerEvent('pointerdown', {
        clientX: event.clientX,
        clientY: event.clientY,
        button: 2,
        buttons: 2,
        pointerId: -1,
        bubbles: true,
        cancelable: true
      });
      this.props.onSecondaryTapDown(pointerEvent);
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

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.clearDoubleTapTimer();
    this.clearTripleTapTimer();
    
    // Remove all event listeners
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('contextmenu', this.handleContextMenu);
  }
}