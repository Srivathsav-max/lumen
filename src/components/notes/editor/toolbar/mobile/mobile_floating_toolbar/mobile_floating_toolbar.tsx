import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EditorState, Selection, SelectionType, SelectionUpdateReason } from '../../../../core';
import { MobileSelectionDragMode, selectionDragModeKey } from '../../../editor_component/service/selection/mobile_selection_service';

const selectionExtraInfoDisableFloatingToolbar = 'disableFloatingToolbar';

export interface MobileFloatingToolbarItem {
  builder: () => React.ReactNode;
}

export interface MobileFloatingToolbarProps {
  editorState: EditorState;
  editorScrollController: any; // EditorScrollController type
  children: React.ReactNode;
  floatingToolbarHeight: number;
  toolbarBuilder: (
    context: React.Context<any>,
    anchor: { x: number; y: number },
    closeToolbar: () => void
  ) => React.ReactNode;
}

export const MobileFloatingToolbar: React.FC<MobileFloatingToolbarProps> = ({
  editorState,
  editorScrollController,
  children,
  floatingToolbarHeight,
  toolbarBuilder,
}) => {
  const [toolbarContainer, setToolbarContainer] = useState<HTMLElement | null>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [prevSelection, setPrevSelection] = useState<Selection | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onScrollEndRef = useRef<(() => void) | null>(null);

  const clear = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (toolbarContainer) {
      document.body.removeChild(toolbarContainer);
      setToolbarContainer(null);
    }
    setIsToolbarVisible(false);
    setPrevSelection(null);
  }, [toolbarContainer]);

  const findSuitableRect = useCallback((rects: DOMRect[]): DOMRect => {
    if (rects.length === 0) return new DOMRect();

    const editorRect = editorState.renderBox?.getBoundingClientRect();
    if (!editorRect) return new DOMRect();

    // Find rects with non-negative top position relative to editor
    const rectsWithNonNegativeDy = rects.filter(
      rect => rect.top >= editorRect.top
    );

    if (rectsWithNonNegativeDy.length === 0) {
      return new DOMRect(); // Selection not visible
    }

    // Find the minimum rect by top position
    return rectsWithNonNegativeDy.reduce((min, current) => {
      if (min.top < current.top) {
        return min;
      } else if (min.top === current.top) {
        return min.left < current.left ? min : current;
      } else {
        return current;
      }
    });
  }, [editorState]);

  const calculateToolbarOffset = useCallback((rect: DOMRect): {
    left?: number;
    top: number;
    right?: number;
  } => {
    const editorRect = editorState.renderBox?.getBoundingClientRect();
    if (!editorRect) return { top: 0 };

    const left = Math.abs(rect.left - editorRect.left);
    const right = Math.abs(rect.right - editorRect.left);
    const width = editorRect.width;
    const threshold = width / 3.0;
    const top = rect.top < floatingToolbarHeight
      ? rect.bottom + floatingToolbarHeight
      : rect.top;

    if (left <= threshold) {
      // Show on left
      return { left: rect.left, top };
    } else if (left >= threshold && right <= threshold * 2.0) {
      // Show in center
      return { left: threshold, top };
    } else {
      // Show on right
      return { right: editorRect.right - rect.right, top };
    }
  }, [editorState, floatingToolbarHeight]);

  const buildToolbar = useCallback((
    context: React.Context<any>,
    offset: { x: number; y: number }
  ): React.ReactNode => {
    return toolbarBuilder(context, offset, clear);
  }, [toolbarBuilder, clear]);

  const showToolbar = useCallback(() => {
    const rects = editorState.selectionRects();
    if (!rects || rects.length === 0) {
      return;
    }

    const rect = findSuitableRect(rects);
    // Empty is determined only if there is only one selection area
    if (rects.length <= 1 && (rect.width === 0 && rect.height === 0)) {
      return;
    }

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 1000;
    `;

    const toolbarElement = document.createElement('div');
    toolbarElement.style.cssText = `
      position: absolute;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top}px;
      pointer-events: auto;
    `;

    const toolbar = buildToolbar(
      React.createContext({}),
      { x: rect.left + rect.width / 2, y: rect.top }
    );

    overlay.appendChild(toolbarElement);
    document.body.appendChild(overlay);
    setToolbarContainer(overlay);
    setIsToolbarVisible(true);
  }, [editorState, findSuitableRect, buildToolbar]);

  const showAfterDelay = useCallback((duration = 0) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      clear();
      showToolbar();
    }, duration);
  }, [clear, showToolbar]);

  const onSelectionChanged = useCallback(() => {
    const selection = editorState.selection;
    const selectionType = editorState.selectionType;
    
    if (!selection || selectionType === SelectionType.block) {
      clear();
    } else if (selection.isCollapsed) {
      if (isToolbarVisible) {
        clear();
      } else if (prevSelection === selection &&
                 editorState.selectionUpdateReason === SelectionUpdateReason.uiEvent &&
                 editorState.selectionExtraInfo?.[selectionExtraInfoDisableFloatingToolbar] !== true) {
        showAfterDelay();
      }
      setPrevSelection(selection);
    } else {
      clear();
      
      const dragMode = editorState.selectionExtraInfo?.[selectionDragModeKey];
      if ([
        MobileSelectionDragMode.leftSelectionHandle,
        MobileSelectionDragMode.rightSelectionHandle,
      ].includes(dragMode)) {
        return;
      }
      
      if (editorState.selectionExtraInfo?.[selectionExtraInfoDisableFloatingToolbar] !== true) {
        showAfterDelay();
      }
    }
  }, [editorState, isToolbarVisible, prevSelection, clear, showAfterDelay]);

  const onScrollPositionChanged = useCallback(() => {
    if (toolbarContainer) {
      document.body.removeChild(toolbarContainer);
      setToolbarContainer(null);
    }
    setPrevSelection(null);

    if (isToolbarVisible && !onScrollEndRef.current) {
      onScrollEndRef.current = () => showAfterDelay(50);
    }
  }, [toolbarContainer, isToolbarVisible, showAfterDelay]);

  useEffect(() => {
    editorState.selectionNotifier.addListener(onSelectionChanged);
    editorScrollController.offsetNotifier?.addListener(onScrollPositionChanged);

    return () => {
      editorState.selectionNotifier.removeListener(onSelectionChanged);
      editorScrollController.offsetNotifier?.removeListener(onScrollPositionChanged);
      clear();
    };
  }, [editorState, editorScrollController, onSelectionChanged, onScrollPositionChanged, clear]);

  useEffect(() => {
    const handleScroll = () => {
      if (onScrollEndRef.current) {
        onScrollEndRef.current();
        onScrollEndRef.current = null;
      }
    };

    // Simulate scroll end detection
    let scrollTimeout: NodeJS.Timeout;
    const handleScrollStart = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 150);
    };

    window.addEventListener('scroll', handleScrollStart, true);
    return () => {
      window.removeEventListener('scroll', handleScrollStart, true);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return <>{children}</>;
};