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

interface Connection {
  from: string;
  y1: string;
  to: string;
  y2: string;
  relationshipStrength: number;
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

  const connections: Connection[] = [
    { from: '25%', y1: '33%', to: '50%', y2: '25%', relationshipStrength: 85 },
    { from: '25%', y1: '33%', to: '33%', y2: '67%', relationshipStrength: 72 },
    { from: '50%', y1: '25%', to: '67%', y2: '33%', relationshipStrength: 91 },
    { from: '33%', y1: '67%', to: '50%', y2: '67%', relationshipStrength: 64 },
  ];

  // Function to calculate midpoint between two points
  const getMidpoint = (x1: string, y1: string, x2: string, y2: string) => {
    const x1Num = parseFloat(x1);
    const y1Num = parseFloat(y1);
    const x2Num = parseFloat(x2);
    const y2Num = parseFloat(y2);
    
    return {
      x: `${(x1Num + x2Num) / 2}%`,
      y: `${(y1Num + y2Num) / 2}%`
    };
  };

  // Generate colors based on relationship strength
  const getConnectionColor = (strength: number) => {
    if (strength >= 85) return "#4F46E5"; // Strong - Indigo
    if (strength >= 70) return "#7C3AED"; // Medium - Purple
    if (strength >= 50) return "#2563EB"; // Weak - Blue
    return "#9CA3AF"; // Very weak - Gray
  };

  return (
    <div className="h-full bg-slate-900 rounded-lg relative">
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid Background */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: 'center center'
          }}
        />
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px',
            backgroundPosition: 'center center'
          }}
        />

        {/* Connection Lines - Molecular Style */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            {/* Glossy gradient for nodes */}
            <radialGradient id="glossyIndigo" cx="50%" cy="30%" r="70%" fx="50%" fy="30%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#4338CA" />
            </radialGradient>
            <radialGradient id="glossyPurple" cx="50%" cy="30%" r="70%" fx="50%" fy="30%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#7E22CE" />
            </radialGradient>
            <radialGradient id="glossyBlue" cx="50%" cy="30%" r="70%" fx="50%" fy="30%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </radialGradient>
            <radialGradient id="glossyGreen" cx="50%" cy="30%" r="70%" fx="50%" fy="30%">
              <stop offset="0%" stopColor="#86EFAC" />
              <stop offset="100%" stopColor="#16A34A" />
            </radialGradient>
            <radialGradient id="glossyYellow" cx="50%" cy="30%" r="70%" fx="50%" fy="30%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
            
            {/* Glow filter for active nodes */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Molecular Bonds */}
          {connections.map((conn, i) => {
            // Get color based on relationship strength
            const connectionColor = getConnectionColor(conn.relationshipStrength);
            
            return (
              <g key={i}>
                {/* Molecular bond line */}
                <line
                  x1={conn.from}
                  y1={conn.y1}
                  x2={conn.to}
                  y2={conn.y2}
                  stroke={connectionColor}
                  strokeWidth="3"
                  strokeOpacity="0.7"
                  strokeLinecap="round"
                />
                
                {/* Secondary molecular bond line (for molecular double-bond effect) */}
                <line
                  x1={conn.from}
                  y1={conn.y1}
                  x2={conn.to}
                  y2={conn.y2}
                  stroke={connectionColor}
                  strokeWidth="1"
                  strokeOpacity="0.3"
                  strokeLinecap="round"
                  strokeDasharray="5,5"
                />
                
                {/* Relationship percentage indicator */}
                {(() => {
                  const midpoint = getMidpoint(conn.from, conn.y1, conn.to, conn.y2);
                  return (
                    <g transform={`translate(${midpoint.x}, ${midpoint.y})`}>
                      {/* Background circle */}
                      <circle
                        r="14"
                        fill={connectionColor}
                        opacity="0.8"
                      />
                      
                      {/* Highlight effect on circle */}
                      <circle
                        r="12"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.3)"
                        strokeWidth="2"
                      />
                      
                      {/* Percentage text */}
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {conn.relationshipStrength}%
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>

        {/* Molecular Nodes */}
        {nodes.map((node) => {
          // Determine size in pixels for SVG elements
          const sizeMatch = node.size.match(/w-(\d+)/);
          const nodeSize = sizeMatch ? parseInt(sizeMatch[1]) * 4 : 64; // Default to 64px if not found
          
          // Get gradient ID based on node color
          const gradientId = `glossy${node.color.charAt(0).toUpperCase() + node.color.slice(1)}`;
                  
          return (
            <div
              key={node.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: node.position.x, top: node.position.y }}
              onClick={() => setActiveNode(node.id)}
            >
              {/* SVG for glossy molecular node */}
              <svg width={nodeSize} height={nodeSize} viewBox={`0 0 ${nodeSize} ${nodeSize}`}>
                {/* Main circle */}
                <circle
                  cx={nodeSize/2}
                  cy={nodeSize/2}
                  r={nodeSize/2 - 2}
                  fill={`url(#${gradientId})`}
                  filter={activeNode === node.id ? "url(#glow)" : ""}
                />
                
                {/* Highlight effect */}
                <ellipse
                  cx={nodeSize/2}
                  cy={nodeSize/3}
                  rx={nodeSize/3}
                  ry={nodeSize/6}
                  fill="rgba(255, 255, 255, 0.3)"
                />
                
                {/* Ring for active node */}
                {activeNode === node.id && (
                  <circle
                    cx={nodeSize/2}
                    cy={nodeSize/2}
                    r={nodeSize/2 + 4}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    className="animate-spin-slow"
                    style={{ animationDuration: '20s' }}
                  />
                )}
              </svg>
              
              {/* Title below the node */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center">
                <span className="px-2 py-1 rounded-full bg-gray-800 bg-opacity-70 text-white text-xs whitespace-nowrap">
                  {node.title}
                </span>
              </div>
              
              {/* Mastery Indicator */}
              <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 border-2 border-gray-700 shadow-lg">
                  <span className="text-xs font-bold text-white">{node.mastery}%</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Node Info Panel */}
        {activeNode && (
          <div className="absolute top-4 right-4 w-72 bg-gray-900 bg-opacity-80 backdrop-blur-md rounded-xl shadow-lg p-4 border border-gray-700 text-white animate-fadeIn">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-white">
                {nodes.find(n => n.id === activeNode)?.title}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-300"
                onClick={() => setActiveNode(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Mastery Progress with animated bar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">Mastery Level</span>
                  <span className="text-sm font-medium text-white">
                    {nodes.find(n => n.id === activeNode)?.mastery}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`bg-${nodes.find(n => n.id === activeNode)?.color}-500 h-2 rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${nodes.find(n => n.id === activeNode)?.mastery}%` }}
                  ></div>
                </div>
              </div>

              {/* Related Content */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Recommended Content</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Advanced Concepts</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200">
                    <PlayCircle className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Video Tutorials</span>
                  </div>
                </div>
              </div>
              
              <button className={`w-full px-4 py-2 bg-${nodes.find(n => n.id === activeNode)?.color}-600 text-white rounded-lg text-sm font-medium hover:bg-${nodes.find(n => n.id === activeNode)?.color}-700 transition-colors duration-200 shadow-md`}>
                Study This Concept
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-80 backdrop-blur-md rounded-lg shadow-md p-2 flex gap-2 border border-gray-700">
        <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-700 transition-colors duration-200 text-gray-300 hover:text-white">
          <Filter className="w-5 h-5" />
        </button>
        <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-700 transition-colors duration-200 text-gray-300 hover:text-white">
          <Network className="w-5 h-5" />
        </button>
        <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-700 transition-colors duration-200 text-gray-300 hover:text-white">
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      {/* Custom style for slow spin animation */}
      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};