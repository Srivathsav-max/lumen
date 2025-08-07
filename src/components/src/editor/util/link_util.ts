// URL validation utility functions

export function isUri(text: string): boolean {
  const lowerText = text.toLowerCase();
  return isURL(text) ||
         isCustomUrl(text) ||
         lowerText.startsWith('mailto:') ||
         lowerText.startsWith('file:');
}

/**
 * Check if text is a valid URL using basic validation
 */
export function isURL(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    // Try with http:// prefix for URLs without protocol
    try {
      new URL(`http://${text}`);
      // Additional check to ensure it looks like a domain
      return /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})/.test(text);
    } catch {
      return false;
    }
  }
}

/**
 * Return true if the text looks like [xxx://xxx]
 */
export function isCustomUrl(text: string): boolean {
  return customUrlRegex.test(text);
}

const customUrlRegex = /^[a-zA-Z0-9]+:\/\/[^\/\s].*/i;