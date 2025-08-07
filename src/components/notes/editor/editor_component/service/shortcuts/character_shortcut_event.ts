import { EditorState } from '../../../editor_state';

export type CharacterShortcutEventHandler = (editorState: EditorState) => Promise<boolean>;

export type CharacterShortcutEventHandlerWithCharacter = (
  editorState: EditorState,
  character: string,
) => Promise<boolean>;

/**
 * Defines the implementation of shortcut event based on character.
 */
export class CharacterShortcutEvent {
  public readonly key: string;
  public character: string;
  public readonly regExp?: RegExp;
  public readonly handler: CharacterShortcutEventHandler;
  public readonly handlerWithCharacter?: CharacterShortcutEventHandlerWithCharacter;

  constructor(options: {
    key: string;
    character: string;
    handler: CharacterShortcutEventHandler;
    handlerWithCharacter?: CharacterShortcutEventHandlerWithCharacter;
    regExp?: RegExp;
  }) {
    const { key, character, handler, handlerWithCharacter, regExp } = options;
    
    // Assert that either regExp is null and character is single, or regExp exists and character is empty
    if (!((regExp == null && character.length === 1) || (regExp != null && character.length === 0))) {
      throw new Error('Either regExp must be null and character must be single, or regExp must exist and character must be empty');
    }

    this.key = key;
    this.character = character;
    this.regExp = regExp;
    this.handler = handler;
    this.handlerWithCharacter = handlerWithCharacter;
  }

  updateCharacter(newCharacter: string): void {
    if (newCharacter.length !== 1) {
      throw new Error('New character must be a single character');
    }
    this.character = newCharacter;
  }

  async execute(editorState: EditorState): Promise<boolean> {
    return this.handler(editorState);
  }

  async executeWithCharacter(editorState: EditorState, character: string): Promise<boolean> {
    return this.handlerWithCharacter?.(editorState, character) ?? this.handler(editorState);
  }

  copyWith(options: {
    key?: string;
    character?: string;
    handler?: CharacterShortcutEventHandler;
    regExp?: RegExp;
  }): CharacterShortcutEvent {
    return new CharacterShortcutEvent({
      key: options.key ?? this.key,
      character: options.character ?? this.character,
      regExp: options.regExp ?? this.regExp,
      handler: options.handler ?? this.handler,
      handlerWithCharacter: this.handlerWithCharacter,
    });
  }

  toString(): string {
    return `CharacterShortcutEvent{key: ${this.key}, character: ${this.character}, regExp: ${this.regExp}, handler: ${this.handler}}`;
  }

  equals(other: CharacterShortcutEvent): boolean {
    return this.key === other.key &&
           this.character === other.character &&
           this.regExp === other.regExp &&
           this.handler === other.handler;
  }

  get hashCode(): number {
    let hash = 0;
    const str = `${this.key}${this.character}${this.regExp}${this.handler}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}