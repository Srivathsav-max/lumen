export class Debounce {
  private static readonly _actions = new Map<string, NodeJS.Timeout>();

  static debounce(
    key: string,
    duration: number,
    callback: () => void
  ): void {
    if (duration === 0) {
      // Call immediately
      callback();
      Debounce.cancel(key);
    } else {
      Debounce.cancel(key);
      const timer = setTimeout(() => {
        callback();
        Debounce.cancel(key);
      }, duration);
      
      Debounce._actions.set(key, timer);
    }
  }

  static cancel(key: string): void {
    const timer = Debounce._actions.get(key);
    if (timer) {
      clearTimeout(timer);
      Debounce._actions.delete(key);
    }
  }

  static clear(): void {
    for (const [key, timer] of Debounce._actions.entries()) {
      clearTimeout(timer);
    }
    Debounce._actions.clear();
  }
}