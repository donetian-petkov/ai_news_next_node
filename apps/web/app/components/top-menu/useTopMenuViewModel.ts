'use client';

import { useMemo } from 'react';
import { FILTERED_FEED_URL } from '../../store/constants';
import type { FeedInfo } from '../../store/types';
import type { TopMenuContextValue } from './context/TopMenuContext';
import type { TopMenuVibe } from './topMenu.services';
import type { TopMenuAddStreamModel, TopMenuControlsActions, TopMenuControlsModel, TopMenuSearchModel } from './types';

type Args = {
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
  hideAllResearch: boolean;
  hideAllSummaries: boolean;
  searchVisible: boolean;
  addStreamVisible: boolean;
  controlsCollapsed: boolean;
  menuCollapsed: boolean;
  allColumnControlsHidden: boolean;
  feeds: FeedInfo[];
  orderByUrl: string[];
  search: TopMenuSearchModel;
  addStream: TopMenuAddStreamModel;
  controlsModel: TopMenuControlsModel;
  controlsActions: TopMenuControlsActions;
  helpOpen: boolean;
  helpTitle: string;
  helpCloseLabel: string;
  onCloseHelp: () => void;
  notificationsOpen: boolean;
  notificationInbox: Array<{ id: string; kind: 'success' | 'error' | 'warning' | 'info'; message: string; createdAt: number }>;
  onOpenNotifications: () => void;
  onCloseNotifications: () => void;
  onDismissNotification: (id: string) => void;
  onDismissAllNotifications: () => void;
  toasts: Array<{ id: string; kind: 'success' | 'error' | 'warning' | 'info'; message: string; createdAt: number }>;
  onDismissToast: (id: string) => void;
  mobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
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

export function useTopMenuViewModel({
  labels,
  topHintAsButtons,
  isMobile,
  showDesktopBody,
  connected,
  status,
  totalTokens,
  language,
  timezone,
  dateFormat,
  menuItemsAsIcons,
  vibe,
  hideAllResearch,
  hideAllSummaries,
  searchVisible,
  addStreamVisible,
  controlsCollapsed,
  menuCollapsed,
  allColumnControlsHidden,
  feeds,
  orderByUrl,
  search,
  addStream,
  controlsModel,
  controlsActions,
  helpOpen,
  helpTitle,
  helpCloseLabel,
  onCloseHelp,
  notificationsOpen,
  notificationInbox,
  onOpenNotifications,
  onCloseNotifications,
  onDismissNotification,
  onDismissAllNotifications,
  toasts,
  onDismissToast,
  mobileDrawerOpen,
  onCloseMobileDrawer,
  onScrollToColumns,
  onScrollToPageTop,
  onScrollToPageBottom,
  onOpenHelp,
  onToggleMenu,
  onToggleSearch,
  onToggleAddStream,
  onToggleControls,
  onToggleAllColumnControls,
  onToggleHideAllResearch,
  onToggleHideAllSummaries,
  onChangeVibe,
  onPlayToggleSound,
  onReorderFeeds
}: Args) {
  const searchLabel = searchVisible ? labels.hideSearch : labels.search;
  const addStreamLabel = addStreamVisible ? labels.hideAddStream : labels.addStream;
  const controlsLabel = controlsCollapsed ? labels.showTopControls : labels.hideTopControls;
  const allColumnLabel = allColumnControlsHidden ? labels.showAllColumnControls : labels.hideAllColumnControls;
  const menuLabel = menuCollapsed ? labels.showMenu : labels.hideMenu;

  const orderedFeeds = useMemo(() => {
    const list = [...feeds];
    const orderIndex = new Map(orderByUrl.map((url, idx) => [url, idx]));
    list.sort((a, b) => {
      const aFiltered = a.url === FILTERED_FEED_URL;
      const bFiltered = b.url === FILTERED_FEED_URL;
      if (aFiltered !== bFiltered) return aFiltered ? -1 : 1;
      const ai = orderIndex.get(a.url) ?? Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.get(b.url) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
    return list;
  }, [feeds, orderByUrl]);

  const contextValue = useMemo<TopMenuContextValue>(() => ({
    labels,
    topHintAsButtons,
    isMobile,
    showDesktopBody,
    connected,
    status,
    totalTokens,
    language,
    timezone,
    dateFormat,
    menuItemsAsIcons,
    vibe,
    searchLabel,
    addStreamLabel,
    controlsLabel,
    allColumnLabel,
    menuLabel,
    hideAllResearchLabel: hideAllResearch ? labels.showAllResearch : labels.hideAllResearch,
    hideAllSummariesLabel: hideAllSummaries ? labels.showAllSummaries : labels.hideAllSummaries,
    orderedFeeds,
    searchVisible,
    addStreamVisible,
    search,
    addStream,
    controls: {
      model: controlsModel,
      actions: controlsActions
    },
    help: {
      open: helpOpen,
      title: helpTitle,
      closeLabel: helpCloseLabel,
      onClose: onCloseHelp
    },
    notifications: {
      open: notificationsOpen,
      items: notificationInbox,
      onOpen: onOpenNotifications,
      onClose: onCloseNotifications,
      onDismiss: onDismissNotification,
      onDismissAll: onDismissAllNotifications
    },
    toast: {
      toasts,
      onDismiss: onDismissToast
    },
    mobileDrawer: {
      open: mobileDrawerOpen,
      onClose: onCloseMobileDrawer
    },
    onScrollToColumns,
    onScrollToPageTop,
    onScrollToPageBottom,
    onOpenHelp,
    onToggleMenu,
    onToggleSearch,
    onToggleAddStream,
    onToggleControls,
    onToggleAllColumnControls,
    onToggleHideAllResearch,
    onToggleHideAllSummaries,
    onChangeVibe,
    onPlayToggleSound,
    onReorderFeeds
  }), [addStream, addStreamLabel, addStreamVisible, allColumnLabel, connected, controlsActions, controlsLabel, controlsModel, dateFormat, helpCloseLabel, helpOpen, helpTitle, hideAllResearch, hideAllSummaries, isMobile, labels, language, menuItemsAsIcons, menuLabel, mobileDrawerOpen, notificationInbox, notificationsOpen, onChangeVibe, onCloseHelp, onCloseMobileDrawer, onCloseNotifications, onDismissAllNotifications, onDismissNotification, onDismissToast, onOpenHelp, onOpenNotifications, onPlayToggleSound, onReorderFeeds, onScrollToColumns, onScrollToPageBottom, onScrollToPageTop, onToggleAddStream, onToggleAllColumnControls, onToggleControls, onToggleHideAllResearch, onToggleHideAllSummaries, onToggleMenu, onToggleSearch, orderedFeeds, search, searchLabel, searchVisible, showDesktopBody, status, timezone, toasts, topHintAsButtons, totalTokens, vibe]);

  return {
    contextValue
  };
}
