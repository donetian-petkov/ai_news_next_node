'use client';

import { useMemo } from 'react';
import { NewsMoodFilterValue, NewsTypeFilterValue, type FeedInfo, type NewsItem } from '../../../../store/types';
import { clampVisibleCount, normalizeStoryLimit } from '../../storyVisibility';

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

  const maxStoriesPerColumn = normalizeStoryLimit(storiesPerColumn);
  const visibleLimit = clampVisibleCount(visibleByFeed[feed.url], maxStoriesPerColumn);
  const shownItems = itemsVisible.slice(0, visibleLimit);

  return {
    items,
    itemsVisible,
    shownItems,
    visibleLimit
  };
}
