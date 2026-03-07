'use client';

import { useCallback } from 'react';
import type { AppDispatch } from '../../../store/store';
import { removeFeedLocally, setFeedBudgetSetting, setFeedColumnSettings, setFeedIntervalSetting, setFeedResearchSetting, setFeedSummarySetting } from '../../../store/slices/feedsSlice';
import { removeOldItemsInFeed } from '../../../store/slices/newsSlice';
import { setKeywords as setUiKeywords } from '../../../store/slices/uiSlice';
import { sendWsMessage } from '../../../store/wsClient';
import type { BudgetMode, FeedInfo, SortMode } from '../../../store/types';
import { cutoffFromAge, presetToFeedFilters } from '../reactColumns.utils';
import { COLUMN_LAYOUT_TOKENS } from '../designTokens';
import type { FeedFilterPreset } from '../reactColumns.types';

type UseFeedColumnActionsArgs = {
  dispatch: AppDispatch;
  connected: boolean;
  deleteAgeByUrl: Record<string, 'yesterday' | 'week' | 'month' | 'year'>;
};

export function useFeedColumnActions({
  dispatch,
  connected,
  deleteAgeByUrl
}: UseFeedColumnActionsArgs) {
  const removeFeed = useCallback((feedUrl: string) => {
    if (!connected) return;
    const ok = sendWsMessage({ type: 'remove_feed', feedUrl });
    if (ok) dispatch(removeFeedLocally(feedUrl));
  }, [connected, dispatch]);

  const toggleFeedSummary = useCallback((feed: FeedInfo) => {
    if (!connected) return;
    const nextEnabled = !feed.summaryEnabled;
    const ok = sendWsMessage({ type: 'set_feed_summary', feedUrl: feed.url, enabled: nextEnabled });
    if (ok) dispatch(setFeedSummarySetting({ feedUrl: feed.url, enabled: nextEnabled }));
  }, [connected, dispatch]);

  const toggleFeedResearch = useCallback((feed: FeedInfo) => {
    if (!connected) return;
    const nextEnabled = !feed.researchEnabled;
    const ok = sendWsMessage({ type: 'set_feed_research', feedUrl: feed.url, enabled: nextEnabled });
    if (ok) dispatch(setFeedResearchSetting({ feedUrl: feed.url, enabled: nextEnabled }));
  }, [connected, dispatch]);

  const setFeedBudget = useCallback((feed: FeedInfo, budget: BudgetMode) => {
    if (!connected) return;
    const ok = sendWsMessage({ type: 'set_feed_budget', feedUrl: feed.url, budget });
    if (ok) dispatch(setFeedBudgetSetting({ feedUrl: feed.url, budget }));
  }, [connected, dispatch]);

  const setFeedInterval = useCallback((feed: FeedInfo, intervalSec: number) => {
    if (!connected) return;
    const next = Math.max(COLUMN_LAYOUT_TOKENS.minFeedIntervalSec, Math.min(COLUMN_LAYOUT_TOKENS.maxFeedIntervalSec, Math.floor(intervalSec)));
    const ok = sendWsMessage({ type: 'set_feed_interval', feedUrl: feed.url, intervalSec: next });
    if (ok) dispatch(setFeedIntervalSetting({ feedUrl: feed.url, intervalSec: next }));
  }, [connected, dispatch]);

  const setFeedSortMode = useCallback((feed: FeedInfo, sortMode: SortMode) => {
    if (!connected) return;
    const ok = sendWsMessage({
      type: 'set_feed_column_settings',
      feedUrl: feed.url,
      sortMode,
      filters: feed.filters
    });
    if (ok) dispatch(setFeedColumnSettings({ feedUrl: feed.url, sortMode }));
  }, [connected, dispatch]);

  const setFeedFilters = useCallback((feed: FeedInfo, filters: FeedInfo['filters']) => {
    if (!connected) return;
    const ok = sendWsMessage({
      type: 'set_feed_column_settings',
      feedUrl: feed.url,
      sortMode: feed.sortMode,
      filters
    });
    if (ok) dispatch(setFeedColumnSettings({ feedUrl: feed.url, filters }));
  }, [connected, dispatch]);

  const setFeedFilterPreset = useCallback((feed: FeedInfo, preset: FeedFilterPreset) => {
    setFeedFilters(feed, presetToFeedFilters(preset));
  }, [setFeedFilters]);

  const setKeywords = useCallback((keywords: string[]) => {
    if (!connected) return;
    const cleaned = Array.isArray(keywords)
      ? keywords
        .map(v => String(v || '').trim())
        .filter(Boolean)
      : [];
    const ok = sendWsMessage({ type: 'set_keywords', keywords: cleaned });
    if (ok) dispatch(setUiKeywords(cleaned));
  }, [connected, dispatch]);

  const removeOldInFeed = useCallback((feed: FeedInfo) => {
    const age = deleteAgeByUrl[feed.url] || 'week';
    dispatch(removeOldItemsInFeed({
      feedUrl: feed.url,
      cutoffMs: cutoffFromAge(age)
    }));
  }, [deleteAgeByUrl, dispatch]);

  return {
    removeFeed,
    toggleFeedSummary,
    toggleFeedResearch,
    setFeedBudget,
    setFeedInterval,
    setFeedSortMode,
    setFeedFilterPreset,
    setKeywords,
    removeOldInFeed
  };
}
