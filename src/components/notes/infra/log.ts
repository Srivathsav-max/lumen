export enum AppFlowyEditorLogLevel {
  off = 'off',
  error = 'error',
  warn = 'warn',
  info = 'info',
  debug = 'debug',
  all = 'all'
}

export type AppFlowyEditorLogHandler = (message: string) => void;

/// Manages log service for [AppFlowyEditor]
///
/// Set the log level and config the handler depending on your need.
export class AppFlowyLogConfiguration {
  private static _instance: AppFlowyLogConfiguration;
  
  public handler?: AppFlowyEditorLogHandler;
  private _level: AppFlowyEditorLogLevel = AppFlowyEditorLogLevel.off;

  private constructor() {}

  static getInstance(): AppFlowyLogConfiguration {
    if (!AppFlowyLogConfiguration._instance) {
      AppFlowyLogConfiguration._instance = new AppFlowyLogConfiguration();
    }
    return AppFlowyLogConfiguration._instance;
  }

  get level(): AppFlowyEditorLogLevel {
    return this._level;
  }

  set level(level: AppFlowyEditorLogLevel) {
    this._level = level;
  }

  private shouldLog(level: AppFlowyEditorLogLevel): boolean {
    const levels = [
      AppFlowyEditorLogLevel.off,
      AppFlowyEditorLogLevel.error,
      AppFlowyEditorLogLevel.warn,
      AppFlowyEditorLogLevel.info,
      AppFlowyEditorLogLevel.debug,
      AppFlowyEditorLogLevel.all
    ];
    
    const currentLevelIndex = levels.indexOf(this._level);
    const messageLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex !== 0 && messageLevelIndex <= currentLevelIndex;
  }

  log(level: AppFlowyEditorLogLevel, loggerName: string, message: string): void {
    if (this.shouldLog(level) && this.handler) {
      const timestamp = new Date().toISOString();
      this.handler(`[${level.toUpperCase()}][${loggerName}]: ${timestamp}: ${message}`);
    }
  }
}

/// For logging message in AppFlowyEditor
export class AppFlowyEditorLog {
  private readonly name: string;
  private readonly config: AppFlowyLogConfiguration;

  private constructor(name: string) {
    this.name = name;
    this.config = AppFlowyLogConfiguration.getInstance();
  }

  /// For logging message related to [AppFlowyEditor].
  ///
  /// For example, uses the logger when registering plugins
  ///   or handling something related to [EditorState].
  static readonly editor = new AppFlowyEditorLog('editor');

  /// For logging message related to [AppFlowySelectionService].
  ///
  /// For example, uses the logger when updating or clearing selection.
  static readonly selection = new AppFlowyEditorLog('selection');

  /// For logging message related to [AppFlowyKeyboardService].
  ///
  /// For example, uses the logger when processing shortcut events.
  static readonly keyboard = new AppFlowyEditorLog('keyboard');

  /// For logging message related to [AppFlowyInputService].
  ///
  /// For example, uses the logger when processing text inputs.
  static readonly input = new AppFlowyEditorLog('input');

  /// For logging message related to [AppFlowyScrollService].
  ///
  /// For example, uses the logger when processing scroll events.
  static readonly scroll = new AppFlowyEditorLog('scroll');

  /// For logging message related to [FloatingToolbar] or [MobileToolbar].
  ///
  /// For example, uses the logger when processing toolbar events.
  static readonly toolbar = new AppFlowyEditorLog('toolbar');

  /// For logging message related to UI.
  ///
  /// For example, uses the logger when building the widget.
  static readonly ui = new AppFlowyEditorLog('ui');

  error(message: string): void {
    this.config.log(AppFlowyEditorLogLevel.error, this.name, message);
  }

  warn(message: string): void {
    this.config.log(AppFlowyEditorLogLevel.warn, this.name, message);
  }

  info(message: string): void {
    this.config.log(AppFlowyEditorLogLevel.info, this.name, message);
  }

  debug(message: string): void {
    this.config.log(AppFlowyEditorLogLevel.debug, this.name, message);
  }
}