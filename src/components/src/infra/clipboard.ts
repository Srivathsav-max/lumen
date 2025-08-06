export interface AppFlowyClipboardData {
  text?: string;
  html?: string;
}

export class AppFlowyClipboard {
  private static _mockData?: AppFlowyClipboardData;
  public static lastText?: string;

  static async setData(options: {
    text?: string;
    html?: string;
  }): Promise<void> {
    const { text, html } = options;
    
    if (!text) {
      return;
    }

    AppFlowyClipboard.lastText = text;

    // Use the Clipboard API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (error) {
        console.warn('Failed to write to clipboard using Clipboard API:', error);
      }
    }

    // Fallback method
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  static async getData(): Promise<AppFlowyClipboardData> {
    if (AppFlowyClipboard._mockData) {
      return AppFlowyClipboard._mockData;
    }

    // Use the Clipboard API if available
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const text = await navigator.clipboard.readText();
        return { text, html: undefined };
      } catch (error) {
        console.warn('Failed to read from clipboard using Clipboard API:', error);
      }
    }

    // Fallback - return empty data since we can't read clipboard without user interaction
    return { text: undefined, html: undefined };
  }

  // For testing purposes
  static mockSetData(data?: AppFlowyClipboardData): void {
    AppFlowyClipboard._mockData = data;
  }
}