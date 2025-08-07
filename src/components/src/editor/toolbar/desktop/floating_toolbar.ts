import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EditorState, Selection, SelectionType, ToolbarItem } from '../../../core';
import { FloatingToolbarWidget } from './floating_toolbar_widget';
import { ToolbarTooltipBuilder, PlaceHolderItemBuilder } from '../toolbar';

export interface FloatingToolbarStyle {
  backgroundColor?: string;
  toolbarActiveColor?: string;
  toolbarIconColor?: string;
  toolbarShadowColor?: string;
  toolbarElevation?: number;
}

export const defaultFloatingToolbarStyle: FloatingToolbarStyle = {
  backgroundColor: '#000000',
  toolbarActiveColor: '#87CEEB',
  toolbarIconColor: '#FFFFFF',
  toolbarShadowColor: undefined,
  toolbarElevation: 0,
};

export type FloatingToolbarBuilder = (
  context: React.Context<any>,
  child: React.ReactNode,
  onDismiss: () => void,
  isMetricsChanged: boolean
) => React.ReactNode;

export interface FloatingToolbarProps {
  items: ToolbarItem[];
  editorState: EditorState;
  editorScrollController: any; // EditorScrollController type
  textDirection?: 'ltr' | 'rtl';
  children: React.ReactNode;
  style?: FloatingToolbarStyle;
  tooltipBuilder?: ToolbarTooltipBuilder;
  floatingToolbarHeight?: number;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  decoration?: React.CSSProperties;
  placeHolderBuilder?: PlaceHolderItemBuilder;
  toolbarBuilder?: FloatingToolbarBuilder;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  items,
  editorState,
  editorScrollController,
  textDirection = 'ltr',
  children,
  style = defaultFloatingToolbarStyle,
  tooltipBuilder,
  floatingToolbarHeight = 32,
  padding,
  decoration,
  placeHolderBuilder,
  toolbarBuilder,
}) => {
  const [toolbarContainer, setToolbarContainer] = useState<HTMLElement | null>(null);
  const [toolbarWidget, setToolbarWidget] = useState<React.ReactNode | null>(null);
  const [hasMetricsChanged, setHasMetricsChanged] = useState(false);
  const [lastSelection, setLastSelection] = useState<Selection | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const finalStyle = useMemo(() => ({
    ...defaultFloatingToolbarStyle,
    ...style,
  }), [style]);

  const clear = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (toolbarContainer) {
      document.body.removeChild(toolbarContainer);
      setToolbarContainer(null);
    }
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
      return { left: editorRect.left + threshold, top };
    } else {
      // Show on right
      return { right: editorRect.right - rect.right, top };
    }
  }, [editorState, floatingToolbarHeight]);

  const buildToolbar = useCallback((context: React.Context<any>): React.ReactNode => {
    const newToolbarWidget = (
      <FloatingToolbarWidget
        items={items}
        editorState={editorState}
        backgroundColor={finalStyle.backgroundColor!}
        toolbarActiveColor={finalStyle.toolbarActiveColor!}
        toolbarIconColor={finalStyle.toolbarIconColor!}
        toolbarElevation={finalStyle.toolbarElevation!}
        toolbarShadowColor={finalStyle.toolbarShadowColor}
        textDirection={textDirection}
        tooltipBuilder={tooltipBuilder}
        floatingToolbarHeight={floatingToolbarHeight}
        padding={padding}
        decoration={decoration}
        placeHolderBuilder={placeHolderBuilder}
      />
    );

    setToolbarWidget(newToolbarWidget);
    return newToolbarWidget;
  }, [
    items,
    editorState,
    finalStyle,
    textDirection,
    tooltipBuilder,
    floatingToolbarHeight,
    padding,
    decoration,
    placeHolderBuilder,
  ]);

  const showToolbar = useCallback((isMetricsChanged: boolean) => {
    const selection = editorState.selection;
    if (!selection || selection.isCollapsed) {
      return;
    }

    if (editorState.selectionExtraInfo?.disableToolbar === true) {
      return;
    }

    if (!editorState.editable) {
      return;
    }

    // Check if content is visible
    const nodes = editorState.getSelectedNodes();
    if (!nodes || nodes.length === 0 ||
        nodes.every(node => {
          const delta = node.delta;
          return !delta || delta.length === 0;
        })) {
      return;
    }

    const rects = editorState.selectionRects();
    if (!rects || rects.length === 0) {
      return;
    }

    const rect = findSuitableRect(rects);
    const { left, top, right } = calculateToolbarOffset(rect);

    // If selection is not visible, don't show toolbar
    if ((top <= floatingToolbarHeight || (left === 0 && right === 0)) && toolbarBuilder) {
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
      ${left !== undefined ? `left: ${left}px;` : ''}
      ${top !== undefined ? `top: ${Math.max(0, top) - floatingToolbarHeight}px;` : ''}
      ${right !== undefined ? `right: ${right}px;` : ''}
      pointer-events: auto;
    `;

    const child = buildToolbar(React.createContext({}));
    
    if (toolbarBuilder) {
      const customToolbar = toolbarBuilder(
        React.createContext({}),
        child,
        clear,
        isMetricsChanged
      );
      // Render custom toolbar
    } else {
      // Render default positioned toolbar
      overlay.appendChild(toolbarElement);
    }

    document.body.appendChild(overlay);
    setToolbarContainer(overlay);
  }, [
    editorState,
    floatingToolbarHeight,
    findSuitableRect,
    calculateToolbarOffset,
    toolbarBuilder,
    buildToolbar,
    clear,
  ]);

  const showAfterDelay = useCallback((
    duration = 0,
    isMetricsChanged = false
  ) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      clear();
      showToolbar(isMetricsChanged);
    }, duration);
  }, [clear, showToolbar]);

  const onSelectionChanged = useCallback(() => {
    const selection = editorState.selection;
    const selectionType = editorState.selectionType;
    
    if (lastSelection === selection) return;
    setLastSelection(selection);

    if (!selection ||
        selection.isCollapsed ||
        selectionType === SelectionType.block ||
        editorState.selectionExtraInfo?.disableToolbar === true) {
      clear();
    } else {
      showAfterDelay(200, hasMetricsChanged);
      if (hasMetricsChanged) {
        setHasMetricsChanged(false);
      }
    }
  }, [editorState, lastSelection, hasMetricsChanged, clear, showAfterDelay]);

  const onScrollPositionChanged = useCallback(() => {
    clear();
    showAfterDelay();
  }, [clear, showAfterDelay]);

  useEffect(() => {
    const handleResize = () => {
      setHasMetricsChanged(true);
      showAfterDelay(0, true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showAfterDelay]);

  useEffect(() => {
    editorState.selectionNotifier.addListener(onSelectionChanged);
    editorScrollController.offsetNotifier?.addListener(onScrollPositionChanged);

    return () => {
      editorState.selectionNotifier.removeListener(onSelectionChanged);
      editorScrollController.offsetNotifier?.removeListener(onScrollPositionChanged);
      clear();
    };
  }, [editorState, editorScrollController, onSelectionChanged, onScrollPositionChanged, clear]);

  return <>{children}</>;
};