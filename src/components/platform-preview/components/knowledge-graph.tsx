"use client";

import React, { useState } from 'react';
import { Network, X, PlayCircle, BookOpen, ChevronRight, Filter, Sparkles } from 'lucide-react';

interface Node {
  id: string;
  title: string;
  mastery: number;
  color: string;
  position: { x: string; y: string };
  size: string;
}

export const KnowledgeGraph = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('graph');
  
  const nodes: Node[] = [
    {
      id: 'ml',
      title: 'Machine Learning',
      mastery: 92,
      color: 'indigo',
      position: { x: '25%', y: '33%' },
      size: 'w-20 h-20'
    },
    {
      id: 'deep-learning',
      title: 'Deep Learning',
      mastery: 85,
      color: 'purple',
      position: { x: '50%', y: '25%' },
      size: 'w-16 h-16'
    },
    {
      id: 'neural-networks',
      title: 'Neural Networks',
      mastery: 78,
      color: 'blue',
      position: { x: '67%', y: '33%' },
      size: 'w-18 h-18'
    },
    {
      id: 'reinforcement',
      title: 'Reinforcement Learning',
      mastery: 62,
      color: 'green',
      position: { x: '33%', y: '67%' },
      size: 'w-16 h-16'
    },
    {
      id: 'nlp',
      title: 'NLP',
      mastery: 66,
      color: 'yellow',
      position: { x: '50%', y: '67%' },
      size: 'w-14 h-14'
    }
  ];

  const connections = [
    { from: '25%', y1: '33%', to: '50%', y2: '25%' },
    { from: '25%', y1: '33%', to: '33%', y2: '67%' },
    { from: '50%', y1: '25%', to: '67%', y2: '33%' },
    { from: '33%', y1: '67%', to: '50%', y2: '67%' },
  ];

  return (
    <div className="h-full bg-gray-50 rounded-lg relative">
      <div className="absolute inset-0 overflow-hidden">
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn, i) => (
            <line
              key={i}
              x1={conn.from}
              y1={conn.y1}
              x2={conn.to}
              y2={conn.y2}
              stroke="#a8b1ff"
              strokeWidth="2"
            />
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: node.position.x, top: node.position.y }}
            onClick={() => setActiveNode(node.id)}
          >
            <div className={`${node.size} rounded-full flex items-center justify-center text-sm font-medium 
              ${activeNode === node.id 
                ? `bg-${node.color}-600 text-white ring-4 ring-${node.color}-200` 
                : `bg-${node.color}-100 text-${node.color}-800 hover:bg-${node.color}-200`}`}
            >
              <span className="text-center px-2">{node.title}</span>
            </div>
            {/* Mastery Indicator */}
            <div className="absolute transform translate-x-8 -translate-y-8">
              <div className={`px-2 py-1 rounded-full bg-${node.color}-100 text-${node.color}-800 text-xs`}>
                {node.mastery}% Mastery
              </div>
            </div>
          </div>
        ))}

        {/* Node Info Panel */}
        {activeNode && (
          <div className="absolute top-4 right-4 w-72 bg-white rounded-xl shadow-lg p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {nodes.find(n => n.id === activeNode)?.title}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setActiveNode(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Mastery Progress */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-500">Mastery Level</span>
                  <span className="text-sm font-medium text-gray-900">
                    {nodes.find(n => n.id === activeNode)?.mastery}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-indigo-600 h-1.5 rounded-full" 
                    style={{ width: `${nodes.find(n => n.id === activeNode)?.mastery}%` }}
                  ></div>
                </div>
              </div>

              {/* Related Content */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Content</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm">Advanced Concepts</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <PlayCircle className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm">Video Tutorials</span>
                  </div>
                </div>
              </div>
              
              <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                Study This Concept
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md p-2 flex gap-2">
        <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-100">
          <Filter className="w-5 h-5 text-gray-600" />
        </button>
        <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-100">
          <Network className="w-5 h-5 text-gray-600" />
        </button>
        <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-100">
          <Sparkles className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};
