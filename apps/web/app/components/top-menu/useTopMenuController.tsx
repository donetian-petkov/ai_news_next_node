'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  dismissToast,
  setAppearanceSettings,
  setHelpOpen,
  setHideAllResearch,
  setHideAllSummaries,
  setSearchQuery,
  setTopUiState
} from '../../store/slices/uiSlice';
import { reorderFeeds } from '../../store/slices/feedsSlice';
import { type TopMenuDeleteAge, type TopMenuVibe } from './topMenu.services';
import { useTopMenuActions } from './useTopMenuActions';
import { useTopMenuFocusAndSearch } from './useTopMenuFocusAndSearch';
import { useTopMenuHotkeys } from './useTopMenuHotkeys';
import { useTopMenuOutsideCollapse } from './useTopMenuOutsideCollapse';
import { useTopMenuSound } from './useTopMenuSound';
import { useTopMenuToastLifecycle } from './useTopMenuToastLifecycle';
import { useTopMenuUiPersistence } from './useTopMenuUiPersistence';
import { useTopMenuViewModel } from './useTopMenuViewModel';
import { useTopMenuControlPanelHandlers } from './useTopMenuControlPanelHandlers';
import type { AddStatus, FeedType, TopMenuAddStreamModel, TopMenuControlsActions, TopMenuControlsModel, TopMenuSearchModel } from './types';

export function useTopMenuController() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const ui = useAppSelector(s => s.ui);
  const connected = useAppSelector(s => s.connection.connected);
  const status = useAppSelector(s => s.connection.status);
  const totalTokens = useAppSelector(s => s.aiUsage.totalTokens);
  const feeds = useAppSelector(s => s.feeds.feeds);
  const orderByUrl = useAppSelector(s => s.feeds.orderByUrl);
  const toasts = useAppSelector(s => s.ui.toasts);
  const briefing = useAppSelector(s => s.briefing);

  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const isMobile = useMediaQuery('(max-width: 900px)');
  const resolvedColorMode = ui.colorMode === 'system' ? (prefersDark ? 'dark' : 'light') : ui.colorMode;

  const [feedType, setFeedType] = useState<FeedType>('rss');
  const [feedUrl, setFeedUrl] = useState('');
  const [feedLabel, setFeedLabel] = useState('');
  const [feedInterval, setFeedInterval] = useState('120');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [deleteAgeAll, setDeleteAgeAll] = useState<TopMenuDeleteAge>('week');
  const [addStatus, setAddStatus] = useState<AddStatus>(null);
  const topbarInnerRef = useRef<HTMLDivElement | null>(null);

  const labels = useMemo(
    () => t('topMenu', { returnObjects: true }) as Record<string, string>,
    [t]
  );

  useTopMenuUiPersistence({ dispatch, ui, resolvedColorMode });

  const { triggerSoundCue } = useTopMenuSound(ui);
  const {
    searchDraft,
    searchInputRef,
    addStreamInputRef,
    scheduleFocus,
    onSearchDraftChange,
    clearSearch
  } = useTopMenuFocusAndSearch({
    initialSearchQuery: ui.searchQuery,
    onSearchCommit: value => dispatch(setSearchQuery(value))
  });

  useEffect(() => {
    if (!isMobile) setMobileDrawerOpen(false);
  }, [isMobile]);

  useTopMenuOutsideCollapse({
    isMobile,
    menuCollapsed: ui.menuCollapsed,
    controlsCollapsed: ui.controlsCollapsed,
    topbarInnerRef,
    onCollapseControls: () => dispatch(setTopUiState({ controlsCollapsed: true }))
  });

  useTopMenuToastLifecycle({
    toasts,
    onDismiss: id => dispatch(dismissToast(id)),
    onToastKind: kind => {
      if (kind === 'error') triggerSoundCue('error');
      else if (kind === 'success') triggerSoundCue('success');
      else triggerSoundCue('toggle');
    }
  });

  const {
    addStream,
    toggleSearch,
    toggleAddStream,
    toggleControls,
    toggleMenu,
    toggleAllColumnControls,
    cycleTheme,
    cycleVibe,
    applyAllBudget,
    changeAiProvider,
    setProviderApiKey,
    requestNotificationPermission,
    resetAllNewest,
    deleteOldAllColumns
  } = useTopMenuActions({
    dispatch,
    ui,
    feeds,
    isMobile,
    labels,
    t,
    feedType,
    feedUrl,
    feedLabel,
    feedInterval,
    deleteAgeAll,
    setAddStatus,
    setFeedUrl,
    setFeedLabel,
    setMobileDrawerOpen,
    scheduleFocus
  });

  useTopMenuHotkeys({
    searchVisible: ui.searchVisible,
    onCloseHelp: () => dispatch(setHelpOpen(false)),
    onToggleHelp: () => dispatch(setHelpOpen(!ui.helpOpen)),
    onFocusSearch: () => scheduleFocus('search', 20),
    onToggleMenu: toggleMenu,
    onToggleControls: toggleControls,
    onToggleAllColumnControls: toggleAllColumnControls,
    onToggleSearch: toggleSearch,
    onToggleAddStream: toggleAddStream,
    onCycleTheme: cycleTheme,
    onCycleVibe: cycleVibe
  });

  const onOpenHelp = () => dispatch(setHelpOpen(true));
  const onCloseHelp = () => dispatch(setHelpOpen(false));
  const onDismissToast = (id: string) => dispatch(dismissToast(id));
  const onCloseMobileDrawer = () => setMobileDrawerOpen(false);
  const onToggleHideAllResearch = () => dispatch(setHideAllResearch(!ui.hideAllResearch));
  const onToggleHideAllSummaries = () => dispatch(setHideAllSummaries(!ui.hideAllSummaries));
  const onChangeVibe = (nextVibe: TopMenuVibe) => dispatch(setAppearanceSettings({ vibe: nextVibe }));
  const onReorderFeeds = (fromUrl: string, toUrl: string) => dispatch(reorderFeeds({ fromUrl, toUrl }));
  const onPlayToggleSound = () => triggerSoundCue('toggle');
  const controlPanelHandlers = useTopMenuControlPanelHandlers({
    dispatch,
    ui,
    feeds,
    triggerSoundCue,
    requestNotificationPermission,
    changeAiProvider,
    setProviderApiKey,
    applyAllBudget,
    cycleTheme,
    resetAllNewest,
    deleteOldAllColumns,
    onOpenHelp
  });
  const controlsActions = useMemo<TopMenuControlsActions>(() => ({
    onDeleteAgeAllChange: setDeleteAgeAll,
    ...controlPanelHandlers
  }), [controlPanelHandlers]);

  const onScrollToColumns = () => {
    document.querySelector('.container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const onScrollToPageTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const onScrollToPageBottom = () => {
    const target = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  const topHintAsButtons = ui.menuHintMode === 'buttons';
  const menuItemsAsIcons = ui.buttonMode === 'icons';
  const showDesktopBody = !isMobile && !ui.menuCollapsed;
  const searchModel = useMemo<TopMenuSearchModel>(() => ({
    isMobile,
    searchDraft,
    searchInputRef,
    onSearchDraftChange,
    onClear: clearSearch
  }), [clearSearch, isMobile, onSearchDraftChange, searchDraft, searchInputRef]);
  const addStreamModel = useMemo<TopMenuAddStreamModel>(() => ({
    isMobile,
    feedType,
    feedUrl,
    feedLabel,
    feedInterval,
    addStatus,
    addStreamInputRef,
    onFeedTypeChange: setFeedType,
    onFeedUrlChange: setFeedUrl,
    onFeedLabelChange: setFeedLabel,
    onFeedIntervalChange: setFeedInterval,
    onAddStream: addStream
  }), [addStatus, addStream, addStreamInputRef, feedInterval, feedLabel, feedType, feedUrl, isMobile]);
  const controlsModel = useMemo<TopMenuControlsModel>(() => ({
    collapsed: ui.controlsCollapsed,
    deleteAgeAll,
    quickRow: {
      aiAvailable: ui.aiAvailable,
      aiEnabled: ui.aiEnabled,
      storiesPerColumn: ui.storiesPerColumn
    },
    notifications: {
      notifyEnabled: ui.notifyEnabled,
      notifyMode: ui.notifyMode
    },
    aiSettings: {
      aiAvailable: ui.aiAvailable,
      performanceMode: ui.performanceMode,
      aiProvider: ui.aiProvider,
      keywords: ui.keywords,
      summaryLang: ui.summaryLang,
      researchLang: ui.researchLang,
      titleDisplayLanguage: ui.titleDisplayLanguage,
      showFilteredColumn: ui.showFilteredColumn,
      showEmergingColumn: ui.showEmergingColumn,
      insightFeatures: ui.insightFeatures,
      localImpactRegion: ui.localImpactRegion,
      trackedTopics: ui.trackedTopics,
      summaryModel: ui.summaryModel,
      researchModel: ui.researchModel,
      askModel: ui.askModel,
      availableModels: ui.availableModels,
      moodFilter: ui.moodFilter,
      typeFilter: ui.typeFilter,
      allBudget: ui.allBudget,
      dailyBriefingDelivery: ui.dailyBriefingDelivery,
      dailyBriefingEmail: ui.dailyBriefingEmail,
      dailyBriefingFormat: ui.dailyBriefingFormat,
      dailyBriefingAudio: ui.dailyBriefingAudio,
      dailyBriefingFeedUrls: ui.dailyBriefingFeedUrls,
      availableFeeds: feeds.map(feed => ({
        url: feed.url,
        label: feed.label,
        kind: feed.kind,
        summaryEnabled: feed.summaryEnabled
      })),
      briefing
    },
    appearance: {
      font: ui.font,
      fontSize: ui.fontSize,
      scheme: ui.scheme,
      timezone: ui.timezone,
      dateFormat: ui.dateFormat,
      showNewsCovers: ui.showNewsCovers,
      buttonMode: ui.buttonMode,
      menuHintMode: ui.menuHintMode,
      effectIntensity: ui.effectIntensity,
      soundTheme: ui.soundTheme,
      performanceMode: ui.performanceMode,
      soundEnabled: ui.soundEnabled,
      vibe: ui.vibe,
      language: ui.language,
      colorMode: ui.colorMode
    }
  }), [briefing, deleteAgeAll, feeds, ui.aiAvailable, ui.aiEnabled, ui.aiProvider, ui.allBudget, ui.askModel, ui.availableModels, ui.buttonMode, ui.colorMode, ui.controlsCollapsed, ui.dailyBriefingAudio, ui.dailyBriefingDelivery, ui.dailyBriefingEmail, ui.dailyBriefingFeedUrls, ui.dailyBriefingFormat, ui.dateFormat, ui.effectIntensity, ui.font, ui.fontSize, ui.insightFeatures, ui.keywords, ui.language, ui.localImpactRegion, ui.menuHintMode, ui.moodFilter, ui.notifyEnabled, ui.notifyMode, ui.performanceMode, ui.researchLang, ui.researchModel, ui.scheme, ui.showNewsCovers, ui.soundEnabled, ui.soundTheme, ui.storiesPerColumn, ui.summaryLang, ui.summaryModel, ui.timezone, ui.titleDisplayLanguage, ui.trackedTopics, ui.typeFilter, ui.vibe]);

  const { contextValue } = useTopMenuViewModel({
    labels,
    topHintAsButtons,
    isMobile,
    showDesktopBody,
    connected,
    status,
    totalTokens,
    language: ui.language,
    timezone: ui.timezone,
    dateFormat: ui.dateFormat,
    menuItemsAsIcons,
    vibe: ui.vibe,
    hideAllResearch: ui.hideAllResearch,
    hideAllSummaries: ui.hideAllSummaries,
    searchVisible: ui.searchVisible,
    addStreamVisible: ui.addStreamVisible,
    controlsCollapsed: ui.controlsCollapsed,
    menuCollapsed: ui.menuCollapsed,
    allColumnControlsHidden: ui.allColumnControlsHidden,
    feeds,
    orderByUrl,
    search: searchModel,
    addStream: addStreamModel,
    controlsModel,
    controlsActions,
    helpOpen: ui.helpOpen,
    helpTitle: labels.helpTitle,
    helpCloseLabel: labels.close,
    onCloseHelp,
    toasts,
    onDismissToast,
    mobileDrawerOpen,
    onCloseMobileDrawer,
    onScrollToColumns,
    onScrollToPageTop,
    onScrollToPageBottom,
    onOpenHelp,
    onToggleMenu: toggleMenu,
    onToggleSearch: toggleSearch,
    onToggleAddStream: toggleAddStream,
    onToggleControls: toggleControls,
    onToggleAllColumnControls: toggleAllColumnControls,
    onToggleHideAllResearch,
    onToggleHideAllSummaries,
    onChangeVibe,
    onPlayToggleSound,
    onReorderFeeds
  });

  return {
    topbarInnerRef,
    contextValue
  };
}
