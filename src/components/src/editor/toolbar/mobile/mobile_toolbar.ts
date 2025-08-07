import React, { useState, useEffect, useCallback } from 'react';
import { EditorState, Selection } from '../../../core';
import { MobileToolbarItem, MobileToolbarWidgetService, isMobileToolbarActionItem } from './mobile_toolbar_item';
import { MobileToolbarTheme, MobileToolbarThemeData, defaultMobileToolbarTheme } from './mobile_toolbar_style';
import { MobileToolbarItemMenu } from './utils/mobile_toolbar_item_menu';

export interface MobileToolbarProps {
  editorState: EditorState;
  toolbarItems: MobileToolbarItem[];
  theme?: Partial<MobileToolbarThemeData>;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  editorState,
  toolbarItems,
  theme = {},
}) => {
  const [selection, setSelection] = useState<Selection | null>(null);

  const mergedTheme = {
    ...defaultMobileToolbarTheme,
    ...theme,
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      setSelection(editorState.selection);
    };

    editorState.selectionNotifier.addListener(handleSelectionChange);
    return () => editorState.selectionNotifier.removeListener(handleSelectionChange);
  }, [editorState]);

  if (!selection) {
    return null;
  }

  return (
    <MobileToolbarTheme theme={mergedTheme}>
      <MobileToolbarWidget
        editorState={editorState}
        selection={selection}
        toolbarItems={toolbarItems}
      />
    </MobileToolbarTheme>
  );
};

export interface MobileToolbarWidgetProps {
  editorState: EditorState;
  toolbarItems: MobileToolbarItem[];
  selection: Selection;
}

export const MobileToolbarWidget: React.FC<MobileToolbarWidgetProps> = ({
  editorState,
  toolbarItems,
  selection,
}) => {
  const [showItemMenu, setShowItemMenu] = useState(false);
  const [selectedToolbarItemIndex, setSelectedToolbarItemIndex] = useState<number | null>(null);
  const [previousKeyboardHeight, setPreviousKeyboardHeight] = useState(0);
  const [updateKeyboardHeight, setUpdateKeyboardHeight] = useState(true);

  const service: MobileToolbarWidgetService = {
    closeMenu: () => {
      if (showItemMenu) {
        setShowItemMenu(false);
      }
    },
    openMenu: () => setShowItemMenu(true),
    isMenuOpen: showItemMenu,
  };

  const closeItemMenu = useCallback(() => {
    service.closeMenu?.();
  }, [service]);

  useEffect(() => {
    // Simulate keyboard height detection
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const keyboardHeight = Math.max(0, windowHeight - viewportHeight);
      
      if (updateKeyboardHeight) {
        setPreviousKeyboardHeight(keyboardHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [updateKeyboardHeight]);

  const handleItemWithMenuPressed = useCallback((selectedItemIndex: number) => {
    setUpdateKeyboardHeight(false);
    
    if (selectedToolbarItemIndex === selectedItemIndex) {
      // Toggle menu if same item is selected
      const newShowMenu = !showItemMenu;
      setShowItemMenu(newShowMenu);
      
      if (!newShowMenu) {
        editorState.service.keyboardService?.enableKeyBoard(selection);
      } else {
        setUpdateKeyboardHeight(false);
        editorState.service.keyboardService?.closeKeyboard();
      }
    } else {
      // Show menu for new item
      setSelectedToolbarItemIndex(selectedItemIndex);
      setShowItemMenu(true);
      editorState.service.keyboardService?.closeKeyboard();
    }
  }, [selectedToolbarItemIndex, showItemMenu, editorState, selection]);

  const handleCloseMenuPressed = useCallback(() => {
    setShowItemMenu(false);
    editorState.service.keyboardService?.enableKeyBoard(selection);
  }, [editorState, selection]);

  const handleQuitEditingPressed = useCallback(() => {
    editorState.selection = null;
  }, [editorState]);

  return (
    <MobileToolbarTheme>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <MobileToolbarContainer
          editorState={editorState}
          selection={selection}
          toolbarItems={toolbarItems}
          service={service}
          showItemMenu={showItemMenu}
          onItemWithMenuPressed={handleItemWithMenuPressed}
          onCloseMenuPressed={handleCloseMenuPressed}
          onQuitEditingPressed={handleQuitEditingPressed}
        />
        <div style={{ minHeight: previousKeyboardHeight }}>
          {showItemMenu && selectedToolbarItemIndex !== null && (
            <MobileToolbarItemMenu
              editorState={editorState}
              itemMenuBuilder={() => {
                const item = toolbarItems[selectedToolbarItemIndex];
                if (item.type === 'menu') {
                  return item.itemMenuBuilder(React.createContext({}), editorState, service) || null;
                }
                return null;
              }}
            />
          )}
        </div>
      </div>
    </MobileToolbarTheme>
  );
};

interface MobileToolbarContainerProps {
  editorState: EditorState;
  selection: Selection;
  toolbarItems: MobileToolbarItem[];
  service: MobileToolbarWidgetService;
  showItemMenu: boolean;
  onItemWithMenuPressed: (index: number) => void;
  onCloseMenuPressed: () => void;
  onQuitEditingPressed: () => void;
}

const MobileToolbarContainer: React.FC<MobileToolbarContainerProps> = ({
  editorState,
  selection,
  toolbarItems,
  service,
  showItemMenu,
  onItemWithMenuPressed,
  onCloseMenuPressed,
  onQuitEditingPressed,
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
      <div style={{ flex: 1 }}>
        <ToolbarItemListView
          editorState={editorState}
          selection={selection}
          toolbarItems={toolbarItems}
          service={service}
          onItemWithMenuPressed={onItemWithMenuPressed}
        />
      </div>
      <div
        style={{
          width: '1px',
          height: 'calc(100% - 16px)',
          backgroundColor: theme.itemOutlineColor,
          margin: '8px 0',
        }}
      />
      {showItemMenu ? (
        <button
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            color: theme.iconColor,
          }}
          onClick={onCloseMenuPressed}
        >
          ✕
        </button>
      ) : (
        <button
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            color: theme.iconColor,
          }}
          onClick={onQuitEditingPressed}
        >
          ⌨
        </button>
      )}
    </div>
  );
};

interface ToolbarItemListViewProps {
  editorState: EditorState;
  selection: Selection;
  toolbarItems: MobileToolbarItem[];
  service: MobileToolbarWidgetService;
  onItemWithMenuPressed: (index: number) => void;
}

const ToolbarItemListView: React.FC<ToolbarItemListViewProps> = ({
  editorState,
  selection,
  toolbarItems,
  service,
  onItemWithMenuPressed,
}) => {
  return (
    <div style={{ display: 'flex', overflowX: 'auto', alignItems: 'center' }}>
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