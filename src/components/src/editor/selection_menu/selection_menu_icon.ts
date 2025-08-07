import React from 'react';
import { SelectionMenuStyle } from './selection_menu_widget';

export interface SelectionMenuIconWidgetProps {
  name?: string;
  icon?: string; // Icon name or unicode character
  isSelected: boolean;
  style: SelectionMenuStyle;
}

export const SelectionMenuIconWidget: React.FC<SelectionMenuIconWidgetProps> = ({
  name,
  icon,
  isSelected,
  style,
}) => {
  if (!name && !icon) {
    throw new Error('Either name or icon must be provided');
  }

  const iconColor = isSelected 
    ? style.selectionMenuItemSelectedIconColor 
    : style.selectionMenuItemIconColor;

  if (icon) {
    return (
      <span
        style={{
          fontSize: '18px',
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
        }}
      >
        {icon}
      </span>
    );
  }

  if (name) {
    // For SVG icons, we would typically load them from a sprite or icon library
    // For now, we'll use simple text representations
    const getIconForName = (iconName: string): string => {
      switch (iconName) {
        case 'text':
          return 'T';
        case 'h1':
          return 'H1';
        case 'h2':
          return 'H2';
        case 'h3':
          return 'H3';
        case 'image':
          return '📷';
        case 'bulleted_list':
          return '•';
        case 'number':
          return '1.';
        case 'checkbox':
          return '☐';
        case 'quote':
          return '"';
        case 'divider':
          return '—';
        case 'table':
          return '⊞';
        default:
          return '?';
      }
    };

    return (
      <span
        style={{
          fontSize: '18px',
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          fontWeight: 'bold',
        }}
      >
        {getIconForName(name)}
      </span>
    );
  }

  return null;
};