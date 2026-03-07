'use client';

import { useMemo } from 'react';
import { setAskDraft, toggleAskOpen, togglePinnedNews } from '../../../store/slices/newsSlice';
import { setFeedDeleteAge, toggleFeedControls, togglePinned } from '../../../store/slices/feedsSlice';
import type { AppDispatch } from '../../../store/store';
import type { FeedColumnHandlers } from '../reactColumns.types';

type Args = {
  dispatch: AppDispatch;
  getBodyMode: FeedColumnHandlers['getBodyMode'];
  getDefaultBodyMode: FeedColumnHandlers['getDefaultBodyMode'];
  setBodyMode: FeedColumnHandlers['setBodyMode'];
  setAdvancedControlsByUrl: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setVisibleByFeed: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  removeFeed: FeedColumnHandlers['onRemoveFeed'];
  toggleFeedSummary: FeedColumnHandlers['onToggleFeedSummary'];
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
  requestResearch: FeedColumnHandlers['onRequestResearch'];
  requestAsk: FeedColumnHandlers['onAskSubmit'];
};

export function useFeedColumnHandlers({
  dispatch,
  getBodyMode,
  getDefaultBodyMode,
  setBodyMode,
  setAdvancedControlsByUrl,
  setVisibleByFeed,
  removeFeed,
  toggleFeedSummary,
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
  requestResearch,
  requestAsk
}: Args) {
  return useMemo<FeedColumnHandlers>(() => ({
    getBodyMode,
    getDefaultBodyMode,
    setBodyMode,
    onTogglePinnedColumn: (feedUrl: string) => dispatch(togglePinned(feedUrl)),
    onRemoveFeed: removeFeed,
    onToggleFeedControls: (feedUrl: string) => dispatch(toggleFeedControls(feedUrl)),
    onToggleFeedSummary: toggleFeedSummary,
    onToggleFeedResearch: toggleFeedResearch,
    onSetFeedBudget: setFeedBudget,
    onSetFeedInterval: setFeedInterval,
    onSetFeedSortMode: setFeedSortMode,
    onSetFeedFilterPreset: setFeedFilterPreset,
    onSetKeywords: setKeywords,
    onToggleAdvancedControls: (feedUrl: string) => setAdvancedControlsByUrl(prev => ({ ...prev, [feedUrl]: !prev[feedUrl] })),
    onSetDeleteAge: (feedUrl, age) => dispatch(setFeedDeleteAge({ feedUrl, age })),
    onRemoveOldInFeed: removeOldInFeed,
    onShowMoreNews: (feedUrl: string) => setVisibleByFeed(prev => ({ ...prev, [feedUrl]: (prev[feedUrl] || 10) + 5 })),
    onResetNewsToTen: (feedUrl: string) => setVisibleByFeed(prev => ({ ...prev, [feedUrl]: 10 })),
    onTogglePinnedNews: (id: string) => dispatch(togglePinnedNews(id)),
    onCopyLink: copyLink,
    onShareNews: shareNews,
    onCopyNewsPayload: copyNewsPayload,
    onHideItem: hideItem,
    onRequestSummary: requestSummary,
    onRequestResearch: requestResearch,
    onToggleAsk: (id, feedUrl) => dispatch(toggleAskOpen({ id, feedUrl })),
    onSetAskDraft: (id, feedUrl, draft) => dispatch(setAskDraft({ id, feedUrl, draft })),
    onAskSubmit: requestAsk
  }), [copyLink, copyNewsPayload, dispatch, getBodyMode, getDefaultBodyMode, hideItem, removeFeed, removeOldInFeed, requestAsk, requestResearch, requestSummary, setAdvancedControlsByUrl, setBodyMode, setFeedBudget, setFeedFilterPreset, setFeedInterval, setFeedSortMode, setKeywords, setVisibleByFeed, shareNews, toggleFeedResearch, toggleFeedSummary]);
}
