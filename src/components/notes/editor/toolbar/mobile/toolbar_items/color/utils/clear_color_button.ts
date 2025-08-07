import { MobileToolbarTheme } from '../../mobile_toolbar_style';

export class ClearColorButton {
  private onPressed: () => void;
  private isSelected: boolean;

  constructor(options: {
    onPressed: () => void;
    isSelected: boolean;
  }) {
    this.onPressed = options.onPressed;
    this.isSelected = options.isSelected;
  }

  render(context: HTMLElement): HTMLElement {
    const style = MobileToolbarTheme.of(context);

    const button = document.createElement('div');
    button.style.cssText = `
      height: ${style.buttonHeight}px;
      border-radius: ${style.borderRadius}px;
      border: ${this.isSelected ? style.buttonSelectedBorderWidth : style.buttonBorderWidth}px solid ${
        this.isSelected ? style.itemHighlightColor : style.itemOutlineColor
      };
      cursor: pointer;
      position: relative;
      background: white;
    `;

    button.addEventListener('click', this.onPressed);

    // Create diagonal line using CSS
    const diagonalLine = document.createElement('div');
    diagonalLine.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        to top right,
        transparent 48%,
        ${style.clearDiagonalLineColor} 48%,
        ${style.clearDiagonalLineColor} 52%,
        transparent 52%
      );
      pointer-events: none;
    `;

    button.appendChild(diagonalLine);
    return button;
  }
}