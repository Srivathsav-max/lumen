/**
 * Dynamic KaTeX Math Renderer Utility
 * Implements modern KaTeX best practices for 2024
 */

export interface KaTeXOptions {
  displayMode?: boolean;
  throwOnError?: boolean;
  errorColor?: string;
  macros?: Record<string, string>;
  strict?: boolean;
  trust?: boolean;
  output?: 'html' | 'mathml' | 'htmlAndMathml';
}

export interface MathDelimiter {
  left: string;
  right: string;
  display: boolean;
}

export class KaTeXRenderer {
  private static instance: KaTeXRenderer | null = null;
  private katex: any = null;
  private autoRender: any = null;
  private isLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  // Standard delimiters following 2024 best practices
  private readonly delimiters: MathDelimiter[] = [
    { left: "$$", right: "$$", display: true },
    { left: "$", right: "$", display: false },
    { left: "\\[", right: "\\]", display: true },
    { left: "\\(", right: "\\)", display: false },
  ];

  private readonly defaultOptions: KaTeXOptions = {
    throwOnError: false,
    errorColor: '#cc0000',
    output: 'htmlAndMathml',
    strict: false,
    trust: false,
  };

  private constructor() {}

  static getInstance(): KaTeXRenderer {
    if (!KaTeXRenderer.instance) {
      KaTeXRenderer.instance = new KaTeXRenderer();
    }
    return KaTeXRenderer.instance;
  }

  /**
   * Load KaTeX dynamically with proper CDN and version
   */
  private async loadKaTeX(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = new Promise(async (resolve, reject) => {
      try {
        // Check if already loaded globally
        if ((window as any).katex) {
          this.katex = (window as any).katex;
          this.autoRender = (window as any).renderMathInElement;
          this.isLoaded = true;
          resolve();
          return;
        }

        // Load KaTeX CSS
        if (!document.getElementById('katex-css')) {
          const cssLink = document.createElement('link');
          cssLink.id = 'katex-css';
          cssLink.rel = 'stylesheet';
          cssLink.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css';
          cssLink.crossOrigin = 'anonymous';
          document.head.appendChild(cssLink);
        }

        // Load KaTeX JS
        await this.loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js');
        
        // Load auto-render extension
        await this.loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/contrib/auto-render.min.js');

        this.katex = (window as any).katex;
        this.autoRender = (window as any).renderMathInElement;
        this.isLoaded = true;
        resolve();
      } catch (error) {
        console.error('Failed to load KaTeX:', error);
        reject(error);
      }
    });

    return this.loadingPromise;
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Render a single math expression
   */
  async renderMath(expression: string, options: Partial<KaTeXOptions> = {}): Promise<string> {
    await this.loadKaTeX();
    if (!this.katex) throw new Error('KaTeX not loaded');

    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      return this.katex.renderToString(expression, mergedOptions);
    } catch (error) {
      console.warn('KaTeX render error:', error);
      // Return error display as per best practices
      return `<span style="color: ${mergedOptions.errorColor}">${expression}</span>`;
    }
  }

  /**
   * Detect and parse math expressions in text
   */
  detectMathExpressions(text: string): Array<{
    expression: string;
    isDisplay: boolean;
    start: number;
    end: number;
    delimiter: MathDelimiter;
  }> {
    const matches: Array<{
      expression: string;
      isDisplay: boolean;
      start: number;
      end: number;
      delimiter: MathDelimiter;
    }> = [];

    for (const delimiter of this.delimiters) {
      const leftEscaped = delimiter.left.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rightEscaped = delimiter.right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`${leftEscaped}([\\s\\S]*?)${rightEscaped}`, 'g');
      
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Avoid overlapping matches
        const start = match.index;
        const end = start + match[0].length;
        
        const isOverlapping = matches.some(existing => 
          (start >= existing.start && start < existing.end) ||
          (end > existing.start && end <= existing.end) ||
          (start <= existing.start && end >= existing.end)
        );
        
        if (!isOverlapping) {
          matches.push({
            expression: match[1],
            isDisplay: delimiter.display,
            start,
            end,
            delimiter
          });
        }
      }
    }

    return matches.sort((a, b) => a.start - b.start);
  }

  /**
   * Replace math expressions in text with rendered HTML
   */
  async processText(text: string): Promise<string> {
    const mathExpressions = this.detectMathExpressions(text);
    if (mathExpressions.length === 0) return text;

    let processedText = text;
    let offset = 0;

    for (const math of mathExpressions) {
      const renderedMath = await this.renderMath(math.expression, {
        displayMode: math.isDisplay
      });
      
      const beforeMath = processedText.slice(0, math.start + offset);
      const afterMath = processedText.slice(math.end + offset);
      
      processedText = beforeMath + renderedMath + afterMath;
      offset += renderedMath.length - (math.end - math.start);
    }

    return processedText;
  }

  /**
   * Auto-render math in DOM element (modern implementation)
   */
  async renderInElement(element: HTMLElement, options: Partial<KaTeXOptions> = {}): Promise<void> {
    await this.loadKaTeX();
    if (!this.autoRender) {
      console.warn('KaTeX auto-render not available, falling back to manual processing');
      await this.fallbackRenderInElement(element, options);
      return;
    }

    const mergedOptions = { 
      ...this.defaultOptions, 
      ...options,
      delimiters: this.delimiters,
      // Prevent breaking on errors
      throwOnError: false,
      // Use proper output format
      output: 'htmlAndMathml'
    };

    try {
      this.autoRender(element, mergedOptions);
    } catch (error) {
      console.warn('Auto-render failed, using fallback:', error);
      await this.fallbackRenderInElement(element, options);
    }
  }

  /**
   * Fallback manual rendering when auto-render fails
   */
  private async fallbackRenderInElement(element: HTMLElement, options: Partial<KaTeXOptions> = {}): Promise<void> {
    const textContent = element.textContent || '';
    if (!textContent) return;

    const processedHTML = await this.processText(textContent);
    if (processedHTML !== textContent) {
      element.innerHTML = processedHTML;
    }
  }

  /**
   * Check if KaTeX is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.loadKaTeX();
      return this.isLoaded && !!this.katex;
    } catch {
      return false;
    }
  }

  /**
   * Validate math expression
   */
  async validateExpression(expression: string): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.renderMath(expression, { throwOnError: true });
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const katexRenderer = KaTeXRenderer.getInstance();

// Convenience functions
export const renderMath = (expression: string, options?: Partial<KaTeXOptions>) => 
  katexRenderer.renderMath(expression, options);

export const renderMathInElement = (element: HTMLElement, options?: Partial<KaTeXOptions>) => 
  katexRenderer.renderInElement(element, options);

export const processTextWithMath = (text: string) => 
  katexRenderer.processText(text);

export const isMathAvailable = () => 
  katexRenderer.isAvailable();