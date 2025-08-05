// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Measure page load time
  measurePageLoad(pageName: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        this.metrics.set(`page_load_${pageName}`, loadTime);
        console.log(`[Performance] ${pageName} loaded in ${loadTime}ms`);
      }
    }
  }

  // Measure component render time
  measureRender(componentName: string, startTime: number): void {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    this.metrics.set(`render_${componentName}`, renderTime);
    
    if (renderTime > 100) {
      console.warn(`[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render`);
    }
  }

  // Measure API call time
  measureApiCall(endpoint: string, startTime: number): void {
    const endTime = performance.now();
    const apiTime = endTime - startTime;
    this.metrics.set(`api_${endpoint}`, apiTime);
    
    if (apiTime > 1000) {
      console.warn(`[Performance] API call to ${endpoint} took ${apiTime.toFixed(2)}ms`);
    }
  }

  // Get all metrics
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  // Get Core Web Vitals
  getCoreWebVitals(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('[Performance] LCP:', lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          console.log('[Performance] FID:', entry.processingStart - entry.startTime);
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            console.log('[Performance] CLS:', clsValue);
          }
        });
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }

  // Memory usage
  getMemoryUsage(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      console.log('[Performance] Memory usage:', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
      });
    }
  }
}

// Hook for measuring component render performance
export function usePerformance(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  
  const startRender = () => {
    return performance.now();
  };
  
  const endRender = (startTime: number) => {
    monitor.measureRender(componentName, startTime);
  };
  
  return { startRender, endRender };
}

// Utility for measuring async operations
export async function measureAsync<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await operation();
    PerformanceMonitor.getInstance().measureApiCall(operationName, startTime);
    return result;
  } catch (error) {
    PerformanceMonitor.getInstance().measureApiCall(`${operationName}_error`, startTime);
    throw error;
  }
}