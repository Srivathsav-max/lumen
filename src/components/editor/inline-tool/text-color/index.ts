import "./index.css";
import {
  type InlineTool,
  type InlineToolConstructorOptions,
  type SanitizerConfig,
} from "@editorjs/editorjs";

export interface TextColorConfig {
  defaultColor?: string;
  colorPalette?: string[];
}

export class TextColorInlineTool implements InlineTool {
  /**
   * Editor.js API
   */
  public api;
  
  /**
   * Tool's configuration
   */
  private config;
  
  /**
   * CSS classes
   */
  private CSS = {
    button: 'ce-inline-tool',
    buttonActive: 'ce-inline-tool--active',
    buttonModifier: 'ce-inline-tool--text-color',
  };

  /**
   * Default text colors
   */
  private static readonly DEFAULT_COLORS = [
    '#000000', // Black
    '#6b7280', // Gray
    '#dc2626', // Red
    '#ea580c', // Orange
    '#ca8a04', // Yellow
    '#16a34a', // Green
    '#2563eb', // Blue
    '#9333ea', // Purple
    '#db2777', // Pink
  ];

  constructor({ api, config }: InlineToolConstructorOptions<TextColorConfig>) {
    this.api = api;
    this.config = {
      defaultColor: config?.defaultColor || '#dc2626',
      colorPalette: config?.colorPalette || TextColorInlineTool.DEFAULT_COLORS,
    };
  }

  /**
   * Specifies Tool as Inline Toolbar Tool
   */
  static get isInline(): boolean {
    return true;
  }

  /**
   * Create button element for Toolbar
   */
  render(): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add(this.CSS.button, this.CSS.buttonModifier);
    button.innerHTML = this.toolboxIcon;
    button.title = 'Text Color';

    return button;
  }

  /**
   * Wrap/Unwrap selected fragment
   */
  surround(range: Range): void {
    if (!range) {
      return;
    }

    const colorWrapper = this.api.selection.findParentTag('SPAN', 'ce-text-color');

    /**
     * If start or end of selection is in the colored block
     */
    if (colorWrapper) {
      this.unwrap(colorWrapper);
    } else {
      this.wrap(range);
    }
  }

  /**
   * Wrap selection with color
   */
  wrap(range: Range): void {
    const selectedText = range.extractContents();
    const span = document.createElement('SPAN');
    
    span.classList.add('ce-text-color');
    span.style.color = this.config.defaultColor;
    span.appendChild(selectedText);
    range.insertNode(span);

    /**
     * Expand (add) selection to colored block
     */
    this.api.selection.expandToTag(span);
  }

  /**
   * Unwrap color
   */
  unwrap(colorWrapper: HTMLElement): void {
    /**
     * Expand selection to all colored block
     */
    this.api.selection.expandToTag(colorWrapper);

    const sel = window.getSelection();
    if (!sel) return;

    const range = sel.getRangeAt(0);

    const unwrappedContent = range.extractContents();

    /**
     * Remove empty colored block
     */
    colorWrapper.parentNode?.removeChild(colorWrapper);

    /**
     * Insert extracted content
     */
    range.insertNode(unwrappedContent);

    /**
     * Restore selection
     */
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /**
   * Check and change Tool's state for current selection
   */
  checkState(): boolean {
    const colorTag = this.api.selection.findParentTag('SPAN', 'ce-text-color');

    const button = this.button;
    if (button) {
      button.classList.toggle(this.CSS.buttonActive, !!colorTag);
    }

    return !!colorTag;
  }

  /**
   * Get Tool icon's SVG
   */
  get toolboxIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lc"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>`;
  }

  /**
   * Sanitizer rule
   */
  static get sanitize(): SanitizerConfig {
    return {
      span: {
        class: 'ce-text-color',
        style: true,
      },
    };
  }

  /**
   * Create color palette menu
   */
  renderActions(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.classList.add('ce-text-color-palette');

    // Add color options
    this.config.colorPalette.forEach((color: string) => {
      const colorButton = document.createElement('button');
      colorButton.classList.add('ce-text-color-option');
      colorButton.style.backgroundColor = color;
      colorButton.title = `Text color: ${color}`;
      
      colorButton.addEventListener('click', () => {
        this.changeTextColor(color);
      });

      wrapper.appendChild(colorButton);
    });

    // Add remove color button
    const removeButton = document.createElement('button');
    removeButton.classList.add('ce-text-color-remove');
    removeButton.innerHTML = '✕';
    removeButton.title = 'Remove text color';
    removeButton.addEventListener('click', () => {
      this.removeTextColor();
    });

    wrapper.appendChild(removeButton);

    return wrapper;
  }

  /**
   * Change text color
   */
  private changeTextColor(color: string): void {
    const colorWrapper = this.api.selection.findParentTag('SPAN', 'ce-text-color');
    
    if (colorWrapper) {
      (colorWrapper as HTMLElement).style.color = color;
    } else {
      // Apply new color to selection
      this.config.defaultColor = color;
      try {
        const selection = this.api.selection.save();
        if (selection) {
          this.wrap(selection as Range);
          this.api.selection.restore();
        }
      } catch (error) {
        console.warn('Error applying text color:', error);
      }
    }
  }

  /**
   * Remove text color
   */
  private removeTextColor(): void {
    const colorWrapper = this.api.selection.findParentTag('SPAN', 'ce-text-color');
    if (colorWrapper) {
      this.unwrap(colorWrapper);
    }
  }

  /**
   * Button element
   */
  private get button(): HTMLElement | null {
    try {
      // Try different ways to access the toolbar
      if (this.api.toolbar?.nodes?.wrapper) {
        return this.api.toolbar.nodes.wrapper.querySelector(`.${this.CSS.buttonModifier}`);
      }
      
      // Fallback: search in document
      return document.querySelector(`.${this.CSS.buttonModifier}`);
    } catch (error) {
      console.warn('Could not find text color button:', error);
      return null;
    }
  }
}
