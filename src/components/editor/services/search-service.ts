import type EditorJS from "@editorjs/editorjs";
import type { OutputData } from "@editorjs/editorjs";

/**
 * Search match result
 */
export interface SearchMatch {
  blockId: string;
  blockIndex: number;
  blockType: string;
  start: number;
  end: number;
  text: string;
  matchText: string;
}

/**
 * Search options
 */
export interface SearchOptions {
  caseSensitive: boolean;
  regex: boolean;
  wholeWords: boolean;
}

/**
 * Search service for EditorJS
 */
export class SearchService {
  private editor: EditorJS;
  private matches: SearchMatch[] = [];
  private currentMatchIndex = -1;
  private currentQuery = '';
  private searchOptions: SearchOptions = {
    caseSensitive: false,
    regex: false,
    wholeWords: false,
  };
  private highlightClassName = 'search-highlight';
  private currentHighlightClassName = 'search-highlight-current';
  private regexHighlightClassName = 'regex-preview-highlight';

  // Event listeners
  private listeners: {
    onMatchesChanged?: (matches: SearchMatch[], currentIndex: number) => void;
    onCurrentMatchChanged?: (match: SearchMatch | null, index: number) => void;
  } = {};

  constructor(editor: EditorJS) {
    this.editor = editor;
    this.injectSearchStyles();
    // Listen for inline regex compile events from blocks
    if (typeof window !== 'undefined') {
      window.addEventListener('lumen-inline-regex', this.handleInlineRegexEvent as EventListener);
    }
  }

  /**
   * Add event listeners
   */
  public on(
    event: 'matchesChanged',
    callback: (matches: SearchMatch[], currentIndex: number) => void
  ): void;
  public on(
    event: 'currentMatchChanged',
    callback: (match: SearchMatch | null, index: number) => void
  ): void;
  public on(event: string, callback: Function): void {
    if (event === 'matchesChanged') {
      this.listeners.onMatchesChanged = callback as any;
    } else if (event === 'currentMatchChanged') {
      this.listeners.onCurrentMatchChanged = callback as any;
    }
  }

  /**
   * Remove event listeners
   */
  public off(event: string): void {
    if (event === 'matchesChanged') {
      this.listeners.onMatchesChanged = undefined;
    } else if (event === 'currentMatchChanged') {
      this.listeners.onCurrentMatchChanged = undefined;
    }
  }

  /**
   * Search for text in the editor
   */
  public async search(query: string, options: Partial<SearchOptions> = {}): Promise<SearchMatch[]> {
    this.searchOptions = { ...this.searchOptions, ...options };
    this.currentQuery = query;

    // Clear previous highlights
    this.clearHighlights();

    if (!query.trim()) {
      this.matches = [];
      this.currentMatchIndex = -1;
      this.notifyMatchesChanged();
      return this.matches;
    }

    try {
      const data = await this.editor.save();
      this.matches = this.findMatches(query, data);
      this.currentMatchIndex = this.matches.length > 0 ? 0 : -1;
      
      // Highlight all matches
      this.highlightMatches();
      this.highlightCurrentMatch();
      
      this.notifyMatchesChanged();
      this.notifyCurrentMatchChanged();
      
      return this.matches;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Navigate to next match
   */
  public nextMatch(): SearchMatch | null {
    if (this.matches.length === 0) return null;

    this.clearCurrentHighlight();
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
    this.highlightCurrentMatch();
    this.scrollToCurrentMatch();
    
    this.notifyCurrentMatchChanged();
    return this.matches[this.currentMatchIndex];
  }

  /**
   * Navigate to previous match
   */
  public previousMatch(): SearchMatch | null {
    if (this.matches.length === 0) return null;

    this.clearCurrentHighlight();
    this.currentMatchIndex = this.currentMatchIndex <= 0 
      ? this.matches.length - 1 
      : this.currentMatchIndex - 1;
    this.highlightCurrentMatch();
    this.scrollToCurrentMatch();
    
    this.notifyCurrentMatchChanged();
    return this.matches[this.currentMatchIndex];
  }

  /**
   * Replace current match
   */
  public async replaceCurrentMatch(replacement: string): Promise<boolean> {
    if (this.currentMatchIndex < 0 || this.currentMatchIndex >= this.matches.length) {
      return false;
    }

    const match = this.matches[this.currentMatchIndex];
    const success = await this.replaceMatch(match, replacement);
    
    if (success) {
      // Re-search to update matches
      await this.search(this.currentQuery, this.searchOptions);
    }
    
    return success;
  }

  /**
   * Replace all matches
   */
  public async replaceAllMatches(replacement: string): Promise<number> {
    if (this.matches.length === 0) return 0;

    let replacedCount = 0;
    
    // Replace matches in reverse order to maintain correct indices
    for (let i = this.matches.length - 1; i >= 0; i--) {
      const match = this.matches[i];
      const success = await this.replaceMatch(match, replacement);
      if (success) {
        replacedCount++;
      }
    }

    // Re-search to update matches
    if (replacedCount > 0) {
      await this.search(this.currentQuery, this.searchOptions);
    }

    return replacedCount;
  }

  /**
   * Clear all search highlights
   */
  public clearHighlights(): void {
    const highlights = document.querySelectorAll(`.${this.highlightClassName}, .${this.currentHighlightClassName}`);
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize(); // Merge adjacent text nodes
      }
    });
  }

  /**
   * Get current search statistics
   */
  public getSearchStats(): { matches: number; currentIndex: number; query: string } {
    return {
      matches: this.matches.length,
      currentIndex: this.currentMatchIndex + 1, // 1-based for UI
      query: this.currentQuery,
    };
  }

  /**
   * Dispose of the search service
   */
  public dispose(): void {
    this.clearHighlights();
    this.listeners = {};
    if (typeof window !== 'undefined') {
      window.removeEventListener('lumen-inline-regex', this.handleInlineRegexEvent as EventListener);
    }
  }

  /**
   * Find matches in editor data
   */
  private findMatches(query: string, data: OutputData): SearchMatch[] {
    const matches: SearchMatch[] = [];
    
    if (!data.blocks) return matches;

    const pattern = this.createSearchPattern(query);
    if (!pattern) return matches;

    data.blocks.forEach((block, blockIndex) => {
      const text = this.extractTextFromBlock(block);
      if (!text) return;

      const blockMatches = Array.from(text.matchAll(pattern));
      blockMatches.forEach(match => {
        if (match.index !== undefined) {
          matches.push({
            blockId: block.id || `block-${blockIndex}`,
            blockIndex,
            blockType: block.type,
            start: match.index,
            end: match.index + match[0].length,
            text: text,
            matchText: match[0],
          });
        }
      });
    });

    return matches;
  }

  /**
   * Create search pattern based on options
   */
  private createSearchPattern(query: string): RegExp | null {
    try {
      let pattern = query;
      let flags = 'g'; // Global flag

      if (!this.searchOptions.caseSensitive) {
        flags += 'i';
      }

      if (!this.searchOptions.regex) {
        // Escape special regex characters
        pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      if (this.searchOptions.wholeWords && !this.searchOptions.regex) {
        pattern = `\\b${pattern}\\b`;
      }

      return new RegExp(pattern, flags);
    } catch (error) {
      console.error('Invalid regex pattern:', error);
      return null;
    }
  }

  /**
   * Extract text content from block
   */
  private extractTextFromBlock(block: any): string {
    if (!block || !block.data) return '';
    
    try {
      switch (block.type) {
        case 'paragraph':
        case 'header':
          return this.stripHtml(block.data.text || '');
        case 'quote':
          return this.stripHtml((block.data.text || '') + ' ' + (block.data.caption || ''));
        case 'list':
          if (block.data.items && Array.isArray(block.data.items)) {
            return block.data.items.map((item: string) => this.stripHtml(item)).join(' ');
          }
          break;
        case 'checklist':
          if (block.data.items && Array.isArray(block.data.items)) {
            return block.data.items.map((item: any) => this.stripHtml(item.text || '')).join(' ');
          }
          break;
        case 'code':
          return block.data.code || '';
        case 'table':
          if (block.data.content && Array.isArray(block.data.content)) {
            return block.data.content
              .flat()
              .filter(Boolean)
              .map((cell: string) => this.stripHtml(cell))
              .join(' ');
          }
          break;
        case 'image':
          return block.data.caption || '';
        default:
          // Handle unknown block types gracefully
          if (typeof block.data === 'string') {
            return this.stripHtml(block.data);
          } else if (block.data.text) {
            return this.stripHtml(block.data.text);
          }
      }
    } catch (error) {
      console.warn('Error extracting text from block:', error, block);
    }
    return '';
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    if (typeof window !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.textContent || div.innerText || '';
    }
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Highlight all matches
   */
  private highlightMatches(): void {
    // Implementation would need to access EditorJS DOM elements
    // This is a simplified version - in practice, you'd need to traverse
    // the actual DOM nodes created by EditorJS blocks
    this.matches.forEach((match, index) => {
      this.highlightMatchInDOM(match, index === this.currentMatchIndex);
    });
  }

  /**
   * Highlight current match
   */
  private highlightCurrentMatch(): void {
    if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.matches.length) {
      const match = this.matches[this.currentMatchIndex];
      this.highlightMatchInDOM(match, true);
    }
  }

  /**
   * Clear current match highlight
   */
  private clearCurrentHighlight(): void {
    const currentHighlights = document.querySelectorAll(`.${this.currentHighlightClassName}`);
    currentHighlights.forEach(highlight => {
      highlight.classList.remove(this.currentHighlightClassName);
      highlight.classList.add(this.highlightClassName);
    });
  }

  /**
   * Highlight match in DOM (simplified implementation)
   */
  private highlightMatchInDOM(match: SearchMatch, isCurrent: boolean): void {
    try {
      // Try multiple selectors to find the block element
      let blockElement = document.querySelector(`[data-id="${match.blockId}"]`) ||
                        document.querySelector(`[data-block-id="${match.blockId}"]`) ||
                        document.querySelector(`#block-${match.blockId}`) ||
                        document.querySelector(`.ce-block:nth-child(${match.blockIndex + 1})`);
      
      if (blockElement) {
        this.highlightTextInElement(blockElement, match, isCurrent);
      } else {
        // Fallback: try to find by block index
        const allBlocks = document.querySelectorAll('.ce-block');
        if (allBlocks[match.blockIndex]) {
          this.highlightTextInElement(allBlocks[match.blockIndex], match, isCurrent);
        }
      }
    } catch (error) {
      console.warn('Error highlighting match in DOM:', error, match);
    }
  }

  /**
   * Highlight text within an element
   */
  private highlightTextInElement(element: Element, match: SearchMatch, isCurrent: boolean): void {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    let currentOffset = 0;
    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';
      const nodeStart = currentOffset;
      const nodeEnd = currentOffset + nodeText.length;

      if (match.start >= nodeStart && match.start < nodeEnd) {
        // Match starts in this text node
        const startOffset = match.start - nodeStart;
        const endOffset = Math.min(match.end - nodeStart, nodeText.length);
        
        this.wrapTextWithHighlight(textNode, startOffset, endOffset, isCurrent);
        break;
      }

      currentOffset = nodeEnd;
    }
  }

  /**
   * Wrap text with highlight span
   */
  private wrapTextWithHighlight(textNode: Text, start: number, end: number, isCurrent: boolean): void {
    const text = textNode.textContent || '';
    const beforeText = text.substring(0, start);
    const matchText = text.substring(start, end);
    const afterText = text.substring(end);

    const highlight = document.createElement('span');
    highlight.className = isCurrent ? this.currentHighlightClassName : this.highlightClassName;
    highlight.textContent = matchText;

    const parent = textNode.parentNode;
    if (parent) {
      if (beforeText) {
        parent.insertBefore(document.createTextNode(beforeText), textNode);
      }
      parent.insertBefore(highlight, textNode);
      if (afterText) {
        parent.insertBefore(document.createTextNode(afterText), textNode);
      }
      parent.removeChild(textNode);
    }
  }

  /**
   * Scroll to current match
   */
  private scrollToCurrentMatch(): void {
    if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.matches.length) {
      const match = this.matches[this.currentMatchIndex];
      
      try {
        // Try multiple selectors to find the block element
        let blockElement = document.querySelector(`[data-id="${match.blockId}"]`) ||
                          document.querySelector(`[data-block-id="${match.blockId}"]`) ||
                          document.querySelector(`#block-${match.blockId}`) ||
                          document.querySelector(`.ce-block:nth-child(${match.blockIndex + 1})`);
        
        if (!blockElement) {
          // Fallback: try to find by block index
          const allBlocks = document.querySelectorAll('.ce-block');
          blockElement = allBlocks[match.blockIndex];
        }
        
        if (blockElement) {
          blockElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      } catch (error) {
        console.warn('Error scrolling to match:', error, match);
      }
    }
  }

  /**
   * Replace a specific match
   */
  private async replaceMatch(match: SearchMatch, replacement: string): Promise<boolean> {
    try {
      // This would need to be implemented based on EditorJS API
      // You'd need to:
      // 1. Get the block data
      // 2. Update the text content with replacement
      // 3. Update the block in the editor
      
      // Simplified implementation - in practice you'd need to handle
      // different block types differently
      console.log(`Replace "${match.matchText}" with "${replacement}" in block ${match.blockId}`);
      return true;
    } catch (error) {
      console.error('Replace failed:', error);
      return false;
    }
  }

  /**
   * Inject search highlight styles
   */
  private injectSearchStyles(): void {
    const styleId = 'editor-search-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .${this.highlightClassName} {
        background-color: #ffeb3b;
        color: #000;
        padding: 0 2px;
        border-radius: 2px;
      }
      
      .${this.currentHighlightClassName} {
        background-color: #ff9800;
        color: #fff;
        padding: 0 2px;
        border-radius: 2px;
        box-shadow: 0 0 0 2px #ff9800;
      }

      .${this.regexHighlightClassName} {
        background-color: rgba(76, 175, 80, 0.25);
        outline: 1px dashed #4caf50;
        border-radius: 2px;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Notify listeners of matches change
   */
  private notifyMatchesChanged(): void {
    if (this.listeners.onMatchesChanged) {
      this.listeners.onMatchesChanged(this.matches, this.currentMatchIndex);
    }
  }

  /**
   * Handle inline regex event and preview-highlight matches in current document.
   */
  private handleInlineRegexEvent = (evt: CustomEvent<{ pattern: string; flags: string }>): void => {
    try {
      const { pattern, flags } = (evt as any).detail ?? { pattern: '', flags: '' };
      if (!pattern) return;
      // Clear previous regex preview highlights only (not find/replace ones)
      document.querySelectorAll(`.${this.regexHighlightClassName}`).forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
          parent.normalize();
        }
      });

      const safeFlags = (flags || '').replace(/[^gimsuy]/g, '');
      const re = new RegExp(pattern, safeFlags || 'g');

      // Walk through editor blocks and highlight matches
      const root = document.querySelector('#editor');
      if (!root) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let n: Node | null;
      while ((n = walker.nextNode())) nodes.push(n as Text);
      nodes.forEach((textNode) => this.highlightRegexInTextNode(textNode, re));
    } catch (e) {
      // ignore invalid patterns
    }
  };

  private highlightRegexInTextNode(textNode: Text, re: RegExp): void {
    const text = textNode.textContent || '';
    if (!text) return;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    re.lastIndex = 0;

    const parent = textNode.parentNode;
    if (!parent) return;

    const frag = document.createDocumentFragment();

    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (start > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
      }
      const span = document.createElement('span');
      span.className = this.regexHighlightClassName;
      span.textContent = text.slice(start, end);
      frag.appendChild(span);
      if (!re.global) break; // avoid infinite loops
      lastIndex = end;
      if (re.lastIndex === match.index) re.lastIndex++; // progress for zero-length matches
    }
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    if (frag.childNodes.length > 0) {
      parent.replaceChild(frag, textNode);
    }
  }

  /**
   * Notify listeners of current match change
   */
  private notifyCurrentMatchChanged(): void {
    if (this.listeners.onCurrentMatchChanged) {
      const currentMatch = this.currentMatchIndex >= 0 ? this.matches[this.currentMatchIndex] : null;
      this.listeners.onCurrentMatchChanged(currentMatch, this.currentMatchIndex);
    }
  }
}
