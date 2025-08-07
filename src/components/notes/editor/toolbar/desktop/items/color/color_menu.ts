import { EditorState } from '../../../../../editor_state';
import { Selection } from '../../../../../core/location/selection';
import { ColorPicker, ColorOption } from './color_picker';
import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';
import { formatFontColor, formatHighlightColor } from '../../../../command/text_commands';
import { generateTextColorOptions, generateHighlightColorOptions } from '../../../../util/color_util';

let currentOverlay: HTMLElement | null = null;
let keepEditorFocusCount = 0;

const keepEditorFocusNotifier = {
  increase: () => keepEditorFocusCount++,
  decrease: () => keepEditorFocusCount--
};

export function showColorMenu(options: {
  context: HTMLElement;
  editorState: EditorState;
  selection: Selection;
  currentColorHex?: string;
  textColorOptions?: ColorOption[];
  highlightColorOptions?: ColorOption[];
  isTextColor: boolean;
  showClearButton?: boolean;
}): void {
  const {
    context,
    editorState,
    selection,
    currentColorHex,
    textColorOptions,
    highlightColorOptions,
    isTextColor,
    showClearButton = false
  } = options;

  // Since link format is only available for single line selection,
  // the first rect(also the only rect) is used as the starting reference point for the overlay position
  const rects = editorState.selectionRects();
  if (rects.length === 0) return;
  
  const rect = rects[0];

  // Calculate position
  const left = rect.left + 10;
  let top: number | undefined;
  let bottom: number | undefined;
  
  const offset = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  const editorRect = editorState.renderBox?.getBoundingClientRect();
  if (editorRect) {
    const editorOffset = { x: editorRect.left, y: editorRect.top };
    const editorHeight = editorRect.height;
    const threshold = editorOffset.y + editorHeight - 250;
    
    if (offset.y > threshold) {
      bottom = editorOffset.y + editorHeight - rect.top - 5;
    } else {
      top = rect.bottom + 5;
    }
  } else {
    top = rect.bottom + 5;
  }

  function dismissOverlay(): void {
    if (currentOverlay) {
      currentOverlay.remove();
      currentOverlay = null;
    }
  }

  keepEditorFocusNotifier.increase();
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    ${top !== undefined ? `top: ${top}px;` : ''}
    ${bottom !== undefined ? `bottom: ${bottom}px;` : ''}
    left: ${left}px;
    z-index: 1000;
  `;

  const colorPicker = new ColorPicker({
    title: isTextColor
      ? AppFlowyEditorL10n.current.textColor
      : AppFlowyEditorL10n.current.highlightColor,
    showClearButton,
    selectedColorHex: currentColorHex,
    colorOptions: isTextColor
      ? textColorOptions ?? generateTextColorOptions()
      : highlightColorOptions ?? generateHighlightColorOptions(),
    onSubmittedColorHex: (color, _) => {
      if (isTextColor) {
        formatFontColor(
          editorState,
          editorState.selection,
          color,
          { withUpdateSelection: true }
        );
      } else {
        formatHighlightColor(
          editorState,
          editorState.selection,
          color,
          { withUpdateSelection: true }
        );
      }
      dismissOverlay();
      keepEditorFocusNotifier.decrease();
    },
    resetText: isTextColor
      ? AppFlowyEditorL10n.current.resetToDefaultColor
      : AppFlowyEditorL10n.current.clearHighlightColor,
    resetIconName: isTextColor ? 'reset_text_color' : 'clear_highlight_color'
  });

  overlay.appendChild(colorPicker.render(context));
  document.body.appendChild(overlay);
  currentOverlay = overlay;
}