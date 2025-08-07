"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Palette, Check, X } from "lucide-react";

export interface ColorOption {
  name: string;
  value: string;
  category?: string;
}

interface ColorPaletteProps {
  selectedColor?: string;
  onColorSelect: (color: string | null) => void;
  colors?: ColorOption[];
  showClearButton?: boolean;
  trigger?: React.ReactNode;
  className?: string;
}

const DEFAULT_COLORS: ColorOption[] = [
  // Text Colors
  { name: "Default", value: "", category: "text" },
  { name: "Gray", value: "#6b7280", category: "text" },
  { name: "Red", value: "#dc2626", category: "text" },
  { name: "Orange", value: "#ea580c", category: "text" },
  { name: "Yellow", value: "#ca8a04", category: "text" },
  { name: "Green", value: "#16a34a", category: "text" },
  { name: "Blue", value: "#2563eb", category: "text" },
  { name: "Purple", value: "#9333ea", category: "text" },
  { name: "Pink", value: "#db2777", category: "text" },
  
  // Background Colors
  { name: "Clear", value: "", category: "background" },
  { name: "Light Gray", value: "#f3f4f6", category: "background" },
  { name: "Light Red", value: "#fef2f2", category: "background" },
  { name: "Light Orange", value: "#fff7ed", category: "background" },
  { name: "Light Yellow", value: "#fefce8", category: "background" },
  { name: "Light Green", value: "#f0fdf4", category: "background" },
  { name: "Light Blue", value: "#eff6ff", category: "background" },
  { name: "Light Purple", value: "#faf5ff", category: "background" },
  { name: "Light Pink", value: "#fdf2f8", category: "background" },
  
  // Highlight Colors
  { name: "Yellow Highlight", value: "#fef08a", category: "highlight" },
  { name: "Green Highlight", value: "#bbf7d0", category: "highlight" },
  { name: "Blue Highlight", value: "#bfdbfe", category: "highlight" },
  { name: "Orange Highlight", value: "#fed7aa", category: "highlight" },
  { name: "Pink Highlight", value: "#fce7f3", category: "highlight" },
  { name: "Purple Highlight", value: "#e9d5ff", category: "highlight" },
  { name: "Cyan Highlight", value: "#a5f3fc", category: "highlight" },
  { name: "Lime Highlight", value: "#d9f99d", category: "highlight" },
];

export function ColorPalette({
  selectedColor,
  onColorSelect,
  colors = DEFAULT_COLORS,
  showClearButton = true,
  trigger,
  className = "",
}: ColorPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorSelect = (color: string | null) => {
    onColorSelect(color);
    setIsOpen(false);
  };

  const renderColorButton = (color: ColorOption) => {
    const isSelected = selectedColor === color.value;
    const isEmpty = !color.value;
    
    return (
      <Button
        key={`${color.category}-${color.value}`}
        variant="ghost"
        className={`
          h-8 w-8 p-0 rounded-md border-2 transition-all duration-200
          ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}
          ${isEmpty ? 'border-dashed' : ''}
        `}
        style={{
          backgroundColor: color.value || 'transparent',
        }}
        onClick={() => handleColorSelect(color.value || null)}
        title={color.name}
      >
        {isSelected && (
          <Check className="h-3 w-3 text-primary" />
        )}
        {isEmpty && !isSelected && (
          <X className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
    );
  };

  const groupedColors = colors.reduce((acc, color) => {
    const category = color.category || 'default';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(color);
    return acc;
  }, {} as Record<string, ColorOption[]>);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className={className}>
      <Palette className="h-4 w-4" />
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {Object.entries(groupedColors).map(([category, categoryColors]) => (
            <div key={category}>
              <h4 className="text-sm font-medium mb-2 capitalize">
                {category === 'text' ? 'Text Colors' : 
                 category === 'background' ? 'Background Colors' :
                 category === 'highlight' ? 'Highlight Colors' : 
                 category}
              </h4>
              <div className="grid grid-cols-9 gap-2">
                {categoryColors.map(renderColorButton)}
              </div>
            </div>
          ))}
          
          {showClearButton && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleColorSelect(null)}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Color
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Export predefined color sets for different use cases
export const TEXT_COLORS: ColorOption[] = DEFAULT_COLORS.filter(c => c.category === 'text');
export const BACKGROUND_COLORS: ColorOption[] = DEFAULT_COLORS.filter(c => c.category === 'background');
export const HIGHLIGHT_COLORS: ColorOption[] = DEFAULT_COLORS.filter(c => c.category === 'highlight');

// Utility function to convert hex to rgba
export function hexToRgba(hex: string, alpha: number = 1): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Utility function to determine if a color is light or dark
export function isLightColor(hex: string): boolean {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return true;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
