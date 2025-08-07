import React, { createContext, useContext } from 'react';

/**
 * Style for the mobile toolbar.
 * 
 * foregroundColor -> text and icon color
 * itemHighlightColor -> selected item border color
 * itemOutlineColor -> item border color
 */
export interface MobileToolbarThemeData {
  backgroundColor: string;
  iconColor: string;
  foregroundColor: string;
  clearDiagonalLineColor: string;
  itemHighlightColor: string;
  itemOutlineColor: string;
  tabBarSelectedBackgroundColor: string;
  tabBarSelectedForegroundColor: string;
  primaryColor: string;
  onPrimaryColor: string;
  outlineColor: string;
  toolbarHeight: number;
  borderRadius: number;
  buttonHeight: number;
  buttonSpacing: number;
  buttonBorderWidth: number;
  buttonSelectedBorderWidth: number;
}

export const defaultMobileToolbarTheme: MobileToolbarThemeData = {
  backgroundColor: '#FFFFFF',
  iconColor: '#000000',
  foregroundColor: '#676666',
  clearDiagonalLineColor: '#B3261E',
  itemHighlightColor: '#1F71AC',
  itemOutlineColor: '#E3E3E3',
  tabBarSelectedBackgroundColor: 'rgba(128, 128, 128, 0.14)',
  tabBarSelectedForegroundColor: '#000000',
  primaryColor: '#1F71AC',
  onPrimaryColor: '#FFFFFF',
  outlineColor: '#E3E3E3',
  toolbarHeight: 48.0,
  borderRadius: 6.0,
  buttonHeight: 40.0,
  buttonSpacing: 8.0,
  buttonBorderWidth: 1.0,
  buttonSelectedBorderWidth: 2.0,
};

const MobileToolbarThemeContext = createContext<MobileToolbarThemeData>(defaultMobileToolbarTheme);

export interface MobileToolbarThemeProps {
  theme?: Partial<MobileToolbarThemeData>;
  children: React.ReactNode;
}

export const MobileToolbarTheme: React.FC<MobileToolbarThemeProps> = ({
  theme = {},
  children,
}) => {
  const mergedTheme = {
    ...defaultMobileToolbarTheme,
    ...theme,
  };

  return (
    <MobileToolbarThemeContext.Provider value={mergedTheme}>
      {children}
    </MobileToolbarThemeContext.Provider>
  );
};

export const useMobileToolbarTheme = (): MobileToolbarThemeData => {
  const context = useContext(MobileToolbarThemeContext);
  if (!context) {
    throw new Error('useMobileToolbarTheme must be used within a MobileToolbarTheme');
  }
  return context;
};

export const MobileToolbarThemeConsumer: React.FC<{
  children: (theme: MobileToolbarThemeData) => React.ReactNode;
}> = ({ children }) => {
  const theme = useMobileToolbarTheme();
  return <>{children(theme)}</>;
};