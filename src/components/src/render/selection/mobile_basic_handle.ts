import { EditorState } from '../../editor/editor_state';
import { MobileSelectionService, MobileSelectionDragMode } from '../../service/selection/mobile_selection_service';

export enum HandleType {
  none = 'none',
  left = 'left',
  right = 'right',
  collapsed = 'collapsed'
}

export interface HandleTypeExtensions {
  getDragMode(): MobileSelectionDragMode;
  getCrossAxisAlignment(): string;
  getKey(): string;
}

export const HandleTypeUtils = {
  getDragMode(type: HandleType): MobileSelectionDragMode {
    switch (type) {
      case HandleType.none:
        throw new Error('Unsupported handle type');
      case HandleType.left:
        return MobileSelectionDragMode.leftSelectionHandle;
      case HandleType.right:
        return MobileSelectionDragMode.rightSelectionHandle;
      case HandleType.collapsed:
        return MobileSelectionDragMode.cursor;
    }
  },

  getCrossAxisAlignment(type: HandleType): string {
    switch (type) {
      case HandleType.none:
        throw new Error('Unsupported handle type');
      case HandleType.left:
        return 'flex-end';
      case HandleType.right:
        return 'flex-start';
      case HandleType.collapsed:
        return 'center';
    }
  },

  getKey(type: HandleType): string {
    switch (type) {
      case HandleType.none:
        throw new Error('Unsupported handle type');
      case HandleType.left:
        return 'left-handle';
      case HandleType.right:
        return 'right-handle';
      case HandleType.collapsed:
        return 'collapsed-handle';
    }
  }
};

interface DragHandleProps {
  handleHeight: number;
  handleColor?: string;
  handleWidth?: number;
  handleBallWidth?: number;
  debugPaintSizeEnabled?: boolean;
  onDragging?: (isDragging: boolean) => void;
  handleType: HandleType;
}

export class DragHandle {
  private props: DragHandleProps;
  private element: HTMLElement;
  private selection: any = null;

  constructor(props: DragHandleProps) {
    this.props = {
      handleColor: '#000000',
      handleWidth: 2.0,
      handleBallWidth: 6.0,
      debugPaintSizeEnabled: false,
      ...props
    };
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    let child: HTMLElement;

    if (this.isIOS()) {
      child = this.createIOSHandle();
    } else if (this.isAndroid()) {
      child = this.createAndroidHandle();
    } else {
      throw new Error('Unsupported platform');
    }

    if (this.props.debugPaintSizeEnabled) {
      const debugContainer = document.createElement('div');
      debugContainer.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
      debugContainer.appendChild(child);
      child = debugContainer;
    }

    if (this.props.handleType !== HandleType.none && this.props.handleType !== HandleType.collapsed) {
      const offset = this.isIOS() ? -this.props.handleWidth! : 0.0;
      const stack = document.createElement('div');
      stack.style.position = 'relative';
      stack.style.overflow = 'visible';

      if (this.props.handleType === HandleType.left) {
        child.style.position = 'absolute';
        child.style.left = `${offset}px`;
      }
      if (this.props.handleType === HandleType.right) {
        child.style.position = 'absolute';
        child.style.right = `${offset}px`;
      }

      stack.appendChild(child);
      child = stack;
    }

    return child;
  }

  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  private isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  }

  private createIOSHandle(): HTMLElement {
    let child: HTMLElement;
    
    if (this.props.handleType === HandleType.collapsed) {
      child = document.createElement('div');
      child.id = HandleTypeUtils.getKey(this.props.handleType);
      child.style.width = `${this.props.handleWidth}px`;
      child.style.backgroundColor = this.props.handleColor!;
      child.style.height = `${this.props.handleHeight}px`;
    } else {
      const column = document.createElement('div');
      column.style.display = 'flex';
      column.style.flexDirection = 'column';
      column.style.height = '100%';

      if (this.props.handleType === HandleType.left) {
        const ball = document.createElement('div');
        ball.style.width = `${this.props.handleBallWidth}px`;
        ball.style.height = `${this.props.handleBallWidth}px`;
        ball.style.backgroundColor = this.props.handleColor!;
        ball.style.borderRadius = '50%';
        column.appendChild(ball);
      } else {
        const spacer = document.createElement('div');
        spacer.style.width = `${this.props.handleBallWidth}px`;
        spacer.style.height = `${this.props.handleBallWidth}px`;
        column.appendChild(spacer);
      }

      const line = document.createElement('div');
      line.style.width = `${this.props.handleWidth}px`;
      line.style.backgroundColor = this.props.handleColor!;
      line.style.height = `${this.props.handleHeight - 2.0 * this.props.handleBallWidth!}px`;
      column.appendChild(line);

      if (this.props.handleType === HandleType.right) {
        const ball = document.createElement('div');
        ball.style.width = `${this.props.handleBallWidth}px`;
        ball.style.height = `${this.props.handleBallWidth}px`;
        ball.style.backgroundColor = this.props.handleColor!;
        ball.style.borderRadius = '50%';
        column.appendChild(ball);
      } else {
        const spacer = document.createElement('div');
        spacer.style.width = `${this.props.handleBallWidth}px`;
        spacer.style.height = `${this.props.handleBallWidth}px`;
        column.appendChild(spacer);
      }

      child = column;
    }

    this.addIOSGestureHandlers(child);
    return child;
  }

  private createAndroidHandle(): HTMLElement {
    let child = document.createElement('div');
    child.style.width = `${this.props.handleWidth}px`;
    child.style.height = `${this.props.handleHeight - 2.0 * this.props.handleBallWidth!}px`;

    if (this.props.handleType === HandleType.none) {
      return child;
    }

    const ballWidth = this.props.handleBallWidth! * 2.0;
    const column = document.createElement('div');
    column.style.display = 'flex';
    column.style.flexDirection = 'column';
    column.style.alignItems = HandleTypeUtils.getCrossAxisAlignment(this.props.handleType);
    column.style.minHeight = 'min-content';

    column.appendChild(child);

    let ball: HTMLElement;
    if (this.props.handleType === HandleType.collapsed) {
      ball = document.createElement('div');
      ball.style.width = `${ballWidth}px`;
      ball.style.height = `${ballWidth}px`;
      ball.style.backgroundColor = this.props.handleColor!;
      ball.style.transform = 'rotate(45deg)';
      ball.style.borderRadius = `${this.props.handleBallWidth}px ${this.props.handleBallWidth}px ${this.props.handleBallWidth}px 0`;
    } else if (this.props.handleType === HandleType.left) {
      ball = document.createElement('div');
      ball.style.width = `${ballWidth}px`;
      ball.style.height = `${ballWidth}px`;
      ball.style.backgroundColor = this.props.handleColor!;
      ball.style.borderRadius = `${this.props.handleBallWidth}px 0 ${this.props.handleBallWidth}px ${this.props.handleBallWidth}px`;
    } else {
      ball = document.createElement('div');
      ball.style.width = `${ballWidth}px`;
      ball.style.height = `${ballWidth}px`;
      ball.style.backgroundColor = this.props.handleColor!;
      ball.style.borderRadius = `0 ${this.props.handleBallWidth}px ${this.props.handleBallWidth}px ${this.props.handleBallWidth}px`;
    }

    column.appendChild(ball);
    this.addAndroidGestureHandlers(column, ballWidth);
    return column;
  }

  private addIOSGestureHandlers(element: HTMLElement): void {
    const editorState = EditorState.getInstance();
    const ballWidth = this.props.handleBallWidth!;
    let offset = 0.0;
    
    if (this.props.handleType === HandleType.left) {
      offset = ballWidth;
    } else if (this.props.handleType === HandleType.right) {
      offset = -ballWidth;
    }

    let isDragging = false;

    element.addEventListener('pointerdown', (e) => {
      isDragging = true;
      const adjustedEvent = this.translatePointerEvent(e, 0, offset);
      editorState.service.selectionService.onPanStart(
        adjustedEvent,
        HandleTypeUtils.getDragMode(this.props.handleType)
      );
      this.props.onDragging?.(true);
      e.preventDefault();
    });

    element.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const adjustedEvent = this.translatePointerEvent(e, 0, offset);
      editorState.service.selectionService.onPanUpdate(
        adjustedEvent,
        HandleTypeUtils.getDragMode(this.props.handleType)
      );
      this.props.onDragging?.(true);
    });

    element.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      editorState.service.selectionService.onPanEnd(
        e,
        HandleTypeUtils.getDragMode(this.props.handleType)
      );
      this.props.onDragging?.(false);
    });
  }

  private addAndroidGestureHandlers(element: HTMLElement, ballWidth: number): void {
    const editorState = EditorState.getInstance();
    let isDragging = false;

    element.addEventListener('pointerdown', (e) => {
      isDragging = true;
      const adjustedEvent = this.translatePointerEvent(e, 0, -ballWidth);
      this.selection = editorState.service.selectionService.onPanStart(
        adjustedEvent,
        HandleTypeUtils.getDragMode(this.props.handleType)
      );
      this.props.onDragging?.(true);
      e.preventDefault();
    });

    element.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const adjustedEvent = this.translatePointerEvent(e, 0, -ballWidth);
      const selection = editorState.service.selectionService.onPanUpdate(
        adjustedEvent,
        HandleTypeUtils.getDragMode(this.props.handleType)
      );
      
      if (this.selection !== selection) {
        // Haptic feedback simulation
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
      this.selection = selection;
      this.props.onDragging?.(true);
    });

    element.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      editorState.service.selectionService.onPanEnd(
        e,
        HandleTypeUtils.getDragMode(this.props.handleType)
      );
      this.props.onDragging?.(false);
    });
  }

  private translatePointerEvent(event: PointerEvent, dx: number, dy: number): PointerEvent {
    // Create a new event with adjusted coordinates
    const adjustedEvent = new PointerEvent(event.type, {
      ...event,
      clientX: event.clientX + dx,
      clientY: event.clientY + dy,
    });
    return adjustedEvent;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}