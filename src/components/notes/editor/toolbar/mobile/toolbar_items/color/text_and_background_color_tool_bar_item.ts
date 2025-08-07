import { MobileToolbarItem } from '../../mobile_toolbar_item';
import { ColorOption } from '../../../desktop/items/color/color_picker';
import { EditorState } from '../../../../../editor_state';
import { Selection } from '../../../../../core/location/selection';
import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';

export function buildTextAndBackgroundColorMobileToolbarItem(options: {
  textColorOptions?: ColorOption[];
  backgroundColorOptions?: ColorOption[];
} = {}): MobileToolbarItem {
  return MobileToolbarItem.withMenu({
    itemIconBuilder: (context, editorState, service) => {
      const icon = document.createElement('div');
      icon.style.cssText = `
        width: 24px;
        height: 24px;
        background-color: currentColor;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      `;
      icon.textContent = '🎨';
      return icon;
    },
    itemMenuBuilder: (editorState, service) => {
      const selection = editorState.selection;
      if (!selection) {
        return null;
      }
      return new TextAndBackgroundColorMenu({
        editorState,
        selection,
        textColorOptions: options.textColorOptions,
        backgroundColorOptions: options.backgroundColorOptions
      }).render();
    }
  });
}

class TextAndBackgroundColorMenu {
  private editorState: EditorState;
  private selection: Selection;
  private textColorOptions?: ColorOption[];
  private backgroundColorOptions?: ColorOption[];

  constructor(options: {
    editorState: EditorState;
    selection: Selection;
    textColorOptions?: ColorOption[];
    backgroundColorOptions?: ColorOption[];
  }) {
    this.editorState = options.editorState;
    this.selection = options.selection;
    this.textColorOptions = options.textColorOptions;
    this.backgroundColorOptions = options.backgroundColorOptions;
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      padding: 8px;
    `;

    // Tab headers
    const tabHeaders = document.createElement('div');
    tabHeaders.style.cssText = `
      display: flex;
      margin-bottom: 8px;
    `;

    const textColorTab = document.createElement('button');
    textColorTab.textContent = AppFlowyEditorL10n.current.textColor;
    textColorTab.style.cssText = `
      flex: 1;
      padding: 8px;
      border: 1px solid #ccc;
      background: white;
      cursor: pointer;
    `;

    const backgroundColorTab = document.createElement('button');
    backgroundColorTab.textContent = AppFlowyEditorL10n.current.backgroundColor;
    backgroundColorTab.style.cssText = `
      flex: 1;
      padding: 8px;
      border: 1px solid #ccc;
      background: white;
      cursor: pointer;
    `;

    // Tab content
    const tabContent = document.createElement('div');
    tabContent.style.cssText = `
      min-height: 120px;
      padding: 8px;
      border: 1px solid #ccc;
    `;

    let activeTab = 'text';

    const showTextColors = () => {
      activeTab = 'text';
      textColorTab.style.backgroundColor = '#f0f0f0';
      backgroundColorTab.style.backgroundColor = 'white';
      tabContent.innerHTML = '';
      tabContent.appendChild(this.createColorGrid(true));
    };

    const showBackgroundColors = () => {
      activeTab = 'background';
      textColorTab.style.backgroundColor = 'white';
      backgroundColorTab.style.backgroundColor = '#f0f0f0';
      tabContent.innerHTML = '';
      tabContent.appendChild(this.createColorGrid(false));
    };

    textColorTab.addEventListener('click', showTextColors);
    backgroundColorTab.addEventListener('click', showBackgroundColors);

    tabHeaders.appendChild(textColorTab);
    tabHeaders.appendChild(backgroundColorTab);

    container.appendChild(tabHeaders);
    container.appendChild(tabContent);

    // Show text colors by default
    showTextColors();

    return container;
  }

  private createColorGrid(isTextColor: boolean): HTMLElement {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    `;

    // Simplified color options
    const colors = [
      { name: 'Red', colorHex: '#ff0000' },
      { name: 'Green', colorHex: '#00ff00' },
      { name: 'Blue', colorHex: '#0000ff' },
      { name: 'Yellow', colorHex: '#ffff00' },
      { name: 'Purple', colorHex: '#ff00ff' },
      { name: 'Cyan', colorHex: '#00ffff' }
    ];

    colors.forEach(color => {
      const button = document.createElement('button');
      button.style.cssText = `
        width: 40px;
        height: 40px;
        background-color: ${color.colorHex};
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
      `;
      
      button.addEventListener('click', () => {
        // Apply color formatting
        if (isTextColor) {
          this.editorState.formatDelta(this.selection, {
            textColor: color.colorHex
          });
        } else {
          this.editorState.formatDelta(this.selection, {
            backgroundColor: color.colorHex
          });
        }
      });

      grid.appendChild(button);
    });

    return grid;
  }
}