import { keyToCodeMapping } from './key_mapping';

export interface KeybindingExtensions {
  containsKeyEvent(keyEvent: KeyboardEvent): boolean;
}

export const KeybindingUtils = {
  containsKeyEvent(keybindings: Keybinding[], keyEvent: KeyboardEvent): boolean {
    for (const keybinding of keybindings) {
      if (keybinding.isMetaPressed === keyEvent.metaKey &&
          keybinding.isControlPressed === keyEvent.ctrlKey &&
          keybinding.isAltPressed === keyEvent.altKey &&
          keybinding.isShiftPressed === keyEvent.shiftKey &&
          keybinding.keyCode === keyEvent.code.charCodeAt(0)) {
        return true;
      }
    }
    return false;
  }
};

export class Keybinding {
  public readonly isAltPressed: boolean;
  public readonly isControlPressed: boolean;
  public readonly isMetaPressed: boolean;
  public readonly isShiftPressed: boolean;
  public readonly keyLabel: string;

  constructor(options: {
    isAltPressed: boolean;
    isControlPressed: boolean;
    isMetaPressed: boolean;
    isShiftPressed: boolean;
    keyLabel: string;
  }) {
    this.isAltPressed = options.isAltPressed;
    this.isControlPressed = options.isControlPressed;
    this.isMetaPressed = options.isMetaPressed;
    this.isShiftPressed = options.isShiftPressed;
    this.keyLabel = options.keyLabel;
  }

  static parse(command: string): Keybinding {
    command = command.toLowerCase().trim();

    let isAltPressed = false;
    let isControlPressed = false;
    let isMetaPressed = false;
    let isShiftPressed = false;

    let matchedModifier = false;

    do {
      matchedModifier = false;
      if (/^alt(\+|\-)/.test(command)) {
        isAltPressed = true;
        command = command.substring(4); // 4 = 'alt+'.length
        matchedModifier = true;
      }
      if (/^ctrl(\+|\-)/.test(command)) {
        isControlPressed = true;
        command = command.substring(5); // 5 = 'ctrl+'.length
        matchedModifier = true;
      }
      if (/^shift(\+|\-)/.test(command)) {
        isShiftPressed = true;
        command = command.substring(6); // 6 = 'shift+'.length
        matchedModifier = true;
      }
      if (/^meta(\+|\-)/.test(command)) {
        isMetaPressed = true;
        command = command.substring(5); // 5 = 'meta+'.length
        matchedModifier = true;
      }
      if (/^cmd(\+|\-)/.test(command) || /^win(\+|\-)/.test(command)) {
        isMetaPressed = true;
        command = command.substring(4); // 4 = 'cmd+'.length
        matchedModifier = true;
      }
    } while (matchedModifier);

    return new Keybinding({
      isAltPressed,
      isControlPressed,
      isMetaPressed,
      isShiftPressed,
      keyLabel: command,
    });
  }

  get keyCode(): number {
    const code = keyToCodeMapping[this.keyLabel.toLowerCase()];
    if (code === undefined) {
      throw new Error(`Unknown key label: ${this.keyLabel}`);
    }
    return code;
  }

  copyWith(options: Partial<{
    isAltPressed: boolean;
    isControlPressed: boolean;
    isMetaPressed: boolean;
    isShiftPressed: boolean;
    keyLabel: string;
  }>): Keybinding {
    return new Keybinding({
      isAltPressed: options.isAltPressed ?? this.isAltPressed,
      isControlPressed: options.isControlPressed ?? this.isControlPressed,
      isMetaPressed: options.isMetaPressed ?? this.isMetaPressed,
      isShiftPressed: options.isShiftPressed ?? this.isShiftPressed,
      keyLabel: options.keyLabel ?? this.keyLabel,
    });
  }

  toMap(): Record<string, any> {
    return {
      isAltPressed: this.isAltPressed,
      isControlPressed: this.isControlPressed,
      isMetaPressed: this.isMetaPressed,
      isShiftPressed: this.isShiftPressed,
      keyLabel: this.keyLabel,
    };
  }

  static fromMap(map: Record<string, any>): Keybinding {
    return new Keybinding({
      isAltPressed: map.isAltPressed ?? false,
      isControlPressed: map.isControlPressed ?? false,
      isMetaPressed: map.isMetaPressed ?? false,
      isShiftPressed: map.isShiftPressed ?? false,
      keyLabel: map.keyLabel ?? '',
    });
  }

  toJson(): string {
    return JSON.stringify(this.toMap());
  }

  static fromJson(source: string): Keybinding {
    return Keybinding.fromMap(JSON.parse(source));
  }

  toString(): string {
    return `Keybinding(isAltPressed: ${this.isAltPressed}, isControlPressed: ${this.isControlPressed}, isMetaPressed: ${this.isMetaPressed}, isShiftPressed: ${this.isShiftPressed}, keyLabel: ${this.keyLabel})`;
  }

  equals(other: Keybinding): boolean {
    return other.isAltPressed === this.isAltPressed &&
           other.isControlPressed === this.isControlPressed &&
           other.isMetaPressed === this.isMetaPressed &&
           other.isShiftPressed === this.isShiftPressed &&
           other.keyCode === this.keyCode;
  }

  get hashCode(): number {
    let hash = 0;
    const str = `${this.isAltPressed}${this.isControlPressed}${this.isMetaPressed}${this.isShiftPressed}${this.keyCode}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}