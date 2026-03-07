'use client';

import type { RefObject } from 'react';
import type { RootState } from '../../store/store';
import type { TopMenuDeleteAge } from './topMenu.services';

export type AddStatus = { kind: 'info' | 'success' | 'error'; message: string } | null;
export type FeedType = 'rss' | 'reddit' | 'youtube';
export type TopMenuUiState = RootState['ui'];
export type TopMenuFocusTarget = 'search' | 'addStream';

export type TopMenuActionsResult = {
  addStream: () => void;
  toggleSearch: () => void;
  toggleAddStream: () => void;
  toggleControls: () => void;
  toggleMenu: () => void;
  toggleAllColumnControls: () => void;
  cycleTheme: () => void;
  cycleVibe: () => void;
  applyAllBudget: (budget: 'low' | 'standard' | 'high') => void;
  changeAiProvider: (provider: 'openai' | 'claude' | 'openrouter') => void;
  setProviderApiKey: (provider: 'openai' | 'claude' | 'openrouter', apiKey: string) => void;
  requestNotificationPermission: (enabled: boolean) => Promise<void>;
  resetAllNewest: () => void;
  deleteOldAllColumns: () => void;
};

export type TopMenuSearchModel = {
  isMobile: boolean;
  searchDraft: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchDraftChange: (value: string) => void;
  onClear: () => void;
};

export type TopMenuAddStreamModel = {
  isMobile: boolean;
  feedType: FeedType;
  feedUrl: string;
  feedLabel: string;
  feedInterval: string;
  addStatus: AddStatus;
  addStreamInputRef: RefObject<HTMLInputElement | null>;
  onFeedTypeChange: (value: FeedType) => void;
  onFeedUrlChange: (value: string) => void;
  onFeedLabelChange: (value: string) => void;
  onFeedIntervalChange: (value: string) => void;
  onAddStream: () => void;
};

export type TopMenuControlsModel = {
  collapsed: boolean;
  deleteAgeAll: TopMenuDeleteAge;
  quickRow: {
    aiAvailable: TopMenuUiState['aiAvailable'];
    aiEnabled: TopMenuUiState['aiEnabled'];
  };
  notifications: {
    notifyEnabled: TopMenuUiState['notifyEnabled'];
    notifyMode: TopMenuUiState['notifyMode'];
  };
  aiSettings: {
    aiAvailable: TopMenuUiState['aiAvailable'];
    performanceMode: TopMenuUiState['performanceMode'];
    aiProvider: TopMenuUiState['aiProvider'];
    keywords: TopMenuUiState['keywords'];
    summaryLang: TopMenuUiState['summaryLang'];
    researchLang: TopMenuUiState['researchLang'];
    summaryModel: TopMenuUiState['summaryModel'];
    researchModel: TopMenuUiState['researchModel'];
    askModel: TopMenuUiState['askModel'];
    availableModels: TopMenuUiState['availableModels'];
    moodFilter: TopMenuUiState['moodFilter'];
    typeFilter: TopMenuUiState['typeFilter'];
    allBudget: TopMenuUiState['allBudget'];
  };
  appearance: {
    font: TopMenuUiState['font'];
    fontSize: TopMenuUiState['fontSize'];
    scheme: TopMenuUiState['scheme'];
    timezone: TopMenuUiState['timezone'];
    dateFormat: TopMenuUiState['dateFormat'];
    buttonMode: TopMenuUiState['buttonMode'];
    menuHintMode: TopMenuUiState['menuHintMode'];
    effectIntensity: TopMenuUiState['effectIntensity'];
    soundTheme: TopMenuUiState['soundTheme'];
    performanceMode: TopMenuUiState['performanceMode'];
    soundEnabled: TopMenuUiState['soundEnabled'];
    vibe: TopMenuUiState['vibe'];
    language: TopMenuUiState['language'];
    colorMode: TopMenuUiState['colorMode'];
  };
};

export type TopMenuAppearancePatch = {
  font?: TopMenuUiState['font'];
  fontSize?: TopMenuUiState['fontSize'];
  scheme?: TopMenuUiState['scheme'];
  timezone?: TopMenuUiState['timezone'];
  dateFormat?: TopMenuUiState['dateFormat'];
  buttonMode?: TopMenuUiState['buttonMode'];
  menuHintMode?: TopMenuUiState['menuHintMode'];
  effectIntensity?: TopMenuUiState['effectIntensity'];
  soundTheme?: TopMenuUiState['soundTheme'];
  soundEnabled?: TopMenuUiState['soundEnabled'];
  vibe?: TopMenuUiState['vibe'];
  performanceMode?: TopMenuUiState['performanceMode'];
};

export type TopMenuControlsActions = {
  onDeleteAgeAllChange: (age: TopMenuDeleteAge) => void;
  onResetAllNewest: () => void;
  onShowMoreNewsAll: () => void;
  onResetNewsShownAll: () => void;
  onDeleteOldAllColumns: () => void;
  onToggleAiEnabled: (enabled: boolean) => void;
  onOpenHelp: () => void;
  onNotifyEnabledChange: (enabled: boolean) => void;
  onNotifyModeChange: (mode: TopMenuUiState['notifyMode']) => void;
  onChangeAiProvider: (provider: TopMenuUiState['aiProvider']) => void;
  onSetProviderApiKey: (provider: TopMenuUiState['aiProvider'], apiKey: string) => void;
  onSetKeywords: (keywords: string[]) => void;
  onSummaryLangChange: (lang: TopMenuUiState['summaryLang']) => void;
  onResearchLangChange: (lang: TopMenuUiState['researchLang']) => void;
  onSummaryModelChange: (model: string) => void;
  onResearchModelChange: (model: string) => void;
  onAskModelChange: (model: string) => void;
  onMoodFilterChange: (value: TopMenuUiState['moodFilter']) => void;
  onTypeFilterChange: (value: TopMenuUiState['typeFilter']) => void;
  onApplyAllBudget: (budget: 'low' | 'standard' | 'high') => void;
  onSetAppearance: (patch: TopMenuAppearancePatch) => void;
  onSetLanguage: (lang: 'en' | 'bg') => void;
  onCycleTheme: () => void;
  onTogglePerformanceMode: () => void;
  onToggleSoundEnabled: () => void;
};
