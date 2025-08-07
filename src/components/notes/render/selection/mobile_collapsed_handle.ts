import { EditorState } from '@/notes-core/editor_state';
import { MobileBasicHandle, HandleType, DragHandle } from './mobile_basic_handle';

interface MobileCollapsedHandleProps {
  layerLink: HTMLElement;
  rect: DOMRect;
  handleColor?: string;
  handleBallWidth?: number;
  handleWidth?: number;
  enableHapticFeedbackOnAndroid?: boolean;
  onDragging?: (isDragging: boolean) => void;
}

export class MobileCollapsedHandle {
  private props: MobileCollapsedHandleProps;
  private element: HTMLElement;

  constructor(props: MobileCollapsedHandleProps) {
    this.props = {
      handleColor: '#000000',
      handleBallWidth: 6.0,
      handleWidth: 2.0,
      enableHapticFeedbackOnAndroid: true,
      ...props
    };
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'mobile-collapsed-handle';
    
    const debugInfo = EditorState.getInstance().debugInfo;
    
    if (this.isIOS()) {
      container.appendChild(this.createIOSHandle(debugInfo.debugPaintSizeEnabled));
    } else if (this.isAndroid()) {
      container.appendChild(this.createAndroidHandle(debugInfo.debugPaintSizeEnabled));
    } else {
      throw new Error('Unsupported platform');
    }
    
    return container;
  }

  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  private isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  }

  private createIOSHandle(debugPaintSizeEnabled: boolean): HTMLElement {
    const editorStyle = EditorState.getInstance().editorStyle;
    const defaultExtend = 10.0;
    const topExtend = editorStyle.mobileDragHandleTopExtend ?? defaultExtend;
    const leftExtend = editorStyle.mobileDragHandleLeftExtend ?? defaultExtend;
    const widthExtend = editorStyle.mobileDragHandleWidthExtend ?? 2 * defaultExtend;
    const heightExtend = editorStyle.mobileDragHandleHeightExtend ?? 2 * defaultExtend;
    
    const adjustedRect = new DOMRect(
      this.props.rect.left - leftExtend,
      this.props.rect.top - topExtend,
      this.props.rect.width + widthExtend,
      this.props.rect.height + heightExtend
    );

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = `${adjustedRect.left}px`;
    container.style.top = `${adjustedRect.top}px`;
    container.style.width = `${adjustedRect.width}px`;
    container.style.height = `${adjustedRect.height}px`;

    const dragHandle = new DragHandle({
      handleHeight: adjustedRect.height,
      handleType: HandleType.collapsed,
      handleColor: 'transparent',
      handleWidth: adjustedRect.width,
      debugPaintSizeEnabled,
      onDragging: this.props.onDragging
    });

    container.appendChild(dragHandle.getElement());
    return container;
  }

  private createAndroidHandle(debugPaintSizeEnabled: boolean): HTMLElement {
    const editorStyle = EditorState.getInstance().editorStyle;
    const topExtend = editorStyle.mobileDragHandleTopExtend ?? 0;
    const leftExtend = editorStyle.mobileDragHandleLeftExtend ?? 2 * this.props.handleBallWidth!;
    const widthExtend = editorStyle.mobileDragHandleWidthExtend ?? 4 * this.props.handleBallWidth!;
    const heightExtend = editorStyle.mobileDragHandleHeightExtend ?? 2 * this.props.handleBallWidth!;
    
    const adjustedRect = new DOMRect(
      this.props.rect.left - leftExtend,
      this.props.rect.top - topExtend,
      this.props.rect.width + widthExtend,
      this.props.rect.height + heightExtend
    );

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = `${adjustedRect.left}px`;
    container.style.top = `${adjustedRect.top}px`;
    container.style.width = `${adjustedRect.width}px`;
    container.style.height = `${adjustedRect.height}px`;

    const dragHandle = new DragHandle({
      handleHeight: adjustedRect.height,
      handleType: HandleType.collapsed,
      handleColor: this.props.handleColor!,
      handleWidth: adjustedRect.width,
      handleBallWidth: this.props.handleBallWidth!,
      debugPaintSizeEnabled,
      onDragging: this.props.onDragging
    });

    const handleElement = dragHandle.getElement();
    handleElement.style.top = '4px';
    container.appendChild(handleElement);
    
    return container;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  updateRect(rect: DOMRect): void {
    this.props.rect = rect;
    this.element.replaceWith(this.createElement());
    this.element = this.createElement();
  }
}