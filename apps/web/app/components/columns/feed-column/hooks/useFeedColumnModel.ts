'use client';

import { EMERGING_FEED_URL, FILTERED_FEED_URL } from '../../../../store/constants';
import type { FeedInfo } from '../../../../store/types';
import { useFeedColumnsContext } from '../../context/useFeedColumnsContext';
import { useFeedColumnItems } from './useFeedColumnItems';

type Args = {
  feed: FeedInfo;
  columnIdx: number;
};

export function useFeedColumnModel({ feed, columnIdx }: Args) {
  const { view, state } = useFeedColumnsContext();
  const { palette, performanceMode, moodFilter, typeFilter, searchQuery, fontScale, connectionStatus } = view;
  const { filteredColumnItems, itemsByFeed, visibleByFeed } = state;

  const isMatchColumn = feed.url === FILTERED_FEED_URL || String(feed.label || '').toLowerCase().startsWith('filtered');
  const isEmergingColumn = feed.url === EMERGING_FEED_URL;
  const colTheme: 'a' | 'b' | 'match' = isMatchColumn ? 'match' : (columnIdx % 2 === 0 ? 'a' : 'b');
  const accent = colTheme === 'a' ? palette.a : colTheme === 'b' ? palette.b : palette.m;
  const soft = colTheme === 'a' ? palette.aSoft : colTheme === 'b' ? palette.bSoft : palette.mSoft;

  const { items, itemsVisible, shownItems } = useFeedColumnItems({
    feed,
    isMatchColumn,
    filteredColumnItems,
    itemsByFeed,
    moodFilter,
    typeFilter,
    searchQuery,
    performanceMode,
    visibleByFeed
  });

  return {
    isMatchColumn,
    isEmergingColumn,
    colTheme,
    accent,
    soft,
    fontScale,
    palette,
    performanceMode,
    connectionStatus,
    items,
    itemsVisible,
    shownItems
  };
}
