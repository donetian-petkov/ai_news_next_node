'use client';

import type { DragEvent } from 'react';
import { createContext } from 'react';
import type { FeedInfo } from '../../../store/types';
import type {
  FeedColumnDragState,
  FeedColumnHandlers,
  FeedColumnStateModel,
  FeedColumnViewModel
} from '../reactColumns.types';

export type FeedColumnsContextValue = {
  header: {
    title: string;
    liveLabel: string;
    disconnectedLabel: string;
    connected: boolean;
    status: string;
    summariesLoadingCount: number;
    summariesStalledCount: number;
    summariesLoadingLabel: string;
    summariesLoadingItems: string[];
  };
  clipboard: {
    open: boolean;
    message: string;
    onClose: () => void;
  };
  view: FeedColumnViewModel;
  state: FeedColumnStateModel;
  handlers: FeedColumnHandlers;
  renderedFeeds: FeedInfo[];
  autoActionBypassFeedUrls: string[];
  onGridDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onGridDrop: (e: DragEvent<HTMLDivElement>) => void;
  buildDragState: (feed: FeedInfo, canDrag: boolean) => FeedColumnDragState;
};

export const FeedColumnsContext = createContext<FeedColumnsContextValue | null>(null);
