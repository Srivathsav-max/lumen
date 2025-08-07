import "./index.css";
import {
  type InlineTool,
  type InlineToolConstructorOptions,
  type SanitizerConfig,
} from "@editorjs/editorjs";

export interface HighlighterConfig {
  defaultColor?: string;
  colorPalette?: string[];
}

export class HighlighterInlineTool implements InlineTool {
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
    buttonModifier: 'ce-inline-tool--highlighter',
  };

  /**
   * Default highlight colors
   */
  private static readonly DEFAULT_COLORS = [
    '#ffeb3b', // Yellow
    '#4caf50', // Green  
    '#2196f3', // Blue
    '#ff9800', // Orange
    '#e91e63', // Pink
    '#9c27b0', // Purple
    '#00bcd4', // Cyan
    '#ff5722', // Deep Orange
  ];

  constructor({ api, config }: InlineToolConstructorOptions<HighlighterConfig>) {
    this.api = api;
    this.config = {
      defaultColor: config?.defaultColor || '#ffeb3b',
      colorPalette: config?.colorPalette || HighlighterInlineTool.DEFAULT_COLORS,
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
    button.title = 'Highlight';

    return button;
  }

  /**
   * Wrap/Unwrap selected fragment
   */
  surround(range: Range): void {
    if (!range) {
      return;
    }

    const termWrapper = this.api.selection.findParentTag('MARK', 'ce-highlighter');

    /**
     * If start or end of selection is in the highlighted block
     */
    if (termWrapper) {
      this.unwrap(termWrapper);
    } else {
      this.wrap(range);
    }
  }

  /**
   * Wrap selection with highlight
   */
  wrap(range: Range): void {
    const selectedText = range.extractContents();
    const mark = document.createElement('MARK');
    
    mark.classList.add('ce-highlighter');
    mark.style.backgroundColor = this.config.defaultColor;
    mark.appendChild(selectedText);
    range.insertNode(mark);

    /**
     * Expand (add) selection to highlighted block
     */
    this.api.selection.expandToTag(mark);
  }

  /**
   * Unwrap highlight
   */
  unwrap(termWrapper: HTMLElement): void {
    /**
     * Expand selection to all highlighted block
     */
    this.api.selection.expandToTag(termWrapper);

    const sel = window.getSelection();
    if (!sel) return;

    const range = sel.getRangeAt(0);

    const unwrappedContent = range.extractContents();

    /**
     * Remove empty highlighted block
     */
    termWrapper.parentNode?.removeChild(termWrapper);

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
   * Check and change Term's state for current selection
   */
  checkState(): boolean {
    const termTag = this.api.selection.findParentTag('MARK', 'ce-highlighter');

    const button = this.button;
    if (button) {
      button.classList.toggle(this.CSS.buttonActive, !!termTag);
    }

    return !!termTag;
  }

  /**
   * Get Tool icon's SVG
   */
  get toolboxIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lc"><path d="m9 11-6 6v3h3l6-6"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>`;
  }

  /**
   * Sanitizer rule
   */
  static get sanitize(): SanitizerConfig {
    return {
      mark: {
        class: 'ce-highlighter',
        style: true,
      },
    };
  }

  /**
   * Create color palette menu
   */
  renderActions(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.classList.add('ce-highlighter-palette');

    // Add color options
    this.config.colorPalette.forEach((color: string) => {
      const colorButton = document.createElement('button');
      colorButton.classList.add('ce-highlighter-color');
      colorButton.style.backgroundColor = color;
      colorButton.title = `Highlight with ${color}`;
      
      colorButton.addEventListener('click', () => {
        this.changeHighlightColor(color);
      });

      wrapper.appendChild(colorButton);
    });

    // Add remove highlight button
    const removeButton = document.createElement('button');
    removeButton.classList.add('ce-highlighter-remove');
    removeButton.innerHTML = '✕';
    removeButton.title = 'Remove highlight';
    removeButton.addEventListener('click', () => {
      this.removeHighlight();
    });

    wrapper.appendChild(removeButton);

    return wrapper;
  }

  /**
   * Change highlight color
   */
  private changeHighlightColor(color: string): void {
    const termWrapper = this.api.selection.findParentTag('MARK', 'ce-highlighter');
    
    if (termWrapper) {
      (termWrapper as HTMLElement).style.backgroundColor = color;
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
        console.warn('Error applying highlight color:', error);
      }
    }
  }

  /**
   * Remove highlight
   */
  private removeHighlight(): void {
    const termWrapper = this.api.selection.findParentTag('MARK', 'ce-highlighter');
    if (termWrapper) {
      this.unwrap(termWrapper);
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
      console.warn('Could not find highlighter button:', error);
      return null;
    }
  }
}
