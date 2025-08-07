import { Component, ComponentChild } from '../../../../core/component';
import { EditorState } from '../../../../core/editor_state';
import { SelectionGestureInterceptor } from '../../../../service/selection/selection_gesture_interceptor';

interface IgnoreEditorSelectionGestureProps {
  children: ComponentChild[];
}

interface IgnoreEditorSelectionGestureState {
  // Add any state properties if needed
}

export class IgnoreEditorSelectionGesture extends Component<IgnoreEditorSelectionGestureProps, IgnoreEditorSelectionGestureState> {
  private key: string;
  private interceptor: SelectionGestureInterceptor;
  private editorState: EditorState;

  constructor(props: IgnoreEditorSelectionGestureProps) {
    super(props);
    this.key = Math.random().toString(36).substr(2, 9);
    this.editorState = {} as EditorState; // In real implementation, get from context
  }

  componentDidMount(): void {
    this.interceptor = new SelectionGestureInterceptor({
      key: this.key,
      canTap: (details) => {
        const element = this.getElement();
        if (element) {
          const rect = element.getBoundingClientRect();
          const localX = details.globalPosition.x - rect.left;
          const localY = details.globalPosition.y - rect.top;
          return !(localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height);
        }
        return true;
      },
    });
    
    if (this.editorState.editable) {
      this.editorState.selectionService.registerGestureInterceptor(this.interceptor);
    }
  }

  componentWillUnmount(): void {
    if (this.editorState.editable) {
      this.editorState.selectionService.unregisterGestureInterceptor(this.key);
    }
  }

  render(): ComponentChild {
    return {
      tag: 'div',
      onPointerDown: (event: PointerEvent) => {
        const element = this.getElement();
        // touch to clear
        if (element) {
          const rect = element.getBoundingClientRect();
          const localX = event.clientX - rect.left;
          const localY = event.clientY - rect.top;
          
          if (localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height) {
            requestAnimationFrame(() => {
              this.editorState.updateSelectionWithReason(null);
            });
          }
        }
      },
      children: this.props.children,
    };
  }

  private getElement(): HTMLElement | null {
    // In a real implementation, this would get the actual DOM element
    // For now, return null as a placeholder
    return null;
  }
}