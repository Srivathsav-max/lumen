import { EditorState } from '../../editor_state';
import { Node } from '../../node';
import { TextInsert } from '../../delta';
import { Selection } from '../../selection';
import { AppFlowyRichTextKeys } from '../../block_component/rich_text/rich_text_keys';
import { editorLaunchUrl } from '../../../infra/url_launcher';
import { SelectionUpdateReason } from '../../selection/selection_update_reason';
import { showLinkMenu } from '../../toolbar/desktop/items/link/link_menu';

export interface TextSpan {
  style?: CSSStyleDeclaration;
  text: string;
  recognizer?: EventListener;
  mouseCursor?: string;
}

/**
 * Support Desktop and Web platform
 * - customize the href text span
 */
export function defaultTextSpanDecoratorForAttribute(
  context: any,
  node: Node,
  index: number,
  text: TextInsert,
  before: TextSpan,
  after: TextSpan,
): TextSpan {
  const attributes = text.attributes;
  if (!attributes) {
    return before;
  }

  const editorState = EditorState.getInstance();
  const href = attributes[AppFlowyRichTextKeys.href] as string;
  
  if (href) {
    // Add a tap gesture recognizer to the text span
    let timer: number | undefined;
    let tapCount = 0;

    const tapHandler = async (event: MouseEvent) => {
      // Implement a simple double tap logic
      tapCount += 1;
      if (timer !== undefined) {
        clearTimeout(timer);
      }

      // Meta / Ctrl + click to open the link
      if (tapCount === 2 || 
          !editorState.editable || 
          event.ctrlKey || 
          event.metaKey) {
        tapCount = 0;
        editorLaunchUrl(href);
        return;
      }

      timer = window.setTimeout(() => {
        tapCount = 0;
        const selection = Selection.single({
          path: node.path,
          startOffset: index,
          endOffset: index + text.text.length,
        });
        
        editorState.updateSelectionWithReason(
          selection,
          SelectionUpdateReason.uiEvent,
        );

        // Use setTimeout to simulate post-frame callback
        setTimeout(() => {
          showLinkMenu(context, editorState, selection, true);
        }, 0);
      }, 200);
    };

    return {
      style: before.style,
      text: text.text,
      recognizer: tapHandler,
      mouseCursor: 'pointer',
    };
  }

  return before;
}

/**
 * Create a clickable text span element with the given properties
 */
export function createClickableTextSpan(
  textSpan: TextSpan,
  element?: HTMLElement,
): HTMLElement {
  const span = element || document.createElement('span');
  span.textContent = textSpan.text;
  
  if (textSpan.style) {
    // Apply styles from the TextSpan
    Object.assign(span.style, textSpan.style);
  }
  
  if (textSpan.mouseCursor) {
    span.style.cursor = textSpan.mouseCursor;
  }
  
  if (textSpan.recognizer) {
    span.addEventListener('click', textSpan.recognizer as EventListener);
  }
  
  return span;
}

/**
 * Apply text span styling to an HTML element
 */
export function applyTextSpanStyle(element: HTMLElement, textSpan: TextSpan): void {
  if (textSpan.style) {
    Object.assign(element.style, textSpan.style);
  }
  
  if (textSpan.mouseCursor) {
    element.style.cursor = textSpan.mouseCursor;
  }
  
  if (textSpan.recognizer) {
    element.addEventListener('click', textSpan.recognizer as EventListener);
  }
}