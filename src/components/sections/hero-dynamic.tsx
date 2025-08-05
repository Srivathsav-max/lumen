"use client";

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/lazy';

// Lazy load the heavy hero section
export const HeroSection = dynamic(
  () => import('./hero').then((mod) => ({ default: mod.HeroSection })),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    ),
  }
);