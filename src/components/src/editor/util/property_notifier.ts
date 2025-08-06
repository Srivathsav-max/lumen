export type PropertyListener<T> = (value: T) => void;

/// A simple property notifier that can notify listeners when a value changes
export class PropertyNotifier<T> {
  private _value: T;
  private _listeners: Set<PropertyListener<T>> = new Set();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  set value(newValue: T) {
    if (this._value !== newValue) {
      this._value = newValue;
      this.notifyListeners();
    }
  }

  /// Add a listener that will be called when the value changes
  addListener(listener: PropertyListener<T>): void {
    this._listeners.add(listener);
  }

  /// Remove a listener
  removeListener(listener: PropertyListener<T>): void {
    this._listeners.delete(listener);
  }

  /// Remove all listeners
  removeAllListeners(): void {
    this._listeners.clear();
  }

  /// Notify all listeners of the current value
  notifyListeners(): void {
    for (const listener of this._listeners) {
      try {
        listener(this._value);
      } catch (error) {
        console.error('Error in PropertyNotifier listener:', error);
      }
    }
  }

  /// Dispose of this notifier and remove all listeners
  dispose(): void {
    this._listeners.clear();
  }

  /// Get the number of listeners
  get listenerCount(): number {
    return this._listeners.size;
  }

  /// Check if there are any listeners
  get hasListeners(): boolean {
    return this._listeners.size > 0;
  }
}