'use client';

import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { FeedInfo } from '../../../store/types';
import { COLUMN_LAYOUT_TOKENS } from '../designTokens';

type Args = {
  renderedFeeds: FeedInfo[];
  storyLimit: number;
  showMoreNewsAllSeq: number;
  resetNewsShownAllSeq: number;
  columnNodesRef: MutableRefObject<Record<string, HTMLDivElement | null>>;
};

function normalizeStoryLimit(value: number): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return COLUMN_LAYOUT_TOKENS.initialVisibleItems;
  return Math.max(1, Math.min(200, parsed));
}

function defaultVisibleCount(storyLimit: number): number {
  return Math.min(COLUMN_LAYOUT_TOKENS.initialVisibleItems, normalizeStoryLimit(storyLimit));
}

function clampVisibleCount(value: number | undefined, storyLimit: number): number {
  const limit = normalizeStoryLimit(storyLimit);
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return defaultVisibleCount(limit);
  return Math.max(1, Math.min(limit, parsed));
}

export function useColumnHydration({
  renderedFeeds,
  storyLimit,
  showMoreNewsAllSeq,
  resetNewsShownAllSeq,
  columnNodesRef
}: Args) {
  const [visibleByFeed, setVisibleByFeed] = useState<Record<string, number>>({});
  const [hydratedColumns, setHydratedColumns] = useState<Record<string, true>>({});

  useEffect(() => {
    if (!renderedFeeds.length) return;
    setVisibleByFeed(prev => {
      const next: Record<string, number> = {};
      renderedFeeds.forEach(feed => {
        next[feed.url] = typeof prev[feed.url] === 'number'
          ? clampVisibleCount(prev[feed.url], storyLimit)
          : defaultVisibleCount(storyLimit);
      });
      return next;
    });
  }, [renderedFeeds, storyLimit]);

  useEffect(() => {
    if (showMoreNewsAllSeq <= 0 || !renderedFeeds.length) return;
    setVisibleByFeed(prev => {
      const next = { ...prev };
      renderedFeeds.forEach(feed => {
        next[feed.url] = clampVisibleCount(
          (next[feed.url] || defaultVisibleCount(storyLimit)) + COLUMN_LAYOUT_TOKENS.visibleItemsStep,
          storyLimit
        );
      });
      return next;
    });
  }, [showMoreNewsAllSeq, renderedFeeds, storyLimit]);

  useEffect(() => {
    if (resetNewsShownAllSeq <= 0 || !renderedFeeds.length) return;
    setVisibleByFeed(prev => {
      const next = { ...prev };
      renderedFeeds.forEach(feed => {
        next[feed.url] = defaultVisibleCount(storyLimit);
      });
      return next;
    });
  }, [resetNewsShownAllSeq, renderedFeeds, storyLimit]);

  useEffect(() => {
    setHydratedColumns(prev => {
      const next = { ...prev };
      let changed = false;
      for (let i = 0; i < Math.min(COLUMN_LAYOUT_TOKENS.eagerHydratedColumns, renderedFeeds.length); i++) {
        const url = renderedFeeds[i].url;
        if (!next[url]) {
          next[url] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [renderedFeeds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      const found: string[] = [];
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const url = String(el.dataset.feedUrl || '');
        if (url) found.push(url);
      });
      if (!found.length) return;
      setHydratedColumns(prev => {
        const next = { ...prev };
        let changed = false;
        found.forEach(url => {
          if (!next[url]) {
            next[url] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, {
      root: null,
      rootMargin: COLUMN_LAYOUT_TOKENS.intersectionRootMargin,
      threshold: COLUMN_LAYOUT_TOKENS.intersectionThreshold
    });

    renderedFeeds.forEach(feed => {
      const node = columnNodesRef.current[feed.url];
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [columnNodesRef, renderedFeeds]);

  return {
    visibleByFeed,
    setVisibleByFeed,
    hydratedColumns,
    setHydratedColumns
  };
}
