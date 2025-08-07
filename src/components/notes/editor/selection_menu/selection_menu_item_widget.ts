import React, { useState } from 'react';
import { EditorState } from '../../core';
import { SelectionMenuService } from './selection_menu_service';
import { SelectionMenuItem, SelectionMenuStyle } from './selection_menu_widget';

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
            : onHover 
              ? style.selectionMenuItemSelectedColor
              : 'transparent',
          cursor: 'pointer',
          fontSize: '12px',
          color: selected 
            ? style.selectionMenuItemSelectedTextColor 
            : style.selectionMenuItemTextColor,
          transition: 'all 0.2s ease',
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
          {item.icon(editorState, selected, selectionMenuStyle)}
        </span>
        <span style={{ textAlign: 'left', flex: 1 }}>
          {item.nameBuilder?.(item.getName(), style, selected) || item.getName()}
        </span>
      </button>
    </div>
  );
};