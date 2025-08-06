export class ColorUtil {
  /// Converts a hex color string to RGB values
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /// Converts RGB values to a hex color string
  static rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /// Converts a hex color to RGBA with alpha
  static hexToRgba(hex: string, alpha: number = 1): string {
    const rgb = ColorUtil.hexToRgb(hex);
    if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  /// Checks if a color is considered "light"
  static isLightColor(hex: string): boolean {
    const rgb = ColorUtil.hexToRgb(hex);
    if (!rgb) return false;
    
    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5;
  }

  /// Gets a contrasting color (black or white) for the given color
  static getContrastingColor(hex: string): string {
    return ColorUtil.isLightColor(hex) ? '#000000' : '#ffffff';
  }
}