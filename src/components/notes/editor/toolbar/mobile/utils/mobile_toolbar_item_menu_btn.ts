import { MobileToolbarTheme } from '../mobile_toolbar_style';

export class MobileToolbarItemMenuBtn {
  private onPressed: () => void;
  private icon?: HTMLElement;
  private label?: HTMLElement;
  private isSelected: boolean;

  constructor(options: {
    onPressed: () => void;
    icon?: HTMLElement;
    label?: HTMLElement;
    isSelected: boolean;
  }) {
    this.onPressed = options.onPressed;
    this.icon = options.icon;
    this.label = options.label;
    this.isSelected = options.isSelected;
  }

  render(context: HTMLElement): HTMLElement {
    const style = MobileToolbarTheme.of(context);
    
    const button = document.createElement('button');
    button.style.cssText = `
      display: flex;
      align-items: ${this.label ? 'flex-start' : 'center'};
      justify-content: ${this.label ? 'flex-start' : 'center'};
      color: ${style.foregroundColor};
      background: transparent;
      border: ${style.buttonSelectedBorderWidth}px solid ${
        this.isSelected ? style.itemHighlightColor : style.itemOutlineColor
      };
      border-radius: ${style.borderRadius}px;
      padding: 0;
      cursor: pointer;
      outline: none;
    `;
    
    // Remove splash/ripple effects
    button.style.userSelect = 'none';
    button.style.webkitTapHighlightColor = 'transparent';
    
    button.addEventListener('click', this.onPressed);
    
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
    `;
    
    if (this.icon) {
      const iconContainer = document.createElement('div');
      iconContainer.style.cssText = `
        padding: 0 6px;
      `;
      iconContainer.appendChild(this.icon);
      row.appendChild(iconContainer);
    }
    
    if (this.label) {
      row.appendChild(this.label);
    }
    
    button.appendChild(row);
    return button;
  }
}