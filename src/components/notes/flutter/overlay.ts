// Simplified overlay system for web - this would be much more complex in a real implementation
// This is a basic abstraction of Flutter's overlay system

export type WidgetBuilder = (context: any) => any;

export class OverlayEntry {
  public readonly builder: WidgetBuilder;
  private _opaque: boolean;
  private _maintainState: boolean;
  private _mounted = false;
  private _overlay: OverlayState | null = null;
  private _listeners: Set<() => void> = new Set();

  constructor(options: {
    builder: WidgetBuilder;
    opaque?: boolean;
    maintainState?: boolean;
  }) {
    this.builder = options.builder;
    this._opaque = options.opaque ?? false;
    this._maintainState = options.maintainState ?? false;
  }

  get opaque(): boolean {
    return this._opaque;
  }

  set opaque(value: boolean) {
    if (this._opaque === value) return;
    this._opaque = value;
    this._overlay?._didChangeEntryOpacity();
  }

  get maintainState(): boolean {
    return this._maintainState;
  }

  set maintainState(value: boolean) {
    if (this._maintainState === value) return;
    this._maintainState = value;
    this._overlay?._didChangeEntryOpacity();
  }

  get mounted(): boolean {
    return this._mounted;
  }

  _updateMounted(value: boolean): void {
    if (value === this._mounted) return;
    this._mounted = value;
    this._notifyListeners();
  }

  addListener(listener: () => void): void {
    this._listeners.add(listener);
  }

  removeListener(listener: () => void): void {
    this._listeners.delete(listener);
  }

  private _notifyListeners(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }

  remove(): void {
    if (!this._overlay) return;
    
    const overlay = this._overlay;
    this._overlay = null;
    
    if (!overlay.mounted) return;
    
    overlay._entries.splice(overlay._entries.indexOf(this), 1);
    overlay._markDirty();
  }

  markNeedsBuild(): void {
    // In a real implementation, this would trigger a rebuild
    console.debug('OverlayEntry.markNeedsBuild called');
  }

  dispose(): void {
    this._listeners.clear();
  }
}

export class Overlay {
  public readonly initialEntries: OverlayEntry[];
  public readonly clipBehavior: string;

  constructor(options: {
    initialEntries?: OverlayEntry[];
    clipBehavior?: string;
  } = {}) {
    this.initialEntries = options.initialEntries ?? [];
    this.clipBehavior = options.clipBehavior ?? 'hardEdge';
  }

  static of(context: any, options: { rootOverlay?: boolean } = {}): OverlayState | null {
    // In a real implementation, this would traverse the widget tree
    // For now, returning a mock overlay state
    return new OverlayState(new Overlay());
  }

  createState(): OverlayState {
    return new OverlayState(this);
  }
}

export class OverlayState {
  public readonly _entries: OverlayEntry[] = [];
  private _mounted = true;

  constructor(private widget: Overlay) {
    this.insertAll(widget.initialEntries);
  }

  get mounted(): boolean {
    return this._mounted;
  }

  get entries(): readonly OverlayEntry[] {
    return [...this._entries];
  }

  private _insertionIndex(below?: OverlayEntry, above?: OverlayEntry): number {
    if (below) return this._entries.indexOf(below);
    if (above) return this._entries.indexOf(above) + 1;
    return this._entries.length;
  }

  insert(entry: OverlayEntry, options: { below?: OverlayEntry; above?: OverlayEntry } = {}): void {
    const { below, above } = options;
    
    if (this._entries.includes(entry)) {
      throw new Error('The specified entry is already present in the Overlay.');
    }
    
    if (entry._overlay) {
      throw new Error('The specified entry is already present in another Overlay.');
    }
    
    entry._overlay = this;
    this._entries.splice(this._insertionIndex(below, above), 0, entry);
    entry._updateMounted(true);
    this._markDirty();
  }

  insertAll(entries: OverlayEntry[], options: { below?: OverlayEntry; above?: OverlayEntry } = {}): void {
    if (entries.length === 0) return;
    
    const { below, above } = options;
    
    for (const entry of entries) {
      if (this._entries.includes(entry)) {
        throw new Error('One or more of the specified entries are already present in the Overlay.');
      }
      if (entry._overlay) {
        throw new Error('One or more of the specified entries are already present in another Overlay.');
      }
      entry._overlay = this;
    }
    
    const insertIndex = this._insertionIndex(below, above);
    this._entries.splice(insertIndex, 0, ...entries);
    
    for (const entry of entries) {
      entry._updateMounted(true);
    }
    
    this._markDirty();
  }

  _markDirty(): void {
    if (this._mounted) {
      // In a real implementation, this would trigger a rebuild
      console.debug('OverlayState._markDirty called');
    }
  }

  _didChangeEntryOpacity(): void {
    this._markDirty();
  }

  build(context: any): any {
    // In a real implementation, this would build the overlay widget tree
    const children: any[] = [];
    let onstage = true;
    
    for (let i = this._entries.length - 1; i >= 0; i--) {
      const entry = this._entries[i];
      if (onstage) {
        children.push(entry.builder(context));
        if (entry.opaque) onstage = false;
      } else if (entry.maintainState) {
        children.push(entry.builder(context));
      }
    }
    
    return {
      type: 'overlay',
      children: children.reverse(),
      clipBehavior: this.widget.clipBehavior,
    };
  }

  dispose(): void {
    this._mounted = false;
    for (const entry of this._entries) {
      entry._updateMounted(false);
      entry.dispose();
    }
    this._entries.length = 0;
  }
}