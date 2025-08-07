import { ToolbarItem } from '../../../../../render/toolbar/toolbar_item';
import { onlyShowInSingleSelectionAndTextType } from '../../../../block_component/base_component/block_component_configuration';
import { SVGIconItemWidget } from '../icon_item_widget';
import { AppFlowyRichTextKeys } from '../../../../block_component/rich_text/appflowy_rich_text_keys';
import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';
import { LinkMenu } from './link_menu';
import { isUri, editorLaunchUrl } from '../../../../util/link_util';
import { EditorState } from '../../../../../editor_state';
import { Selection } from '../../../../../core/location/selection';
import { AppFlowyClipboard } from '../../../../../infra/clipboard';

const menuWidth = 300;
const hasTextHeight = 244;
const noTextHeight = 150;
const kLinkItemId = 'editor.link';

let keepEditorFocusCount = 0;
const keepEditorFocusNotifier = {
  increase: () => keepEditorFocusCount++,
  decrease: () => keepEditorFocusCount--
};

export const linkItem = new ToolbarItem({
  id: kLinkItemId,
  group: 4,
  isActive: onlyShowInSingleSelectionAndTextType,
  builder: (context, editorState, highlightColor, iconColor, tooltipBuilder) => {
    const selection = editorState.selection!;
    const nodes = editorState.getNodesInSelection(selection);
    const isHref = nodes.allSatisfyInSelection(selection, (delta) => {
      return delta.everyAttributes(
        (attributes) => attributes[AppFlowyRichTextKeys.href] != null
      );
    });

    const child = new SVGIconItemWidget({
      iconName: 'toolbar/link',
      isHighlight: isHref,
      highlightColor,
      iconColor,
      onPressed: () => {
        showLinkMenu(context, editorState, selection, isHref);
      }
    });

    if (tooltipBuilder) {
      return tooltipBuilder(
        context,
        kLinkItemId,
        AppFlowyEditorL10n.current.link,
        child.render()
      );
    }

    return child.render();
  }
});

function showLinkMenu(
  context: HTMLElement,
  editorState: EditorState,
  selection: Selection,
  isHref: boolean
): void {
  // Since link format is only available for single line selection,
  // the first rect(also the only rect) is used as the starting reference point for the overlay position

  // Get link address if the selection is already a link
  let linkText: string | undefined;
  if (isHref) {
    linkText = editorState.getDeltaAttributeValueInSelection(
      AppFlowyRichTextKeys.href,
      selection
    );
  }

  const { left, top, right, bottom } = getPosition(editorState, linkText);

  // Get node, index and length for formatting text when the link is removed
  const node = editorState.getNodeAtPath(selection.end.path);
  if (!node) {
    return;
  }
  const index = selection.normalized.startIndex;
  const length = selection.length;

  let overlay: HTMLElement | null = null;

  function dismissOverlay(): void {
    keepEditorFocusNotifier.decrease();
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  keepEditorFocusNotifier.increase();
  
  // Create overlay
  overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    ${top !== undefined ? `top: ${top}px;` : ''}
    ${bottom !== undefined ? `bottom: ${bottom}px;` : ''}
    ${left !== undefined ? `left: ${left}px;` : ''}
    ${right !== undefined ? `right: ${right}px;` : ''}
    z-index: 1000;
  `;

  const linkMenu = new LinkMenu({
    linkText,
    editorState,
    onOpenLink: async () => {
      if (linkText) {
        await editorLaunchUrl(linkText);
      }
    },
    onSubmitted: async (text) => {
      if (isUri(text)) {
        await editorState.formatDelta(selection, {
          [AppFlowyRichTextKeys.href]: text
        });
        dismissOverlay();
      }
    },
    onCopyLink: () => {
      if (linkText) {
        AppFlowyClipboard.setData({ text: linkText });
      }
      dismissOverlay();
    },
    onRemoveLink: () => {
      const transaction = editorState.transaction;
      transaction.formatText(
        node,
        index,
        length,
        { [AppFlowyRichTextKeys.href]: null }
      );
      editorState.apply(transaction);
      dismissOverlay();
    },
    onDismiss: dismissOverlay
  });

  overlay.appendChild(linkMenu.render(context));
  document.body.appendChild(overlay);
}

// Get a proper position for link menu
function getPosition(
  editorState: EditorState,
  linkText?: string
): { left?: number; top?: number; right?: number; bottom?: number } {
  const rects = editorState.selectionRects();
  if (rects.length === 0) {
    return { left: 0, top: 0 };
  }
  
  const rect = rects[0];
  let left: number | undefined, right: number | undefined, top: number | undefined, bottom: number | undefined;
  
  const offset = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  const editorRect = editorState.renderBox?.getBoundingClientRect();
  if (!editorRect) {
    return { left: rect.left, top: rect.bottom + 5 };
  }
  
  const editorOffset = { x: editorRect.left, y: editorRect.top };
  const editorWidth = editorRect.width;
  
  [left, right] = getStartEnd(
    editorWidth,
    offset.x,
    editorOffset.x,
    menuWidth,
    rect.left,
    rect.right,
    true
  );

  const editorHeight = editorRect.height;
  [top, bottom] = getStartEnd(
    editorHeight,
    offset.y,
    editorOffset.y,
    linkText ? hasTextHeight : noTextHeight,
    rect.top,
    rect.bottom,
    false
  );

  return { left, top, right, bottom };
}

// This method calculates the start and end position for a specific
// direction (either horizontal or vertical) in the layout.
function getStartEnd(
  editorLength: number,
  offsetD: number,
  editorOffsetD: number,
  menuLength: number,
  rectStart: number,
  rectEnd: number,
  isHorizontal: boolean
): [number | undefined, number | undefined] {
  const threshold = editorOffsetD + editorLength - menuWidth;
  let start: number | undefined, end: number | undefined;
  
  if (offsetD > threshold) {
    end = editorOffsetD + editorLength - rectStart - 5;
  } else if (isHorizontal) {
    start = rectStart;
  } else {
    start = rectEnd + 5;
  }

  return [start, end];
}