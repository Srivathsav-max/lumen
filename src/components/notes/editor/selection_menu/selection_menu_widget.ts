import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EditorState, Node, Path, Selection } from '../../core';
import { SelectionMenuService } from './selection_menu_service';

export type SelectionMenuItemHandler = (
  editorState: EditorState,
  menuService: SelectionMenuService,
  context: React.Context<any>
) => void;

export type SelectionMenuItemNameBuilder = (
  name: string,
  style: SelectionMenuStyle,
  isSelected: boolean
) => React.ReactNode;

export interface SelectionMenuItem {
  getName: () => string;
  icon: (
    editorState: EditorState,
    isSelected: boolean,
    style: SelectionMenuStyle
  ) => React.ReactNode;
  keywords: string[];
  handler: SelectionMenuItemHandler;
  nameBuilder?: SelectionMenuItemNameBuilder;
  deleteKeywords?: boolean;
  deleteSlash?: boolean;
  onSelected?: () => void;
  allKeywords?: string[];
}

export class SelectionMenuStyle {
  static readonly light = new SelectionMenuStyle({
    selectionMenuBackgroundColor: '#FFFFFF',
    selectionMenuItemTextColor: '#333333',
    selectionMenuItemIconColor: '#333333',
    selectionMenuItemSelectedTextColor: '#385BF7',
    selectionMenuItemSelectedIconColor: '#385BF7',
    selectionMenuItemSelectedColor: '#E0F8FF',
    selectionMenuUnselectedLabelColor: '#333333',
    selectionMenuDividerColor: '#00BCF0',
    selectionMenuLinkBorderColor: '#00BCF0',
    selectionMenuInvalidLinkColor: '#E53935',
    selectionMenuButtonColor: '#00BCF0',
    selectionMenuButtonTextColor: '#333333',
    selectionMenuButtonIconColor: '#333333',
    selectionMenuButtonBorderColor: '#00BCF0',
    selectionMenuTabIndicatorColor: '#00BCF0',
  });

  static readonly dark = new SelectionMenuStyle({
    selectionMenuBackgroundColor: '#282E3A',
    selectionMenuItemTextColor: '#BBC3CD',
    selectionMenuItemIconColor: '#BBC3CD',
    selectionMenuItemSelectedTextColor: '#131720',
    selectionMenuItemSelectedIconColor: '#131720',
    selectionMenuItemSelectedColor: '#00BCF0',
    selectionMenuUnselectedLabelColor: '#BBC3CD',
    selectionMenuDividerColor: '#3A3F44',
    selectionMenuLinkBorderColor: '#3A3F44',
    selectionMenuInvalidLinkColor: '#E53935',
    selectionMenuButtonColor: '#00BCF0',
    selectionMenuButtonTextColor: '#FFFFFF',
    selectionMenuButtonIconColor: '#FFFFFF',
    selectionMenuButtonBorderColor: '#00BCF0',
    selectionMenuTabIndicatorColor: '#00BCF0',
  });

  constructor(private colors: {
    selectionMenuBackgroundColor: string;
    selectionMenuItemTextColor: string;
    selectionMenuItemIconColor: string;
    selectionMenuItemSelectedTextColor: string;
    selectionMenuItemSelectedIconColor: string;
    selectionMenuItemSelectedColor: string;
    selectionMenuUnselectedLabelColor: string;
    selectionMenuDividerColor: string;
    selectionMenuLinkBorderColor: string;
    selectionMenuInvalidLinkColor: string;
    selectionMenuButtonColor: string;
    selectionMenuButtonTextColor: string;
    selectionMenuButtonIconColor: string;
    selectionMenuButtonBorderColor: string;
    selectionMenuTabIndicatorColor: string;
  }) {}

  get selectionMenuBackgroundColor() { return this.colors.selectionMenuBackgroundColor; }
  get selectionMenuItemTextColor() { return this.colors.selectionMenuItemTextColor; }
  get selectionMenuItemIconColor() { return this.colors.selectionMenuItemIconColor; }
  get selectionMenuItemSelectedTextColor() { return this.colors.selectionMenuItemSelectedTextColor; }
  get selectionMenuItemSelectedIconColor() { return this.colors.selectionMenuItemSelectedIconColor; }
  get selectionMenuItemSelectedColor() { return this.colors.selectionMenuItemSelectedColor; }
  get selectionMenuUnselectedLabelColor() { return this.colors.selectionMenuUnselectedLabelColor; }
  get selectionMenuDividerColor() { return this.colors.selectionMenuDividerColor; }
  get selectionMenuLinkBorderColor() { return this.colors.selectionMenuLinkBorderColor; }
  get selectionMenuInvalidLinkColor() { return this.colors.selectionMenuInvalidLinkColor; }
  get selectionMenuButtonColor() { return this.colors.selectionMenuButtonColor; }
  get selectionMenuButtonTextColor() { return this.colors.selectionMenuButtonTextColor; }
  get selectionMenuButtonIconColor() { return this.colors.selectionMenuButtonIconColor; }
  get selectionMenuButtonBorderColor() { return this.colors.selectionMenuButtonBorderColor; }
  get selectionMenuTabIndicatorColor() { return this.colors.selectionMenuTabIndicatorColor; }
}

export interface SelectionMenuWidgetProps {
  items: SelectionMenuItem[];
  itemCountFilter: number;
  maxItemInRow: number;
  menuService: SelectionMenuService;
  editorState: EditorState;
  onSelectionUpdate: () => void;
  onExit: () => void;
  selectionMenuStyle: SelectionMenuStyle;
  deleteSlashByDefault: boolean;
  singleColumn?: boolean;
  nameBuilder?: SelectionMenuItemNameBuilder;
}

export const SelectionMenuWidget: React.FC<SelectionMenuWidgetProps> = ({
  items,
  itemCountFilter,
  maxItemInRow,
  menuService,
  editorState,
  onSelectionUpdate,
  onExit,
  selectionMenuStyle,
  deleteSlashByDefault,
  singleColumn = false,
  nameBuilder,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showingItems, setShowingItems] = useState<SelectionMenuItem[]>(items);
  const [keyword, setKeyword] = useState('');
  const [searchCounter, setSearchCounter] = useState(0);
  const scrollControllerRef = useRef<HTMLDivElement>(null);

  const updateKeyword = useCallback((newKeyword: string) => {
    setKeyword(newKeyword);

    let maxKeywordLength = 0;
    const filteredItems = items.filter(item => {
      const allKeywords = [...item.keywords, item.getName().toLowerCase()];
      return allKeywords.some(kw => {
        const matches = kw.includes(newKeyword.toLowerCase());
        if (matches) {
          maxKeywordLength = Math.max(maxKeywordLength, kw.length);
        }
        return matches;
      });
    });

    if (newKeyword.length >= maxKeywordLength + 2 && 
        !(deleteSlashByDefault && searchCounter < 2)) {
      return onExit();
    }

    setShowingItems(filteredItems);

    if (filteredItems.length === 0) {
      setSearchCounter(prev => prev + 1);
    } else {
      setSearchCounter(0);
    }
  }, [items, deleteSlashByDefault, searchCounter, onExit]);

  const scrollToSelectedIndex = useCallback(() => {
    if (!scrollControllerRef.current) return;
    
    const selectedElement = scrollControllerRef.current.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  const handleKeyEvent = useCallback((event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.type !== 'keydown') return;

    const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

    if (event.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < showingItems.length) {
        showingItems[selectedIndex].handler(editorState, menuService, React.createContext({}));
        return;
      }
    } else if (event.key === 'Escape') {
      onExit();
      return;
    } else if (event.key === 'Backspace') {
      if (searchCounter > 0) {
        setSearchCounter(prev => prev - 1);
      }
      if (keyword.length === 0) {
        onExit();
      } else {
        updateKeyword(keyword.substring(0, keyword.length - 1));
      }
      deleteLastCharacters();
      return;
    } else if (event.key && !arrowKeys.includes(event.key) && event.key !== 'Tab') {
      updateKeyword(keyword + event.key);
      insertText(event.key);
      return;
    }

    let newSelectedIndex = selectedIndex;
    if (event.key === 'ArrowLeft') {
      newSelectedIndex -= maxItemInRow;
      if (newSelectedIndex < 0) {
        const lastRowStart = (showingItems.length - 1) - 
          ((showingItems.length - 1) % maxItemInRow);
        newSelectedIndex = lastRowStart + (selectedIndex % maxItemInRow);
        if (newSelectedIndex >= showingItems.length) {
          newSelectedIndex = showingItems.length - 1;
        }
      }
    } else if (event.key === 'ArrowRight') {
      newSelectedIndex += maxItemInRow;
      if (newSelectedIndex >= showingItems.length) {
        newSelectedIndex = selectedIndex % maxItemInRow;
        if (newSelectedIndex >= showingItems.length) {
          newSelectedIndex = showingItems.length - 1;
        }
      }
    } else if (event.key === 'ArrowUp') {
      if (newSelectedIndex > 0) {
        newSelectedIndex -= 1;
      } else {
        newSelectedIndex = showingItems.length - 1;
      }
    } else if (event.key === 'ArrowDown') {
      if (newSelectedIndex < showingItems.length - 1) {
        newSelectedIndex += 1;
      } else {
        newSelectedIndex = 0;
      }
    } else if (event.key === 'Tab') {
      newSelectedIndex += 1;
      if (newSelectedIndex >= showingItems.length) {
        newSelectedIndex = 0;
      }
    }

    if (newSelectedIndex !== selectedIndex) {
      setSelectedIndex(Math.max(0, Math.min(newSelectedIndex, showingItems.length - 1)));
      scrollToSelectedIndex();
    }
  }, [selectedIndex, showingItems, keyword, searchCounter, maxItemInRow, editorState, menuService, onExit, updateKeyword, scrollToSelectedIndex]);

  const deleteLastCharacters = useCallback((length = 1) => {
    const selection = editorState.selection;
    if (!selection || !selection.isCollapsed) return;

    const node = editorState.getNodeAtPath(selection.end.path);
    const delta = node?.delta;
    if (!node || !delta) return;

    onSelectionUpdate();
    const transaction = editorState.transaction;
    transaction.deleteText(node, selection.start.offset - length, length);
    editorState.apply(transaction);
  }, [editorState, onSelectionUpdate]);

  const insertText = useCallback((text: string) => {
    const selection = editorState.selection;
    if (!selection || !selection.isSingle) return;

    const node = editorState.getNodeAtPath(selection.end.path);
    if (!node) return;

    onSelectionUpdate();
    const transaction = editorState.transaction;
    transaction.insertText(node, selection.end.offset, text);
    editorState.apply(transaction);
  }, [editorState, onSelectionUpdate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyEvent);
    return () => document.removeEventListener('keydown', handleKeyEvent);
  }, [handleKeyEvent]);

  const buildResultsWidget = () => {
    if (singleColumn) {
      return (
        <div
          ref={scrollControllerRef}
          style={{
            maxHeight: '300px',
            minWidth: '300px',
            maxWidth: '300px',
            overflowY: 'auto',
          }}
        >
          {showingItems.map((item, index) => (
            <SelectionMenuItemWidget
              key={index}
              item={item}
              isSelected={selectedIndex === index}
              editorState={editorState}
              menuService={menuService}
              selectionMenuStyle={selectionMenuStyle}
            />
          ))}
        </div>
      );
    } else {
      const columns: React.ReactNode[] = [];
      let itemWidgets: React.ReactNode[] = [];
      const filteredItems = itemCountFilter > 0 
        ? showingItems.slice(0, itemCountFilter) 
        : showingItems;

      filteredItems.forEach((item, i) => {
        if (i !== 0 && i % maxItemInRow === 0) {
          columns.push(
            <div key={`col-${columns.length}`} style={{ display: 'flex', flexDirection: 'column' }}>
              {itemWidgets}
            </div>
          );
          itemWidgets = [];
        }
        itemWidgets.push(
          <SelectionMenuItemWidget
            key={i}
            item={item}
            isSelected={selectedIndex === i}
            editorState={editorState}
            menuService={menuService}
            selectionMenuStyle={selectionMenuStyle}
          />
        );
      });

      if (itemWidgets.length > 0) {
        columns.push(
          <div key={`col-${columns.length}`} style={{ display: 'flex', flexDirection: 'column' }}>
            {itemWidgets}
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {columns}
        </div>
      );
    }
  };

  const buildNoResultsWidget = () => (
    <div style={{ padding: '8px', width: '140px', textAlign: 'center' }}>
      <span style={{ fontSize: '18px', color: '#999' }}>
        No results
      </span>
    </div>
  );

  return (
    <div
      style={{
        backgroundColor: selectionMenuStyle.selectionMenuBackgroundColor,
        boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
        borderRadius: '6px',
      }}
    >
      {showingItems.length === 0 ? buildNoResultsWidget() : buildResultsWidget()}
    </div>
  );
};

export interface SelectionMenuItemWidgetProps {
  editorState: EditorState;
  menuService: SelectionMenuService;
  item: SelectionMenuItem;
  isSelected: boolean;
  selectionMenuStyle: SelectionMenuStyle;
  width?: number;
}

export const SelectionMenuItemWidget: React.FC<SelectionMenuItemWidgetProps> = ({
  editorState,
  menuService,
  item,
  isSelected,
  selectionMenuStyle,
  width = 140,
}) => {
  const [onHover, setOnHover] = useState(false);

  const handleClick = () => {
    item.handler(editorState, menuService, React.createContext({}));
  };

  const handleMouseEnter = () => setOnHover(true);
  const handleMouseLeave = () => setOnHover(false);

  const style = selectionMenuStyle;
  const selected = isSelected || onHover;

  return (
    <div style={{ padding: '5px 8px' }}>
      <button
        style={{
          width: `${width}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '8px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: isSelected 
            ? style.selectionMenuItemSelectedColor 
            : 'transparent',
          cursor: 'pointer',
          fontSize: '12px',
          color: selected 
            ? style.selectionMenuItemSelectedTextColor 
            : style.selectionMenuItemTextColor,
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span style={{ marginRight: '8px' }}>
          {item.icon(editorState, selected, selectionMenuStyle)}
        </span>
        {item.nameBuilder?.(item.getName(), style, selected) || (
          <span>{item.getName()}</span>
        )}
      </button>
    </div>
  );
};