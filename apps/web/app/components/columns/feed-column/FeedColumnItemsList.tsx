'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Alert, Button, Skeleton, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { BodyMode, FeedAskState } from '../reactColumns.types';
import { collapseText, compactResearch, extractConfidence } from '../reactColumns.utils';
import { NewsCard } from '../NewsCard';
import { useFeedColumnsContext } from '../context/useFeedColumnsContext';
import { useFeedColumnContext } from './context/useFeedColumnContext';
import { COLUMN_COLOR_TOKENS, COLUMN_LAYOUT_TOKENS } from '../designTokens';
import { getDefaultVisibleCount, getShowMoreStep } from '../storyVisibility';
import type { NewsCardHandlers, NewsCardStateModel, NewsCardViewModel } from '../news-card/newsCard.types';
import { askKey, bodyKey, cssEscape, getDefaultAskState, type PendingScrollTarget } from './feedColumnItems.utils';

function pendingKey(feedUrl: string, id: string): string {
  return `${feedUrl}::${id}`;
}

export function FeedColumnItemsList() {
  const { t } = useTranslation();
  const { feed, items, itemsVisible, shownItems, isMatchColumn, accent, soft } = useFeedColumnContext();
  const { view, state, handlers } = useFeedColumnsContext();

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
    summaryPendingById,
    researchPendingById,
    pinnedNewsById,
    askByItem,
    bodyModes,
    hydratedColumns
  } = state;
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
    onToggleAsk,
    onSetAskDraft,
    onAskSubmit,
    onShowMoreNews,
    onResetNewsToTen
  } = handlers;

  const pendingScrollRef = useRef<PendingScrollTarget | null>(null);
  const resetVisibleCount = getDefaultVisibleCount(storiesPerColumn);
  const showMoreCount = getShowMoreStep(shownItems.length, storiesPerColumn);
  const canShowMore = itemsVisible.length > shownItems.length;
  const canReset = shownItems.length > resetVisibleCount;

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
    <Stack spacing={1.2}>
      {itemsVisible.length === 0 ? (
        <Alert severity="info" variant="outlined">
          {items.length === 0 ? (isMatchColumn ? labels.waitingMatches : labels.waiting) : labels.noMatches}
        </Alert>
      ) : shownItems.map(it => {
        const askState: FeedAskState = askByItem[askKey(it)] || getDefaultAskState();
        const pendingLookupKey = pendingKey(it.feedUrl, it.id);
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
          onSetSummaryMode: (mode: BodyMode) => setBodyMode(summaryKey, mode),
          onSetResearchMode: (mode: BodyMode) => setBodyMode(researchKey, mode)
        };

        return (
          <NewsCard
            key={it.id}
            view={sharedCardView}
            state={cardState}
            handlers={cardHandlers}
          />
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
