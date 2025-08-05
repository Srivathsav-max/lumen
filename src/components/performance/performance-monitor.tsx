"use client";

import { useEffect } from 'react';
import { PerformanceMonitor } from '@/lib/performance';

export function PerformanceMonitorComponent() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const monitor = PerformanceMonitor.getInstance();
      
      monitor.getCoreWebVitals();
      
      const memoryInterval = setInterval(() => {
        monitor.getMemoryUsage();
      }, 30000); // Every 30 seconds
      
      // Measure page load
      monitor.measurePageLoad(window.location.pathname);
      
      return () => {
        clearInterval(memoryInterval);
      };
    }
  }, []);

  // This component doesn't render anything
  return null;
}