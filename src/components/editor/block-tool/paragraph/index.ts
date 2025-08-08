import "./index.css";

import {
  type PasteConfig,
  type BlockTool,
  type ToolboxConfig,
  type HTMLPasteEvent,
  type ConversionConfig,
  type SanitizerConfig,
  type BlockToolConstructorOptions,
} from "@editorjs/editorjs";

type ParagraphData = {
  /** Paragraph's content. Can include HTML tags: <a><b><i> */
  text: string;
};

export type ParagraphConfig = {
  /** Block's placeholder */
  placeholder?: string;
  /** Whether or not to keep blank paragraphs when saving editor data */
  preserveBlank?: boolean;
};

export default class ParagraphBlock implements BlockTool {
  /**
   * Editor.js API
   */
  public api;
  /**
   * Read only mode flag from internal EditorJS API
   */
  public readOnly;
  /**
   * Paragraph configuration
   */
  private _config;
  /**
   * Initial Paragraph data
   */
  private _data;
  /**
   * Paragraph element
   */
  private _holderNode;
  /**
   * Paragraph css
   */
  private _CSS;

  constructor({
    data,
    config,
    api,
    readOnly,
  }: BlockToolConstructorOptions<ParagraphData, ParagraphConfig>) {
    this.api = api;
    this.readOnly = readOnly;

    this._CSS = {
      block: this.api.styles.block,
      wrapper: "ce-paragraph",
    };

    if (!readOnly) {
      this.onKeyUp = this.onKeyUp.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
    }

    this._config = {
      preserveBlank: !!config?.preserveBlank,
      placeholder: config?.placeholder || "",
    };
    this._data = this._normalizeData(data);
    this._holderNode = this._drawHolderNode();
  }

  /**
   * Normalize input data
   */
  private _normalizeData(data: ParagraphData): ParagraphData {
    if (typeof data === "object") {
      return { text: data.text || "" };
    }

    return { text: "" };
  }

  /**
   * Get paragraph tag for target level
   */
  private _drawHolderNode(): HTMLParagraphElement {
    /**
     * Create element for current Block's level
     */
    const paragraph = document.createElement("P") as HTMLParagraphElement;

    /**
     * Add text to block
     */
    paragraph.innerHTML = this._data.text;

    /**
     * Add styles class
     */
    paragraph.classList.add(this._CSS.wrapper, this._CSS.block);

    /**
     * Add Placeholder
     */
    paragraph.dataset.placeholder = this.api.i18n.t(this.placeholder);

    if (!this.readOnly) {
      paragraph.contentEditable = "true";
      paragraph.addEventListener("keyup", this.onKeyUp);
      paragraph.addEventListener("keydown", this.onKeyDown);
    }
    return paragraph;
  }

  /**
   * Check if text content is empty and set empty string to inner html.
   * We need this because some browsers (e.g. Safari) insert <br> into empty contenteditable elements
   */
  onKeyUp(e: KeyboardEvent) {
    // Cleanup empty HTML added by some browsers
    if (e.code === "Backspace" || e.code === "Delete") {
      if (this._holderNode.textContent === "") {
        this._holderNode.innerHTML = "";
      }
    }

    // Try to detect inline Regex pattern like /foo(bar)?/gi at caret
    // Trigger only on slash or Enter to reduce noise
    if (e.key === "/" || e.key === "Enter") {
      try {
        const txt = this._holderNode.textContent || "";
        const match = txt.match(/\/((?:\\\/|[^\/])+?)\/([gimsuy]*)$/);
        if (match && match[1] !== undefined) {
          const pattern = match[1];
          const flags = match[2] || "";
          // Dispatch a global event to let core handle highlighting
          window.dispatchEvent(
            new CustomEvent("lumen-inline-regex", {
              detail: { pattern, flags },
            })
          );
        }
      } catch {}
    }

    // Apply inline markdown formatting and linkification on space/enter/tab/punctuation
    if (
      e.key === " " ||
      e.key === "Enter" ||
      e.key === "Tab" ||
      e.key === "." ||
      e.key === "," ||
      e.key === ")" ||
      e.key === ":" ||
      e.key === ";" ||
      e.key === "!" ||
      e.key === "?"
    ) {
      this.applyInlineMarkdownFormatting();
    }
  }

  /**
   * Handle markdown block shortcuts like `# `, `## `, `> `, `- `, `1. `, "```"
   */
  private onKeyDown(e: KeyboardEvent) {
    if (this.readOnly) return;

    const isSpace = e.key === " ";
    const isEnter = e.key === "Enter";
    const isDash = e.key === "-";
    const isBacktick = e.key === "`";

    // Only check on Space/Enter/`/ - to keep it lightweight
    if (!isSpace && !isEnter && !isBacktick && !isDash) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!this._holderNode.contains(range.startContainer)) return;

    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(this._holderNode);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const beforeText = beforeRange.toString();

    // Trim right spaces for reliable checks but keep original for length
    const beforeTrimmed = beforeText.replace(/\u00A0/g, " ");

    // 1) Headings: `#` .. `######` followed by Space
    if (isSpace) {
      const headingMatch = beforeTrimmed.match(/^(#{1,6})$/);
      if (headingMatch) {
        e.preventDefault();
        this.transformToHeading(headingMatch[1].length);
        return;
      }

      // Unordered list: '-' or '*' then space
      if (/^[-*+]$/.test(beforeTrimmed)) {
        e.preventDefault();
        this.transformToList("unordered");
        return;
      }

      // Ordered list: '1.' (or any number + '.') then space
      if (/^\d+[\.|\)]$/.test(beforeTrimmed)) {
        e.preventDefault();
        this.transformToList("ordered");
        return;
      }

      // Toggle block: '>' ; Quote: '"'
      if (/^>$/.test(beforeTrimmed)) {
        e.preventDefault();
        this.transformToToggle();
        return;
      }
      if (/^"$/.test(beforeTrimmed)) {
        e.preventDefault();
        this.transformToQuote();
        return;
      }

      // Checklist: "[ ]" or "[x]" then space
      if (/^\[(\s|x)\]$/.test(beforeTrimmed) || /^-\s\[(\s|x)\]$/.test(beforeTrimmed)) {
        e.preventDefault();
        const checked = beforeTrimmed.includes("x");
        this.transformToChecklist(checked);
        return;
      }

      // Image: ![alt](url)
      if (/^!\[[^\]]*\]\([^\)]+\)$/.test(beforeTrimmed)) {
        e.preventDefault();
        const m = beforeTrimmed.match(/^!\[([^\]]*)\]\(([^\)]+)\)$/);
        if (m) {
          this.transformToImage(m[2], m[1] || "Image");
          return;
        }
      }
    }

    // Divider: '---' then Enter
    if (isEnter && (/^---$/.test(beforeTrimmed) || /^\*\*\*$/.test(beforeTrimmed) || /^___$/.test(beforeTrimmed))) {
      e.preventDefault();
      this.transformToDivider();
      return;
    }

    // Code block: "```" then Enter, optionally with language like ```js
    if (isEnter && /^```\w*$/.test(beforeTrimmed)) {
      e.preventDefault();
      const lang = beforeTrimmed.replace(/^```/, "").trim();
      this.transformToCode(lang);
      return;
    }

    // Table: on Enter when current paragraph contains multiple table-like lines
    if (isEnter) {
      const text = (this._holderNode.textContent || "").replace(/\u00A0/g, " ");
      if (this.isMarkdownTable(text)) {
        e.preventDefault();
        this.transformToTable(text);
        return;
      }
    }
  }

  private removeCurrentPrefixAndGetIndex(): number {
    // Remove everything before caret (prefix + typed key) from this paragraph
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    const index = this.api.blocks.getCurrentBlockIndex();
    // Clear current paragraph content to avoid leftover prefix
    this._holderNode.innerHTML = "";
    // Ensure caret moves to new block after transform
    return index;
  }

  private transformToHeading(level: number) {
    const index = this.removeCurrentPrefixAndGetIndex();
    // Insert heading next to current, focus on it, then delete original
    this.api.blocks.insert("heading", { text: "", level }, {}, undefined, true);
    this.api.blocks.delete(index);
  }

  private transformToList(style: "unordered" | "ordered") {
    const index = this.removeCurrentPrefixAndGetIndex();
    this.api.blocks.insert("list", { style, items: [""] }, {}, undefined, true);
    this.api.blocks.delete(index);
  }

  private transformToQuote() {
    const index = this.removeCurrentPrefixAndGetIndex();
    this.api.blocks.insert("quote", { text: "", caption: "", alignment: "left" }, {}, undefined, true);
    this.api.blocks.delete(index);
  }

  // Basic toggle/accordion using list as a fallback (Notion-like > becomes toggle)
  private transformToToggle() {
    const index = this.removeCurrentPrefixAndGetIndex();
    // Fallback to an unordered list item as a "toggle" stand-in
    this.api.blocks.insert("list", { style: "unordered", items: [""] }, {}, undefined, true);
    this.api.blocks.delete(index);
  }

  private transformToChecklist(checked: boolean) {
    const index = this.removeCurrentPrefixAndGetIndex();
    this.api.blocks.insert("checklist", { items: [{ text: "", checked }] }, {}, undefined, true);
    this.api.blocks.delete(index);
  }

  private transformToDivider() {
    const index = this.removeCurrentPrefixAndGetIndex();
    this.api.blocks.insert("divider", { type: "line" }, {}, undefined, true);
    this.api.blocks.delete(index);
  }

  private transformToCode(language: string) {
    const index = this.removeCurrentPrefixAndGetIndex();
    this.api.blocks.insert("code", { code: "", language }, {}, undefined, true);
    this.api.blocks.delete(index);
  }

  private transformToImage(url: string, alt: string) {
    const index = this.removeCurrentPrefixAndGetIndex();
    this.api.blocks.insert(
      "image",
      {
        url,
        caption: alt || "Image",
        withBorder: false,
        withBackground: false,
        stretched: false,
      } as any,
      {},
      undefined,
      true
    );
    this.api.blocks.delete(index);
  }

  private isMarkdownTable(text: string): boolean {
    if (!text.includes("|")) return false;
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const pipeLines = lines.filter((l) => l.includes("|"));
    if (pipeLines.length < 2) return false;
    // Has a separator like | --- | --- |
    const sepRegex = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/;
    return pipeLines.some((l) => sepRegex.test(l));
  }

  private transformToTable(text: string) {
    const index = this.removeCurrentPrefixAndGetIndex();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l.includes("|"));

    if (lines.length < 2) return;
    const sepRegex = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/;
    let header: string[] | null = null;
    const rows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (sepRegex.test(line)) {
        // separator line; previous line is header
        const prev = i > 0 ? lines[i - 1] : '';
        header = this.splitTableRow(prev);
        continue;
      }
      if (i < lines.length - 1 && sepRegex.test(lines[i + 1])) {
        // current is header (next is separator)
        continue;
      }
      rows.push(this.splitTableRow(line));
    }

    const content = [] as string[][];
    if (header) content.push(header);
    content.push(...rows);

    this.api.blocks.insert(
      "table",
      {
        withHeadings: !!header,
        content,
      } as any,
      {},
      undefined,
      true
    );
    this.api.blocks.delete(index);
  }

  private splitTableRow(line: string): string[] {
    return line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length >= 0);
  }

  private applyInlineMarkdownFormatting(): void {
    const walker = document.createTreeWalker(this._holderNode, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      // Skip if inside a link or code tag already
      const parentEl = (n as Text).parentElement;
      if (parentEl && (parentEl.closest("a, code") || parentEl.isContentEditable === false)) continue;
      textNodes.push(n as Text);
    }
    textNodes.forEach((node) => this.replaceMarkdownInTextNode(node));
  }

  private replaceMarkdownInTextNode(textNode: Text): void {
    const text = textNode.textContent || "";
    if (!/[\*`_~\[\]:$]|https?:\/\//.test(text)) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    const pattern = /(\$\$[^$]+\$\$)|(\$[^$]+\$)|(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(~~[^~]+~~)|(~[^~]+~)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^\)]+\))|(https?:\/\/[^\s)]+)|(\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b)/g;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, start)));

      const token = m[0];
      let el: HTMLElement | null = null;
      if (m[1] || m[2]) {
        // Math: $$...$$ display or $...$ inline
        const isBlock = !!m[1];
        const latex = token.slice(isBlock ? 2 : 1, isBlock ? -2 : -1);
        el = document.createElement("span");
        el.className = isBlock ? "math-block" : "math-inline";
        // Try KaTeX if available
        try {
          const katex = (window as any)?.katex;
          if (katex && typeof katex.render === "function") {
            katex.render(latex, el, { displayMode: isBlock });
          } else {
            el.textContent = latex;
            el.style.fontFamily = "monospace";
            if (isBlock) {
              el.style.display = "inline-block";
              el.style.padding = "2px 4px";
            }
          }
        } catch {
          el.textContent = latex;
        }
      } else if (m[3]) {
        el = document.createElement("code");
        el.textContent = token.slice(1, -1);
      } else if (m[4] || m[5]) {
        el = document.createElement("b");
        el.textContent = token.slice(2, -2);
      } else if (m[6] || m[7]) {
        el = document.createElement("s");
        el.textContent = token.startsWith("~~") ? token.slice(2, -2) : token.slice(1, -1);
      } else if (m[8] || m[9]) {
        el = document.createElement("i");
        el.textContent = token.slice(1, -1);
      } else if (m[10]) {
        // [text](url)
        const mm = token.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
        if (mm) {
          const a = document.createElement("a");
          a.href = mm[2];
          a.textContent = mm[1];
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          el = a;
        }
      } else if (m[11]) {
        const a = document.createElement("a");
        a.href = token;
        a.textContent = token;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        el = a;
      } else if (m[12]) {
        const a = document.createElement("a");
        a.href = `mailto:${token}`;
        a.textContent = token;
        el = a;
      }

      if (el) frag.appendChild(el);
      else frag.appendChild(document.createTextNode(token));
      cursor = end;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));

    const parent = textNode.parentNode;
    if (parent) parent.replaceChild(frag, textNode);
  }

  destroy(): void {
    this._holderNode.removeEventListener("keyup", this.onKeyUp);
    this._holderNode.removeEventListener("keydown", this.onKeyDown);
  }

  render(): HTMLParagraphElement {
    return this._holderNode;
  }

  validate(savedData: ParagraphData): boolean {
    if (savedData.text.trim() === "" && !this._config.preserveBlank) {
      return false;
    }

    return true;
  }

  save(toolsContent: HTMLParagraphElement): ParagraphData {
    return { text: toolsContent.innerHTML };
  }

  merge(data: ParagraphData): void {
    const newData = { text: `${this.data.text}${data.text}` };

    this.data = newData;
  }

  onPaste(event: HTMLPasteEvent): void {
    const data = { text: event.detail.data.innerHTML };

    this.data = data;
  }

  /**
   * Get current Tools`s data
   */
  get data(): ParagraphData {
    this._data.text = this._holderNode.innerHTML;

    return this._data;
  }

  /**
   * Store data in plugin:
   * - at the this._data property
   * - at the HTML
   */
  set data(data) {
    this._data = this._normalizeData(data);

    /**
     * If level is set and block in DOM
     * then replace it to a new block
     */
    if (this._holderNode.parentNode) {
      const newParagraph = this._drawHolderNode();

      /**
       * Replace blocks
       */
      this._holderNode.parentNode.replaceChild(newParagraph, this._holderNode);

      /**
       * Save new block to private variable
       */
      this._holderNode = newParagraph;
    }
  }

  /**
   * Get placeholder from paragraph config
   */
  get placeholder(): string {
    return this._config.placeholder || `Enter text...`;
  }

  /**
   * Paste substitutions configuration
   */
  static get pasteConfig(): PasteConfig {
    return {
      tags: ["P"],
    };
  }

  /**
   * Rules that specified how this Tool can be converted into/from another Tool
   */
  static get conversionConfig(): ConversionConfig {
    return {
      export: "text", // to convert Paragraph to other block, use 'text' property of saved data
      import: "text", // to covert other block's exported string to Paragraph, fill 'text' property of tool data
    };
  }

  /**
   * Sanitizer rules description
   */
  static get sanitize(): SanitizerConfig {
    return {
      text: {
        br: true,
      },
    };
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
      title: "Text",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="lc"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>`,
    };
  }
}
