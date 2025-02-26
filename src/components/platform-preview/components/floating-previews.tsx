"use client";

import React from 'react';
import { BrainCircuit, Network, LineChart } from 'lucide-react';

export const FloatingPreviews = () => {
  return (
    <div className="absolute inset-0">
      {/* Knowledge Graph Card */}
      <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg animate-float">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Knowledge Graph</h4>
            <p className="text-sm text-gray-500">Dynamic concept mapping</p>
          </div>
        </div>
      </div>

      {/* Analytics Card */}
      <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg animate-float" style={{ animationDelay: "1s" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Learning Analytics</h4>
            <p className="text-sm text-gray-500">Real-time progress tracking</p>
          </div>
        </div>
      </div>

      {/* AI Assistant Hint */}
      <div className="absolute top-1/2 right-12 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg animate-float" style={{ animationDelay: "2s" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">AI Assistant</h4>
            <p className="text-sm text-gray-500">Personalized guidance</p>
          </div>
        </div>
      </div>
    </div>
  );
};
