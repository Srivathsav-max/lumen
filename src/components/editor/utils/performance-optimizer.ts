/**
 * Performance optimization utilities for EditorJS
 */

export class EditorPerformanceOptimizer {
  private static instance: EditorPerformanceOptimizer;
  private renderQueue: Array<() => void> = [];
  private isProcessing = false;

  static getInstance(): EditorPerformanceOptimizer {
    if (!EditorPerformanceOptimizer.instance) {
      EditorPerformanceOptimizer.instance = new EditorPerformanceOptimizer();
    }
    return EditorPerformanceOptimizer.instance;
  }

  /**
   * Queue a render operation to be processed during idle time
   */
  queueRender(operation: () => void): void {
    this.renderQueue.push(operation);
    this.processQueue();
  }

  /**
   * Process the render queue during idle time
   */
  private processQueue(): void {
    if (this.isProcessing || this.renderQueue.length === 0) return;

    this.isProcessing = true;

    const processNext = () => {
      if (this.renderQueue.length === 0) {
        this.isProcessing = false;
        return;
      }

      const operation = this.renderQueue.shift();
      if (operation) {
        try {
          operation();
        } catch (error) {
          console.warn('Queued render operation failed:', error);
        }
      }

      // Schedule next operation
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(processNext, { timeout: 16 });
      } else {
        setTimeout(processNext, 0);
      }
    };

    processNext();
  }

  /**
   * Optimize DOM operations by batching them
   */
  batchDOMOperations(operations: Array<() => void>): void {
    if (typeof window === 'undefined') return;

    // Use requestAnimationFrame for DOM operations
    requestAnimationFrame(() => {
      operations.forEach(op => {
        try {
          op();
        } catch (error) {
          console.warn('Batched DOM operation failed:', error);
        }
      });
    });
  }

  /**
   * Debounce function for performance-sensitive operations
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Throttle function for high-frequency events
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Measure and log performance of operations
   */
  measurePerformance<T>(
    operation: () => T,
    operationName: string,
    threshold: number = 10
  ): T {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > threshold) {
      console.warn(`[Performance] ${operationName} took ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * Optimize text processing for large content
   */
  optimizeTextProcessing(text: string, processor: (text: string) => string): string {
    // For small text, process immediately
    if (text.length < 1000) {
      return processor(text);
    }

    // For large text, process in chunks
    const chunkSize = 1000;
    const chunks: string[] = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    return chunks.map(chunk => processor(chunk)).join('');
  }

  /**
   * Create a performance-optimized observer for content changes
   */
  createOptimizedObserver(
    target: Element,
    callback: (mutations: MutationRecord[]) => void,
    options: MutationObserverInit = {}
  ): MutationObserver {
    const throttledCallback = this.throttle(callback, 100);
    
    const observer = new MutationObserver((mutations) => {
      // Filter out trivial mutations
      const significantMutations = mutations.filter(mutation => {
        if (mutation.type === 'childList') {
          return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
        }
        if (mutation.type === 'attributes') {
          return mutation.attributeName !== 'style';
        }
        return true;
      });

      if (significantMutations.length > 0) {
        throttledCallback(significantMutations);
      }
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: false,
      characterData: true,
      characterDataOldValue: false,
      ...options
    });

    return observer;
  }
}

/**
 * Hook for using performance optimizer in React components
 */
export function usePerformanceOptimizer() {
  return EditorPerformanceOptimizer.getInstance();
}