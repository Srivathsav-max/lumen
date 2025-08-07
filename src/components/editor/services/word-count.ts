import type EditorJS from "@editorjs/editorjs";
import type { OutputData } from "@editorjs/editorjs";

/**
 * Word and character count statistics
 */
export interface Counters {
  wordCount: number;
  charCount: number;
}

/**
 * Configuration for the word count service
 */
export interface WordCountConfig {
  debounceDuration?: number;
}

/**
 * Word Counter service that tracks word and character count
 * in an EditorJS instance
 */
export class WordCountService {
  private editor: EditorJS;
  private config: WordCountConfig;
  private debounceTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(counters: Counters) => void> = [];
  private lastCounters: Counters = { wordCount: 0, charCount: 0 };

  // Word regex that matches non-whitespace sequences
  private static readonly WORD_REGEX = /\S+/g;

  constructor(editor: EditorJS, config: WordCountConfig = {}) {
    this.editor = editor;
    this.config = {
      debounceDuration: config.debounceDuration ?? 300,
    };

    this.setupEventListeners();
  }

  /**
   * Set up event listeners for editor changes
   */
  private setupEventListeners(): void {
    // Listen to editor changes
    this.editor.isReady.then(() => {
      // Initial count
      this.updateCounts();

      // EditorJS doesn't have a direct onChange method
      // We'll use a polling approach or rely on external triggers
      // The component using this service should call updateCounts manually
    });
  }

  /**
   * Add a listener for count updates
   */
  public addListener(callback: (counters: Counters) => void): void {
    this.listeners.push(callback);
    // Immediately call with current counts
    callback(this.lastCounters);
  }

  /**
   * Remove a listener
   */
  public removeListener(callback: (counters: Counters) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get current document counters
   */
  public async getDocumentCounters(): Promise<Counters> {
    try {
      const data = await this.editor.save();
      return this.calculateCounters(data);
    } catch (error) {
      console.error("Failed to get document counters:", error);
      return { wordCount: 0, charCount: 0 };
    }
  }

  /**
   * Get counters for selected content (if any)
   */
  public async getSelectionCounters(): Promise<Counters> {
    // Note: EditorJS doesn't have a direct API for getting selected content
    // This would require custom implementation or using the browser's selection API
    // For now, return empty counters
    return { wordCount: 0, charCount: 0 };
  }

  /**
   * Manually trigger count update (to be called from external change handlers)
   */
  public triggerUpdate(): void {
    this.debouncedUpdateCounts();
  }

  /**
   * Update counts with debouncing
   */
  private debouncedUpdateCounts(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.updateCounts();
    }, this.config.debounceDuration);
  }

  /**
   * Update counts immediately
   */
  private async updateCounts(): Promise<void> {
    try {
      const counters = await this.getDocumentCounters();
      
      // Only notify if counts have changed
      if (
        counters.wordCount !== this.lastCounters.wordCount ||
        counters.charCount !== this.lastCounters.charCount
      ) {
        this.lastCounters = counters;
        this.notifyListeners(counters);
      }
    } catch (error) {
      console.error("Failed to update counts:", error);
    }
  }

  /**
   * Calculate word and character counts from editor data
   */
  private calculateCounters(data: OutputData): Counters {
    let wordCount = 0;
    let charCount = 0;

    if (data.blocks) {
      for (const block of data.blocks) {
        const text = this.extractTextFromBlock(block);
        wordCount += this.countWords(text);
        charCount += this.countCharacters(text);
      }
    }

    return { wordCount, charCount };
  }

  /**
   * Extract plain text from a block
   */
  private extractTextFromBlock(block: any): string {
    let text = "";

    switch (block.type) {
      case "paragraph":
      case "header":
        text = block.data.text || "";
        break;
      case "quote":
        text = (block.data.text || "") + " " + (block.data.caption || "");
        break;
      case "list":
        if (block.data.items && Array.isArray(block.data.items)) {
          text = block.data.items.join(" ");
        }
        break;
      case "checklist":
        if (block.data.items && Array.isArray(block.data.items)) {
          text = block.data.items.map((item: any) => item.text || "").join(" ");
        }
        break;
      case "code":
        text = block.data.code || "";
        break;
      case "table":
        if (block.data.content && Array.isArray(block.data.content)) {
          text = block.data.content
            .flat()
            .filter(Boolean)
            .join(" ");
        }
        break;
      case "image":
        text = block.data.caption || "";
        break;
      default:
        // Try to extract text from common data properties
        if (block.data) {
          if (typeof block.data.text === "string") {
            text = block.data.text;
          } else if (typeof block.data.content === "string") {
            text = block.data.content;
          }
        }
    }

    // Strip HTML tags and decode entities
    return this.stripHtml(text);
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    if (typeof window !== "undefined") {
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.textContent || div.innerText || "";
    }
    // Fallback for server-side
    return html.replace(/<[^>]*>/g, "");
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    if (!text.trim()) return 0;
    const matches = text.match(WordCountService.WORD_REGEX);
    return matches ? matches.length : 0;
  }

  /**
   * Count characters in text (using Unicode-aware counting)
   */
  private countCharacters(text: string): number {
    if (!text) return 0;
    // Use Array.from to handle Unicode characters properly
    return Array.from(text).length;
  }

  /**
   * Notify all listeners of count changes
   */
  private notifyListeners(counters: Counters): void {
    this.listeners.forEach((callback) => {
      try {
        callback(counters);
      } catch (error) {
        console.error("Error in word count listener:", error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.listeners = [];
  }
}
