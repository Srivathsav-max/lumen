"use client";

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/lazy';

// Lazy load the platform preview section
export const PlatformPreviewSection = dynamic(
  () => import('./index').then((mod) => ({ default: mod.PlatformPreviewSection })),
  {
    ssr: false,
    loading: () => (
      <div className="relative min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    ),
  }
);