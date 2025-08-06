import { Delta } from '../../core/document/text_delta';

export class DeltaUtil {
  /// Checks if two deltas are equal
  static isEqual(delta1: Delta, delta2: Delta): boolean {
    return delta1.equals(delta2);
  }

  /// Merges multiple deltas into one
  static merge(deltas: Delta[]): Delta {
    if (deltas.length === 0) return new Delta();
    if (deltas.length === 1) return deltas[0];
    
    return deltas.reduce((acc, delta) => acc.compose(delta));
  }

  /// Gets the plain text from a delta
  static toPlainText(delta: Delta): string {
    return delta.toPlainText();
  }

  /// Checks if a delta is empty (no operations or only empty inserts)
  static isEmpty(delta: Delta): boolean {
    if (delta.operations.length === 0) return true;
    
    const plainText = delta.toPlainText();
    return plainText.trim().length === 0;
  }

  /// Gets the length of text in a delta
  static getLength(delta: Delta): number {
    return delta.length;
  }

  /// Slices a delta between two indices
  static slice(delta: Delta, start: number, end?: number): Delta {
    return delta.slice(start, end);
  }

  /// Inverts a delta against a base delta
  static invert(delta: Delta, base: Delta): Delta {
    return delta.invert(base);
  }

  /// Transforms a delta against another delta
  static transform(delta: Delta, other: Delta, priority: boolean = false): Delta {
    // This would need a proper operational transform implementation
    // For now, returning the original delta
    return delta;
  }
}