"use client";

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/lazy';

// Lazy load the features section
export const FeaturesSection = dynamic(
  () => import('./features').then((mod) => ({ default: mod.FeaturesSection })),
  {
    ssr: false,
    loading: () => (
      <div className="relative min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    ),
  }
);