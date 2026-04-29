'use client';

import { createContext } from 'react';
import type { FeedInfo } from '../../../store/types';
import type { TopMenuVibe } from '../topMenu.services';
import type { TopMenuAddStreamModel, TopMenuControlsActions, TopMenuControlsModel, TopMenuSearchModel } from '../types';

type TopMenuToast = {
  id: string;
  kind: 'success' | 'error' | 'warning' | 'info';
  message: string;
  createdAt: number;
};

export type TopMenuContextValue = {
  labels: Record<string, string>;
  topHintAsButtons: boolean;
  isMobile: boolean;
  showDesktopBody: boolean;
  connected: boolean;
  status: string;
  totalTokens: number;
  language: 'en' | 'bg';
  timezone: 'system' | 'UTC' | 'Europe/Sofia' | 'Europe/London' | 'Europe/Berlin' | 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles' | 'Asia/Tokyo';
  dateFormat: 'ddmmyy' | 'mmddyy' | 'yyyymmdd';
  menuItemsAsIcons: boolean;
  vibe: TopMenuVibe;
  searchLabel: string;
  addStreamLabel: string;
  controlsLabel: string;
  allColumnLabel: string;
  menuLabel: string;
  hideAllResearchLabel: string;
  hideAllSummariesLabel: string;
  orderedFeeds: FeedInfo[];
  searchVisible: boolean;
  addStreamVisible: boolean;
  search: TopMenuSearchModel;
  addStream: TopMenuAddStreamModel;
  controls: {
    model: TopMenuControlsModel;
    actions: TopMenuControlsActions;
  };
  help: {
    open: boolean;
    title: string;
    closeLabel: string;
    onClose: () => void;
  };
  notifications: {
    open: boolean;
    items: TopMenuToast[];
    onOpen: () => void;
    onClose: () => void;
    onDismiss: (id: string) => void;
    onDismissAll: () => void;
  };
  toast: {
    toasts: TopMenuToast[];
    onDismiss: (id: string) => void;
  };
  mobileDrawer: {
    open: boolean;
    onClose: () => void;
  };
  onScrollToColumns: () => void;
  onScrollToPageTop: () => void;
  onScrollToPageBottom: () => void;
  onOpenHelp: () => void;
  onToggleMenu: () => void;
  onToggleSearch: () => void;
  onToggleAddStream: () => void;
  onToggleControls: () => void;
  onToggleAllColumnControls: () => void;
  onToggleHideAllResearch: () => void;
  onToggleHideAllSummaries: () => void;
  onChangeVibe: (nextVibe: TopMenuVibe) => void;
  onPlayToggleSound: () => void;
  onReorderFeeds: (fromUrl: string, toUrl: string) => void;
};

export const TopMenuContext = createContext<TopMenuContextValue | null>(null);
