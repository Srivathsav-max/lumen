import { ColorOption } from './color_option';

// Color utility functions
const colorToHex = (color: string): string => {
  // Convert color names or other formats to hex
  // This is a simplified implementation
  const colorMap: Record<string, string> = {
    'grey': '#808080',
    'gray': '#808080',
    'brown': '#A52A2A',
    'yellow': '#FFFF00',
    'green': '#008000',
    'blue': '#0000FF',
    'purple': '#800080',
    'pink': '#FFC0CB',
    'red': '#FF0000',
  };
  
  return colorMap[color.toLowerCase()] || color;
};

const addAlpha = (hex: string, alpha: number): string => {
  // Convert hex color to rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Default text color options when no option is provided
 * - support
 *   - desktop
 *   - web
 *   - mobile
 */
export function generateTextColorOptions(): ColorOption[] {
  return [
    {
      colorHex: colorToHex('grey'),
      name: 'Gray',
    },
    {
      colorHex: colorToHex('brown'),
      name: 'Brown',
    },
    {
      colorHex: colorToHex('yellow'),
      name: 'Yellow',
    },
    {
      colorHex: colorToHex('green'),
      name: 'Green',
    },
    {
      colorHex: colorToHex('blue'),
      name: 'Blue',
    },
    {
      colorHex: colorToHex('purple'),
      name: 'Purple',
    },
    {
      colorHex: colorToHex('pink'),
      name: 'Pink',
    },
    {
      colorHex: colorToHex('red'),
      name: 'Red',
    },
  ];
}

/**
 * Default background color options when no option is provided
 * - support
 *   - desktop
 *   - web
 *   - mobile
 */
export function generateHighlightColorOptions(): ColorOption[] {
  return [
    {
      colorHex: addAlpha(colorToHex('grey'), 0.3),
      name: 'Gray Background',
    },
    {
      colorHex: addAlpha(colorToHex('brown'), 0.3),
      name: 'Brown Background',
    },
    {
      colorHex: addAlpha(colorToHex('yellow'), 0.3),
      name: 'Yellow Background',
    },
    {
      colorHex: addAlpha(colorToHex('green'), 0.3),
      name: 'Green Background',
    },
    {
      colorHex: addAlpha(colorToHex('blue'), 0.3),
      name: 'Blue Background',
    },
    {
      colorHex: addAlpha(colorToHex('purple'), 0.3),
      name: 'Purple Background',
    },
    {
      colorHex: addAlpha(colorToHex('pink'), 0.3),
      name: 'Pink Background',
    },
    {
      colorHex: addAlpha(colorToHex('red'), 0.3),
      name: 'Red Background',
    },
  ];
}