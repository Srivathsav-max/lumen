export interface Size {
  width: number;
  height: number;
}

export class SVGIconItemWidget {
  private size: Size;
  private iconSize: Size;
  private iconName?: string;
  private iconBuilder?: () => HTMLElement;
  private isHighlight: boolean;
  private highlightColor: string;
  private iconColor?: string;
  private onPressed?: () => void;

  constructor(options: {
    size?: Size;
    iconSize?: Size;
    iconName?: string;
    iconBuilder?: () => HTMLElement;
    isHighlight: boolean;
    highlightColor: string;
    iconColor?: string;
    onPressed?: () => void;
  }) {
    this.size = options.size ?? { width: 30, height: 30 };
    this.iconSize = options.iconSize ?? { width: 18, height: 18 };
    this.iconName = options.iconName;
    this.iconBuilder = options.iconBuilder;
    this.isHighlight = options.isHighlight;
    this.highlightColor = options.highlightColor;
    this.iconColor = options.iconColor;
    this.onPressed = options.onPressed;
  }

  render(): HTMLElement {
    let child: HTMLElement;
    
    if (this.iconBuilder) {
      child = this.iconBuilder();
    } else {
      child = this.createSvgIcon();
    }

    if (this.onPressed) {
      const button = document.createElement('button');
      button.style.cssText = `
        width: ${this.size.width}px;
        height: ${this.size.height}px;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      `;
      
      // Remove default button styles and hover effects
      button.style.outline = 'none';
      button.style.userSelect = 'none';
      
      // Add hover effect
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'transparent';
      });
      
      button.addEventListener('click', this.onPressed);
      button.appendChild(child);
      
      return button;
    }

    const container = document.createElement('div');
    container.style.cssText = `
      width: ${this.size.width}px;
      height: ${this.size.height}px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    container.appendChild(child);
    return container;
  }

  private createSvgIcon(): HTMLElement {
    // In a real implementation, you would load the actual SVG
    // For now, we'll create a placeholder
    const icon = document.createElement('div');
    icon.style.cssText = `
      width: ${this.iconSize.width}px;
      height: ${this.iconSize.height}px;
      background-color: ${this.isHighlight ? this.highlightColor : (this.iconColor ?? '#666')};
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: white;
    `;
    
    // Add icon identifier for debugging
    if (this.iconName) {
      icon.title = this.iconName;
      icon.textContent = this.iconName.split('/').pop()?.charAt(0).toUpperCase() ?? '?';
    }
    
    return icon;
  }
}