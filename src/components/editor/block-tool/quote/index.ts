import { TunesMenuConfig } from "@editorjs/editorjs/types/tools";
import "./index.css";
import {
  type BlockTool,
  type ToolboxConfig,
  type BlockToolConstructorOptions,
  type ConversionConfig,
  type SanitizerConfig,
} from "@editorjs/editorjs";

type QuoteData = {
  text: string;
  caption: string;
  alignment: "left" | "center";
};

export type QuoteConfig = {
  quotePlaceholder?: string;
  captionPlaceholder?: string;
};

export default class QuoteBlock implements BlockTool {
  /**
   * Editor.js API
   */
  public api;
  /**
   * Read only mode flag
   */
  public readOnly;
  /**
   * Quote configuration
   */
  private _config;
  /**
   * Quote data
   */
  private _data;
  /**
   * Quote element
   */
  private _holderNode;
  /**
   * Quote css
   */
  private _CSS;

  constructor({
    api,
    data,
    readOnly,
    config,
  }: BlockToolConstructorOptions<QuoteData, QuoteConfig>) {
    this.api = api;
    this.readOnly = readOnly;

    this._CSS = {
      block: this.api.styles.block,
      wrapper: "cdx-quote",
      text: "cdx-quote__text",
      input: "cdx-quote__input",
      caption: "cdx-quote__caption",
    };

    this._config = {
      quotePlaceholder: config?.quotePlaceholder || "Enter a quote",
      captionPlaceholder: config?.captionPlaceholder || "Quote's author",
    };

    this._data = this._normalizeData(data);
    this._holderNode = this._drawView();
  }

  private _isHtmlContent(text: string): boolean {
    return /<\/?[a-zA-Z][^>]*>/.test(text);
  }

  private _hasMarkdownFormatting(text: string): boolean {
    return /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(__[^_]+__)|(_[^_]+_)|(~~[^~]+~~)/.test(text);
  }

  private _processMarkdownToHtml(text: string): string {
    if (!text) return "";
    
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<i>$1</i>')
      .replace(/__([^_]+)__/g, '<b>$1</b>')
      .replace(/_([^_]+)_/g, '<i>$1</i>')
      .replace(/~~([^~]+)~~/g, '<s>$1</s>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  private _sanitizeAndNormalizeText(text: string): string {
    if (!text) return "";
    
    if (this._isHtmlContent(text)) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      return tempDiv.innerHTML;
    }
    
    if (this._hasMarkdownFormatting(text)) {
      return this._processMarkdownToHtml(text);
    }
    
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  /**
   * Normalize input data
   */
  private _normalizeData(data: Partial<QuoteData>): QuoteData {
    return {
      text: this._sanitizeAndNormalizeText(data.text || ""),
      caption: this._sanitizeAndNormalizeText(data.caption || ""),
      alignment: data.alignment || "left",
    };
  }

  /**
   * Create Tool's view
   */
  private _drawView(): HTMLDivElement {
    const wrapper = document.createElement("DIV") as HTMLDivElement;
    const quote = document.createElement("BLOCKQUOTE");
    const text = document.createElement("DIV") as HTMLDivElement;
    const caption = document.createElement("CITE") as HTMLElement;

    wrapper.classList.add(this._CSS.wrapper);
    text.classList.add(this._CSS.text, this._CSS.input);
    caption.classList.add(this._CSS.caption, this._CSS.input);

    text.contentEditable = !this.readOnly ? "true" : "false";
    caption.contentEditable = !this.readOnly ? "true" : "false";

    text.dataset.placeholder = this._config.quotePlaceholder;
    caption.dataset.placeholder = this._config.captionPlaceholder;

    // Set content with proper HTML handling
    if (this._isHtmlContent(this._data.text) || this._hasMarkdownFormatting(this._data.text)) {
      text.innerHTML = this._data.text;
    } else {
      text.textContent = this._data.text;
    }
    
    if (this._isHtmlContent(this._data.caption) || this._hasMarkdownFormatting(this._data.caption)) {
      caption.innerHTML = this._data.caption;
    } else {
      caption.textContent = this._data.caption;
    }

    quote.appendChild(text);
    wrapper.appendChild(quote);
    wrapper.appendChild(caption);

    // Apply alignment
    wrapper.style.textAlign = this._data.alignment;

    return wrapper;
  }

  /**
   * Extract Tool's data from the view
   */
  save(): QuoteData {
    const text = this._holderNode.querySelector(`.${this._CSS.text}`) as HTMLElement;
    const caption = this._holderNode.querySelector(`.${this._CSS.caption}`) as HTMLElement;

    return {
      text: text.innerHTML,
      caption: caption.innerHTML,
      alignment: (this._holderNode.style.textAlign as "left" | "center") || "left",
    };
  }

  /**
   * Settings menu
   */
  renderSettings(): TunesMenuConfig {
    return [
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="lc"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>`,
        label: this.api.i18n.t("Align Left"),
        onActivate: () => this._toggleAlignment("left"),
        closeOnActivate: true,
        isActive: this._data.alignment === "left",
      },
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="lc"><line x1="8" x2="16" y1="6" y2="6"/><line x1="8" x2="16" y1="12" y2="12"/><line x1="8" x2="16" y1="18" y2="18"/></svg>`,
        label: this.api.i18n.t("Align Center"),
        onActivate: () => this._toggleAlignment("center"),
        closeOnActivate: true,
        isActive: this._data.alignment === "center",
      },
    ];
  }

  /**
   * Toggle quote alignment
   */
  private _toggleAlignment(alignment: "left" | "center") {
    this._data.alignment = alignment;
    this._holderNode.style.textAlign = alignment;
  }

  render(): HTMLDivElement {
    return this._holderNode;
  }

  /**
   * Returns true to notify the core that read-only mode is supported
   */
  static get isReadOnlySupported(): boolean {
    return true;
  }

  /**
   * Tool's Toolbox settings
   */
  static get toolbox(): ToolboxConfig {
    return {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="lc"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>`,
      title: "Quote",
    };
  }

  /**
   * Allow Quote Tool to be converted to/from other block
   */
  static get conversionConfig() {
    return {
      /**
       * To create exported string from quote, concatenate text and caption
       */
      export: (data: QuoteData): string => {
        return data.caption ? `${data.text} — ${data.caption}` : data.text;
      },
      /**
       * To create a quote from other block's string, put it at the text field
       */
      import: (string: string): QuoteData => {
        return {
          text: string,
          caption: "",
          alignment: "left",
        };
      },
    };
  }

  /**
   * Sanitizer config
   */
  static get sanitize(): SanitizerConfig {
    return {
      text: {
        br: true,
      },
      caption: {
        br: true,
      },
    };
  }
}
