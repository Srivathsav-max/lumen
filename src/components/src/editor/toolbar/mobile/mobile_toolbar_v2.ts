import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EditorState, Selection, SelectionType } from '../../../core';
import { MobileToolbarItem, MobileToolbarWidgetService, isMobileToolbarActionItem } from './mobile_toolbar_item';
import { MobileToolbarTheme, MobileToolbarThemeData, defaultMobileToolbarTheme } from './mobile_toolbar_style';
import { MobileToolbarItemMenu } from './utils/mobile_toolbar_item_menu';

const selectionExtraInfoDisableMobileToolbarKey = 'disableMobileToolbar';

export interface MobileToolbarV2Props {
  editorState: EditorState;
  toolbarItems: MobileToolbarItem[];
  children: React.ReactNode;
  theme?: Partial<MobileToolbarThemeData>;
}

export const MobileToolbarV2: React.FC<MobileToolbarV2Props> = ({
  editorState,
  toolbarItems,
  children,
  theme = {},
}) => {
  const [toolbarOverlay, setToolbarOverlay] = useState<HTMLElement | null>(null);
  const [isKeyboardShow, setIsKeyboardShow] = useState(false);
  const keyboardHeightRef = useRef(0);

  const mergedTheme = {
    ...defaultMobileToolbarTheme,
    ...theme,
  };

  const onKeyboardHeightChanged = useCallback((height: number) => {
    keyboardHeightRef.current = height;
    setIsKeyboardShow(height > 0);
  }, []);

  const removeKeyboardToolbar = useCallback(() => {
    if (toolbarOverlay) {
      document.body.removeChild(toolbarOverlay);
      setToolbarOverlay(null);
    }
  }, [toolbarOverlay]);

  const insertKeyboardToolbar = useCallback(() => {
    removeKeyboardToolbar();

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      pointer-events: auto;
    `;

    document.body.appendChild(overlay);
    setToolbarOverlay(overlay);
  }, [removeKeyboardToolbar]);

  useEffect(() => {
    insertKeyboardToolbar();

    // Simulate keyboard height observer
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const keyboardHeight = Math.max(0, windowHeight - viewportHeight);
      onKeyboardHeightChanged(keyboardHeight);
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      removeKeyboardToolbar();
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [insertKeyboardToolbar, removeKeyboardToolbar, onKeyboardHeightChanged]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1 }}>
        {children}
      </div>
      <div style={{ height: isKeyboardShow ? mergedTheme.toolbarHeight : 0 }} />
      {toolbarOverlay && (
        <MobileToolbarPortal
          container={toolbarOverlay}
          editorState={editorState}
          toolbarItems={toolbarItems}
          theme={mergedTheme}
        />
      )}
    </div>
  );
};

interface MobileToolbarPortalProps {
  container: HTMLElement;
  editorState: EditorState;
  toolbarItems: MobileToolbarItem[];
  theme: MobileToolbarThemeData;
}

const MobileToolbarPortal: React.FC<MobileToolbarPortalProps> = ({
  container,
  editorState,
  toolbarItems,
  theme,
}) => {
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      setSelection(editorState.selection);
    };

    editorState.selectionNotifier.addListener(handleSelectionChange);
    return () => editorState.selectionNotifier.removeListener(handleSelectionChange);
  }, [editorState]);

  if (!selection || editorState.selectionExtraInfo?.[selectionExtraInfoDisableMobileToolbarKey] === true) {
    return null;
  }

  return (
    <MobileToolbarTheme theme={theme}>
      <MobileToolbarInternal
        editorState={editorState}
        toolbarItems={toolbarItems}
      />
    </MobileToolbarTheme>
  );
};

interface MobileToolbarInternalProps {
  editorState: EditorState;
  toolbarItems: MobileToolbarItem[];
}

const MobileToolbarInternal: React.FC<MobileToolbarInternalProps> = ({
  editorState,
  toolbarItems,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState<number | null>(null);
  const [canUpdateCachedKeyboardHeight, setCanUpdateCachedKeyboardHeight] = useState(true);
  const [cachedKeyboardHeight, setCachedKeyboardHeight] = useState(0);
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null);
  const [closeKeyboardInitiative, setCloseKeyboardInitiative] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const service: MobileToolbarWidgetService = {
    closeMenu: () => setShowMenu(false),
    openMenu: (menuContent) => setShowMenu(true),
    isMenuOpen: showMenu,
  };

  const closeItemMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  const showItemMenu = useCallback(() => {
    setShowMenu(true);
  }, []);

  const onKeyboardHeightChanged = useCallback((height: number) => {
    if (!closeKeyboardInitiative && 
        cachedKeyboardHeight !== 0 && 
        !showMenu && 
        height === 0) {
      editorState.selection = null;
    }

    if (canUpdateCachedKeyboardHeight) {
      setCachedKeyboardHeight(height);
    }

    if (height === 0) {
      setCloseKeyboardInitiative(false);
    }
  }, [closeKeyboardInitiative, cachedKeyboardHeight, showMenu, canUpdateCachedKeyboardHeight, editorState]);

  const showKeyboard = useCallback(() => {
    const selection = editorState.selection;
    if (selection) {
      editorState.service.keyboardService?.enableKeyBoard(selection);
    }
  }, [editorState]);

  const closeKeyboard = useCallback(() => {
    editorState.service.keyboardService?.closeKeyboard();
  }, [editorState]);

  useEffect(() => {
    if (currentSelection !== editorState.selection) {
      setCurrentSelection(editorState.selection);
      closeItemMenu();
    }
  }, [editorState.selection, currentSelection, closeItemMenu]);

  const handleItemWithActionPressed = useCallback((index: number) => {
    if (showMenu) {
      closeItemMenu();
      showKeyboard();
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        setCanUpdateCachedKeyboardHeight(true);
      }, 500);
    }
  }, [showMenu, closeItemMenu, showKeyboard]);

  const handleItemWithMenuPressed = useCallback((index: number) => {
    if (selectedMenuIndex === index && showMenu) {
      closeItemMenu();
      showKeyboard();
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        setCanUpdateCachedKeyboardHeight(true);
      }, 500);
    } else {
      setCanUpdateCachedKeyboardHeight(false);
      setSelectedMenuIndex(index);
      setCloseKeyboardInitiative(true);
      showItemMenu();
      closeKeyboard();
    }
  }, [selectedMenuIndex, showMenu, closeItemMenu, showKeyboard, showItemMenu, closeKeyboard]);

  const handleCloseButtonPressed = useCallback(() => {
    if (showMenu) {
      closeItemMenu();
      showKeyboard();
    } else {
      setCloseKeyboardInitiative(true);
      editorState.selection = null;
    }
  }, [showMenu, closeItemMenu, showKeyboard, editorState]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <MobileToolbarComponent
        editorState={editorState}
        toolbarItems={toolbarItems}
        service={service}
        showMenu={showMenu}
        onItemWithActionPressed={handleItemWithActionPressed}
        onItemWithMenuPressed={handleItemWithMenuPressed}
        onClosePressed={handleCloseButtonPressed}
      />
      <div style={{ height: cachedKeyboardHeight }}>
        {showMenu && selectedMenuIndex !== null && (
          <MobileToolbarItemMenu
            editorState={editorState}
            itemMenuBuilder={() => {
              const item = toolbarItems[selectedMenuIndex];
              if (item.type === 'menu') {
                return item.itemMenuBuilder(React.createContext({}), editorState, service);
              }
              return null;
            }}
          />
        )}
      </div>
    </div>
  );
};

interface MobileToolbarComponentProps {
  editorState: EditorState;
  toolbarItems: MobileToolbarItem[];
  service: MobileToolbarWidgetService;
  showMenu: boolean;
  onItemWithActionPressed: (index: number) => void;
  onItemWithMenuPressed: (index: number) => void;
  onClosePressed: () => void;
}

const MobileToolbarComponent: React.FC<MobileToolbarComponentProps> = ({
  editorState,
  toolbarItems,
  service,
  showMenu,
  onItemWithActionPressed,
  onItemWithMenuPressed,
  onClosePressed,
}) => {
  const theme = React.useContext(MobileToolbarTheme);

  return (
    <div
      style={{
        width: '100%',
        height: theme.toolbarHeight,
        borderTop: `1px solid ${theme.itemOutlineColor}`,
        borderBottom: `1px solid ${theme.itemOutlineColor}`,
        backgroundColor: theme.backgroundColor,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1, display: 'flex', overflowX: 'auto' }}>
        <ToolbarItemListView
          toolbarItems={toolbarItems}
          editorState={editorState}
          service={service}
          onItemWithActionPressed={onItemWithActionPressed}
          onItemWithMenuPressed={onItemWithMenuPressed}
        />
      </div>
      <div
        style={{
          width: '1px',
          height: '100%',
          backgroundColor: theme.itemOutlineColor,
          margin: '8px 0',
        }}
      />
      <button
        style={{
          background: 'none',
          border: 'none',
          padding: '8px',
          cursor: 'pointer',
          color: theme.iconColor,
        }}
        onClick={onClosePressed}
      >
        {showMenu ? '✕' : '⌨'}
      </button>
    </div>
  );
};

interface ToolbarItemListViewProps {
  toolbarItems: MobileToolbarItem[];
  editorState: EditorState;
  service: MobileToolbarWidgetService;
  onItemWithActionPressed: (index: number) => void;
  onItemWithMenuPressed: (index: number) => void;
}

const ToolbarItemListView: React.FC<ToolbarItemListViewProps> = ({
  toolbarItems,
  editorState,
  service,
  onItemWithActionPressed,
  onItemWithMenuPressed,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {toolbarItems.map((item, index) => {
        const icon = item.itemIconBuilder(React.createContext({}), editorState, service);
        if (!icon) return null;

        return (
          <button
            key={index}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => {
              if (item.type === 'menu') {
                onItemWithMenuPressed(index);
              } else {
                onItemWithActionPressed(index);
                service.closeMenu?.();
                item.actionHandler(React.createContext({}), editorState);
              }
            }}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
};