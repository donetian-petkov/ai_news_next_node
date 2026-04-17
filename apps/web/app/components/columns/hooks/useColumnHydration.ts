'use client';

import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { FeedInfo } from '../../../store/types';
import { COLUMN_LAYOUT_TOKENS } from '../designTokens';
import { clampVisibleCount, getDefaultVisibleCount, getShowMoreStep } from '../storyVisibility';

type Args = {
  renderedFeeds: FeedInfo[];
  storyLimit: number;
  showMoreNewsAllSeq: number;
  resetNewsShownAllSeq: number;
  columnNodesRef: MutableRefObject<Record<string, HTMLDivElement | null>>;
};

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
          : getDefaultVisibleCount(storyLimit);
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
          (next[feed.url] || getDefaultVisibleCount(storyLimit)) + getShowMoreStep(next[feed.url], storyLimit),
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
        next[feed.url] = getDefaultVisibleCount(storyLimit);
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
