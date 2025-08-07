// Copyright 2019 The Fuchsia Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ItemPositionsNotifier } from './item_positions_notifier';

/**
 * Position information for an item in the list.
 */
export interface ItemPosition {
  /** Index of the item. */
  index: number;
  
  /** 
   * Distance in proportion of the viewport's main axis length from the leading
   * edge of the viewport to the leading edge of the item.
   * 
   * May be negative if the item is partially visible.
   */
  itemLeadingEdge: number;
  
  /** 
   * Distance in proportion of the viewport's main axis length from the leading
   * edge of the viewport to the trailing edge of the item.
   * 
   * May be greater than one if the item is partially visible.
   */
  itemTrailingEdge: number;
}

/**
 * Provides a listenable iterable of itemPositions of items that are on
 * screen and their locations.
 */
export abstract class ItemPositionsListener {
  /**
   * Creates an ItemPositionsListener that can be used by a
   * ScrollablePositionedList to return the current position of items.
   */
  static create(): ItemPositionsListener {
    return new ItemPositionsNotifier();
  }

  /**
   * The position of items that are at least partially visible in the viewport.
   */
  abstract get itemPositions(): ItemPosition[];

  /**
   * Add a listener for position changes
   */
  abstract addListener(listener: (positions: ItemPosition[]) => void): void;

  /**
   * Remove a listener for position changes
   */
  abstract removeListener(listener: (positions: ItemPosition[]) => void): void;
}

/**
 * Utility functions for ItemPosition
 */
export const ItemPositionUtils = {
  equals(a: ItemPosition, b: ItemPosition): boolean {
    return a.index === b.index &&
           a.itemLeadingEdge === b.itemLeadingEdge &&
           a.itemTrailingEdge === b.itemTrailingEdge;
  },

  hashCode(position: ItemPosition): number {
    let hash = 7;
    hash = 31 * hash + position.index;
    hash = 31 * hash + position.itemLeadingEdge;
    hash = 31 * hash + position.itemTrailingEdge;
    return hash;
  },

  toString(position: ItemPosition): string {
    return `ItemPosition(index: ${position.index}, itemLeadingEdge: ${position.itemLeadingEdge}, itemTrailingEdge: ${position.itemTrailingEdge})`;
  }
};