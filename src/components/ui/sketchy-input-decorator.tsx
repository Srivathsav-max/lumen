"use client";

import React from "react";

interface SketchyInputDecoratorProps {
  className?: string;
}

export const SketchyInputDecorator: React.FC<SketchyInputDecoratorProps> = ({
  className = "",
}) => {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.1 }}
      >
        {/* Sketchy border */}
        <path
          d="M5,5 
             C7,3 10,2 15,2 
             L85,2 
             C90,2 93,3 95,5 
             C97,7 98,10 98,15 
             L98,85 
             C98,90 97,93 95,95 
             C93,97 90,98 85,98 
             L15,98 
             C10,98 7,97 5,95 
             C3,93 2,90 2,85 
             L2,15 
             C2,10 3,7 5,5 Z"
          stroke="#333"
          fill="none"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeDasharray="2,1"
        />
        
        {/* Pencil strokes */}
        <line
          x1="10"
          y1="30"
          x2="90"
          y2="30"
          stroke="#333"
          strokeWidth="0.2"
          strokeDasharray="1,2"
        />
        <line
          x1="10"
          y1="50"
          x2="90"
          y2="50"
          stroke="#333"
          strokeWidth="0.2"
          strokeDasharray="0.5,1.5"
        />
        <line
          x1="10"
          y1="70"
          x2="90"
          y2="70"
          stroke="#333"
          strokeWidth="0.2"
          strokeDasharray="0.8,1.2"
        />
        
        {/* Corner embellishments */}
        <path
          d="M5 5 C3 10, 10 3, 15 5"
          stroke="#333"
          fill="none"
          strokeWidth="0.3"
        />
        <path
          d="M95 5 C97 10, 90 3, 85 5"
          stroke="#333"
          fill="none"
          strokeWidth="0.3"
        />
        <path
          d="M5 95 C3 90, 10 97, 15 95"
          stroke="#333"
          fill="none"
          strokeWidth="0.3"
        />
        <path
          d="M95 95 C97 90, 90 97, 85 95"
          stroke="#333"
          fill="none"
          strokeWidth="0.3"
        />
      </svg>
    </div>
  );
};

export default SketchyInputDecorator;
