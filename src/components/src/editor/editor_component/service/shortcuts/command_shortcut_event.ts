import { EditorState } from '../../../editor_state';
import { KeyEvent, KeyEventResult } from '../../../infra/key_event';
import { PlatformExtension } from '../../../util/platform_extension';
import { Keybinding } from '../../../service/shortcut_event/keybinding';

export type CommandShortcutEventHandler = (editorState: EditorState) => KeyEventResult;

/**
 * Defines the implementation of shortcut event based on command.
 */
export class CommandShortcutEvent {
  /// The unique key.
  ///
  /// Usually, uses the description as the key.
  readonly key: string;

  /// The string representation for the keyboard keys.
  ///
  /// The following is the mapping relationship of modify key.
  ///   ctrl: Ctrl
  ///   meta: Command in macOS or Control in Windows.
  ///   alt: Alt
  ///   shift: Shift
  ///   cmd: meta
  ///   win: meta
  ///
  /// Refer to keyMapping for other keys.
  ///
  /// Uses ',' to split different keyboard key combinations.
  ///
  /// Like, 'ctrl+c,cmd+c'
  ///
  command: string;

  /// Callback to return the localized description of the command.
  private readonly _getDescription?: () => string;

  readonly handler: CommandShortcutEventHandler;

  private _keybindings: Keybinding[] = [];

  constructor(options: {
    key: string;
    command: string;
    handler: CommandShortcutEventHandler;
    getDescription?: () => string;
    windowsCommand?: string;
    macOSCommand?: string;
    linuxCommand?: string;
  }) {
    this.key = options.key;
    this.command = options.command;
    this.handler = options.handler;
    this._getDescription = options.getDescription;

    this.updateCommand({
      command: options.command,
      windowsCommand: options.windowsCommand,
      macOSCommand: options.macOSCommand,
      linuxCommand: options.linuxCommand,
    });
  }

  get keybindings(): Keybinding[] {
    return this._keybindings;
  }

  get description(): string | undefined {
    return this._getDescription ? this._getDescription() : undefined;
  }

  /// This _completely_ clears the command, ensuring that
  /// it cannot be triggered until it is updated again.
  ///
  /// Update it using updateCommand.
  ///
  clearCommand(): void {
    this._keybindings = [];
    this.command = '';
  }

  updateCommand(options: {
    command?: string;
    windowsCommand?: string;
    macOSCommand?: string;
    linuxCommand?: string;
  }): void {
    const { command, windowsCommand, macOSCommand, linuxCommand } = options;
    
    if (!command && !windowsCommand && !macOSCommand && !linuxCommand) {
      return;
    }
    
    let matched = false;
    if ((PlatformExtension.isWindows || PlatformExtension.isWebOnWindows) &&
        windowsCommand && windowsCommand.length > 0) {
      this.command = windowsCommand;
      matched = true;
    } else if ((PlatformExtension.isMacOS || PlatformExtension.isWebOnMacOS) &&
        macOSCommand && macOSCommand.length > 0) {
      this.command = macOSCommand;
      matched = true;
    } else if ((PlatformExtension.isLinux || PlatformExtension.isWebOnLinux) &&
        linuxCommand && linuxCommand.length > 0) {
      this.command = linuxCommand;
      matched = true;
    } else if (command && command.length > 0) {
      this.command = command;
      matched = true;
    }

    if (matched) {
      this._keybindings = this.command.split(',').map(e => Keybinding.parse(e));
    }
  }

  canRespondToRawKeyEvent(event: KeyEvent): boolean {
    return this.keybindings.some(binding => binding.containsKeyEvent(event));
  }

  execute(editorState: EditorState): KeyEventResult {
    return this.handler(editorState);
  }

  copyWith(options: {
    key?: string;
    getDescription?: () => string;
    command?: string;
    handler?: CommandShortcutEventHandler;
  }): CommandShortcutEvent {
    return new CommandShortcutEvent({
      key: options.key ?? this.key,
      getDescription: options.getDescription ?? this._getDescription,
      command: options.command ?? this.command,
      handler: options.handler ?? this.handler,
    });
  }

  toString(): string {
    return `CommandShortcutEvent(key: ${this.key}, command: ${this.command}, handler: ${this.handler})`;
  }

  equals(other: CommandShortcutEvent): boolean {
    return this.key === other.key &&
           this.command === other.command &&
           this.handler === other.handler;
  }

  get hashCode(): number {
    return this.key.length + this.command.length + this.handler.toString().length;
  }
}