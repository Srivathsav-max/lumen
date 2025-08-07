import { ColorOption } from '../../../desktop/items/color/color_picker';
import { MobileToolbarTheme } from '../../mobile_toolbar_style';

export class ColorButton {
  private colorOption: ColorOption;
  private isBackgroundColor: boolean;
  private isSelected: boolean;
  private onPressed: () => void;

  constructor(options: {
    colorOption: ColorOption;
    isSelected: boolean;
    onPressed: () => void;
    isBackgroundColor?: boolean;
  }) {
    this.colorOption = options.colorOption;
    this.isBackgroundColor = options.isBackgroundColor ?? false;
    this.isSelected = options.isSelected;
    this.onPressed = options.onPressed;
  }

  render(context: HTMLElement): HTMLElement {
    const style = MobileToolbarTheme.of(context);
    
    const button = document.createElement('div');
    button.style.cssText = `
      height: ${style.buttonHeight}px;
      background-color: ${this.isBackgroundColor ? this.tryToColor(this.colorOption.colorHex) : 'transparent'};
      border-radius: ${style.borderRadius}px;
      border: ${this.isSelected ? style.buttonSelectedBorderWidth : style.buttonBorderWidth}px solid ${
        this.isSelected ? style.itemHighlightColor : style.itemOutlineColor
      };
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    button.addEventListener('click', this.onPressed);

    if (!this.isBackgroundColor) {
      const text = document.createElement('span');
      text.textContent = this.colorOption.name;
      text.style.color = this.tryToColor(this.colorOption.colorHex);
      button.appendChild(text);
    }

    return button;
  }

  private tryToColor(colorHex: string): string {
    // Simple color conversion - in a real implementation you'd want more robust color parsing
    if (colorHex.startsWith('#')) return colorHex;
    if (colorHex.startsWith('0x')) {
      const hex = colorHex.substring(2);
      if (hex.length === 8) {
        // ARGB format, convert to RGBA
        const a = hex.substring(0, 2);
        const rgb = hex.substring(2);
        return `#${rgb}${a}`;
      }
      return `#${hex}`;
    }
    return `#${colorHex}`;
  }
}