// Copyright 2019 The Fuchsia Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ScrollOffsetNotifier } from './scroll_offset_notifier';

/**
 * Provides an affordance for listening to scroll offset changes.
 * 
 * This is an experimental API and is subject to change.
 * Behavior may be ill-defined in some cases. Please file bugs.
 */
export abstract class ScrollOffsetListener {
  /**
   * Stream of scroll offset deltas.
   */
  abstract get changes(): ReadableStream<number>;

  /**
   * Add a listener for scroll offset changes
   */
  abstract addListener(listener: (delta: number) => void): void;

  /**
   * Remove a listener for scroll offset changes
   */
  abstract removeListener(listener: (delta: number) => void): void;

  /**
   * Construct a ScrollOffsetListener.
   * 
   * Set recordProgrammaticScrolls to false to prevent reporting of
   * programmatic scrolls.
   */
  static create(options: { recordProgrammaticScrolls?: boolean } = {}): ScrollOffsetListener {
    return new ScrollOffsetNotifier({
      recordProgrammaticScrolls: options.recordProgrammaticScrolls ?? true
    });
  }
}