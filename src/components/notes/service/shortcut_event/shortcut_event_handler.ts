export enum KeyEventResult {
  handled = 'handled',
  ignored = 'ignored',
  skipRemainingHandlers = 'skipRemainingHandlers'
}

export interface KeyEvent {
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  type: 'keydown' | 'keyup' | 'keypress';
}

export type ShortcutEventHandler = (
  editorState: any,
  event?: KeyEvent
) => KeyEventResult;