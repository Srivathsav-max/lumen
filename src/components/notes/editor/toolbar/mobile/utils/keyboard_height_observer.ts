import { PlatformExtension } from '../../../../util/platform_extension';

export type KeyboardHeightCallback = (height: number) => void;

// The KeyboardHeightPlugin only accepts one listener, so we need to create a
// singleton class to manage the multiple listeners.
export class KeyboardHeightObserver {
  private static _instance: KeyboardHeightObserver;
  static androidSDKVersion: number = -1;
  static currentKeyboardHeight: number = 0;

  private listeners: KeyboardHeightCallback[] = [];
  private keyboardHeightPlugin: any; // KeyboardHeightPlugin equivalent

  private constructor() {
    if (PlatformExtension.isAndroid && KeyboardHeightObserver.androidSDKVersion === -1) {
      // In a web environment, we can't get Android SDK version
      // This would need to be implemented with a proper device info plugin
      KeyboardHeightObserver.androidSDKVersion = 30; // Default value
    }

    // Initialize keyboard height detection for web
    this.initializeKeyboardDetection();
  }

  static get instance(): KeyboardHeightObserver {
    if (!KeyboardHeightObserver._instance) {
      KeyboardHeightObserver._instance = new KeyboardHeightObserver();
    }
    return KeyboardHeightObserver._instance;
  }

  private initializeKeyboardDetection(): void {
    // For web, we can detect keyboard by monitoring viewport height changes
    if (typeof window !== 'undefined') {
      let initialViewportHeight = window.visualViewport?.height ?? window.innerHeight;
      
      const handleViewportChange = () => {
        const currentHeight = window.visualViewport?.height ?? window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;
        
        // If height difference is significant, assume keyboard is shown
        const keyboardHeight = heightDifference > 150 ? heightDifference : 0;
        
        this.notify(keyboardHeight);
        KeyboardHeightObserver.currentKeyboardHeight = keyboardHeight;
      };

      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportChange);
      } else {
        window.addEventListener('resize', handleViewportChange);
      }
    }
  }

  addListener(listener: KeyboardHeightCallback): void {
    this.listeners.push(listener);
  }

  removeListener(listener: KeyboardHeightCallback): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  dispose(): void {
    this.listeners = [];
    // Clean up event listeners if needed
  }

  private notify(height: number): void {
    // The keyboard height will notify twice with the same value on Android
    if (PlatformExtension.isAndroid && height === KeyboardHeightObserver.currentKeyboardHeight) {
      return;
    }

    for (const listener of this.listeners) {
      listener(height);
    }
  }
}