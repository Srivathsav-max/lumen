"use client";

import { lazy, Suspense, ComponentType } from 'react';
import { Spinner } from '@/components/ui/ios-spinner';

// Lazy loading wrapper with suspense
export function withLazyLoading<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = (
    <div className="flex items-center justify-center h-40">
      <Spinner size="md" />
    </div>
  )
) {
  const LazyComponent = lazy(importFunc);
  
  return function WrappedComponent(props: any) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Common loading spinner component
export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  return (
    <div className="flex items-center justify-center">
      <Spinner size={size} />
    </div>
  );
};

// Page loading component
export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="text-center">
      <Spinner size="lg" />
      <p className="mt-4 text-gray-600 font-mono">Loading...</p>
    </div>
  </div>
);