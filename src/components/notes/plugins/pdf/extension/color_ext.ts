// PDF color extension utilities for color conversion
export interface PdfColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  toRgbaString(): string;
}

export class ColorExt {
  /**
   * Create a PdfColor from an RGBA string
   * @param colorString RGBA string in format "rgba(r, g, b, a)"
   * @returns PdfColor object or null if parsing fails
   */
  static fromRgbaString(colorString: string): PdfColor | null {
    const regex = /rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/;
    const match = regex.exec(colorString);

    if (!match || match.length < 5) {
      return null;
    }

    const redColor = match[1];
    const greenColor = match[2];
    const blueColor = match[3];
    const alphaColor = match[4];

    const red = redColor ? parseInt(redColor, 10) : null;
    const green = greenColor ? parseInt(greenColor, 10) : null;
    const blue = blueColor ? parseInt(blueColor, 10) : null;
    const alpha = alphaColor ? parseInt(alphaColor, 10) : null;

    if (red === null || green === null || blue === null || alpha === null) {
      return null;
    }

    return new PdfColorImpl(
      rgbaToHex(red, green, blue, { opacity: alpha })
    );
  }
}

class PdfColorImpl implements PdfColor {
  private hexValue: number;

  constructor(hexValue: number) {
    this.hexValue = hexValue;
  }

  get red(): number {
    return (this.hexValue >> 16) & 0xFF;
  }

  get green(): number {
    return (this.hexValue >> 8) & 0xFF;
  }

  get blue(): number {
    return this.hexValue & 0xFF;
  }

  get alpha(): number {
    return (this.hexValue >> 24) & 0xFF;
  }

  toRgbaString(): string {
    return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`;
  }
}

/**
 * Convert RGBA values to hex integer
 * @param red Red component (0-255)
 * @param green Green component (0-255)
 * @param blue Blue component (0-255)
 * @param options Options object with opacity
 * @returns Hex integer representation
 */
export function rgbaToHex(
  red: number, 
  green: number, 
  blue: number, 
  options: { opacity?: number } = {}
): number {
  const { opacity = 1 } = options;
  
  // Clamp values to valid ranges
  red = Math.abs(red);
  green = Math.abs(green);
  blue = Math.abs(blue);
  let normalizedOpacity = Math.abs(opacity);
  
  // Normalize opacity to 0-255 range
  normalizedOpacity = normalizedOpacity > 1 ? 255 : normalizedOpacity * 255;
  
  // Clamp color values to 0-255
  red = Math.min(red, 255);
  green = Math.min(green, 255);
  blue = Math.min(blue, 255);
  
  const alpha = Math.round(normalizedOpacity);

  // Convert to hex string and then parse as integer
  const hexString = `0x${alpha.toString(16).padStart(2, '0')}${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
  
  return parseInt(hexString, 16);
}