// Toolbar item widget for rendering individual toolbar items
export interface ToolbarItem {
  iconBuilder?: (isHighlight: boolean) => HTMLElement;
  tooltipsMessage: string;
  id: string;
  type: string;
}

export interface ToolbarItemWidgetProps {
  item: ToolbarItem;
  isHighlight: boolean;
  onPressed: () => void;
}

export class ToolbarItemWidget {
  private props: ToolbarItemWidgetProps;
  private element: HTMLElement;

  constructor(props: ToolbarItemWidgetProps) {
    this.props = props;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    if (!this.props.item.iconBuilder) {
      const empty = document.createElement('div');
      empty.style.display = 'none';
      return empty;
    }

    const container = document.createElement('div');
    container.style.cssText = `
      width: 28px;
      height: 28px;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    `;

    const button = document.createElement('button');
    button.style.cssText = `
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    `;

    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });

    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.props.onPressed();
    });

    // Add icon
    const icon = this.props.item.iconBuilder!(this.props.isHighlight);
    icon.style.cssText = `
      width: 20px;
      height: 20px;
      display: block;
    `;
    button.appendChild(icon);

    // Add tooltip
    this.addTooltip(button, this.props.item.tooltipsMessage);

    container.appendChild(button);
    return container;
  }

  private addTooltip(element: HTMLElement, message: string): void {
    let tooltip: HTMLElement | null = null;

    const showTooltip = (e: MouseEvent) => {
      if (tooltip) return;

      tooltip = document.createElement('div');
      tooltip.textContent = message;
      tooltip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 10000;
        pointer-events: none;
        text-align: center;
      `;

      document.body.appendChild(tooltip);

      // Position tooltip above the element
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left = rect.left + (rect.width - tooltipRect.width) / 2;
      let top = rect.top - tooltipRect.height - 8;

      // Adjust if tooltip goes off screen
      if (left < 0) left = 8;
      if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 8;
      }
      if (top < 0) {
        top = rect.bottom + 8;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    const hideTooltip = () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    };

    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
    element.addEventListener('click', hideTooltip);
  }

  updateHighlight(isHighlight: boolean): void {
    this.props.isHighlight = isHighlight;
    
    if (this.props.item.iconBuilder) {
      const button = this.element.querySelector('button');
      if (button) {
        // Remove old icon
        const oldIcon = button.querySelector('*');
        if (oldIcon) {
          oldIcon.remove();
        }
        
        // Add new icon with updated highlight state
        const newIcon = this.props.item.iconBuilder(isHighlight);
        newIcon.style.cssText = `
          width: 20px;
          height: 20px;
          display: block;
        `;
        button.appendChild(newIcon);
      }
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    // Remove event listeners and clean up
    const button = this.element.querySelector('button');
    if (button) {
      button.removeEventListener('mouseenter', () => {});
      button.removeEventListener('mouseleave', () => {});
      button.removeEventListener('click', () => {});
    }
    
    this.element.remove();
  }
}