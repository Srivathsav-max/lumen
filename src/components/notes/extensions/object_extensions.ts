// Object extension utilities for type checking and unwrapping
export class FlowyObjectExtensions {
  /**
   * Safely unwrap an object to a specific type, returning null if the cast fails
   * @param obj The object to unwrap
   * @returns The object cast to type T, or null if the cast fails
   */
  static unwrapOrNull<T>(obj: any): T | null {
    if (obj != null && typeof obj === 'object') {
      return obj as T;
    }
    return null;
  }

  /**
   * Check if an object is of a specific type
   * @param obj The object to check
   * @param typeCheck A function that returns true if the object is of the expected type
   * @returns True if the object matches the type check
   */
  static isType<T>(obj: any, typeCheck: (obj: any) => obj is T): obj is T {
    return typeCheck(obj);
  }
}