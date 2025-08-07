// URL launcher extension utilities for safe URL opening
export async function safeLaunchUrl(href?: string | null): Promise<boolean> {
  if (!href) {
    return false;
  }

  try {
    const uri = new URL(href);
    // If URL parsing succeeds, use the original href
    const newHref = href.trim();
    
    if (await canLaunchUrl(newHref)) {
      await launchUrl(newHref);
      return true;
    }
  } catch {
    // URL parsing failed, try adding http:// scheme
    try {
      const newHref = `http://${href}`.trim();
      if (await canLaunchUrl(newHref)) {
        await launchUrl(newHref);
        return true;
      }
    } catch {
      // Failed to launch even with http:// prefix
      return false;
    }
  }

  return false;
}

/**
 * Check if a URL can be launched (browser-specific implementation)
 */
async function canLaunchUrl(url: string): Promise<boolean> {
  try {
    // In a browser environment, we can generally launch HTTP/HTTPS URLs
    const parsedUrl = new URL(url);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

/**
 * Launch a URL (browser-specific implementation)
 */
async function launchUrl(url: string): Promise<void> {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    // Node.js environment - would need different implementation
    console.warn('URL launching not supported in this environment:', url);
  }
}

// Export the function as a configurable launcher
export let editorLaunchUrl: (href?: string | null) => Promise<boolean> = safeLaunchUrl;