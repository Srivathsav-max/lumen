// Property value notifier implementation for TypeScript
export type ChangeListener = () => void;

export interface ValueListenable<T> {
  readonly value: T;
  addListener(listener: ChangeListener): void;
  removeListener(listener: ChangeListener): void;
}

/**
 * PropertyValueNotifier is similar to ValueNotifier but will notify listeners
 * even when the value is the same as the previous value.
 */
export class PropertyValueNotifier<T> implements ValueListenable<T> {
  private _value: T;
  private _listeners: Set<ChangeListener> = new Set();

  constructor(value: T) {
    this._value = value;
  }

  get value(): T {
    return this._value;
  }

  set value(newValue: T) {
    this._value = newValue;
    this.notifyListeners();
  }

  addListener(listener: ChangeListener): void {
    this._listeners.add(listener);
  }

  removeListener(listener: ChangeListener): void {
    this._listeners.delete(listener);
  }

  protected notifyListeners(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch (error) {
        console.error('Error in PropertyValueNotifier listener:', error);
      }
    }
  }

  dispose(): void {
    this._listeners.clear();
  }
}