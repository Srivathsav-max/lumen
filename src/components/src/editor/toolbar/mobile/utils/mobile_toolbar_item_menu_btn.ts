import React from 'react';
import { useMobileToolbarTheme } from '../mobile_toolbar_style';

export interface MobileToolbarItemMenuBtnProps {
  onPressed: () => void;
  icon?: React.ReactNode;
  label?: string;
  isSelected: boolean;
}

export const MobileToolbarItemMenuBtn: React.FC<MobileToolbarItemMenuBtnProps> = ({
  onPressed,
  icon,
  label,
  isSelected,
}) => {
  const theme = useMobileToolbarTheme();

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: label ? 'flex-start' : 'center',
    padding: '8px',
    border: `${isSelected ? theme.buttonSelectedBorderWidth : theme.buttonBorderWidth}px solid ${
      isSelected ? theme.itemHighlightColor : theme.itemOutlineColor
    }`,
    borderRadius: `${theme.borderRadius}px`,
    backgroundColor: 'transparent',
    color: theme.foregroundColor,
    cursor: 'pointer',
    minHeight: `${theme.buttonHeight}px`,
    width: '100%',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  };

  return (
    <button
      style={buttonStyle}
      onClick={onPressed}
    >
      {icon && (
        <span style={{ marginRight: label ? '6px' : '0' }}>
          {icon}
        </span>
      )}
      {label && <span>{label}</span>}
    </button>
  );
};