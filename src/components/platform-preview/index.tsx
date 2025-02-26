"use client";

import React from 'react';
import './styles.css';
import { Braces } from 'lucide-react';
import { FullDashboard } from './components/dashboard';

export function PlatformPreviewSection() {
  return (
    <section className="py-24 relative">
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
    </section>
  );
}
