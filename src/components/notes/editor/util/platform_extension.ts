export class PlatformExtension {
  private static get _webPlatform(): string {
    if (typeof window !== 'undefined' && window.navigator) {
      return window.navigator.platform?.toLowerCase() ?? '';
    }
    return '';
  }

  /// Returns true if the operating system is macOS and not running on Web platform.
  static get isMacOS(): boolean {
    if (typeof window === 'undefined') return false;
    return window.navigator.platform?.includes('Mac') ?? false;
  }

  /// Returns true if the operating system is Windows and not running on Web platform.
  static get isWindows(): boolean {
    if (typeof window === 'undefined') return false;
    return window.navigator.platform?.includes('Win') ?? false;
  }

  /// Returns true if the operating system is Linux and not running on Web platform.
  static get isLinux(): boolean {
    if (typeof window === 'undefined') return false;
    return window.navigator.platform?.includes('Linux') ?? false;
  }

  /// Returns true if the operating system is iOS and not running on Web platform.
  static get isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
  }

  /// Returns true if the operating system is Android and not running on Web platform.
  static get isAndroid(): boolean {
    if (typeof window === 'undefined') return false;
    return window.navigator.userAgent.includes('Android');
  }

  /// Returns true if the operating system is macOS and running on Web platform.
  static get isWebOnMacOS(): boolean {
    return PlatformExtension._webPlatform.includes('mac');
  }

  /// Returns true if the operating system is Windows and running on Web platform.
  static get isWebOnWindows(): boolean {
    return PlatformExtension._webPlatform.includes('windows');
  }

  /// Returns true if the operating system is Linux and running on Web platform.
  static get isWebOnLinux(): boolean {
    return PlatformExtension._webPlatform.includes('linux');
  }

  static get isDesktopOrWeb(): boolean {
    return PlatformExtension.isDesktop || PlatformExtension.isWeb;
  }

  static get isDesktop(): boolean {
    return PlatformExtension.isMacOS || PlatformExtension.isWindows || PlatformExtension.isLinux;
  }

  static get isMobile(): boolean {
    return PlatformExtension.isIOS || PlatformExtension.isAndroid;
  }

  static get isNotMobile(): boolean {
    return !PlatformExtension.isMobile;
  }

  static get isWeb(): boolean {
    return typeof window !== 'undefined';
  }
}