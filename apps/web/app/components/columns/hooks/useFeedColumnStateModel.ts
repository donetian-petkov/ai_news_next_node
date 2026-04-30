'use client';

import { useMemo } from 'react';
import type { FeedColumnStateModel } from '../reactColumns.types';

type Args = FeedColumnStateModel;

export function useFeedColumnStateModel(args: Args) {
  return useMemo<FeedColumnStateModel>(() => ({
    filteredColumnItems: args.filteredColumnItems,
    duplicateMatchById: args.duplicateMatchById,
    itemsByFeed: args.itemsByFeed,
    pageInfoByFeed: args.pageInfoByFeed,
    visibleByFeed: args.visibleByFeed,
    hydratedColumns: args.hydratedColumns,
    pinnedByUrl: args.pinnedByUrl,
    controlsOpenByUrl: args.controlsOpenByUrl,
    advancedControlsByUrl: args.advancedControlsByUrl,
    deleteAgeByUrl: args.deleteAgeByUrl,
    summaryPendingById: args.summaryPendingById,
    researchPendingById: args.researchPendingById,
    pinnedNewsById: args.pinnedNewsById,
    askByItem: args.askByItem,
    bodyModes: args.bodyModes
  }), [
    args.advancedControlsByUrl,
    args.askByItem,
    args.bodyModes,
    args.controlsOpenByUrl,
    args.deleteAgeByUrl,
    args.duplicateMatchById,
    args.filteredColumnItems,
    args.hydratedColumns,
    args.itemsByFeed,
    args.pageInfoByFeed,
    args.pinnedByUrl,
    args.pinnedNewsById,
    args.researchPendingById,
    args.summaryPendingById,
    args.visibleByFeed
  ]);
}
