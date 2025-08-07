/**
 * Style for the Drop target which is rendered in the AppFlowyEditor
 * using the DesktopSelectionService specifically the renderDropTargetForOffset method.
 */
export class AppFlowyDropTargetStyle {
  /** The margin to apply to the drop target. */
  public readonly margin?: { top?: number; bottom?: number; left?: number; right?: number };
  
  /** Constraints of the drop target */
  public readonly constraints: { 
    minWidth?: number; 
    maxWidth?: number; 
    minHeight?: number; 
    maxHeight?: number; 
  };
  
  /** The color of the drop target (horizontal line) */
  public readonly color?: string;
  
  /** Border radius of the drop target */
  public readonly borderRadius: number;
  
  /** Height of the drop target */
  public readonly height: number;

  constructor(options: {
    margin?: { top?: number; bottom?: number; left?: number; right?: number };
    constraints?: { 
      minWidth?: number; 
      maxWidth?: number; 
      minHeight?: number; 
      maxHeight?: number; 
    };
    color?: string;
    borderRadius?: number;
    height?: number;
  } = {}) {
    this.margin = options.margin;
    this.constraints = options.constraints ?? {};
    this.color = options.color;
    this.borderRadius = options.borderRadius ?? 8;
    this.height = options.height ?? 2;
  }

  /**
   * Apply the drop target style to an HTML element
   */
  applyTo(element: HTMLElement): void {
    // Apply margin
    if (this.margin) {
      if (this.margin.top !== undefined) element.style.marginTop = `${this.margin.top}px`;
      if (this.margin.bottom !== undefined) element.style.marginBottom = `${this.margin.bottom}px`;
      if (this.margin.left !== undefined) element.style.marginLeft = `${this.margin.left}px`;
      if (this.margin.right !== undefined) element.style.marginRight = `${this.margin.right}px`;
    }

    // Apply constraints
    if (this.constraints.minWidth !== undefined) {
      element.style.minWidth = `${this.constraints.minWidth}px`;
    }
    if (this.constraints.maxWidth !== undefined) {
      element.style.maxWidth = `${this.constraints.maxWidth}px`;
    }
    if (this.constraints.minHeight !== undefined) {
      element.style.minHeight = `${this.constraints.minHeight}px`;
    }
    if (this.constraints.maxHeight !== undefined) {
      element.style.maxHeight = `${this.constraints.maxHeight}px`;
    }

    // Apply color
    if (this.color) {
      element.style.backgroundColor = this.color;
    } else {
      // Default to primary color if available
      element.style.backgroundColor = 'var(--primary-color, #007bff)';
    }

    // Apply border radius and height
    element.style.borderRadius = `${this.borderRadius}px`;
    element.style.height = `${this.height}px`;
  }

  /**
   * Create a drop target element with this style applied
   */
  createElement(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'appflowy-drop-target';
    this.applyTo(element);
    return element;
  }
}