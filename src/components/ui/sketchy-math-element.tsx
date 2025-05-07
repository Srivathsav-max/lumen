"use client";

import React from "react";

interface SketchyMathElementProps {
  className?: string;
  opacity?: number;
  color?: string;
  size?: "sm" | "md" | "lg";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
}

export const SketchyMathElement: React.FC<SketchyMathElementProps> = ({
  className = "",
  opacity = 0.1,
  color = "#333",
  size = "md",
  position = "top-right",
}) => {
  // Calculate dimensions based on size
  const getDimensions = () => {
    switch (size) {
      case "sm": return { width: 100, height: 100 };
      case "lg": return { width: 300, height: 300 };
      default: return { width: 200, height: 200 };
    }
  };

  // Calculate position styles
  const getPositionStyles = () => {
    switch (position) {
      case "top-left": return { top: "-20px", left: "-20px" };
      case "top-right": return { top: "-20px", right: "-20px" };
      case "bottom-left": return { bottom: "-20px", left: "-20px" };
      case "bottom-right": return { bottom: "-20px", right: "-20px" };
      default: return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
  };

  const { width, height } = getDimensions();
  const positionStyles = getPositionStyles();

  return (
    <div 
      className={`absolute z-0 ${className}`} 
      style={{ 
        width, 
        height, 
        ...positionStyles 
      }}
    >
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity }}
      >
        {/* Sketchy shapes */}
        <path 
          d="M20 20 Q25 15, 30 20 T40 20" 
          stroke={color} 
          fill="none" 
          strokeWidth="0.5" 
          strokeLinecap="round" 
          strokeDasharray="1,2"
        />
        <path 
          d="M50 15 L55 25 L45 25 Z" 
          stroke={color} 
          fill="none" 
          strokeWidth="0.5" 
          strokeLinecap="round" 
          strokeDasharray="1,2"
        />
        <ellipse 
          cx="70" 
          cy="20" 
          rx="8" 
          ry="5" 
          stroke={color} 
          fill="none" 
          strokeWidth="0.5" 
          strokeDasharray="2,1"
        />
        
        {/* Mathematical formulas */}
        <text x="10" y="40" fontFamily="monospace" fontSize="3" fill={color}>
          ∫ e^x cos(x) dx = (e^x/2)(sin(x)+cos(x))+C
        </text>
        <text x="50" y="50" fontFamily="monospace" fontSize="3" fill={color}>
          ∇²ψ = (1/c²)(∂²ψ/∂t²)
        </text>
        <text x="15" y="60" fontFamily="monospace" fontSize="3" fill={color}>
          ∑(n=1 to ∞) 1/n² = π²/6
        </text>
        
        {/* More sketchy elements */}
        <path 
          d="M20 70 C30 60, 40 80, 50 70" 
          stroke={color} 
          fill="none" 
          strokeWidth="0.5"
        />
        <path 
          d="M60 65 Q70 55, 80 65 Q70 75, 60 65 Z" 
          stroke={color} 
          fill="none" 
          strokeWidth="0.5"
        />
        
        {/* Advanced formula */}
        <text x="10" y="80" fontFamily="monospace" fontSize="3" fill={color}>
          ∮ B·ds = μ₀(I + ε₀∂Φₑ/∂t)
        </text>
        
        {/* Pencil strokes */}
        <path 
          d="M10 90 L90 90" 
          stroke={color} 
          fill="none" 
          strokeWidth="0.5" 
          strokeLinecap="round" 
          strokeDasharray="1,3"
        />
        <path 
          d="M10 95 L90 95" 
          stroke={color} 
          fill="none" 
          strokeWidth="0.5" 
          strokeLinecap="round" 
          strokeDasharray="2,4"
        />
      </svg>
    </div>
  );
};

export default SketchyMathElement;
