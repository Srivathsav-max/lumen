import { EditorState } from '../../editor_state';
import { AppFlowySelectionService } from '../../selection/selection_service';
import { DesktopSelectionServiceWidget } from './selection/desktop_selection_service';
import { MobileSelectionServiceWidget } from './selection/mobile_selection_service';
import { ContextMenuItem } from '../../context_menu/context_menu';
import { AppFlowyDropTargetStyle } from '../style/drop_target_style';
import { Selection, Position } from '../../selection';
import { Node } from '../../node';
import { SelectionGestureInterceptor } from '../../selection/selection_gesture_interceptor';
import { MobileSelectionDragMode } from './selection/mobile_selection_service';

interface SelectionServiceWidgetProps {
  child: HTMLElement;
  cursorColor?: string;
  selectionColor?: string;
  showMagnifier?: boolean;
  contextMenuItems?: ContextMenuItem[][];
  dropTargetStyle?: AppFlowyDropTargetStyle;
}

export class SelectionServiceWidget implements AppFlowySelectionService {
  private props: SelectionServiceWidgetProps;
  private element: HTMLElement;
  private forwardService: AppFlowySelectionService;
  private editorState: EditorState;

  constructor(props: SelectionServiceWidgetProps) {
    this.props = {
      cursorColor: '#00BCF0',
      selectionColor: 'rgba(111, 201, 231, 0.21)',
      showMagnifier: true,
      ...props
    };
    
    this.editorState = EditorState.getInstance();
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    if (this.isDesktopOrWeb()) {
      this.forwardService = new DesktopSelectionServiceWidget({
        cursorColor: this.props.cursorColor!,
        selectionColor: this.props.selectionColor!,
        contextMenuItems: this.props.contextMenuItems,
        dropTargetStyle: this.props.dropTargetStyle || new AppFlowyDropTargetStyle(),
        child: this.props.child,
      });
    } else {
      this.forwardService = new MobileSelectionServiceWidget({
        cursorColor: this.props.cursorColor!,
        selectionColor: this.props.selectionColor!,
        showMagnifier: this.props.showMagnifier!,
        magnifierSize: this.editorState.editorStyle.magnifierSize,
        child: this.props.child,
      });
    }

    return this.forwardService.getElement();
  }

  private isDesktopOrWeb(): boolean {
    return !(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }

  // Delegate all methods to the forward service
  clearCursor(): void {
    this.forwardService.clearCursor();
  }

  clearSelection(): void {
    this.forwardService.clearSelection();
  }

  get currentSelectedNodes(): Node[] {
    return this.forwardService.currentSelectedNodes;
  }

  get currentSelection(): Selection | null {
    return this.forwardService.currentSelection;
  }

  getNodeInOffset(offset: { x: number; y: number }): Node | null {
    return this.forwardService.getNodeInOffset(offset);
  }

  getPositionInOffset(offset: { x: number; y: number }): Position | null {
    return this.forwardService.getPositionInOffset(offset);
  }

  registerGestureInterceptor(interceptor: SelectionGestureInterceptor): void {
    this.forwardService.registerGestureInterceptor(interceptor);
  }

  get selectionRects(): DOMRect[] {
    return this.forwardService.selectionRects;
  }

  unregisterGestureInterceptor(key: string): void {
    this.forwardService.unregisterGestureInterceptor(key);
  }

  updateSelection(selection: Selection | null): void {
    this.forwardService.updateSelection(selection);
  }

  onPanStart(details: PointerEvent, mode: MobileSelectionDragMode): Selection | null {
    return this.forwardService.onPanStart(details, mode);
  }

  onPanUpdate(details: PointerEvent, mode: MobileSelectionDragMode): Selection | null {
    return this.forwardService.onPanUpdate(details, mode);
  }

  onPanEnd(details: PointerEvent, mode: MobileSelectionDragMode): void {
    this.forwardService.onPanEnd(details, mode);
  }

  removeDropTarget(): void {
    this.forwardService.removeDropTarget();
  }

  renderDropTargetForOffset(
    offset: { x: number; y: number },
    options?: {
      builder?: (context: any) => HTMLElement;
      interceptor?: (node: Node) => boolean;
    }
  ): void {
    this.forwardService.renderDropTargetForOffset(offset, options);
  }

  getDropTargetRenderData(
    offset: { x: number; y: number },
    options?: {
      interceptor?: (node: Node) => boolean;
    }
  ): any {
    return this.forwardService.getDropTargetRenderData(offset, options);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.forwardService.destroy?.();
  }
}