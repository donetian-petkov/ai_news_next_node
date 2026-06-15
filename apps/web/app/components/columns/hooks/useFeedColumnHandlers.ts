'use client';

import { useMemo } from 'react';
import { setAskDraft, toggleAskOpen, togglePinnedNews } from '../../../store/slices/newsSlice';
import { setFeedDeleteAge, toggleFeedControls, togglePinned } from '../../../store/slices/feedsSlice';
import type { AppDispatch } from '../../../store/store';
import { clampVisibleCount, getDefaultVisibleCount, getShowMoreStep } from '../storyVisibility';
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
  setFeedDiscordWebhook: FeedColumnHandlers['onSetFeedDiscordWebhook'];
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
  setFeedDiscordWebhook,
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
    onSetFeedDiscordWebhook: setFeedDiscordWebhook,
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
      [feedUrl]: clampVisibleCount(
        (prev[feedUrl] || getDefaultVisibleCount(storiesPerColumn)) + getShowMoreStep(prev[feedUrl], storiesPerColumn),
        storiesPerColumn
      )
    })),
    onResetNewsToTen: (feedUrl: string) => setVisibleByFeed(prev => ({
      ...prev,
      [feedUrl]: getDefaultVisibleCount(storiesPerColumn)
    })),
    onTogglePinnedNews: (id: string) => dispatch(togglePinnedNews(id)),
    onCopyLink: copyLink,
    onShareNews: shareNews,
    onCopyNewsPayload: copyNewsPayload,
    onHideItem: hideItem,
    onRequestSummary: requestSummary,
    onRequestTitleTranslation: requestTitleTranslation,
    onRequestResearch: requestResearch,
    onRequestAutoActions: requestAutoActions,
    onToggleAsk: (id, feedUrl) => dispatch(toggleAskOpen({ id, feedUrl })),
    onSetAskDraft: (id, feedUrl, draft) => dispatch(setAskDraft({ id, feedUrl, draft })),
    onAskSubmit: requestAsk
  }), [copyLink, copyNewsPayload, dispatch, getBodyMode, getDefaultBodyMode, hideItem, moveFeedToTop, removeFeed, removeOldInFeed, requestAsk, requestAutoActions, requestResearch, requestSummary, requestTitleTranslation, setAdvancedControlsByUrl, setBodyMode, setFeedBudget, setFeedDiscordWebhook, setFeedFilterPreset, setFeedInterval, setFeedSortMode, setKeywords, setVisibleByFeed, shareNews, storiesPerColumn, toggleFeedResearch, toggleFeedSummary, toggleFeedTranslation]);
}
