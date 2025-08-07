// Theme extension utilities for accessing theme extensions
export interface ThemeData {
  extensions: Map<string, any>;
}

export class ThemeExtension {
  /**
   * Safely get a theme extension by type, returning null if not found
   * @param theme The theme data to search
   * @param extensionKey The key/type of the extension to retrieve
   * @returns The extension if found, null otherwise
   */
  static extensionOrNull<T>(theme: ThemeData, extensionKey: string): T | null {
    if (theme.extensions.has(extensionKey)) {
      return theme.extensions.get(extensionKey) as T;
    }
    return null;
  }

  /**
   * Check if a theme has a specific extension
   * @param theme The theme data to check
   * @param extensionKey The key/type of the extension to check for
   * @returns True if the extension exists
   */
  static hasExtension(theme: ThemeData, extensionKey: string): boolean {
    return theme.extensions.has(extensionKey);
  }
}