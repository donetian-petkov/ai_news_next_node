'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { EMERGING_FEED_URL, FILTERED_FEED_URL } from '../../../store/constants';
import type { FeedInfo, NewsItem } from '../../../store/types';
import { itemActionFeedUrl } from '../feed-column/feedColumnItems.utils';

type RefreshSnapshot = {
  ready: boolean;
  summaryLang: 'bilingual' | 'bg' | 'en';
  researchLang: 'bg' | 'en';
  titleDisplayLanguage: 'original' | 'bg' | 'en';
  feedSummaryEnabledByUrl: Record<string, boolean>;
  feedResearchEnabledByUrl: Record<string, boolean>;
  feedTranslationEnabledByUrl: Record<string, boolean>;
};

type PendingRefreshState = {
  summaryLanguageChanged: boolean;
  researchLanguageChanged: boolean;
  titleLanguageChanged: boolean;
  feedSummaryEnabled: Set<string>;
  feedResearchEnabled: Set<string>;
  feedTranslationEnabled: Set<string>;
};

type Args = {
  connected: boolean;
  aiEnabled: boolean;
  aiAvailable: boolean;
  summaryLang: RefreshSnapshot['summaryLang'];
  researchLang: RefreshSnapshot['researchLang'];
  titleDisplayLanguage: RefreshSnapshot['titleDisplayLanguage'];
  renderedFeeds: FeedInfo[];
  autoActionBypassFeedUrls: string[];
  itemsByFeed: Record<string, NewsItem[]>;
  filteredColumnItems: NewsItem[];
  requestSummary: (item: NewsItem) => void;
  requestResearch: (item: NewsItem) => void;
  requestTitleTranslation: (item: NewsItem) => void;
};

function createPendingRefreshState(): PendingRefreshState {
  return {
    summaryLanguageChanged: false,
    researchLanguageChanged: false,
    titleLanguageChanged: false,
    feedSummaryEnabled: new Set<string>(),
    feedResearchEnabled: new Set<string>(),
    feedTranslationEnabled: new Set<string>()
  };
}

function hasText(value?: string): boolean {
  return Boolean(String(value || '').trim());
}

function needsDisplayedTitleTranslation(item: NewsItem, displayLanguage: 'original' | 'bg' | 'en'): boolean {
  if (displayLanguage === 'original') return false;
  const originalTitle = String(item.title || '').trim();
  const bgTitle = String(item.titleBg || '').trim();
  const enTitle = String(item.titleEn || '').trim();
  if (displayLanguage === 'bg') return !bgTitle || bgTitle === originalTitle;
  return !enTitle || enTitle === originalTitle;
}

function actionItemKey(item: NewsItem): string {
  return `${itemActionFeedUrl(item)}::${item.id}`;
}

export function useExemptColumnExistingItemRefresh({
  connected,
  aiEnabled,
  aiAvailable,
  summaryLang,
  researchLang,
  titleDisplayLanguage,
  renderedFeeds,
  autoActionBypassFeedUrls,
  itemsByFeed,
  filteredColumnItems,
  requestSummary,
  requestResearch,
  requestTitleTranslation
}: Args) {
  const hasBaselineRef = useRef(false);
  const prevSnapshotRef = useRef<RefreshSnapshot | null>(null);
  const pendingRefreshRef = useRef<PendingRefreshState>(createPendingRefreshState());
  const bypassFeedSet = useMemo(() => new Set(autoActionBypassFeedUrls), [autoActionBypassFeedUrls]);
  const ready = connected && aiEnabled && aiAvailable;

  const itemsByRenderedFeed = useMemo(() => {
    const next: Record<string, NewsItem[]> = {};
    renderedFeeds.forEach(feed => {
      next[feed.url] = feed.url === FILTERED_FEED_URL
        ? filteredColumnItems
        : (itemsByFeed[feed.url] || []);
    });
    return next;
  }, [filteredColumnItems, itemsByFeed, renderedFeeds]);

  const snapshot = useMemo<RefreshSnapshot>(() => {
    const feedSummaryEnabledByUrl: Record<string, boolean> = {};
    const feedResearchEnabledByUrl: Record<string, boolean> = {};
    const feedTranslationEnabledByUrl: Record<string, boolean> = {};

    renderedFeeds.forEach(feed => {
      if (!bypassFeedSet.has(feed.url)) return;
      feedSummaryEnabledByUrl[feed.url] = !!feed.summaryEnabled;
      feedResearchEnabledByUrl[feed.url] = !!feed.researchEnabled;
      feedTranslationEnabledByUrl[feed.url] = !!feed.translationEnabled;
    });

    return {
      ready,
      summaryLang,
      researchLang,
      titleDisplayLanguage,
      feedSummaryEnabledByUrl,
      feedResearchEnabledByUrl,
      feedTranslationEnabledByUrl
    };
  }, [bypassFeedSet, ready, renderedFeeds, researchLang, summaryLang, titleDisplayLanguage]);

  const runForBypassFeeds = useCallback((
    predicate: (feed: FeedInfo, item: NewsItem) => boolean,
    action: (item: NewsItem) => void,
    targetFeedUrl?: string
  ) => {
    const seen = new Set<string>();

    renderedFeeds.forEach(feed => {
      if (!bypassFeedSet.has(feed.url)) return;
      if (targetFeedUrl && feed.url !== targetFeedUrl) return;

      const feedItems = itemsByRenderedFeed[feed.url] || [];
      feedItems.forEach(item => {
        if (!item?.id) return;
        const key = actionItemKey(item);
        if (!key || seen.has(key) || !predicate(feed, item)) return;
        seen.add(key);
        action(item);
      });
    });
  }, [bypassFeedSet, itemsByRenderedFeed, renderedFeeds]);

  const refreshSummaries = useCallback((targetFeedUrl?: string) => {
    runForBypassFeeds((feed, item) => {
      if (item.summaryEligible === false) return false;
      if (targetFeedUrl) return true;
      return feed.url === FILTERED_FEED_URL
        || feed.url === EMERGING_FEED_URL
        || !!feed.summaryEnabled
        || hasText(item.summary);
    }, requestSummary, targetFeedUrl);
  }, [requestSummary, runForBypassFeeds]);

  const refreshResearch = useCallback((targetFeedUrl?: string) => {
    runForBypassFeeds((feed, item) => {
      if (targetFeedUrl) return true;
      return feed.url === FILTERED_FEED_URL
        || feed.url === EMERGING_FEED_URL
        || !!feed.researchEnabled
        || hasText(item.research);
    }, requestResearch, targetFeedUrl);
  }, [requestResearch, runForBypassFeeds]);

  const refreshTranslations = useCallback((
    displayLanguage: 'original' | 'bg' | 'en',
    targetFeedUrl?: string
  ) => {
    if (displayLanguage === 'original') return;
    runForBypassFeeds((feed, item) => {
      if (!feed.translationEnabled) return false;
      return needsDisplayedTitleTranslation(item, displayLanguage);
    }, requestTitleTranslation, targetFeedUrl);
  }, [requestTitleTranslation, runForBypassFeeds]);

  useEffect(() => {
    if (!renderedFeeds.length) return;

    const pending = pendingRefreshRef.current;
    const prev = prevSnapshotRef.current;

    if (!hasBaselineRef.current || !prev) {
      hasBaselineRef.current = true;
      prevSnapshotRef.current = snapshot;
      return;
    }

    if (prev.summaryLang !== snapshot.summaryLang) {
      if (snapshot.ready) refreshSummaries();
      else pending.summaryLanguageChanged = true;
    }

    if (prev.researchLang !== snapshot.researchLang) {
      if (snapshot.ready) refreshResearch();
      else pending.researchLanguageChanged = true;
    }

    if (prev.titleDisplayLanguage !== snapshot.titleDisplayLanguage) {
      if (snapshot.ready) refreshTranslations(snapshot.titleDisplayLanguage);
      else pending.titleLanguageChanged = snapshot.titleDisplayLanguage !== 'original';
    }

    Object.entries(snapshot.feedSummaryEnabledByUrl).forEach(([feedUrl, enabled]) => {
      const prevEnabled = !!prev.feedSummaryEnabledByUrl[feedUrl];
      if (!prevEnabled && enabled) {
        if (snapshot.ready) refreshSummaries(feedUrl);
        else pending.feedSummaryEnabled.add(feedUrl);
      }
      if (prevEnabled && !enabled) pending.feedSummaryEnabled.delete(feedUrl);
    });

    Object.entries(snapshot.feedResearchEnabledByUrl).forEach(([feedUrl, enabled]) => {
      const prevEnabled = !!prev.feedResearchEnabledByUrl[feedUrl];
      if (!prevEnabled && enabled) {
        if (snapshot.ready) refreshResearch(feedUrl);
        else pending.feedResearchEnabled.add(feedUrl);
      }
      if (prevEnabled && !enabled) pending.feedResearchEnabled.delete(feedUrl);
    });

    Object.entries(snapshot.feedTranslationEnabledByUrl).forEach(([feedUrl, enabled]) => {
      const prevEnabled = !!prev.feedTranslationEnabledByUrl[feedUrl];
      if (!prevEnabled && enabled) {
        if (snapshot.ready) refreshTranslations(snapshot.titleDisplayLanguage, feedUrl);
        else pending.feedTranslationEnabled.add(feedUrl);
      }
      if (prevEnabled && !enabled) pending.feedTranslationEnabled.delete(feedUrl);
    });

    if (snapshot.ready) {
      if (pending.summaryLanguageChanged) {
        refreshSummaries();
        pending.summaryLanguageChanged = false;
      }
      if (pending.researchLanguageChanged) {
        refreshResearch();
        pending.researchLanguageChanged = false;
      }
      if (pending.titleLanguageChanged) {
        refreshTranslations(snapshot.titleDisplayLanguage);
        pending.titleLanguageChanged = false;
      }

      Array.from(pending.feedSummaryEnabled).forEach(feedUrl => {
        refreshSummaries(feedUrl);
        pending.feedSummaryEnabled.delete(feedUrl);
      });
      Array.from(pending.feedResearchEnabled).forEach(feedUrl => {
        refreshResearch(feedUrl);
        pending.feedResearchEnabled.delete(feedUrl);
      });
      Array.from(pending.feedTranslationEnabled).forEach(feedUrl => {
        refreshTranslations(snapshot.titleDisplayLanguage, feedUrl);
        pending.feedTranslationEnabled.delete(feedUrl);
      });
    }

    prevSnapshotRef.current = snapshot;
  }, [refreshResearch, refreshSummaries, refreshTranslations, renderedFeeds.length, snapshot]);
}
