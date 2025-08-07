import { EditorState } from '../../../../../editor_state';
import { Selection } from '../../../../../core/location/selection';
import { ColorOption } from '../../../desktop/items/color/color_picker';
import { AppFlowyRichTextKeys } from '../../../../block_component/rich_text/appflowy_rich_text_keys';
import { ClearColorButton } from './utils/clear_color_button';
import { ColorButton } from './utils/color_button';
import { generateTextColorOptions, formatFontColor } from '../../../../util/color_util';

export class TextColorOptionsWidgets {
  private editorState: EditorState;
  private selection: Selection;
  private textColorOptions?: ColorOption[];

  constructor(
    editorState: EditorState,
    selection: Selection,
    options: { textColorOptions?: ColorOption[] } = {}
  ) {
    this.editorState = editorState;
    this.selection = selection;
    this.textColorOptions = options.textColorOptions;
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding: 8px;
      max-height: 200px;
      overflow-y: auto;
    `;

    const selection = this.selection;
    const nodes = this.editorState.getNodesInSelection(selection);
    const hasTextColor = nodes.allSatisfyInSelection(selection, (delta) => {
      return delta.everyAttributes(
        (attributes) => attributes[AppFlowyRichTextKeys.textColor] != null
      );
    });

    const colorOptions = this.textColorOptions ?? generateTextColorOptions();

    // Clear color button
    const clearButton = new ClearColorButton({
      onPressed: () => {
        if (hasTextColor) {
          this.editorState.formatDelta(selection, {
            [AppFlowyRichTextKeys.textColor]: null
          });
          this.updateView(container);
        }
      },
      isSelected: !hasTextColor
    });
    container.appendChild(clearButton.render(container));

    // Color option buttons
    colorOptions.forEach(colorOption => {
      const isSelected = nodes.allSatisfyInSelection(selection, (delta) => {
        return delta.everyAttributes(
          (attributes) => attributes[AppFlowyRichTextKeys.textColor] === colorOption.colorHex
        );
      });

      const colorButton = new ColorButton({
        colorOption,
        onPressed: () => {
          if (!isSelected) {
            formatFontColor(
              this.editorState,
              this.editorState.selection,
              colorOption.colorHex
            );
            this.updateView(container);
          }
        },
        isSelected
      });

      container.appendChild(colorButton.render(container));
    });

    return container;
  }

  private updateView(container: HTMLElement): void {
    // Simple re-render approach
    const newWidget = this.render();
    container.innerHTML = '';
    while (newWidget.firstChild) {
      container.appendChild(newWidget.firstChild);
    }
  }
}