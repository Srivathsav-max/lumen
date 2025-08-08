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

import { EditorPerformanceOptimizer } from "../../utils/performance-optimizer";

type ParagraphData = {
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
  /**
   * Performance optimizer instance
   */
  private _optimizer;

  constructor({
    data,
    config,
    api,
    readOnly,
  }: BlockToolConstructorOptions<ParagraphData, ParagraphConfig>) {
    this.api = api;
    this.readOnly = readOnly;
    this._optimizer = EditorPerformanceOptimizer.getInstance();

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
   * Safe range operations with bounds checking
   */
  private _createSafeRange(): Range | null {
    try {
      return new Range();
    } catch (error) {
      console.warn('Failed to create range:', error);
      return null;
    }
  }

  private _safeSetRangeEnd(range: Range, node: Node, offset: number): boolean {
    try {
      let maxOffset = 0;
      if (node.nodeType === Node.TEXT_NODE) {
        maxOffset = (node as Text).length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        maxOffset = node.childNodes.length;
      }
      
      const safeOffset = Math.min(Math.max(0, offset), maxOffset);
      range.setEnd(node, safeOffset);
      return true;
    } catch (error) {
      console.warn('Failed to set range end:', error);
      return false;
    }
  }

  private _safeSetRangeStart(range: Range, node: Node, offset: number): boolean {
    try {
      let maxOffset = 0;
      if (node.nodeType === Node.TEXT_NODE) {
        maxOffset = (node as Text).length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        maxOffset = node.childNodes.length;
      }
      
      const safeOffset = Math.min(Math.max(0, offset), maxOffset);
      range.setStart(node, safeOffset);
      return true;
    } catch (error) {
      console.warn('Failed to set range start:', error);
      return false;
    }
  }

  /**
   * Dynamically detect and handle HTML content
   */
  private _isHtmlContent(text: string): boolean {
    // Check for common HTML tags that indicate formatted content
    const htmlTagPattern = /<\/?[a-zA-Z][^>]*>/;
    return htmlTagPattern.test(text);
  }

  private _hasMarkdownFormatting(text: string): boolean {
    // Check for common markdown patterns including math expressions
    return /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(__[^_]+__)|(_[^_]+_)|(~~[^~]+~~)|(\$\$[^$]+\$\$)|(\$[^$]+\$)|(\\\[[^\]]+\\\])|(\\\([^)]+\\\))/.test(text);
  }

  private _processMarkdownToHtml(text: string): string {
    if (!text) return "";
    
    // First process math expressions to avoid conflicts with markdown
    let processedText = this._processMathExpressions(text);
    
    // Then process markdown patterns
    processedText = processedText
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')         // **bold**
      .replace(/\*([^*]+)\*/g, '<i>$1</i>')             // *italic*
      .replace(/__([^_]+)__/g, '<b>$1</b>')             // __bold__
      .replace(/_([^_]+)_/g, '<i>$1</i>')               // _italic_
      .replace(/~~([^~]+)~~/g, '<s>$1</s>')             // ~~strikethrough~~
      .replace(/`([^`]+)`/g, '<code>$1</code>')         // `code`
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'); // [text](url)
    
    return processedText;
  }

  private _processMathExpressions(text: string): string {
    // Simple math expression detection and placeholder replacement
    // This will be processed properly when the element is rendered
    const mathPatterns = [
      { regex: /\$\$([^$]+)\$\$/g, placeholder: (match: string) => `<span class="math-display" data-math="${this._encodeForAttribute(match.slice(2, -2))}">${match}</span>` },
      { regex: /\$([^$]+)\$/g, placeholder: (match: string) => `<span class="math-inline" data-math="${this._encodeForAttribute(match.slice(1, -1))}">${match}</span>` },
      { regex: /\\\[([^\]]+)\\\]/g, placeholder: (match: string) => `<span class="math-display" data-math="${this._encodeForAttribute(match.slice(2, -2))}">${match}</span>` },
      { regex: /\\\(([^)]+)\\\)/g, placeholder: (match: string) => `<span class="math-inline" data-math="${this._encodeForAttribute(match.slice(2, -2))}">${match}</span>` }
    ];

    let result = text;
    for (const pattern of mathPatterns) {
      result = result.replace(pattern.regex, pattern.placeholder);
    }
    
    return result;
  }

  private _encodeForAttribute(text: string): string {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  private _sanitizeAndNormalizeText(text: string): string {
    if (!text) return "";
    
    return this._optimizer.measurePerformance(() => {
      // If it already contains HTML tags, treat it as HTML
      if (this._isHtmlContent(text)) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        return tempDiv.innerHTML;
      }
      
      // If it has markdown formatting, convert to HTML
      if (this._hasMarkdownFormatting(text)) {
        return this._optimizer.optimizeTextProcessing(text, (chunk) => 
          this._processMarkdownToHtml(chunk)
        );
      }
      
      // Plain text - decode entities only
      const textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      return textarea.value;
    }, 'text-sanitization', 5);
  }

  /**
   * Normalize input data
   */
  private _normalizeData(data: ParagraphData): ParagraphData {
    if (typeof data === "object") {
      const text = data.text || "";
      return { text: this._sanitizeAndNormalizeText(text) };
    }

    return { text: "" };
  }

  /**
   * Get paragraph tag for target level (optimized for LCP)
   */
  private _drawHolderNode(): HTMLParagraphElement {
    const startTime = performance.now();
    
    /**
     * Create element for current Block's level
     */
    const paragraph = document.createElement("P") as HTMLParagraphElement;

    /**
     * Add styles class first for better rendering
     */
    paragraph.classList.add(this._CSS.wrapper, this._CSS.block);

    /**
     * Add Placeholder
     */
    paragraph.dataset.placeholder = this.api.i18n.t(this.placeholder);

    /**
     * Add text to block - optimized for performance
     */
    const text = this._data.text;
    if (text) {
      if (this._isHtmlContent(text) || this._hasMarkdownFormatting(text)) {
        // Set as HTML to render formatting (already processed in normalize)
        paragraph.innerHTML = text;
        // Defer math rendering to avoid blocking LCP
        if (text.includes('$') || text.includes('\\(') || text.includes('\\[')) {
          this._renderMathInElement(paragraph);
        }
      } else {
        // Set as text content for plain text (fastest path)
        paragraph.textContent = text;
      }
    }

    if (!this.readOnly) {
      paragraph.contentEditable = "true";
      // Use passive listeners for better performance
      paragraph.addEventListener("keyup", this.onKeyUp, { passive: true });
      paragraph.addEventListener("keydown", this.onKeyDown);
    }

    const renderTime = performance.now() - startTime;
    if (renderTime > 10) {
      console.warn(`[Performance] Paragraph render took ${renderTime.toFixed(2)}ms`);
    }

    return paragraph;
  }

  /**
   * Render math expressions in the element using modern KaTeX (deferred)
   */
  private async _renderMathInElement(element: HTMLElement): Promise<void> {
    // Defer math rendering to avoid blocking LCP
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(async () => {
        await this._performMathRendering(element);
      }, { timeout: 1000 });
    } else {
      setTimeout(() => this._performMathRendering(element), 100);
    }
  }

  private async _performMathRendering(element: HTMLElement): Promise<void> {
    try {
      // Dynamic import to avoid bundling issues
      const { renderMathInElement } = await import('@/components/editor/utils/katex-renderer');
      await renderMathInElement(element, {
        throwOnError: false,
        errorColor: '#cc0000',
        output: 'htmlAndMathml'
      });
    } catch (error) {
      console.warn('KaTeX rendering failed:', error);
      // Fallback: replace math placeholders with styled spans
      this._fallbackMathRender(element);
    }
  }

  /**
   * Fallback math rendering when KaTeX is not available
   */
  private _fallbackMathRender(element: HTMLElement): void {
    const mathElements = element.querySelectorAll('.math-display, .math-inline');
    mathElements.forEach(mathEl => {
      const mathContent = mathEl.getAttribute('data-math');
      if (mathContent) {
        const span = document.createElement('span');
        span.textContent = mathContent;
        span.style.fontFamily = 'monospace';
        span.style.backgroundColor = '#f5f5f5';
        span.style.padding = '2px 4px';
        span.style.borderRadius = '3px';
        if (mathEl.classList.contains('math-display')) {
          span.style.display = 'block';
          span.style.textAlign = 'center';
          span.style.margin = '10px 0';
        }
        mathEl.parentNode?.replaceChild(span, mathEl);
      }
    });
  }

  /**
   * Handle backspace on math expressions to convert them back to editable text
   */
  private _handleMathBackspace(): void {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      
      // Check if cursor is at the beginning of a math element
      let mathElement: Element | null = null;
      
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = startContainer as Text;
        if (startOffset === 0 && textNode.parentElement) {
          mathElement = textNode.parentElement.closest('.math-inline, .math-display');
        }
      } else if (startContainer.nodeType === Node.ELEMENT_NODE) {
        const elementNode = startContainer as Element;
        if (startOffset === 0) {
          mathElement = elementNode.closest('.math-inline, .math-display');
        }
      }
      
      if (mathElement && mathElement.parentNode) {
        // Get the original math expression from data attribute
        const mathContent = mathElement.getAttribute('data-math');
        if (mathContent) {
          // Determine the original delimiters based on the math type
          const isDisplay = mathElement.classList.contains('math-display');
          const originalExpression = isDisplay ? `$$${mathContent}$$` : `$${mathContent}$`;
          
          // Create a text node with the original expression
          const textNode = document.createTextNode(originalExpression);
          
          // Replace the math element with the text node
          mathElement.parentNode.replaceChild(textNode, mathElement);
          
          // Position cursor at the beginning of the restored text
          const newRange = document.createRange();
          newRange.setStart(textNode, 0);
          newRange.setEnd(textNode, 0);
          
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } catch (error) {
      console.warn('Error handling math backspace:', error);
    }
  }

  /**
   * Check if text content is empty and set empty string to inner html.
   * We need this because some browsers (e.g. Safari) insert <br> into empty contenteditable elements
   */
  onKeyUp(e: KeyboardEvent) {
    // Handle backspace on math expressions
    if (e.code === "Backspace") {
      this._handleMathBackspace();
      
      // Cleanup empty HTML added by some browsers
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

    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!this._holderNode.contains(range.startContainer)) return;

      const beforeRange = range.cloneRange();
      beforeRange.selectNodeContents(this._holderNode);
      
      // Safe range end setting with bounds checking
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      
      if (!this._safeSetRangeEnd(beforeRange, startContainer, startOffset)) {
        // Fallback: use text content directly
        const beforeText = this._holderNode.textContent || "";
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const currentRange = selection.getRangeAt(0);
          // Estimate position based on text content
          const beforePart = beforeText.substring(0, Math.min(startOffset, beforeText.length));
          this.handleShortcuts(beforePart, e);
        }
        return;
      }
      
      const beforeText = beforeRange.toString();
      this.handleShortcuts(beforeText, e);
    } catch (error) {
      console.warn('Error in paragraph keydown handler:', error);
      // Continue normal behavior if range operations fail
    }
  }

  private handleShortcuts(beforeText: string, e: KeyboardEvent): void {
    const isSpace = e.key === " ";
    const isEnter = e.key === "Enter";
    
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
    try {
      // Remove everything before caret (prefix + typed key) from this paragraph
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      const index = this.api.blocks.getCurrentBlockIndex();
      // Clear current paragraph content to avoid leftover prefix
      this._holderNode.innerHTML = "";
      // Ensure caret moves to new block after transform
      return index;
    } catch (error) {
      console.warn('Error in removeCurrentPrefixAndGetIndex:', error);
      // Fallback to current block index
      return this.api.blocks.getCurrentBlockIndex();
    }
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

    try {
      const frag = document.createDocumentFragment();
      let cursor = 0;
      const pattern = /(\$\$[^$]+\$\$)|(\$[^$]+\$)|(\\\[[^\]]+\\\])|(\\\([^\)]+\\\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(~~[^~]+~~)|(~[^~]+~)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^\)]+\))|(https?:\/\/[^\s)]+)|(\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b)/g;
      let m: RegExpExecArray | null;
      
      while ((m = pattern.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        
        // Bounds checking
        if (start < 0 || start > text.length || end < 0 || end > text.length) continue;
        
        if (start > cursor) {
          const beforeText = text.slice(cursor, start);
          if (beforeText) frag.appendChild(document.createTextNode(beforeText));
        }

        const token = m[0];
        let el: HTMLElement | null = null;
        
        if (m[1] || m[2] || m[3] || m[4]) {
          const isBlock = !!m[1] || !!m[3];
          const latex = m[1]
            ? token.slice(2, -2)
            : m[2]
            ? token.slice(1, -1)
            : m[3]
            ? token.slice(2, -2)
            : token.slice(2, -2); // \( ... \)
          el = document.createElement("span");
          el.className = isBlock ? "math-block" : "math-inline";
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
        } else if (m[5]) {
          el = document.createElement("code");
          el.textContent = token.slice(1, -1);
        } else if (m[6] || m[7]) {
          el = document.createElement("b");
          el.textContent = token.slice(2, -2);
        } else if (m[8] || m[9]) {
          el = document.createElement("s");
          el.textContent = token.startsWith("~~") ? token.slice(2, -2) : token.slice(1, -1);
        } else if (m[10] || m[11]) {
          el = document.createElement("i");
          el.textContent = token.slice(1, -1);
        } else if (m[12]) {
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
        } else if (m[13]) {
          const a = document.createElement("a");
          a.href = token;
          a.textContent = token;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          el = a;
        } else if (m[14]) {
          const a = document.createElement("a");
          a.href = `mailto:${token}`;
          a.textContent = token;
          el = a;
        }

        if (el) frag.appendChild(el);
        else frag.appendChild(document.createTextNode(token));
        cursor = end;
      }
      
      if (cursor < text.length) {
        const remainingText = text.slice(cursor);
        if (remainingText) frag.appendChild(document.createTextNode(remainingText));
      }

      const parent = textNode.parentNode;
      if (parent) {
        parent.replaceChild(frag, textNode);
      }
    } catch (error) {
      console.warn('Error in markdown replacement:', error);
      // Fallback: leave original text node unchanged
    }
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
    const cloned = toolsContent.cloneNode(true) as HTMLElement;
    
    // Normalize formatting elements to standard HTML tags
    cloned.querySelectorAll('strong').forEach((el) => {
      const b = document.createElement('b');
      b.innerHTML = el.innerHTML;
      el.replaceWith(b);
    });
    cloned.querySelectorAll('em').forEach((el) => {
      const i = document.createElement('i');
      i.innerHTML = el.innerHTML;
      el.replaceWith(i);
    });
    
    // Remove style attributes but preserve other attributes
    cloned.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));
    
    // Get the content
    let content = cloned.innerHTML.trim();
    
    // If the content has no meaningful HTML tags (only text), return as plain text
    const hasFormattingTags = /<(?:b|i|u|s|code|a|span|strong|em)\b[^>]*>/i.test(content);
    const hasOnlyBr = /^[^<]*(?:<br\s*\/?>)*[^<]*$/i.test(content);
    
    if (!hasFormattingTags && hasOnlyBr) {
      // Convert to plain text and clean up
      const textContent = cloned.textContent || "";
      return { text: textContent.trim() };
    }
    
    // Clean up common HTML encoding issues while preserving structure
    content = content
      .replace(/<br\s*\/?>\s*$/gi, '') // Remove trailing <br>
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&'); // This should be last to avoid double-decoding
    
    return { text: content };
  }

  merge(data: ParagraphData): void {
    const newData = { text: `${this.data.text}${data.text}` };

    this.data = newData;
  }

  onPaste(event: HTMLPasteEvent): void {
    const data = { text: event.detail.data.innerHTML };

    this.data = data;
  }

  get data(): ParagraphData {
    this._data.text = this._holderNode.innerHTML;

    return this._data;
  }

  set data(data) {
    this._data = this._normalizeData(data);

    if (this._holderNode.parentNode) {
      const newParagraph = this._drawHolderNode();

      this._holderNode.parentNode.replaceChild(newParagraph, this._holderNode);

      this._holderNode = newParagraph;
    } else {
      // If not yet in DOM, just update the content directly
      const text = this._data.text;
      if (this._isHtmlContent(text) || this._hasMarkdownFormatting(text)) {
        this._holderNode.innerHTML = text;
        this._renderMathInElement(this._holderNode);
      } else {
        this._holderNode.textContent = text;
      }
    }
  }

  get placeholder(): string {
    return this._config.placeholder || `Enter text...`;
  }

  static get pasteConfig(): PasteConfig {
    return {
      tags: ["P"],
    };
  }

  static get conversionConfig(): ConversionConfig {
    return {
      export: "text",
      import: "text",
    };
  }

  static get sanitize(): SanitizerConfig {
    return {
      text: {
        br: true,
        b: true,
        strong: true,
        i: true,
        em: true,
        code: true,
        s: true,
        u: true,
        a: {
          href: true,
          target: true,
          rel: true,
        } as any,
        span: {
          class: true,
        } as any,
      },
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  static get toolbox(): ToolboxConfig {
    return {
      title: "Text",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="lc"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>`,
    };
  }
}
