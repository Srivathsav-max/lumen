"use client";

import React, { useState } from 'react';
import { TechnologyTab } from './features/technology-tab';
import { FeaturesTab } from './features/features-tab';
import { WorkflowTab } from './features/workflow-tab';

export const FeaturesSection = () => {
  const [activeTab, setActiveTab] = useState('features');

  return (
    <div className="relative min-h-screen bg-white isolate">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white -z-20"></div>
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-grid-black/[0.02] -z-20"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full bg-white bg-opacity-60 backdrop-blur-3xl -z-10"></div>
        </div>
      </div>
      
      {/* Content */}
      <div className="relative">
        {/* Navigation Tabs */}
        <div className="relative bg-white/80 backdrop-blur-sm border-b border-gray-200 z-10">
          <div className="container mx-auto px-4">
            <div className="flex space-x-1 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('features')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === 'features' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Key Features
              </button>
              <button 
                onClick={() => setActiveTab('workflow')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === 'workflow' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Workflow
              </button>
              <button 
                onClick={() => setActiveTab('technology')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === 'technology' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Core Technology
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="py-12">
          <div className="container mx-auto px-4">
            {activeTab === 'features' && <FeaturesTab />}
            {activeTab === 'workflow' && <WorkflowTab />}
            {activeTab === 'technology' && <TechnologyTab />}
          </div>
        </main>
      </div>
    </div>
  );
};
