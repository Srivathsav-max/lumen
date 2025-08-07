// Copyright 2019 The Fuchsia Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ItemPositionsListener, ItemPosition } from './item_positions_listener';

/**
 * Internal implementation of ItemPositionsListener.
 */
export class ItemPositionsNotifier extends ItemPositionsListener {
  private _itemPositions: ItemPosition[] = [];
  private listeners: Set<(positions: ItemPosition[]) => void> = new Set();

  get itemPositions(): ItemPosition[] {
    return [...this._itemPositions];
  }

  /**
   * Update the current item positions and notify listeners
   */
  updatePositions(positions: ItemPosition[]): void {
    this._itemPositions = [...positions];
    this.notifyListeners();
  }

  addListener(listener: (positions: ItemPosition[]) => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: (positions: ItemPosition[]) => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const positions = this.itemPositions;
    for (const listener of this.listeners) {
      try {
        listener(positions);
      } catch (error) {
        console.error('Error in ItemPositionsNotifier listener:', error);
      }
    }
  }

  /**
   * Clear all listeners and positions
   */
  dispose(): void {
    this.listeners.clear();
    this._itemPositions = [];
  }
}