'use client';

import { useMemo } from 'react';
import { setAskDraft, toggleAskOpen, togglePinnedNews } from '../../../store/slices/newsSlice';
import { setFeedDeleteAge, toggleFeedControls, togglePinned } from '../../../store/slices/feedsSlice';
import type { AppDispatch } from '../../../store/store';
import { COLUMN_LAYOUT_TOKENS } from '../designTokens';
import type { FeedColumnHandlers } from '../reactColumns.types';

type Args = {
  dispatch: AppDispatch;
  getBodyMode: FeedColumnHandlers['getBodyMode'];
  getDefaultBodyMode: FeedColumnHandlers['getDefaultBodyMode'];
  setBodyMode: FeedColumnHandlers['setBodyMode'];
  moveFeedToTop: FeedColumnHandlers['onMoveFeedToTop'];
  setAdvancedControlsByUrl: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setVisibleByFeed: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  storiesPerColumn: number;
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
  requestAsk: FeedColumnHandlers['onAskSubmit'];
};

export function useFeedColumnHandlers({
  dispatch,
  getBodyMode,
  getDefaultBodyMode,
  setBodyMode,
  moveFeedToTop,
  setAdvancedControlsByUrl,
  setVisibleByFeed,
  storiesPerColumn,
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
  requestAsk
}: Args) {
  return useMemo<FeedColumnHandlers>(() => ({
    getBodyMode,
    getDefaultBodyMode,
    setBodyMode,
    onTogglePinnedColumn: (feedUrl: string) => dispatch(togglePinned(feedUrl)),
    onMoveFeedToTop: moveFeedToTop,
    onRemoveFeed: removeFeed,
    onToggleFeedControls: (feedUrl: string) => dispatch(toggleFeedControls(feedUrl)),
    onToggleFeedSummary: toggleFeedSummary,
    onToggleFeedTranslation: toggleFeedTranslation,
    onToggleFeedResearch: toggleFeedResearch,
    onSetFeedBudget: setFeedBudget,
    onSetFeedInterval: setFeedInterval,
    onSetFeedSortMode: setFeedSortMode,
    onSetFeedFilterPreset: setFeedFilterPreset,
    onSetKeywords: setKeywords,
    onToggleAdvancedControls: (feedUrl: string) => setAdvancedControlsByUrl(prev => ({ ...prev, [feedUrl]: !prev[feedUrl] })),
    onSetDeleteAge: (feedUrl, age) => dispatch(setFeedDeleteAge({ feedUrl, age })),
    onRemoveOldInFeed: removeOldInFeed,
    onShowMoreNews: (feedUrl: string) => setVisibleByFeed(prev => ({
      ...prev,
      [feedUrl]: Math.min(
        storiesPerColumn,
        (prev[feedUrl] || Math.min(COLUMN_LAYOUT_TOKENS.initialVisibleItems, storiesPerColumn)) + COLUMN_LAYOUT_TOKENS.visibleItemsStep
      )
    })),
    onResetNewsToTen: (feedUrl: string) => setVisibleByFeed(prev => ({
      ...prev,
      [feedUrl]: Math.min(COLUMN_LAYOUT_TOKENS.initialVisibleItems, storiesPerColumn)
    })),
    onTogglePinnedNews: (id: string) => dispatch(togglePinnedNews(id)),
    onCopyLink: copyLink,
    onShareNews: shareNews,
    onCopyNewsPayload: copyNewsPayload,
    onHideItem: hideItem,
    onRequestSummary: requestSummary,
    onRequestTitleTranslation: requestTitleTranslation,
    onRequestResearch: requestResearch,
    onToggleAsk: (id, feedUrl) => dispatch(toggleAskOpen({ id, feedUrl })),
    onSetAskDraft: (id, feedUrl, draft) => dispatch(setAskDraft({ id, feedUrl, draft })),
    onAskSubmit: requestAsk
  }), [copyLink, copyNewsPayload, dispatch, getBodyMode, getDefaultBodyMode, hideItem, moveFeedToTop, removeFeed, removeOldInFeed, requestAsk, requestResearch, requestSummary, requestTitleTranslation, setAdvancedControlsByUrl, setBodyMode, setFeedBudget, setFeedFilterPreset, setFeedInterval, setFeedSortMode, setKeywords, setVisibleByFeed, shareNews, storiesPerColumn, toggleFeedResearch, toggleFeedSummary, toggleFeedTranslation]);
}
