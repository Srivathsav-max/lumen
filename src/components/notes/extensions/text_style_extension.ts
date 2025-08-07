// Text style and span extension utilities
export interface TextStyle {
  inherit?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  letterSpacing?: number;
  wordSpacing?: number;
  textBaseline?: string;
  height?: number;
  leadingDistribution?: string;
  locale?: string;
  foreground?: any;
  background?: any;
  shadows?: any[];
  fontFeatures?: any[];
  fontVariations?: any[];
  decoration?: string[];
  decorationColor?: string;
  decorationStyle?: string;
  decorationThickness?: number;
  debugLabel?: string;
  fontFamily?: string;
  fontFamilyFallback?: string[];
  overflow?: string;
}

export interface InlineSpan {
  type: 'text' | 'widget';
}

export interface TextSpan extends InlineSpan {
  type: 'text';
  text?: string;
  style?: TextStyle;
  children?: InlineSpan[];
  recognizer?: any;
  semanticsLabel?: string;
}

export class TextSpanExtensions {
  /**
   * Create a copy of TextSpan with updated properties
   */
  static copyWith(
    span: TextSpan,
    options: {
      text?: string;
      style?: TextStyle;
      children?: InlineSpan[];
      recognizer?: any;
      semanticsLabel?: string;
    } = {}
  ): TextSpan {
    return {
      type: 'text',
      text: options.text ?? span.text,
      style: options.style ?? span.style,
      children: options.children ?? span.children,
      recognizer: options.recognizer ?? span.recognizer,
      semanticsLabel: options.semanticsLabel ?? span.semanticsLabel
    };
  }

  /**
   * Update text style recursively through the span tree
   */
  static updateTextStyle(span: TextSpan, other?: TextStyle): TextSpan {
    if (!other) {
      return span;
    }

    return this.copyWith(span, {
      style: span.style ? TextStyleExtensions.combine(span.style, other) : other,
      children: span.children?.map((child) => {
        if (child.type === 'text') {
          return this.updateTextStyle(child as TextSpan, other);
        }
        return child;
      })
    });
  }
}

export class TextStyleExtensions {
  /**
   * Combine two text styles, with the other style taking precedence
   */
  static combine(base: TextStyle, other?: TextStyle): TextStyle {
    if (!other) {
      return base;
    }

    if (other.inherit === false) {
      return other;
    }

    return {
      inherit: other.inherit ?? base.inherit,
      color: other.color ?? base.color,
      backgroundColor: other.backgroundColor ?? base.backgroundColor,
      fontSize: other.fontSize ?? base.fontSize,
      fontWeight: other.fontWeight ?? base.fontWeight,
      fontStyle: other.fontStyle ?? base.fontStyle,
      letterSpacing: other.letterSpacing ?? base.letterSpacing,
      wordSpacing: other.wordSpacing ?? base.wordSpacing,
      textBaseline: other.textBaseline ?? base.textBaseline,
      height: other.height ?? base.height,
      leadingDistribution: other.leadingDistribution ?? base.leadingDistribution,
      locale: other.locale ?? base.locale,
      foreground: other.foreground ?? base.foreground,
      background: other.background ?? base.background,
      shadows: other.shadows ?? base.shadows,
      fontFeatures: other.fontFeatures ?? base.fontFeatures,
      fontVariations: other.fontVariations ?? base.fontVariations,
      decoration: this.combineDecorations(base.decoration, other.decoration),
      decorationColor: other.decorationColor ?? base.decorationColor,
      decorationStyle: other.decorationStyle ?? base.decorationStyle,
      decorationThickness: other.decorationThickness ?? base.decorationThickness,
      debugLabel: other.debugLabel ?? base.debugLabel,
      fontFamily: other.fontFamily ?? base.fontFamily,
      fontFamilyFallback: other.fontFamilyFallback ?? base.fontFamilyFallback,
      overflow: other.overflow ?? base.overflow
    };
  }

  private static combineDecorations(
    base?: string[], 
    other?: string[]
  ): string[] | undefined {
    const combined = new Set<string>();
    
    if (base) {
      base.forEach(decoration => combined.add(decoration));
    }
    
    if (other) {
      other.forEach(decoration => combined.add(decoration));
    }
    
    return combined.size > 0 ? Array.from(combined) : undefined;
  }
}