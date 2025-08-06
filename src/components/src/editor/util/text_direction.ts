export enum TextDirection {
  ltr = 'ltr',
  rtl = 'rtl',
  auto = 'auto'
}

export class TextDirectionUtil {
  /// Detects the text direction based on the content
  static detectTextDirection(text: string): TextDirection {
    if (!text || text.trim().length === 0) {
      return TextDirection.auto;
    }

    // Simple RTL detection based on Unicode ranges
    const rtlChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const ltrChars = /[A-Za-z]/;

    const rtlCount = (text.match(rtlChars) || []).length;
    const ltrCount = (text.match(ltrChars) || []).length;

    if (rtlCount > ltrCount) {
      return TextDirection.rtl;
    } else if (ltrCount > rtlCount) {
      return TextDirection.ltr;
    }

    return TextDirection.auto;
  }

  /// Converts TextDirection enum to CSS direction value
  static toCssDirection(direction: TextDirection): string {
    switch (direction) {
      case TextDirection.ltr:
        return 'ltr';
      case TextDirection.rtl:
        return 'rtl';
      case TextDirection.auto:
        return 'auto';
      default:
        return 'auto';
    }
  }

  /// Converts string to TextDirection enum
  static fromString(direction: string): TextDirection {
    switch (direction.toLowerCase()) {
      case 'ltr':
        return TextDirection.ltr;
      case 'rtl':
        return TextDirection.rtl;
      case 'auto':
        return TextDirection.auto;
      default:
        return TextDirection.auto;
    }
  }

  /// Checks if the text direction is RTL
  static isRtl(direction: TextDirection): boolean {
    return direction === TextDirection.rtl;
  }

  /// Checks if the text direction is LTR
  static isLtr(direction: TextDirection): boolean {
    return direction === TextDirection.ltr;
  }

  /// Gets the opposite direction
  static opposite(direction: TextDirection): TextDirection {
    switch (direction) {
      case TextDirection.ltr:
        return TextDirection.rtl;
      case TextDirection.rtl:
        return TextDirection.ltr;
      case TextDirection.auto:
        return TextDirection.auto;
      default:
        return TextDirection.auto;
    }
  }
}