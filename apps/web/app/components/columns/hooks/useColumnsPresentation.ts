'use client';

import type { AppDispatch } from '../../../store/store';
import type { FeedColumnHandlers, FeedColumnStateModel, FeedColumnViewModel } from '../reactColumns.types';
import { useFeedColumnHandlers } from './useFeedColumnHandlers';
import { useFeedColumnStateModel } from './useFeedColumnStateModel';
import { useFeedColumnViewModel } from './useFeedColumnViewModel';

type Args = {
  dispatch: AppDispatch;
  ui: {
    vibe: string;
    scheme: string;
    buttonMode: 'icons' | 'text';
    titleDisplayLanguage: 'original' | 'bg' | 'en';
    language: 'en' | 'bg';
    timezone: FeedColumnViewModel['timezone'];
    dateFormat: FeedColumnViewModel['dateFormat'];
    showNewsCovers: boolean;
    performanceMode: boolean;
    fontSize: 'sm' | 'md' | 'lg' | 'xl';
    moodFilter: FeedColumnViewModel['moodFilter'];
    typeFilter: FeedColumnViewModel['typeFilter'];
    searchQuery: string;
    hideAllResearch: boolean;
    hideAllSummaries: boolean;
    storiesPerColumn: number;
    aiEnabled: boolean;
    aiAvailable: boolean;
    insightFeatures: FeedColumnViewModel['insightFeatures'];
    localImpactRegion: string;
    trackedTopics: string[];
    keywords: string[];
  };
  labels: Record<string, string>;
  connected: boolean;
  status: string;
  filteredColumnItems: FeedColumnStateModel['filteredColumnItems'];
  duplicateMatchById: FeedColumnStateModel['duplicateMatchById'];
  itemsByFeed: FeedColumnStateModel['itemsByFeed'];
  pageInfoByFeed: FeedColumnStateModel['pageInfoByFeed'];
  visibleByFeed: FeedColumnStateModel['visibleByFeed'];
  hydratedColumns: FeedColumnStateModel['hydratedColumns'];
  pinnedByUrl: FeedColumnStateModel['pinnedByUrl'];
  controlsOpenByUrl: FeedColumnStateModel['controlsOpenByUrl'];
  advancedControlsByUrl: FeedColumnStateModel['advancedControlsByUrl'];
  deleteAgeByUrl: FeedColumnStateModel['deleteAgeByUrl'];
  summaryPendingById: FeedColumnStateModel['summaryPendingById'];
  researchPendingById: FeedColumnStateModel['researchPendingById'];
  pinnedNewsById: FeedColumnStateModel['pinnedNewsById'];
  askByItem: FeedColumnStateModel['askByItem'];
  bodyModes: FeedColumnStateModel['bodyModes'];
  setAdvancedControlsByUrl: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setVisibleByFeed: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  getBodyMode: FeedColumnHandlers['getBodyMode'];
  getDefaultBodyMode: FeedColumnHandlers['getDefaultBodyMode'];
  setBodyMode: FeedColumnHandlers['setBodyMode'];
  moveFeedToTop: FeedColumnHandlers['onMoveFeedToTop'];
  removeFeed: FeedColumnHandlers['onRemoveFeed'];
  toggleFeedSummary: FeedColumnHandlers['onToggleFeedSummary'];
  toggleFeedTranslation: FeedColumnHandlers['onToggleFeedTranslation'];
  toggleFeedResearch: FeedColumnHandlers['onToggleFeedResearch'];
  setFeedBudget: FeedColumnHandlers['onSetFeedBudget'];
  setFeedInterval: FeedColumnHandlers['onSetFeedInterval'];
  setFeedSortMode: FeedColumnHandlers['onSetFeedSortMode'];
  setFeedFilterPreset: FeedColumnHandlers['onSetFeedFilterPreset'];
  setKeywords: FeedColumnHandlers['onSetKeywords'];
  removeOldInFeed: FeedColumnHandlers['onRemoveOldInFeed'];
  copyLink: FeedColumnHandlers['onCopyLink'];
  shareNews: FeedColumnHandlers['onShareNews'];
  copyNewsPayload: FeedColumnHandlers['onCopyNewsPayload'];
  hideItem: FeedColumnHandlers['onHideItem'];
  requestSummary: FeedColumnHandlers['onRequestSummary'];
  requestTitleTranslation: FeedColumnHandlers['onRequestTitleTranslation'];
  requestResearch: FeedColumnHandlers['onRequestResearch'];
  requestAutoActions: FeedColumnHandlers['onRequestAutoActions'];
  requestAsk: FeedColumnHandlers['onAskSubmit'];
};

export function useColumnsPresentation({
  dispatch,
  ui,
  labels,
  connected,
  status,
  filteredColumnItems,
  duplicateMatchById,
  itemsByFeed,
  pageInfoByFeed,
  visibleByFeed,
  hydratedColumns,
  pinnedByUrl,
  controlsOpenByUrl,
  advancedControlsByUrl,
  deleteAgeByUrl,
  summaryPendingById,
  researchPendingById,
  pinnedNewsById,
  askByItem,
  bodyModes,
  setAdvancedControlsByUrl,
  setVisibleByFeed,
  getBodyMode,
  getDefaultBodyMode,
  setBodyMode,
  moveFeedToTop,
  removeFeed,
  toggleFeedSummary,
  toggleFeedTranslation,
  toggleFeedResearch,
  setFeedBudget,
  setFeedInterval,
  setFeedSortMode,
  setFeedFilterPreset,
  setKeywords,
  removeOldInFeed,
  copyLink,
  shareNews,
  copyNewsPayload,
  hideItem,
  requestSummary,
  requestTitleTranslation,
  requestResearch,
  requestAutoActions,
  requestAsk
}: Args) {
  const viewModel = useFeedColumnViewModel({ ui, labels, connected, status });

  const stateModel = useFeedColumnStateModel({
    filteredColumnItems,
    duplicateMatchById,
    itemsByFeed,
    pageInfoByFeed,
    visibleByFeed,
    hydratedColumns,
    pinnedByUrl,
    controlsOpenByUrl,
    advancedControlsByUrl,
    deleteAgeByUrl,
    summaryPendingById,
    researchPendingById,
    pinnedNewsById,
    askByItem,
    bodyModes
  });

  const handlersModel = useFeedColumnHandlers({
    dispatch,
    getBodyMode,
    getDefaultBodyMode,
    setBodyMode,
    moveFeedToTop,
    setAdvancedControlsByUrl,
    setVisibleByFeed,
    storiesPerColumn: ui.storiesPerColumn,
    removeFeed,
    toggleFeedSummary,
    toggleFeedTranslation,
    toggleFeedResearch,
    setFeedBudget,
    setFeedInterval,
    setFeedSortMode,
    setFeedFilterPreset,
    setKeywords,
    removeOldInFeed,
    copyLink,
    shareNews,
    copyNewsPayload,
    hideItem,
    requestSummary,
    requestTitleTranslation,
    requestResearch,
    requestAutoActions,
    requestAsk
  });

  return {
    viewModel,
    stateModel,
    handlersModel
  };
}
