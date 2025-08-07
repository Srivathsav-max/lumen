import { TunesMenuConfig } from "@editorjs/editorjs/types/tools";
import "./index.css";
import {
  type BlockTool,
  type ToolboxConfig,
  type BlockToolConstructorOptions,
  type ConversionConfig,
  type SanitizerConfig,
} from "@editorjs/editorjs";

type CodeData = {
  code: string;
  language?: string;
};

export type CodeConfig = {
  placeholder?: string;
  languages?: Array<{ value: string; label: string }>;
};

export default class CodeBlock implements BlockTool {
  /**
   * Editor.js API
   */
  public api;
  /**
   * Read only mode flag
   */
  public readOnly;
  /**
   * Code configuration
   */
  private _config;
  /**
   * Code data
   */
  private _data;
  /**
   * Code element
   */
  private _holderNode;
  /**
   * Code css
   */
  private _CSS;

  constructor({
    api,
    data,
    readOnly,
    config,
  }: BlockToolConstructorOptions<CodeData, CodeConfig>) {
    this.api = api;
    this.readOnly = readOnly;

    this._CSS = {
      block: this.api.styles.block,
      wrapper: "cdx-code",
      textarea: "cdx-code__textarea",
      languageSelector: "cdx-code__language-selector",
      header: "cdx-code__header",
    };

    this._config = {
      placeholder: config?.placeholder || "Enter code...",
      languages: config?.languages || [
        { value: "", label: "Plain text" },
        { value: "javascript", label: "JavaScript" },
        { value: "typescript", label: "TypeScript" },
        { value: "python", label: "Python" },
        { value: "java", label: "Java" },
        { value: "cpp", label: "C++" },
        { value: "c", label: "C" },
        { value: "csharp", label: "C#" },
        { value: "php", label: "PHP" },
        { value: "ruby", label: "Ruby" },
        { value: "go", label: "Go" },
        { value: "rust", label: "Rust" },
        { value: "html", label: "HTML" },
        { value: "css", label: "CSS" },
        { value: "scss", label: "SCSS" },
        { value: "json", label: "JSON" },
        { value: "xml", label: "XML" },
        { value: "yaml", label: "YAML" },
        { value: "sql", label: "SQL" },
        { value: "bash", label: "Bash" },
        { value: "shell", label: "Shell" },
        { value: "markdown", label: "Markdown" },
      ],
    };

    this._data = this._normalizeData(data);
    this._holderNode = this._drawView();
  }

  /**
   * Normalize input data
   */
  private _normalizeData(data: Partial<CodeData>): CodeData {
    return {
      code: data.code || "",
      language: data.language || "",
    };
  }

  /**
   * Create Tool's view
   */
  private _drawView(): HTMLDivElement {
    const wrapper = document.createElement("DIV") as HTMLDivElement;
    const header = document.createElement("DIV") as HTMLDivElement;
    const languageSelector = document.createElement("SELECT") as HTMLSelectElement;
    const textarea = document.createElement("TEXTAREA") as HTMLTextAreaElement;

    wrapper.classList.add(this._CSS.wrapper);
    header.classList.add(this._CSS.header);
    languageSelector.classList.add(this._CSS.languageSelector);
    textarea.classList.add(this._CSS.textarea);

    // Setup language selector
    this._config.languages?.forEach((lang) => {
      const option = document.createElement("OPTION") as HTMLOptionElement;
      option.value = lang.value;
      option.textContent = lang.label;
      if (lang.value === this._data.language) {
        option.selected = true;
      }
      languageSelector.appendChild(option);
    });

    if (!this.readOnly) {
      languageSelector.addEventListener("change", (e) => {
        this._data.language = (e.target as HTMLSelectElement).value;
      });
    } else {
      languageSelector.disabled = true;
    }

    // Setup textarea
    textarea.placeholder = this._config.placeholder;
    textarea.value = this._data.code;
    textarea.readOnly = this.readOnly;

    if (!this.readOnly) {
      textarea.addEventListener("keydown", this._handleKeyDown.bind(this));
    }

    header.appendChild(languageSelector);
    wrapper.appendChild(header);
    wrapper.appendChild(textarea);

    return wrapper;
  }

  /**
   * Handle keydown events for better code editing experience
   */
  private _handleKeyDown(event: KeyboardEvent): void {
    const textarea = event.target as HTMLTextAreaElement;

    // Handle Tab key for indentation
    if (event.key === "Tab") {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      if (event.shiftKey) {
        // Shift+Tab: Remove indentation
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = value.indexOf("\n", end);
        const line = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
        
        if (line.startsWith("  ")) {
          textarea.value = value.substring(0, lineStart) + line.substring(2) + value.substring(lineEnd === -1 ? value.length : lineEnd);
          textarea.selectionStart = Math.max(lineStart, start - 2);
          textarea.selectionEnd = Math.max(lineStart, end - 2);
        }
      } else {
        // Tab: Add indentation
        textarea.value = value.substring(0, start) + "  " + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
    }
    
    // Handle Enter key for auto-indentation
    else if (event.key === "Enter") {
      const start = textarea.selectionStart;
      const value = textarea.value;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const line = value.substring(lineStart, start);
      const indent = line.match(/^\s*/)?.[0] || "";
      
      if (indent) {
        event.preventDefault();
        textarea.value = value.substring(0, start) + "\n" + indent + value.substring(start);
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
      }
    }
  }

  /**
   * Extract Tool's data from the view
   */
  save(): CodeData {
    const textarea = this._holderNode.querySelector(`.${this._CSS.textarea}`) as HTMLTextAreaElement;
    const languageSelector = this._holderNode.querySelector(`.${this._CSS.languageSelector}`) as HTMLSelectElement;

    return {
      code: textarea.value,
      language: languageSelector.value,
    };
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
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="lc"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>`,
      title: "Code",
    };
  }

  /**
   * Allow Code Tool to be converted to/from other block
   */
  static get conversionConfig() {
    return {
      /**
       * Export code as plain text
       */
      export: (data: CodeData): string => {
        return data.code;
      },
      /**
       * Import plain text as code
       */
      import: (string: string): CodeData => {
        return {
          code: string,
          language: "",
        };
      },
    };
  }

  /**
   * Sanitizer config
   */
  static get sanitize(): SanitizerConfig {
    return {
      code: true,
      language: false,
    };
  }
}
