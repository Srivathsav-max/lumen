// React equivalents and stubs for Dart async concepts

export class StreamController<T> {
  private listeners: ((data: T) => void)[] = [];
  
  add(data: T) {
    this.listeners.forEach(listener => listener(data));
  }
  
  listen(listener: (data: T) => void) {
    this.listeners.push(listener);
    return {
      cancel: () => {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      }
    };
  }
  
  close() {
    this.listeners = [];
  }
}