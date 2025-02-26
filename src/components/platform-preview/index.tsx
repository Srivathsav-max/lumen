"use client";

import React from 'react';
import './styles.css';
import { Braces } from 'lucide-react';
import { FullDashboard } from './components/dashboard';

export function PlatformPreviewSection() {
  const [cursorPosition, setCursorPosition] = React.useState({ x: -100, y: -100 });
  const [cursorColors, setCursorColors] = React.useState(['#FF3366', '#FF6B3D']);
  const [cursorTooltip, setCursorTooltip] = React.useState('With this cursor you can interact with dashboard');

  // Color pairs for random selection
  const colorPairs = [
    ['#FF3366', '#FF6B3D'], // Red-Orange
    ['#7C3AED', '#3B82F6'], // Purple-Blue
    ['#10B981', '#34D399'], // Green-Teal
    ['#F59E0B', '#FBBF24'], // Yellow-Amber
    ['#EC4899', '#F472B6'], // Pink-Rose
    ['#6366F1', '#818CF8'], // Indigo-Purple
  ];

  const getElementTooltip = (element: HTMLElement): string => {
    if (element.closest('button')) return 'Click this button';
    if (element.closest('input')) return 'Type here';
    if (element.closest('a')) return 'Click this link';
    if (element.closest('[role="button"]')) return 'Interactive element';
    return '';
  };

  React.useEffect(() => {
    const handleMouseMove = (e: Event) => {
      if (e instanceof MouseEvent) {
        const targetElement = e.target as HTMLElement;
        const isInteractive = targetElement.closest('button, input, a, [role="button"]');
        
        setCursorPosition({ 
          x: e.clientX,
          y: e.clientY
        });

        if (isInteractive) {
          setCursorTooltip(getElementTooltip(targetElement));
          const randomPair = colorPairs[Math.floor(Math.random() * colorPairs.length)];
          document.documentElement.style.setProperty('--cursor-color-1', randomPair[0]);
          document.documentElement.style.setProperty('--cursor-color-2', randomPair[1]);
        } else {
          setCursorTooltip('With this cursor you can interact with dashboard');
        }
      }
    };

    const handleMouseLeave = (e: Event) => {
      setCursorPosition({ x: -100, y: -100 });
      setCursorTooltip('With this cursor you can interact with dashboard');
    };

    const section = document.querySelector('.platform-preview-wrapper');
    if (section) {
      section.addEventListener('mousemove', handleMouseMove as EventListener);
      section.addEventListener('mouseleave', handleMouseLeave as EventListener);
    }

    return () => {
      if (section) {
        section.removeEventListener('mousemove', handleMouseMove as EventListener);
        section.removeEventListener('mouseleave', handleMouseLeave as EventListener);
      }
    };
  }, []);

  return (
    <section className="py-24 relative platform-preview-wrapper">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center justify-center rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-600 ring-1 ring-inset ring-indigo-500/20 mb-6">
            <Braces className="w-4 h-4 mr-2" />
            Powerful Learning Tools
          </div>
          <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-500">
            Experience Smart Learning
          </h2>
          <p className="text-xl text-gray-600">
            Our intuitive interface combines powerful AI features with an elegant design 
            to make your learning journey seamless and effective.
          </p>
        </div>

        <div className="relative max-w-[1200px] mx-auto">
          {/* Platform Interface Preview */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white">
            {/* Browser-like Top Bar */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                {["bg-red-400", "bg-yellow-400", "bg-green-400"].map((color, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${color}`}></div>
                ))}
              </div>
              <div className="flex-1 text-center">
                <div className="inline-flex items-center px-3 py-1 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 font-mono">
                  platform.moxium.ai
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="h-[800px] bg-gray-50">
              <div className="h-full w-full overflow-auto">
                <FullDashboard />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div 
        id="custom-cursor" 
        style={{ 
          transform: `translate(${cursorPosition.x}px, ${cursorPosition.y}px)`,
          opacity: cursorPosition.x < 0 ? 0 : 1,
          '--content': `'${cursorTooltip}'`
        } as React.CSSProperties} 
      />
    </section>
  );
}
