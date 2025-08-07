// Copyright 2019 The Fuchsia Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ScrollOffsetListener } from './scroll_offset_listener';

export class ScrollOffsetNotifier extends ScrollOffsetListener {
  private recordProgrammaticScrolls: boolean;
  private listeners: Set<(delta: number) => void> = new Set();
  private _changes: ReadableStream<number>;
  private streamController: ReadableStreamDefaultController<number>;

  constructor(options: { recordProgrammaticScrolls?: boolean } = {}) {
    super();
    this.recordProgrammaticScrolls = options.recordProgrammaticScrolls ?? true;
    
    this._changes = new ReadableStream<number>({
      start: (controller) => {
        this.streamController = controller;
      }
    });
  }

  get changes(): ReadableStream<number> {
    return this._changes;
  }

  addListener(listener: (delta: number) => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: (delta: number) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify listeners of a scroll offset change
   */
  notifyChange(delta: number): void {
    // Enqueue the delta to the stream
    if (this.streamController) {
      try {
        this.streamController.enqueue(delta);
      } catch (error) {
        console.error('Error enqueueing scroll delta:', error);
      }
    }

    // Notify all listeners
    for (const listener of this.listeners) {
      try {
        listener(delta);
      } catch (error) {
        console.error('Error in ScrollOffsetNotifier listener:', error);
      }
    }
  }

  /**
   * Check if programmatic scrolls should be recorded
   */
  shouldRecordProgrammaticScrolls(): boolean {
    return this.recordProgrammaticScrolls;
  }

  /**
   * Dispose of the notifier and close the stream
   */
  dispose(): void {
    this.listeners.clear();
    if (this.streamController) {
      try {
        this.streamController.close();
      } catch (error) {
        console.error('Error closing scroll offset stream:', error);
      }
    }
  }
}