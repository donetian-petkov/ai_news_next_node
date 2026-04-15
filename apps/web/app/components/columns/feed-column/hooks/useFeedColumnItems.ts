'use client';

import { useMemo } from 'react';
import { NewsMoodFilterValue, NewsTypeFilterValue, type FeedInfo, type NewsItem } from '../../../../store/types';
import { COLUMN_LAYOUT_TOKENS } from '../../designTokens';

type Args = {
  feed: FeedInfo;
  isMatchColumn: boolean;
  filteredColumnItems: NewsItem[];
  itemsByFeed: Record<string, NewsItem[]>;
  moodFilter: string;
  typeFilter: string;
  searchQuery: string;
  performanceMode: boolean;
  visibleByFeed: Record<string, number>;
  storiesPerColumn: number;
};

function normalizeStoriesPerColumn(value: number): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return COLUMN_LAYOUT_TOKENS.initialVisibleItems;
  return Math.max(1, Math.min(200, parsed));
}

export function useFeedColumnItems({
  feed,
  isMatchColumn,
  filteredColumnItems,
  itemsByFeed,
  moodFilter,
  typeFilter,
  searchQuery,
  performanceMode,
  visibleByFeed,
  storiesPerColumn
}: Args) {
  const items = isMatchColumn ? filteredColumnItems : (itemsByFeed[feed.url] || []);

  const itemsVisible = useMemo(() => {
    const moodFilterEffective = performanceMode ? NewsMoodFilterValue.All : moodFilter;
    const typeFilterEffective = performanceMode ? NewsTypeFilterValue.All : typeFilter;

    const moodFiltered = moodFilterEffective === NewsMoodFilterValue.All
      ? items
      : items.filter(it => it.mood === moodFilterEffective);

    const typeFiltered = typeFilterEffective === NewsTypeFilterValue.All
      ? moodFiltered
      : moodFiltered.filter(it => it.newsType === typeFilterEffective);

    const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
    if (!normalizedQuery) return typeFiltered;

    return typeFiltered.filter(it => {
      const hay = [
        it.title,
        it.summary || '',
        it.research || '',
        it.topicHits?.join('\n') || '',
        it.insights?.bias?.summary || '',
        it.insights?.sensationalism?.summary || ''
      ].join('\n').toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [items, moodFilter, performanceMode, searchQuery, typeFilter]);

  const maxStoriesPerColumn = normalizeStoriesPerColumn(storiesPerColumn);
  const defaultVisibleLimit = Math.min(COLUMN_LAYOUT_TOKENS.initialVisibleItems, maxStoriesPerColumn);
  const visibleLimit = Math.max(
    1,
    Math.min(
      maxStoriesPerColumn,
      Math.floor(Number(visibleByFeed[feed.url] || defaultVisibleLimit))
    )
  );
  const shownItems = itemsVisible.slice(0, visibleLimit);

  return {
    items,
    itemsVisible,
    shownItems,
    visibleLimit
  };
}
