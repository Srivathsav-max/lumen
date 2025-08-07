import React from 'react';
import { EditorState } from '../../../../core';
import { useMobileToolbarTheme } from '../mobile_toolbar_style';

export interface MobileToolbarItemMenuProps {
  editorState: EditorState;
  itemMenuBuilder: () => React.ReactNode | null;
}

export const MobileToolbarItemMenu: React.FC<MobileToolbarItemMenuProps> = ({
  editorState,
  itemMenuBuilder,
}) => {
  const theme = useMobileToolbarTheme();

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: theme.backgroundColor,
        padding: '8px',
        borderTop: `1px solid ${theme.itemOutlineColor}`,
      }}
    >
      {itemMenuBuilder()}
    </div>
  );
};