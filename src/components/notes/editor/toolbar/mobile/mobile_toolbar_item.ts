import React from 'react';
import { EditorState } from '../../../core';

export interface MobileToolbarWidgetService {
  // Service interface for accessing MobileToolbarWidget state
  closeMenu?: () => void;
  openMenu?: (menuContent: React.ReactNode) => void;
  isMenuOpen?: boolean;
}

export type MobileToolbarItemIconBuilder = (
  context: React.Context<any>,
  editorState: EditorState,
  service: MobileToolbarWidgetService
) => React.ReactNode | null;

export type MobileToolbarItemActionHandler = (
  context: React.Context<any>,
  editorState: EditorState
) => void;

export interface MobileToolbarItemAction {
  type: 'action';
  itemIconBuilder: MobileToolbarItemIconBuilder;
  actionHandler: MobileToolbarItemActionHandler;
}

export interface MobileToolbarItemWithMenu {
  type: 'menu';
  itemIconBuilder: MobileToolbarItemIconBuilder;
  itemMenuBuilder: MobileToolbarItemIconBuilder;
}

export type MobileToolbarItem = MobileToolbarItemAction | MobileToolbarItemWithMenu;

export const createMobileToolbarActionItem = (
  itemIconBuilder: MobileToolbarItemIconBuilder,
  actionHandler: MobileToolbarItemActionHandler
): MobileToolbarItemAction => ({
  type: 'action',
  itemIconBuilder,
  actionHandler,
});

export const createMobileToolbarMenuItem = (
  itemIconBuilder: MobileToolbarItemIconBuilder,
  itemMenuBuilder: MobileToolbarItemIconBuilder
): MobileToolbarItemWithMenu => ({
  type: 'menu',
  itemIconBuilder,
  itemMenuBuilder,
});

export const isMobileToolbarActionItem = (
  item: MobileToolbarItem
): item is MobileToolbarItemAction => {
  return item.type === 'action';
};

export const isMobileToolbarMenuItem = (
  item: MobileToolbarItem
): item is MobileToolbarItemWithMenu => {
  return item.type === 'menu';
};