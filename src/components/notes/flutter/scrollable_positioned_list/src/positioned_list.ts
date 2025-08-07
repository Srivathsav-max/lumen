// Copyright 2019 The Fuchsia Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ItemPositionsNotifier, ItemPosition } from './item_positions_notifier';
import { ElementRegistry } from './element_registry';

export interface PositionedListProps {
  itemCount: number;
  itemBuilder: (index: number) => HTMLElement;
  separatorBuilder?: (index: number) => HTMLElement;
  controller?: ScrollController;
  itemPositionsNotifier?: ItemPositionsNotifier;
  positionedIndex?: number;
  alignment?: number;
  scrollDirection?: 'vertical' | 'horizontal';
  reverse?: boolean;
  shrinkWrap?: boolean;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  cacheExtent?: number;
  semanticChildCount?: number;
  addSemanticIndexes?: boolean;
  addRepaintBoundaries?: boolean;
  addAutomaticKeepAlives?: boolean;
}

export interface ScrollController {
  scrollTop: number;
  scrollLeft: number;
  addEventListener(event: string, handler: () => void): void;
  removeEventListener(event: string, handler: () => void): void;
}

/**
 * A list of widgets similar to a standard scrollable list, except scroll control
 * and position reporting is based on index rather than pixel offset.
 * 
 * The list can be displayed with the item at positionedIndex positioned at a
 * particular alignment.
 */
export class PositionedList {
  private props: Required<PositionedListProps>;
  private element: HTMLElement;
  private scrollController: ScrollController;
  private elementRegistry: ElementRegistry;
  private updateScheduled = false;
  private scrollListener: () => void;

  constructor(props: PositionedListProps) {
    this.props = {
      positionedIndex: 0,
      alignment: 0,
      scrollDirection: 'vertical',
      reverse: false,
      shrinkWrap: false,
      padding: {},
      addSemanticIndexes: true,
      addRepaintBoundaries: true,
      addAutomaticKeepAlives: true,
      ...props
    };

    if (this.props.positionedIndex >= this.props.itemCount) {
      throw new Error('positionedIndex must be less than itemCount');
    }

    this.elementRegistry = new ElementRegistry();
    this.scrollListener = this.schedulePositionNotificationUpdate.bind(this);
    this.element = this.createElement();
    this.scrollController = this.props.controller || this.element;
    this.setupScrollListener();
    this.schedulePositionNotificationUpdate();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'positioned-list';
    container.style.position = 'relative';
    container.style.overflow = 'auto';
    container.style.width = '100%';
    container.style.height = '100%';

    if (this.props.scrollDirection === 'horizontal') {
      container.style.overflowY = 'hidden';
      container.style.overflowX = 'auto';
      container.style.display = 'flex';
      container.style.flexDirection = this.props.reverse ? 'row-reverse' : 'row';
    } else {
      container.style.overflowX = 'hidden';
      container.style.overflowY = 'auto';
      container.style.display = 'flex';
      container.style.flexDirection = this.props.reverse ? 'column-reverse' : 'column';
    }

    this.applyPadding(container);
    this.buildItems(container);

    return container;
  }

  private applyPadding(container: HTMLElement): void {
    const padding = this.props.padding;
    if (padding.top !== undefined) container.style.paddingTop = `${padding.top}px`;
    if (padding.bottom !== undefined) container.style.paddingBottom = `${padding.bottom}px`;
    if (padding.left !== undefined) container.style.paddingLeft = `${padding.left}px`;
    if (padding.right !== undefined) container.style.paddingRight = `${padding.right}px`;
  }

  private buildItems(container: HTMLElement): void {
    // Build items before positioned index (in reverse order for proper layout)
    if (this.props.positionedIndex > 0) {
      for (let i = this.props.positionedIndex - 1; i >= 0; i--) {
        const item = this.buildItem(i);
        container.appendChild(item);
        
        if (this.props.separatorBuilder && i > 0) {
          const separator = this.props.separatorBuilder(i - 1);
          container.appendChild(separator);
        }
      }
    }

    // Build positioned item
    if (this.props.itemCount > 0) {
      const positionedItem = this.buildItem(this.props.positionedIndex);
      positionedItem.setAttribute('data-positioned', 'true');
      container.appendChild(positionedItem);
    }

    // Build items after positioned index
    if (this.props.positionedIndex < this.props.itemCount - 1) {
      for (let i = this.props.positionedIndex + 1; i < this.props.itemCount; i++) {
        if (this.props.separatorBuilder) {
          const separator = this.props.separatorBuilder(i - 1);
          container.appendChild(separator);
        }
        
        const item = this.buildItem(i);
        container.appendChild(item);
      }
    }

    // Apply initial positioning
    this.scrollToPositionedItem();
  }

  private buildItem(index: number): HTMLElement {
    const itemContainer = document.createElement('div');
    itemContainer.className = 'positioned-list-item';
    itemContainer.setAttribute('data-index', index.toString());
    
    if (this.props.addRepaintBoundaries) {
      itemContainer.style.contain = 'layout style paint';
    }

    const item = this.props.itemBuilder(index);
    
    if (this.props.addSemanticIndexes) {
      item.setAttribute('aria-setsize', this.props.itemCount.toString());
      item.setAttribute('aria-posinset', (index + 1).toString());
    }

    itemContainer.appendChild(item);
    this.elementRegistry.registerElement(itemContainer, index);
    
    return itemContainer;
  }

  private scrollToPositionedItem(): void {
    const positionedElement = this.element.querySelector('[data-positioned="true"]') as HTMLElement;
    if (!positionedElement) return;

    const containerRect = this.element.getBoundingClientRect();
    const itemRect = positionedElement.getBoundingClientRect();

    if (this.props.scrollDirection === 'vertical') {
      const targetScrollTop = positionedElement.offsetTop - 
        (containerRect.height * this.props.alignment);
      this.element.scrollTop = Math.max(0, targetScrollTop);
    } else {
      const targetScrollLeft = positionedElement.offsetLeft - 
        (containerRect.width * this.props.alignment);
      this.element.scrollLeft = Math.max(0, targetScrollLeft);
    }
  }

  private setupScrollListener(): void {
    this.scrollController.addEventListener('scroll', this.scrollListener);
  }

  private schedulePositionNotificationUpdate(): void {
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      requestAnimationFrame(() => {
        this.updateItemPositions();
        this.updateScheduled = false;
      });
    }
  }

  private updateItemPositions(): void {
    if (!this.props.itemPositionsNotifier) return;

    const positions: ItemPosition[] = [];
    const containerRect = this.element.getBoundingClientRect();
    const registeredElements = this.elementRegistry.getElements();

    for (const [element, index] of registeredElements) {
      const itemRect = element.getBoundingClientRect();
      
      if (this.props.scrollDirection === 'vertical') {
        const viewportHeight = containerRect.height;
        const itemTop = itemRect.top - containerRect.top;
        const itemBottom = itemRect.bottom - containerRect.top;
        
        positions.push({
          index,
          itemLeadingEdge: itemTop / viewportHeight,
          itemTrailingEdge: itemBottom / viewportHeight
        });
      } else {
        const viewportWidth = containerRect.width;
        const itemLeft = itemRect.left - containerRect.left;
        const itemRight = itemRect.right - containerRect.left;
        
        positions.push({
          index,
          itemLeadingEdge: this.props.reverse 
            ? (viewportWidth - itemRight) / viewportWidth
            : itemLeft / viewportWidth,
          itemTrailingEdge: this.props.reverse
            ? (viewportWidth - itemLeft) / viewportWidth
            : itemRight / viewportWidth
        });
      }
    }

    this.props.itemPositionsNotifier.updatePositions(positions);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  scrollToIndex(index: number, alignment: number = 0): void {
    const itemElement = this.element.querySelector(`[data-index="${index}"]`) as HTMLElement;
    if (!itemElement) return;

    const containerRect = this.element.getBoundingClientRect();
    
    if (this.props.scrollDirection === 'vertical') {
      const targetScrollTop = itemElement.offsetTop - (containerRect.height * alignment);
      this.element.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
    } else {
      const targetScrollLeft = itemElement.offsetLeft - (containerRect.width * alignment);
      this.element.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: 'smooth' });
    }
  }

  jumpToIndex(index: number, alignment: number = 0): void {
    const itemElement = this.element.querySelector(`[data-index="${index}"]`) as HTMLElement;
    if (!itemElement) return;

    const containerRect = this.element.getBoundingClientRect();
    
    if (this.props.scrollDirection === 'vertical') {
      const targetScrollTop = itemElement.offsetTop - (containerRect.height * alignment);
      this.element.scrollTop = Math.max(0, targetScrollTop);
    } else {
      const targetScrollLeft = itemElement.offsetLeft - (containerRect.width * alignment);
      this.element.scrollLeft = Math.max(0, targetScrollLeft);
    }
  }

  destroy(): void {
    this.scrollController.removeEventListener('scroll', this.scrollListener);
    this.elementRegistry.destroy();
  }
}