// Copyright 2019 The Fuchsia Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * A registry to track DOM elements in the tree.
 */
export class ElementRegistry {
  private registeredElements = new Map<HTMLElement, number>();
  private elementNotifier?: (elements: Set<HTMLElement>) => void;

  constructor(elementNotifier?: (elements: Set<HTMLElement>) => void) {
    this.elementNotifier = elementNotifier;
  }

  /**
   * Register an element with its associated index
   */
  registerElement(element: HTMLElement, index: number): void {
    this.registeredElements.set(element, index);
    this.notifyChange();
  }

  /**
   * Unregister an element
   */
  unregisterElement(element: HTMLElement): void {
    this.registeredElements.delete(element);
    this.notifyChange();
  }

  /**
   * Get all registered elements
   */
  getElements(): Map<HTMLElement, number> {
    return new Map(this.registeredElements);
  }

  /**
   * Get the set of registered elements
   */
  getElementSet(): Set<HTMLElement> {
    return new Set(this.registeredElements.keys());
  }

  /**
   * Clear all registered elements
   */
  clear(): void {
    this.registeredElements.clear();
    this.notifyChange();
  }

  /**
   * Get the index of a registered element
   */
  getElementIndex(element: HTMLElement): number | undefined {
    return this.registeredElements.get(element);
  }

  /**
   * Check if an element is registered
   */
  hasElement(element: HTMLElement): boolean {
    return this.registeredElements.has(element);
  }

  private notifyChange(): void {
    if (this.elementNotifier) {
      this.elementNotifier(this.getElementSet());
    }
  }

  destroy(): void {
    this.registeredElements.clear();
    this.elementNotifier = undefined;
  }
}

/**
 * A widget-like wrapper that provides element registry functionality
 */
export class RegistryWidget {
  private elementRegistry: ElementRegistry;
  private element: HTMLElement;

  constructor(child: HTMLElement, elementNotifier?: (elements: Set<HTMLElement>) => void) {
    this.elementRegistry = new ElementRegistry(elementNotifier);
    this.element = this.createElement(child);
  }

  private createElement(child: HTMLElement): HTMLElement {
    const container = document.createElement('div');
    container.className = 'registry-widget';
    container.appendChild(child);
    return container;
  }

  getElementRegistry(): ElementRegistry {
    return this.elementRegistry;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.elementRegistry.destroy();
  }
}

/**
 * A widget whose element will be added to its nearest ancestor RegistryWidget
 */
export class RegisteredElementWidget {
  private element: HTMLElement;
  private registry?: ElementRegistry;
  private index: number;

  constructor(child: HTMLElement, index: number, registry?: ElementRegistry) {
    this.index = index;
    this.registry = registry;
    this.element = this.createElement(child);
    
    if (this.registry) {
      this.registry.registerElement(this.element, this.index);
    }
  }

  private createElement(child: HTMLElement): HTMLElement {
    const container = document.createElement('div');
    container.className = 'registered-element-widget';
    container.setAttribute('data-registry-index', this.index.toString());
    container.appendChild(child);
    return container;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  getIndex(): number {
    return this.index;
  }

  updateIndex(newIndex: number): void {
    if (this.registry) {
      this.registry.unregisterElement(this.element);
      this.index = newIndex;
      this.element.setAttribute('data-registry-index', this.index.toString());
      this.registry.registerElement(this.element, this.index);
    } else {
      this.index = newIndex;
      this.element.setAttribute('data-registry-index', this.index.toString());
    }
  }

  destroy(): void {
    if (this.registry) {
      this.registry.unregisterElement(this.element);
    }
    this.registry = undefined;
  }
}