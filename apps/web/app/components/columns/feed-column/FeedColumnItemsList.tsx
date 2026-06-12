'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Button, Skeleton, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NewsMoodFilterValue, NewsTypeFilterValue, type NewsItem } from '../../../store/types';
import { EMERGING_FEED_URL, FILTERED_FEED_URL } from '../../../store/constants';
import type { BodyMode, FeedAskState } from '../reactColumns.types';
import { collapseText, compactResearch, extractConfidence } from '../reactColumns.utils';
import { NewsCard } from '../NewsCard';
import { useFeedColumnsContext } from '../context/useFeedColumnsContext';
import { useFeedColumnContext } from './context/useFeedColumnContext';
import { COLUMN_COLOR_TOKENS, COLUMN_LAYOUT_TOKENS } from '../designTokens';
import { getDefaultVisibleCount, getShowMoreStep } from '../storyVisibility';
import type { NewsCardHandlers, NewsCardStateModel, NewsCardViewModel } from '../news-card/newsCard.types';
import { askKey, bodyKey, cssEscape, getDefaultAskState, itemActionFeedUrl, type PendingScrollTarget } from './feedColumnItems.utils';

const AUTO_ACTION_RETRY_MS = 45_000;
const AUTO_CLASSIFICATION_BATCH = 12;

type AutoActionRequest = {
  summary?: boolean;
  research?: boolean;
  titleTranslate?: boolean;
  mood?: boolean;
  newsType?: boolean;
};

type AutoActionSentinelProps = {
  enabled: boolean;
  immediate: boolean;
  watchKey: string;
  onVisible: () => void;
  children: ReactNode;
};

function pendingKey(feedUrl: string, id: string): string {
  return `${feedUrl}::${id}`;
}

function needsDisplayedTitleTranslation(item: NewsItem, displayLanguage: 'original' | 'bg' | 'en'): boolean {
  if (displayLanguage === 'original') return false;
  const originalTitle = String(item.title || '').trim();
  const bgTitle = String(item.titleBg || '').trim();
  const enTitle = String(item.titleEn || '').trim();
  if (displayLanguage === 'bg') return !bgTitle || bgTitle === originalTitle;
  return !enTitle || enTitle === originalTitle;
}

function hasAutoActionRequest(request: AutoActionRequest): boolean {
  return !!(request.summary || request.research || request.titleTranslate || request.mood || request.newsType);
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function AutoActionSentinel({
  enabled,
  immediate,
  watchKey,
  onVisible,
  children
}: AutoActionSentinelProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (immediate) {
      onVisible();
      return;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      onVisible();
      return;
    }

    let fired = false;
    const observer = new IntersectionObserver((entries) => {
      if (fired) return;
      const seen = entries.some(entry => entry.isIntersecting || entry.intersectionRatio > 0.1);
      if (!seen) return;
      fired = true;
      observer.disconnect();
      onVisible();
    }, {
      root: null,
      rootMargin: '220px 0px',
      threshold: 0.1
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, immediate, onVisible, watchKey]);

  return <div ref={ref}>{children}</div>;
}

export function FeedColumnItemsList() {
  const { t } = useTranslation();
  const { feed, items, itemsVisible, shownItems, isMatchColumn, accent, soft } = useFeedColumnContext();
  const { view, state, handlers, autoActionBypassFeedUrls } = useFeedColumnsContext();

  const {
    aiAvailable,
    aiEnabled,
    performanceMode,
    fontScale,
    buttonMode,
    compactBtnSx,
    labels,
    cardLabels,
    vibeIcons,
    language,
    timezone,
    dateFormat,
    showNewsCovers,
    hideAllResearch,
    hideAllSummaries,
    palette,
    connected,
    storiesPerColumn
  } = view;

  const {
    duplicateMatchById,
    pageInfoByFeed,
    summaryPendingById,
    researchPendingById,
    pinnedNewsById,
    askByItem,
    bodyModes,
    hydratedColumns
  } = state;
  const feedPageInfo = pageInfoByFeed[feed.url];
  const isHydrated = !!hydratedColumns[feed.url];

  const {
    getBodyMode,
    getDefaultBodyMode,
    setBodyMode,
    onTogglePinnedNews,
    onCopyLink,
    onShareNews,
    onCopyNewsPayload,
    onHideItem,
    onRequestSummary,
    onRequestTitleTranslation,
    onRequestResearch,
    onRequestAutoActions,
    onToggleAsk,
    onSetAskDraft,
    onAskSubmit,
    onShowMoreNews,
    onResetNewsToTen
  } = handlers;

  const pendingScrollRef = useRef<PendingScrollTarget | null>(null);
  const autoActionRequestAtRef = useRef<Record<string, number>>({});
  const columnRootRef = useRef<HTMLDivElement | null>(null);
  const [isColumnVisible, setIsColumnVisible] = useState(false);
  const resetVisibleCount = getDefaultVisibleCount(storiesPerColumn);
  const showMoreCount = getShowMoreStep(shownItems.length, storiesPerColumn);
  const regularFeedsHaveMore = useMemo(() => Object.entries(pageInfoByFeed).some(([feedUrl, page]) => (
    feedUrl !== FILTERED_FEED_URL
    && feedUrl !== EMERGING_FEED_URL
    && !!page?.hasMore
  )), [pageInfoByFeed]);
  const canShowMore = itemsVisible.length > shownItems.length
    || (feed.url === FILTERED_FEED_URL || feed.url === EMERGING_FEED_URL
      ? regularFeedsHaveMore
      : !!pageInfoByFeed[feed.url]?.hasMore);
  const canReset = (state.visibleByFeed[feed.url] || resetVisibleCount) > resetVisibleCount;
  const bypassViewportAuto = autoActionBypassFeedUrls.includes(feed.url);
  const moodFilterActive = !performanceMode && view.moodFilter !== NewsMoodFilterValue.All;
  const typeFilterActive = !performanceMode && view.typeFilter !== NewsTypeFilterValue.All;
  const emptyStateMessage = useMemo(() => {
    const now = Date.now();
    const cooldownMs = feedPageInfo?.disabledUntilMs ? Math.max(0, feedPageInfo.disabledUntilMs - now) : 0;
    const lastError = String(feedPageInfo?.lastError || '').trim().toLowerCase();

    if (cooldownMs > 0) {
      const time = formatCountdown(cooldownMs);
      if (lastError.includes('429')) {
        return (labels.feedRateLimited || 'Rate limited, retrying in {{time}}').replace('{{time}}', time);
      }
      return (labels.feedCoolingDown || 'Cooling down, retrying in {{time}}').replace('{{time}}', time);
    }

    if (lastError.includes('parse') || lastError.includes('entity name')) {
      return labels.feedParseError || 'Feed temporarily unavailable.';
    }
    if (lastError.includes('empty body') || lastError.includes('contained no items')) {
      return labels.feedEmpty || 'No news yet from this source.';
    }

    if (!feedPageInfo?.loaded) {
      return isMatchColumn ? (labels.waitingMatches || 'No matched news yet...') : (labels.loadingFeed || labels.waiting || 'Waiting for news...');
    }

    return labels.feedEmpty || 'No news yet from this source.';
  }, [feedPageInfo?.disabledUntilMs, feedPageInfo?.lastError, feedPageInfo?.loaded, feedPageInfo?.loading, isMatchColumn, labels]);

  useEffect(() => {
    const pending = pendingScrollRef.current;
    if (!pending) return;
    if (!shownItems.length) return;

    const feedUrlEscaped = cssEscape(feed.url);
    const columnRoot = document.querySelector(`[data-feed-url="${feedUrlEscaped}"]`) as HTMLElement | null;
    if (!columnRoot) return;

    const targetId = pending.mode === 'news'
      ? pending.newsId
      : shownItems[0]?.id;
    if (!targetId) return;

    const newsIdEscaped = cssEscape(targetId);
    const target = columnRoot.querySelector(`.news-item-card[data-news-id="${newsIdEscaped}"]`) as HTMLElement | null;
    if (!target) return;

    pendingScrollRef.current = null;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      });
    });
  }, [feed.url, shownItems]);

  useEffect(() => {
    if (bypassViewportAuto) {
      setIsColumnVisible(true);
      return;
    }

    const node = columnRootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsColumnVisible(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some(entry => entry.isIntersecting || entry.intersectionRatio > 0.05);
      setIsColumnVisible(visible);
    }, {
      root: null,
      rootMargin: '220px 0px',
      threshold: 0.05
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [bypassViewportAuto, feed.url]);

  const sharedCardView = useMemo<NewsCardViewModel>(() => ({
    labels: cardLabels,
    vibeIcons,
    compactBtnSx,
    buttonMode,
    titleDisplayLanguage: view.titleDisplayLanguage,
    translationEnabled: feed.translationEnabled,
    language,
    timezone,
    dateFormat,
    showNewsCovers,
    aiAvailable,
    insightFeatures: view.insightFeatures,
    localImpactRegion: view.localImpactRegion,
    trackedTopics: view.trackedTopics,
    performanceMode,
    fontScale,
    connected,
    hideAllResearch,
    hideAllSummaries,
    accent,
    soft,
    matchAccent: palette.m
  }), [accent, aiAvailable, buttonMode, cardLabels, compactBtnSx, connected, dateFormat, feed.translationEnabled, fontScale, hideAllResearch, hideAllSummaries, language, palette.m, performanceMode, showNewsCovers, soft, timezone, vibeIcons, view.insightFeatures, view.localImpactRegion, view.titleDisplayLanguage, view.trackedTopics]);

  const sharedCardHandlers = useMemo<NewsCardHandlers>(() => ({
    onTogglePinnedNews,
    onCopyLink,
    onShareNews,
    onCopyNews: onCopyNewsPayload,
    onHideItem,
    onRequestSummary,
    onRequestTitleTranslation,
    onRequestResearch,
    onToggleAsk,
    onAskDraft: onSetAskDraft,
    onAskSubmit,
    onSetSummaryMode: () => {},
    onSetResearchMode: () => {}
  }), [onAskSubmit, onCopyLink, onCopyNewsPayload, onHideItem, onRequestResearch, onRequestSummary, onRequestTitleTranslation, onSetAskDraft, onShareNews, onToggleAsk, onTogglePinnedNews]);

  const requestAutoActionsForItem = useCallback((item: NewsItem, request: AutoActionRequest) => {
    const feedUrl = itemActionFeedUrl(item);
    if (!feedUrl) return;
    const now = Date.now();
    const next: AutoActionRequest = {};

    const maybeAdd = (kind: keyof AutoActionRequest) => {
      if (!request[kind]) return;
      const requestKey = `${kind}:${feedUrl}::${item.id}`;
      const lastAt = autoActionRequestAtRef.current[requestKey] || 0;
      if (now - lastAt < AUTO_ACTION_RETRY_MS) return;
      next[kind] = true;
    };

    maybeAdd('summary');
    maybeAdd('research');
    maybeAdd('titleTranslate');
    maybeAdd('mood');
    maybeAdd('newsType');
    if (!hasAutoActionRequest(next)) return;

    const ok = onRequestAutoActions(item, next);
    if (!ok) return;

    (Object.keys(next) as Array<keyof AutoActionRequest>).forEach(kind => {
      if (!next[kind]) return;
      autoActionRequestAtRef.current[`${kind}:${feedUrl}::${item.id}`] = now;
    });
  }, [onRequestAutoActions]);

  const classificationTargets = useMemo(() => {
    if (!moodFilterActive && !typeFilterActive) return [] as NewsItem[];
    const batchSize = Math.max(resetVisibleCount, shownItems.length, 1, AUTO_CLASSIFICATION_BATCH);
    return items
      .slice(0, batchSize)
      .filter(item => (moodFilterActive && !item.mood) || (typeFilterActive && !item.newsType))
      .slice(0, AUTO_CLASSIFICATION_BATCH);
  }, [items, moodFilterActive, resetVisibleCount, shownItems.length, typeFilterActive]);

  useEffect(() => {
    if (!isColumnVisible) return;
    if (!classificationTargets.length) return;

    classificationTargets.forEach(item => {
      requestAutoActionsForItem(item, {
        ...(moodFilterActive && !item.mood ? { mood: true } : {}),
        ...(typeFilterActive && !item.newsType ? { newsType: true } : {})
      });
    });
  }, [classificationTargets, isColumnVisible, moodFilterActive, requestAutoActionsForItem, typeFilterActive]);

  if (!isHydrated) {
    return (
      <Stack spacing={1.2} sx={{ py: 0.6 }}>
        <Skeleton variant="rounded" height={80} sx={{ bgcolor: COLUMN_COLOR_TOKENS.skeletonBg }} />
        <Skeleton variant="rounded" height={80} sx={{ bgcolor: COLUMN_COLOR_TOKENS.skeletonBg }} />
        <Alert severity="info" variant="outlined">Loading column...</Alert>
      </Stack>
    );
  }

  return (
    <Stack ref={columnRootRef} spacing={1.2}>
      {itemsVisible.length === 0 ? (
        <Alert severity="info" variant="outlined">
          {items.length === 0 ? emptyStateMessage : (labels.noMatches || 'No search matches in this stream.')}
        </Alert>
      ) : shownItems.map(it => {
        const askState: FeedAskState = askByItem[askKey(it)] || getDefaultAskState();
        const pendingLookupKey = pendingKey(itemActionFeedUrl(it), it.id);
        const summaryKey = bodyKey(it, 'summary');
        const researchKey = bodyKey(it, 'research');
        const summaryResearchHidden = hideAllResearch || bodyModes[researchKey] === 'hidden';
        const savedSummaryMode = bodyModes[summaryKey];
        const summaryMode = summaryResearchHidden && savedSummaryMode === 'hidden'
          ? getDefaultBodyMode(it.summary || '', COLUMN_LAYOUT_TOKENS.summaryCollapseThreshold)
          : getBodyMode(summaryKey, it.summary || '', COLUMN_LAYOUT_TOKENS.summaryCollapseThreshold);

        const summaryLong = String(it.summary || '').trim().length > COLUMN_LAYOUT_TOKENS.summaryCollapseThreshold;
        const summaryText = summaryMode === 'collapsed'
          ? collapseText(it.summary || '', COLUMN_LAYOUT_TOKENS.summaryCollapseThreshold)
          : String(it.summary || '');

        const researchMode = getBodyMode(researchKey, it.research || '', COLUMN_LAYOUT_TOKENS.researchCollapseThreshold);
        const researchLong = String(it.research || '').trim().length > COLUMN_LAYOUT_TOKENS.researchCollapseThreshold;
        const researchText = researchMode === 'collapsed'
          ? compactResearch(it.research || '')
          : String(it.research || '');
        const cardState: NewsCardStateModel = {
          item: it,
          isDuplicateMatch: !!duplicateMatchById[it.id],
          askState,
          summaryPending: !!summaryPendingById[pendingLookupKey],
          researchPending: !!researchPendingById[pendingLookupKey],
          isPinnedNews: !!pinnedNewsById[it.id],
          showAutoSummarizing: aiAvailable
            && feed.summaryEnabled
            && aiEnabled
            && it.summaryEligible !== false
            && !it.summary
            && !summaryPendingById[pendingLookupKey],
          showAutoResearching: aiAvailable && feed.researchEnabled && aiEnabled && !it.research && !researchPendingById[pendingLookupKey] && !hideAllResearch,
          summaryMode,
          summaryLong,
          summaryText,
          researchMode,
          researchLong,
          researchText,
          researchConfidence: extractConfidence(it.research || '')
        };

        const cardHandlers: NewsCardHandlers = {
          ...sharedCardHandlers,
          onToggleAsk: () => onToggleAsk(it.id, itemActionFeedUrl(it)),
          onAskDraft: (_id, _feedUrl, draft) => onSetAskDraft(it.id, itemActionFeedUrl(it), draft),
          onSetSummaryMode: (mode: BodyMode) => setBodyMode(summaryKey, mode),
          onSetResearchMode: (mode: BodyMode) => setBodyMode(researchKey, mode)
        };
        const autoActionRequest: AutoActionRequest = {
          ...(aiAvailable
            && aiEnabled
            && !performanceMode
            && !hideAllSummaries
            && feed.summaryEnabled
            && it.summaryEligible !== false
            && !String(it.summary || '').trim()
            && !summaryPendingById[pendingLookupKey]
            ? { summary: true }
            : {}),
          ...(aiAvailable
            && aiEnabled
            && !performanceMode
            && !hideAllResearch
            && feed.researchEnabled
            && !String(it.research || '').trim()
            && !researchPendingById[pendingLookupKey]
            ? { research: true }
            : {}),
          ...(aiAvailable
            && aiEnabled
            && !performanceMode
            && feed.translationEnabled
            && needsDisplayedTitleTranslation(it, view.titleDisplayLanguage)
            ? { titleTranslate: true }
            : {})
        };
        const shouldObserveCard = hasAutoActionRequest(autoActionRequest);
        const autoWatchKey = [
          itemActionFeedUrl(it),
          it.id,
          autoActionRequest.summary ? 'summary' : '',
          autoActionRequest.research ? 'research' : '',
          autoActionRequest.titleTranslate ? 'title' : ''
        ].join(':');

        return (
          <AutoActionSentinel
            key={it.id}
            enabled={shouldObserveCard}
            immediate={bypassViewportAuto}
            watchKey={autoWatchKey}
            onVisible={() => requestAutoActionsForItem(it, autoActionRequest)}
          >
            <NewsCard
              view={sharedCardView}
              state={cardState}
              handlers={cardHandlers}
            />
          </AutoActionSentinel>
        );
      })}
      {itemsVisible.length > 0 ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            size="small"
            variant="outlined"
            disabled={!canShowMore}
            onClick={() => {
              if (!canShowMore) return;
              const target = itemsVisible[shownItems.length];
              if (target?.id) {
                pendingScrollRef.current = { mode: 'news', newsId: target.id };
              }
              onShowMoreNews(feed.url);
            }}
          >
            {t('columns.showMoreNewsCount', { count: showMoreCount })}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            disabled={!canReset}
            onClick={() => {
              if (!canReset) return;
              pendingScrollRef.current = { mode: 'top' };
              onResetNewsToTen(feed.url);
            }}
          >
            {t('columns.resetToFirstCount', { count: resetVisibleCount })}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
