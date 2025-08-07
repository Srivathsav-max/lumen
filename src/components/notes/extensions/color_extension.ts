// Color extension for RGBA string parsing and conversion
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class ColorExtension {
  /**
   * Try to parse the `rgba(red, green, blue, alpha)` from the string.
   */
  static tryFromRgbaString(colorString: string): Color | null {
    const reg = /rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/;
    const match = reg.exec(colorString);
    
    if (!match || match.length < 5) {
      return null;
    }

    const red = parseInt(match[1]);
    const green = parseInt(match[2]);
    const blue = parseInt(match[3]);
    const alpha = parseInt(match[4]);

    if (isNaN(red) || isNaN(green) || isNaN(blue) || isNaN(alpha)) {
      return null;
    }

    return {
      r: red / 255,
      g: green / 255,
      b: blue / 255,
      a: alpha / 255
    };
  }

  static toRgbaString(color: Color): string {
    const alpha = Math.round(color.a * 255);
    const red = Math.round(color.r * 255);
    const green = Math.round(color.g * 255);
    const blue = Math.round(color.b * 255);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  static fromARGB(alpha: number, red: number, green: number, blue: number): Color {
    return {
      r: red / 255,
      g: green / 255,
      b: blue / 255,
      a: alpha / 255
    };
  }
}