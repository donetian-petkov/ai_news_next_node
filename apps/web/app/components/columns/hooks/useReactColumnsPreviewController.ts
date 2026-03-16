'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../../store/hooks';
import { EMERGING_FEED_URL, FILTERED_FEED_URL } from '../../../store/constants';
import type { NewsItem } from '../../../store/types';
import { startWsConnection, stopWsConnection } from '../../../store/wsClient';
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
import { useFeedColumnActions } from './useFeedColumnActions';
import { useNewsItemActions } from './useNewsItemActions';
import { useNewsBodyModes } from './useNewsBodyModes';
import { useColumnDragDrop } from './useColumnDragDrop';
import { useColumnsPresentation } from './useColumnsPresentation';

type Args = {
  wsUrl: string;
};

const DUPLICATE_MATCH_SIMILARITY_THRESHOLD = 0.9;
const DUPLICATE_MATCH_TIME_WINDOW_MS = 12 * 60 * 60 * 1000;
const EMERGING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SUMMARY_STALL_THRESHOLD_MS = 90_000;
const SUMMARY_STATUS_REFRESH_MS = 15_000;
const BULGARIAN_NOISE_STEMS = new Set<string>([
  '\u0441\u043b\u0443\u0436\u0435\u0431\u043d' // служебн
]);

type TextVector = {
  counts: Map<string, number>;
  norm: number;
};

type TextSignature = {
  vector: TextVector;
  tokens: Set<string>;
  publishedMs: number;
};

function normalizedTokens(text: string): string[] {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\u045d/g, '\u0438') // ѝ -> и
    .replace(/\u0439/g, '\u0438') // й -> и
    .replace(/\u044a/g, '\u0430') // ъ -> а
    .replace(/\u044c/g, '') // ь -> ''
    .replace(/\u044e/g, '\u0443') // ю -> у
    .replace(/\u044f/g, '\u0430') // я -> а
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\u0400-\u04ff\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 2)
    .map(token => token.slice(0, Math.min(7, token.length)));
}

function primarySimilarityText(item: NewsItem): string {
  const summary = String(item.summary || '').trim();
  if (summary) return summary;
  const research = String(item.research || '').trim();
  if (research) return research;
  return String(item.title || '').trim();
}

function toVector(item: NewsItem): TextVector {
  const sourceText = primarySimilarityText(item);
  const counts = new Map<string, number>();
  normalizedTokens(sourceText).forEach(token => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  const norm = Math.sqrt(Array.from(counts.values()).reduce((sum, value) => sum + value * value, 0));
  return { counts, norm };
}

function toTokenSet(item: NewsItem): Set<string> {
  const sourceText = primarySimilarityText(item);
  return new Set(
    normalizedTokens(sourceText)
      .filter(token => token.length >= 4)
      .filter(token => !BULGARIAN_NOISE_STEMS.has(token))
  );
}

function cosineSimilarity(a: TextVector, b: TextVector): number {
  if (!a.norm || !b.norm) return 0;
  let dot = 0;
  a.counts.forEach((count, token) => {
    const other = b.counts.get(token);
    if (!other) return;
    dot += count * other;
  });
  return dot / (a.norm * b.norm);
}

function tokenOverlapSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  smaller.forEach(token => {
    if (larger.has(token)) intersection += 1;
  });
  return intersection / smaller.size;
}

function dedupeNewsItemsBySignature(items: NewsItem[], maxTimeDeltaMs = DUPLICATE_MATCH_TIME_WINDOW_MS): NewsItem[] {
  const keptSignatures: TextSignature[] = [];
  const uniqueItems: NewsItem[] = [];

  for (const item of items) {
    const signature: TextSignature = {
      vector: toVector(item),
      tokens: toTokenSet(item),
      publishedMs: Number(item.publishedMs || 0)
    };
    const isDuplicate = keptSignatures.some(kept => {
      const cosine = cosineSimilarity(signature.vector, kept.vector);
      if (cosine >= DUPLICATE_MATCH_SIMILARITY_THRESHOLD) return true;

      const overlap = tokenOverlapSimilarity(signature.tokens, kept.tokens);
      const fuzzyOverlap = fuzzyTokenOverlapSimilarity(signature.tokens, kept.tokens);
      const maxOverlap = Math.max(overlap, fuzzyOverlap);
      if (maxOverlap < DUPLICATE_MATCH_SIMILARITY_THRESHOLD) return false;

      if (!signature.publishedMs || !kept.publishedMs) return true;
      const timeDeltaMs = Math.abs(signature.publishedMs - kept.publishedMs);
      return timeDeltaMs <= maxTimeDeltaMs;
    });

    if (isDuplicate) continue;
    uniqueItems.push(item);
    keptSignatures.push(signature);
  }

  return uniqueItems;
}

function oneEditApart(a: string, b: string): boolean {
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < lenA && j < lenB) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (lenA > lenB) {
      i += 1;
    } else if (lenB > lenA) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < lenA || j < lenB) edits += 1;
  return edits <= 1;
}

function fuzzyTokenOverlapSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  const [smaller, larger] = a.size <= b.size ? [Array.from(a), Array.from(b)] : [Array.from(b), Array.from(a)];
  let matches = 0;

  smaller.forEach(token => {
    if (larger.includes(token)) {
      matches += 1;
      return;
    }

    const hasNear = larger.some(candidate => {
      if (Math.abs(candidate.length - token.length) > 1) return false;
      return oneEditApart(token, candidate);
    });
    if (hasNear) matches += 1;
  });

  return matches / smaller.length;
}

export function useReactColumnsPreviewController({ wsUrl }: Args) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { connection, ui, feeds: feedsState, news: newsState } = useReactColumnsState();
  const { connected, status } = connection;
  const { feeds, pinnedByUrl, controlsOpenByUrl, deleteAgeByUrl, orderByUrl } = feedsState;
  const { itemsByFeed, summaryPendingById, researchPendingById, pinnedNewsById, askByItem } = newsState;

  const hydratedFeedUiRef = useRef(false);
  const summaryActiveSinceRef = useRef<Record<string, number>>({});
  const [advancedControlsByUrl, setAdvancedControlsByUrl] = useState<Record<string, boolean>>({});
  const [summaryStatusTick, setSummaryStatusTick] = useState(0);
  const labels = useMemo(
    () => t('columns', { returnObjects: true }) as Record<string, string>,
    [t]
  );

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
    const pendingSet = new Set(Object.keys(summaryPendingById));

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

    all.forEach(it => {
      if (!it || !it.id || !it.isMatch || it.filteredOk === false) return;
      const prev = map.get(it.id);
      if (!prev || Number(it.publishedMs || 0) > Number(prev.publishedMs || 0)) {
        map.set(it.id, { ...it, feedUrl: FILTERED_FEED_URL });
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

    const uniqueMatched = dedupeNewsItemsBySignature(sortedMatched);
    const uniqueIds = new Set(uniqueMatched.map(item => item.id));
    const duplicateMap: Record<string, true> = {};
    sortedMatched.forEach(item => {
      if (!uniqueIds.has(item.id)) duplicateMap[item.id] = true;
    });

    return {
      filteredColumnItems: uniqueMatched,
      duplicateMatchById: duplicateMap
    };
  }, [itemsByFeed, pinnedNewsById, ui.allBudget, ui.performanceMode]);

  const emergingColumnItems = useMemo(() => {
    if (!ui.insightFeatures.emergingStoryDetector || !ui.showEmergingColumn) return [] as NewsItem[];
    const freshnessCutoffMs = Date.now() - EMERGING_MAX_AGE_MS;
    const velocityRank = (item: NewsItem) => {
      if (item.emergingSignal?.velocity === 'viral') return 3;
      if (item.emergingSignal?.velocity === 'rising') return 2;
      if (item.emergingSignal?.velocity === 'watch') return 1;
      return 0;
    };
    return dedupeNewsItemsBySignature(
      filteredColumnItems
        .filter(item => !!item?.emergingSignal && (item.emergingSignal?.clusterSize || 0) >= 2)
        .filter(item => Number(item.publishedMs || 0) >= freshnessCutoffMs)
        .sort((a, b) => {
          const recencyDiff = Number(b.publishedMs || 0) - Number(a.publishedMs || 0);
          if (recencyDiff) return recencyDiff;
          const velocityDiff = velocityRank(b) - velocityRank(a);
          if (velocityDiff) return velocityDiff;
          return (b.emergingSignal?.clusterSize || 0) - (a.emergingSignal?.clusterSize || 0);
        })
        .map(item => ({ ...item, feedUrl: EMERGING_FEED_URL, isMatch: false })),
      EMERGING_MAX_AGE_MS
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
    showMoreNewsAllSeq: ui.showMoreNewsAllSeq,
    resetNewsShownAllSeq: ui.resetNewsShownAllSeq,
    columnNodesRef
  });

  const {
    requestSummary,
    requestTitleTranslation,
    requestResearch,
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

  const { viewModel, stateModel, handlersModel } = useColumnsPresentation({
    dispatch,
    ui: {
      vibe: (VIBE_LIST.includes(ui.vibe as VibeValue) ? ui.vibe : 'default') as VibeValue,
      scheme: (SCHEME_LIST.includes(ui.scheme as SchemeValue) ? ui.scheme : 'classic') as SchemeValue,
      buttonMode: ui.buttonMode,
      titleDisplayLanguage: ui.titleDisplayLanguage,
      performanceMode: ui.performanceMode,
      fontSize: ui.fontSize,
      moodFilter: ui.moodFilter,
      typeFilter: ui.typeFilter,
      searchQuery: ui.searchQuery,
      hideAllResearch: ui.hideAllResearch,
      hideAllSummaries: ui.hideAllSummaries,
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
    requestTitleTranslation,
    requestResearch,
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
      onGridDragOver,
      onGridDrop,
      buildDragState
    }),
    [buildDragState, clipboardNotice, clipboardNoticeOpen, connected, handlersModel, labels.disconnected, labels.linkCopied, labels.live, labels.previewTitle, labels.summariesLoading, onGridDragOver, onGridDrop, renderedFeeds, stateModel, status, summariesLoading.count, summariesLoading.items, summariesLoading.stalledCount, viewModel]
  );

  return {
    columnsContextValue
  };
}
