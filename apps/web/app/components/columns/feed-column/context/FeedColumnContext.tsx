'use client';

import { createContext } from 'react';
import type { FeedInfo, NewsItem } from '../../../../store/types';

export type FeedColumnContextValue = {
  feed: FeedInfo;
  isMatchColumn: boolean;
  isEmergingColumn: boolean;
  accent: string;
  soft: string;
  fontScale: number;
  items: NewsItem[];
  itemsVisible: NewsItem[];
  shownItems: NewsItem[];
};

export const FeedColumnContext = createContext<FeedColumnContextValue | null>(null);
