'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../../store/hooks';
import { EMERGING_FEED_URL, FILTERED_FEED_URL } from '../../../store/constants';
import type { NewsItem } from '../../../store/types';
import { reorderFeeds } from '../../../store/slices/feedsSlice';
import { setFeedPageLoading } from '../../../store/slices/newsSlice';
import { requestFeedPage, startWsConnection, stopWsConnection } from '../../../store/wsClient';
import {
  type SchemeValue,
  type VibeValue
} from '../reactColumns.types';
import { SCHEME_LIST, VIBE_LIST } from '../reactColumns.utils';
import { useReactColumnsState } from './useReactColumnsState';
import { useFeedUiPersistence } from './useFeedUiPersistence';
import { useDesktopNewsNotifications } from './useDesktopNewsNotifications';
import { useAllColumnControlsSync } from './useAllColumnControlsSync';
import { useColumnHydration } from './useColumnHydration';
import { useExemptColumnExistingItemRefresh } from './useExemptColumnExistingItemRefresh';
import { useFeedColumnActions } from './useFeedColumnActions';
import { useNewsItemActions } from './useNewsItemActions';
import { useNewsBodyModes } from './useNewsBodyModes';
import { useColumnDragDrop } from './useColumnDragDrop';
import { useColumnsPresentation } from './useColumnsPresentation';
import { cutoffFromAge } from '../../top-menu/topMenu.services';
import { dedupeNewsItemsBySignature } from './newsDeduplication';

type Args = {
  wsUrl: string;
};

const DUPLICATE_MATCH_TIME_WINDOW_MS = 12 * 60 * 60 * 1000;
const EMERGING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SUMMARY_STALL_THRESHOLD_MS = 90_000;
const SUMMARY_STATUS_REFRESH_MS = 15_000;

function normalizePageLimit(value: number): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return 10;
  return Math.max(1, Math.min(200, parsed));
}

export function useReactColumnsPreviewController({ wsUrl }: Args) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { connection, ui, feeds: feedsState, news: newsState } = useReactColumnsState();
  const { connected, status } = connection;
  const { feeds, pinnedByUrl, controlsOpenByUrl, deleteAgeByUrl, orderByUrl } = feedsState;
  const { itemsByFeed, pageInfoByFeed, summaryPendingById, researchPendingById, pinnedNewsById, askByItem } = newsState;

  const hydratedFeedUiRef = useRef(false);
  const summaryActiveSinceRef = useRef<Record<string, number>>({});
  const pageRequestInFlightRef = useRef<Record<string, true>>({});
  const [advancedControlsByUrl, setAdvancedControlsByUrl] = useState<Record<string, boolean>>({});
  const [summaryStatusTick, setSummaryStatusTick] = useState(0);
  const labels = useMemo(
    () => t('columns', { returnObjects: true }) as Record<string, string>,
    [t]
  );
  const hasText = (value?: string) => Boolean(String(value || '').trim());
  const filteredRepresentativePreferred = (candidate: NewsItem, current: NewsItem) => {
    const candidatePinned = !!pinnedNewsById[candidate.id];
    const currentPinned = !!pinnedNewsById[current.id];
    if (candidatePinned !== currentPinned) return candidatePinned;
    if (Boolean(candidate.coverUrl) !== Boolean(current.coverUrl)) return Boolean(candidate.coverUrl);
    if (hasText(candidate.summary) !== hasText(current.summary)) return hasText(candidate.summary);
    if (hasText(candidate.research) !== hasText(current.research)) return hasText(candidate.research);
    const candidateTranslated = hasText(candidate.titleBg) || hasText(candidate.titleEn);
    const currentTranslated = hasText(current.titleBg) || hasText(current.titleEn);
    if (candidateTranslated !== currentTranslated) return candidateTranslated;
    const candidateCluster = candidate.emergingSignal?.clusterSize || 0;
    const currentCluster = current.emergingSignal?.clusterSize || 0;
    if (candidateCluster !== currentCluster) return candidateCluster > currentCluster;
    return Number(candidate.publishedMs || 0) > Number(current.publishedMs || 0);
  };
  const emergingVelocityRank = (item: NewsItem) => {
    if (item.emergingSignal?.velocity === 'viral') return 3;
    if (item.emergingSignal?.velocity === 'rising') return 2;
    if (item.emergingSignal?.velocity === 'watch') return 1;
    return 0;
  };
  const emergingRepresentativePreferred = (candidate: NewsItem, current: NewsItem) => {
    const candidateVelocity = emergingVelocityRank(candidate);
    const currentVelocity = emergingVelocityRank(current);
    if (candidateVelocity !== currentVelocity) return candidateVelocity > currentVelocity;
    const candidateCluster = candidate.emergingSignal?.clusterSize || 0;
    const currentCluster = current.emergingSignal?.clusterSize || 0;
    if (candidateCluster !== currentCluster) return candidateCluster > currentCluster;
    if (Boolean(candidate.coverUrl) !== Boolean(current.coverUrl)) return Boolean(candidate.coverUrl);
    if (hasText(candidate.summary) !== hasText(current.summary)) return hasText(candidate.summary);
    if (hasText(candidate.research) !== hasText(current.research)) return hasText(candidate.research);
    return Number(candidate.publishedMs || 0) > Number(current.publishedMs || 0);
  };

  useEffect(() => {
    document.body.dataset.reactRenderer = '1';
    startWsConnection(dispatch, wsUrl);

    return () => {
      delete document.body.dataset.reactRenderer;
      stopWsConnection();
    };
  }, [dispatch, wsUrl]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSummaryStatusTick(prev => prev + 1);
    }, SUMMARY_STATUS_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useFeedUiPersistence({
    dispatch,
    feeds,
    pinnedByUrl,
    controlsOpenByUrl,
    deleteAgeByUrl,
    orderByUrl,
    hydratedRef: hydratedFeedUiRef,
    setAdvancedControlsByUrl
  });

  useDesktopNewsNotifications({
    itemsByFeed,
    notifyEnabled: ui.notifyEnabled,
    notifyMode: ui.notifyMode,
    pinnedByUrl,
    topicTrackingEnabled: ui.insightFeatures.topicTracking,
    trackedTopics: ui.trackedTopics
  });

  useAllColumnControlsSync({
    dispatch,
    allColumnControlsHidden: ui.allColumnControlsHidden,
    feedsCount: feeds.length
  });

  const summariesLoadCandidates = useMemo(() => {
    if (!ui.aiEnabled || !ui.aiAvailable) {
      return {
        pendingKeys: [] as string[],
        itemMetaByKey: new Map<string, { title: string; feedUrl: string }>(),
        feedLabelByUrl: new Map<string, string>()
      };
    }

    const feedLabelByUrl = new Map<string, string>(feeds.map(feed => [feed.url, feed.label]));
    const itemMetaByKey = new Map<string, { title: string; feedUrl: string }>();

    Object.entries(itemsByFeed).forEach(([feedUrl, feedItems]) => {
      if (!Array.isArray(feedItems)) return;
      feedItems.forEach(item => {
        if (!item?.id || !item.feedUrl) return;
        const key = `${item.feedUrl}::${item.id}`;
        if (itemMetaByKey.has(key)) return;
        itemMetaByKey.set(key, {
          title: String(item.title || '').trim(),
          feedUrl: String(item.feedUrl || feedUrl)
        });
      });
    });

    const pendingSet = new Set(
      Object.keys(summaryPendingById).filter(key => itemMetaByKey.has(key))
    );

    return {
      pendingKeys: Array.from(pendingSet),
      itemMetaByKey,
      feedLabelByUrl
    };
  }, [feeds, itemsByFeed, summaryPendingById, ui.aiAvailable, ui.aiEnabled]);

  useEffect(() => {
    const now = Date.now();
    const prev = summaryActiveSinceRef.current;
    const next: Record<string, number> = {};
    summariesLoadCandidates.pendingKeys.forEach(key => {
      next[key] = prev[key] || now;
    });
    summaryActiveSinceRef.current = next;
  }, [summariesLoadCandidates.pendingKeys]);

  const summariesLoading = useMemo(() => {
    if (!ui.aiEnabled || !ui.aiAvailable) {
      return { count: 0, stalledCount: 0, items: [] as string[] };
    }

    const now = Date.now();
    const items: string[] = [];
    let stalledCount = 0;
    summariesLoadCandidates.pendingKeys.forEach(key => {
      const meta = summariesLoadCandidates.itemMetaByKey.get(key);
      const parsedFeedUrl = key.includes('::') ? key.slice(0, key.lastIndexOf('::')) : '';
      const parsedId = key.includes('::') ? key.slice(key.lastIndexOf('::') + 2) : key;
      const effectiveFeedUrl = meta?.feedUrl || parsedFeedUrl;
      const feedLabel = effectiveFeedUrl
        ? (summariesLoadCandidates.feedLabelByUrl.get(effectiveFeedUrl) || effectiveFeedUrl)
        : 'unknown';
      const title = meta?.title || parsedId;
      const sinceMs = summaryActiveSinceRef.current[key] || now;
      const ageMs = Math.max(0, now - sinceMs);
      const stalled = ageMs >= SUMMARY_STALL_THRESHOLD_MS;
      if (stalled) stalledCount += 1;
      items.push(`${stalled ? 'STALLED' : 'PENDING'} · [${feedLabel}] ${title}`);
    });

    return {
      count: summariesLoadCandidates.pendingKeys.length,
      stalledCount,
      items
    };
  }, [summariesLoadCandidates, summaryStatusTick, ui.aiAvailable, ui.aiEnabled]);

  const { filteredColumnItems, duplicateMatchById } = useMemo(() => {
    const all = Object.values(itemsByFeed).flatMap(items => Array.isArray(items) ? items : []);
    const map = new Map<string, (typeof all)[number]>();
    const filteredDeleteAge = deleteAgeByUrl[FILTERED_FEED_URL] || 'week';
    const filteredCutoffMs = cutoffFromAge(filteredDeleteAge);

    all.forEach(it => {
      if (!it || !it.id || !it.isMatch || it.filteredOk === false) return;
      if (Number.isFinite(it.publishedMs) && Number(it.publishedMs) < filteredCutoffMs) return;
      const prev = map.get(it.id);
      if (!prev || Number(it.publishedMs || 0) > Number(prev.publishedMs || 0)) {
        map.set(it.id, { ...it, originFeedUrl: it.originFeedUrl || it.feedUrl, feedUrl: FILTERED_FEED_URL });
      }
    });

    const sortedMatched = Array.from(map.values()).sort((a, b) => {
      const aPinned = !!pinnedNewsById[a.id];
      const bPinned = !!pinnedNewsById[b.id];
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return b.publishedMs - a.publishedMs;
    });

    const duplicateFilteringEnabled = !ui.performanceMode && ui.allBudget !== 'low';
    if (!duplicateFilteringEnabled) {
      return {
        filteredColumnItems: sortedMatched,
        duplicateMatchById: {} as Record<string, true>
      };
    }

    const uniqueMatched = dedupeNewsItemsBySignature(sortedMatched, {
      maxTimeDeltaMs: DUPLICATE_MATCH_TIME_WINDOW_MS,
      prefer: filteredRepresentativePreferred
    });
    const uniqueIds = new Set(uniqueMatched.map(item => item.id));
    const duplicateMap: Record<string, true> = {};
    sortedMatched.forEach(item => {
      if (!uniqueIds.has(item.id)) duplicateMap[item.id] = true;
    });

    return {
      filteredColumnItems: uniqueMatched,
      duplicateMatchById: duplicateMap
    };
  }, [deleteAgeByUrl, itemsByFeed, pinnedNewsById, ui.allBudget, ui.performanceMode]);

  const emergingColumnItems = useMemo(() => {
    if (!ui.insightFeatures.emergingStoryDetector || !ui.showEmergingColumn) return [] as NewsItem[];
    const freshnessCutoffMs = Date.now() - EMERGING_MAX_AGE_MS;
    return dedupeNewsItemsBySignature(
      filteredColumnItems
        .filter(item => !!item?.emergingSignal && (item.emergingSignal?.clusterSize || 0) >= 2)
        .filter(item => Number(item.publishedMs || 0) >= freshnessCutoffMs)
        .sort((a, b) => {
          const velocityDiff = emergingVelocityRank(b) - emergingVelocityRank(a);
          if (velocityDiff) return velocityDiff;
          const clusterDiff = (b.emergingSignal?.clusterSize || 0) - (a.emergingSignal?.clusterSize || 0);
          if (clusterDiff) return clusterDiff;
          if (Boolean(b.coverUrl) !== Boolean(a.coverUrl)) return b.coverUrl ? 1 : -1;
          if (hasText(b.summary) !== hasText(a.summary)) return hasText(b.summary) ? 1 : -1;
          const recencyDiff = Number(b.publishedMs || 0) - Number(a.publishedMs || 0);
          if (recencyDiff) return recencyDiff;
          return Number(b.research ? 1 : 0) - Number(a.research ? 1 : 0);
        })
        .map(item => ({ ...item, originFeedUrl: item.originFeedUrl || item.feedUrl, feedUrl: EMERGING_FEED_URL, isMatch: false })),
      { maxTimeDeltaMs: EMERGING_MAX_AGE_MS, prefer: emergingRepresentativePreferred }
    ).slice(0, 30);
  }, [filteredColumnItems, ui.insightFeatures.emergingStoryDetector, ui.showEmergingColumn]);

  const itemsByFeedForPresentation = useMemo(
    () => (ui.showEmergingColumn && emergingColumnItems.length ? { ...itemsByFeed, [EMERGING_FEED_URL]: emergingColumnItems } : itemsByFeed),
    [emergingColumnItems, itemsByFeed, ui.showEmergingColumn]
  );

  const renderedFeeds = useMemo(() => {
    if (feeds.length) {
      const list = feeds.filter(feed => (feed.url === FILTERED_FEED_URL ? ui.showFilteredColumn : true));
      if (ui.insightFeatures.emergingStoryDetector && ui.showEmergingColumn && emergingColumnItems.length) {
        list.unshift({
          url: EMERGING_FEED_URL,
          label: labels.emergingStory || 'Emerging',
          kind: 'rss',
          intervalSec: 0,
          summaryEnabled: false,
          translationEnabled: true,
          researchEnabled: false,
          budget: 'high',
          sortMode: 'matched',
          filters: { onlyMatches: true, onlyResearched: false, onlySummaries: false }
        });
      }
      const orderIndex = new Map(orderByUrl.map((url, idx) => [url, idx]));
      list.sort((a, b) => {
        const aEmerging = a.url === EMERGING_FEED_URL;
        const bEmerging = b.url === EMERGING_FEED_URL;
        if (aEmerging !== bEmerging) return aEmerging ? -1 : 1;
        const aFiltered = a.url === FILTERED_FEED_URL;
        const bFiltered = b.url === FILTERED_FEED_URL;
        if (aFiltered !== bFiltered) return aFiltered ? -1 : 1;
        const ai = orderIndex.get(a.url) ?? Number.MAX_SAFE_INTEGER;
        const bi = orderIndex.get(b.url) ?? Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });
      return list;
    }

    return Object.keys(itemsByFeedForPresentation)
      .filter(url => (url === FILTERED_FEED_URL ? ui.showFilteredColumn : true))
      .filter(url => (url === EMERGING_FEED_URL ? ui.showEmergingColumn : true))
      .map(url => ({
        url,
        label: url === EMERGING_FEED_URL ? (labels.emergingStory || 'Emerging') : url,
        kind: 'rss' as const,
        intervalSec: 120,
        summaryEnabled: false,
        translationEnabled: true,
        researchEnabled: false,
        budget: 'standard' as const,
        sortMode: 'newest' as const,
        filters: { onlyMatches: false, onlyResearched: false, onlySummaries: false }
      }));
  }, [emergingColumnItems.length, feeds, itemsByFeedForPresentation, labels.emergingStory, orderByUrl, ui.insightFeatures.emergingStoryDetector, ui.showEmergingColumn, ui.showFilteredColumn]);

  const { onGridDragOver, onGridDrop, buildDragState, columnNodesRef } = useColumnDragDrop({
    dispatch,
    renderedFeeds
  });

  const { visibleByFeed, setVisibleByFeed, hydratedColumns } = useColumnHydration({
    renderedFeeds,
    storyLimit: ui.storiesPerColumn,
    showMoreNewsAllSeq: ui.showMoreNewsAllSeq,
    resetNewsShownAllSeq: ui.resetNewsShownAllSeq,
    columnNodesRef
  });

  const autoActionBypassFeedUrls = useMemo(() => {
    const bypass = new Set<string>();
    renderedFeeds.forEach(feed => {
      if (feed.url === FILTERED_FEED_URL || feed.url === EMERGING_FEED_URL) {
        bypass.add(feed.url);
      }
    });
    let regularCount = 0;
    for (const feed of renderedFeeds) {
      if (feed.url === FILTERED_FEED_URL || feed.url === EMERGING_FEED_URL) continue;
      bypass.add(feed.url);
      regularCount += 1;
      if (regularCount >= 3) break;
    }
    return Array.from(bypass);
  }, [renderedFeeds]);

  useEffect(() => {
    Object.keys(pageRequestInFlightRef.current).forEach(feedUrl => {
      if (!pageInfoByFeed[feedUrl]?.loading) {
        delete pageRequestInFlightRef.current[feedUrl];
      }
    });
  }, [pageInfoByFeed]);

  useEffect(() => {
    if (!connected || !feeds.length) return;

    feeds.forEach(feed => {
      if (feed.url === FILTERED_FEED_URL || feed.url === EMERGING_FEED_URL) return;
      const page = pageInfoByFeed[feed.url];
      const loadedCount = Array.isArray(itemsByFeed[feed.url]) ? itemsByFeed[feed.url].length : 0;
      const visibleTarget = normalizePageLimit(visibleByFeed[feed.url] || ui.storiesPerColumn);

      if (page?.loading || pageRequestInFlightRef.current[feed.url]) return;

      if (!page?.loaded) {
        if (requestFeedPage(feed.url, visibleTarget, undefined, true)) {
          pageRequestInFlightRef.current[feed.url] = true;
          dispatch(setFeedPageLoading(feed.url));
        }
        return;
      }

      if (!page.hasMore || loadedCount >= visibleTarget) return;

      const nextLimit = normalizePageLimit(Math.max(ui.storiesPerColumn, visibleTarget - loadedCount));
      if (requestFeedPage(feed.url, nextLimit, page.nextCursor, false)) {
        pageRequestInFlightRef.current[feed.url] = true;
        dispatch(setFeedPageLoading(feed.url));
      }
    });
  }, [connected, dispatch, feeds, itemsByFeed, pageInfoByFeed, ui.storiesPerColumn, visibleByFeed]);

  useEffect(() => {
    if (!connected) return;

    const filteredNeedsMore = ui.showFilteredColumn
      && (visibleByFeed[FILTERED_FEED_URL] || ui.storiesPerColumn) > filteredColumnItems.length;
    const emergingNeedsMore = ui.showEmergingColumn
      && ui.insightFeatures.emergingStoryDetector
      && (visibleByFeed[EMERGING_FEED_URL] || ui.storiesPerColumn) > emergingColumnItems.length;
    if (!filteredNeedsMore && !emergingNeedsMore) return;

    feeds.forEach(feed => {
      if (feed.url === FILTERED_FEED_URL || feed.url === EMERGING_FEED_URL) return;
      const page = pageInfoByFeed[feed.url];
      if (!page?.loaded || page.loading || !page.hasMore || pageRequestInFlightRef.current[feed.url]) return;
      if (requestFeedPage(feed.url, normalizePageLimit(ui.storiesPerColumn), page.nextCursor, false)) {
        pageRequestInFlightRef.current[feed.url] = true;
        dispatch(setFeedPageLoading(feed.url));
      }
    });
  }, [
    connected,
    dispatch,
    emergingColumnItems.length,
    feeds,
    filteredColumnItems.length,
    pageInfoByFeed,
    ui.insightFeatures.emergingStoryDetector,
    ui.showEmergingColumn,
    ui.showFilteredColumn,
    ui.storiesPerColumn,
    visibleByFeed
  ]);

  const moveFeedToTop = (feedUrl: string) => {
    const targetFeedUrl = String(feedUrl || '').trim();
    if (!targetFeedUrl || targetFeedUrl === FILTERED_FEED_URL || targetFeedUrl === EMERGING_FEED_URL) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const firstRegular = renderedFeeds.find(feed => feed.url !== FILTERED_FEED_URL && feed.url !== EMERGING_FEED_URL);
    if (firstRegular && firstRegular.url !== targetFeedUrl) {
      dispatch(reorderFeeds({ fromUrl: targetFeedUrl, toUrl: firstRegular.url }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const {
    requestSummary,
    requestTitleTranslation,
    requestResearch,
    requestAutoActions,
    hideItem,
    copyLink,
    shareNews,
    copyNewsPayload,
    requestAsk,
    clipboardNoticeOpen,
    clipboardNotice,
    setClipboardNoticeOpen
  } = useNewsItemActions({
    dispatch,
    connected,
    askByItem,
    labels
  });

  const {
    removeFeed,
    toggleFeedSummary,
    toggleFeedTranslation,
    toggleFeedResearch,
    setFeedBudget,
    setFeedInterval,
    setFeedSortMode,
    setFeedFilterPreset,
    setKeywords,
    removeOldInFeed
  } = useFeedColumnActions({
    dispatch,
    connected,
    deleteAgeByUrl
  });

  const { bodyModes, getBodyMode, getDefaultBodyMode, setBodyMode } = useNewsBodyModes();

  useExemptColumnExistingItemRefresh({
    connected,
    aiEnabled: ui.aiEnabled,
    aiAvailable: ui.aiAvailable,
    summaryLang: ui.summaryLang,
    researchLang: ui.researchLang,
    titleDisplayLanguage: ui.titleDisplayLanguage,
    renderedFeeds,
    autoActionBypassFeedUrls,
    itemsByFeed: itemsByFeedForPresentation,
    filteredColumnItems,
    requestSummary,
    requestResearch,
    requestTitleTranslation
  });

  const { viewModel, stateModel, handlersModel } = useColumnsPresentation({
    dispatch,
    ui: {
      vibe: (VIBE_LIST.includes(ui.vibe as VibeValue) ? ui.vibe : 'default') as VibeValue,
      scheme: (SCHEME_LIST.includes(ui.scheme as SchemeValue) ? ui.scheme : 'classic') as SchemeValue,
      buttonMode: ui.buttonMode,
      titleDisplayLanguage: ui.titleDisplayLanguage,
      language: ui.language,
      timezone: ui.timezone,
      dateFormat: ui.dateFormat,
      showNewsCovers: ui.showNewsCovers,
      performanceMode: ui.performanceMode,
      fontSize: ui.fontSize,
      moodFilter: ui.moodFilter,
      typeFilter: ui.typeFilter,
      searchQuery: ui.searchQuery,
      hideAllResearch: ui.hideAllResearch,
      hideAllSummaries: ui.hideAllSummaries,
      storiesPerColumn: ui.storiesPerColumn,
      aiEnabled: ui.aiEnabled,
      aiAvailable: ui.aiAvailable,
      insightFeatures: ui.insightFeatures,
      localImpactRegion: ui.localImpactRegion,
      trackedTopics: ui.trackedTopics,
      keywords: ui.keywords
    },
    labels,
    connected,
    status,
    filteredColumnItems,
    duplicateMatchById,
    itemsByFeed: itemsByFeedForPresentation,
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
  });

  const columnsContextValue = useMemo(
    () => ({
      header: {
        title: labels.previewTitle,
        liveLabel: labels.live,
        disconnectedLabel: labels.disconnected,
        connected,
        status,
        summariesLoadingCount: summariesLoading.count,
        summariesStalledCount: summariesLoading.stalledCount,
        summariesLoadingLabel: labels.summariesLoading,
        summariesLoadingItems: summariesLoading.items
      },
      clipboard: {
        open: clipboardNoticeOpen,
        message: clipboardNotice || labels.linkCopied,
        onClose: () => setClipboardNoticeOpen(false)
      },
      view: viewModel,
      state: stateModel,
      handlers: handlersModel,
      renderedFeeds,
      autoActionBypassFeedUrls,
      onGridDragOver,
      onGridDrop,
      buildDragState
    }),
    [autoActionBypassFeedUrls, buildDragState, clipboardNotice, clipboardNoticeOpen, connected, handlersModel, labels.disconnected, labels.linkCopied, labels.live, labels.previewTitle, labels.summariesLoading, onGridDragOver, onGridDrop, renderedFeeds, stateModel, status, summariesLoading.count, summariesLoading.items, summariesLoading.stalledCount, viewModel]
  );

  return {
    columnsContextValue
  };
}
