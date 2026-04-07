import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BudgetMode, FeedInfo, SortMode } from '../types';

type FeedsState = {
  feeds: FeedInfo[];
  pinnedByUrl: Record<string, boolean>;
  controlsOpenByUrl: Record<string, boolean>;
  deleteAgeByUrl: Record<string, 'yesterday' | 'week' | 'month' | 'year'>;
  orderByUrl: string[];
};

const initialState: FeedsState = {
  feeds: [],
  pinnedByUrl: {},
  controlsOpenByUrl: {},
  deleteAgeByUrl: {},
  orderByUrl: []
};

const feedsSlice = createSlice({
  name: 'feeds',
  initialState,
  reducers: {
    setFeeds(state, action: PayloadAction<FeedInfo[]>) {
      const nextFeeds = action.payload;
      const nextUrls = new Set(nextFeeds.map(f => f.url));
      const knownUrls = new Set(state.orderByUrl);
      state.feeds = nextFeeds;

      state.orderByUrl = [
        ...nextFeeds.map(f => f.url).filter(url => !knownUrls.has(url)),
        ...state.orderByUrl.filter(url => nextUrls.has(url))
      ];

      Object.keys(state.pinnedByUrl).forEach(url => {
        if (!nextUrls.has(url)) delete state.pinnedByUrl[url];
      });
      Object.keys(state.controlsOpenByUrl).forEach(url => {
        if (!nextUrls.has(url)) delete state.controlsOpenByUrl[url];
      });
      Object.keys(state.deleteAgeByUrl).forEach(url => {
        if (!nextUrls.has(url)) delete state.deleteAgeByUrl[url];
      });

      nextFeeds.forEach(f => {
        if (typeof state.controlsOpenByUrl[f.url] !== 'boolean') {
          state.controlsOpenByUrl[f.url] = false;
        }
        if (!state.deleteAgeByUrl[f.url]) {
          state.deleteAgeByUrl[f.url] = 'week';
        }
      });
    },
    togglePinned(state, action: PayloadAction<string>) {
      const feedUrl = action.payload;
      state.pinnedByUrl[feedUrl] = !state.pinnedByUrl[feedUrl];
    },
    toggleFeedControls(state, action: PayloadAction<string>) {
      const feedUrl = action.payload;
      const current = state.controlsOpenByUrl[feedUrl];
      state.controlsOpenByUrl[feedUrl] = typeof current === 'boolean' ? !current : false;
    },
    setAllFeedControlsOpen(state, action: PayloadAction<boolean>) {
      const open = !!action.payload;
      state.feeds.forEach(f => {
        state.controlsOpenByUrl[f.url] = open;
      });
    },
    removeFeedLocally(state, action: PayloadAction<string>) {
      const feedUrl = action.payload;
      state.feeds = state.feeds.filter(f => f.url !== feedUrl);
      delete state.pinnedByUrl[feedUrl];
      delete state.controlsOpenByUrl[feedUrl];
      delete state.deleteAgeByUrl[feedUrl];
      state.orderByUrl = state.orderByUrl.filter(url => url !== feedUrl);
    },
    setFeedDeleteAge(state, action: PayloadAction<{ feedUrl: string; age: 'yesterday' | 'week' | 'month' | 'year' }>) {
      const { feedUrl, age } = action.payload;
      state.deleteAgeByUrl[feedUrl] = age;
    },
    setFeedSummarySetting(state, action: PayloadAction<{ feedUrl: string; enabled: boolean }>) {
      const idx = state.feeds.findIndex(f => f.url === action.payload.feedUrl);
      if (idx < 0) return;
      state.feeds[idx].summaryEnabled = action.payload.enabled;
    },
    setFeedResearchSetting(state, action: PayloadAction<{ feedUrl: string; enabled: boolean }>) {
      const idx = state.feeds.findIndex(f => f.url === action.payload.feedUrl);
      if (idx < 0) return;
      state.feeds[idx].researchEnabled = action.payload.enabled;
    },
    setFeedBudgetSetting(state, action: PayloadAction<{ feedUrl: string; budget: BudgetMode }>) {
      const idx = state.feeds.findIndex(f => f.url === action.payload.feedUrl);
      if (idx < 0) return;
      state.feeds[idx].budget = action.payload.budget;
    },
    setFeedIntervalSetting(state, action: PayloadAction<{ feedUrl: string; intervalSec: number }>) {
      const idx = state.feeds.findIndex(f => f.url === action.payload.feedUrl);
      if (idx < 0) return;
      state.feeds[idx].intervalSec = Math.max(20, Math.min(3600, Math.floor(action.payload.intervalSec)));
    },
    setFeedColumnSettings(state, action: PayloadAction<{
      feedUrl: string;
      sortMode?: SortMode;
      filters?: Partial<FeedInfo['filters']>;
    }>) {
      const idx = state.feeds.findIndex(f => f.url === action.payload.feedUrl);
      if (idx < 0) return;
      if (action.payload.sortMode) {
        state.feeds[idx].sortMode = action.payload.sortMode;
      }
      if (action.payload.filters) {
        state.feeds[idx].filters = {
          ...state.feeds[idx].filters,
          ...action.payload.filters
        };
      }
    },
    reorderFeeds(state, action: PayloadAction<{ fromUrl: string; toUrl: string }>) {
      const { fromUrl, toUrl } = action.payload;
      if (!fromUrl || !toUrl || fromUrl === toUrl) return;

      const feedUrls = state.feeds.map(f => f.url);
      const feedUrlSet = new Set(feedUrls);
      const baseOrder = [
        ...state.orderByUrl.filter(url => feedUrlSet.has(url)),
        ...feedUrls.filter(url => !state.orderByUrl.includes(url))
      ];

      const fromIdx = baseOrder.indexOf(fromUrl);
      const toIdx = baseOrder.indexOf(toUrl);
      if (fromIdx < 0 || toIdx < 0) return;

      const next = [...baseOrder];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      state.orderByUrl = next;
    },
    hydrateFeedUiState(state, action: PayloadAction<Partial<Pick<FeedsState, 'pinnedByUrl' | 'controlsOpenByUrl' | 'deleteAgeByUrl' | 'orderByUrl'>>>) {
      const next = action.payload || {};
      const urls = new Set(state.feeds.map(f => f.url));

      if (next.pinnedByUrl && typeof next.pinnedByUrl === 'object') {
        for (const [url, v] of Object.entries(next.pinnedByUrl)) {
          if (urls.has(url)) state.pinnedByUrl[url] = !!v;
        }
      }

      if (next.controlsOpenByUrl && typeof next.controlsOpenByUrl === 'object') {
        for (const [url, v] of Object.entries(next.controlsOpenByUrl)) {
          if (urls.has(url) && typeof v === 'boolean') state.controlsOpenByUrl[url] = v;
        }
      }

      if (next.deleteAgeByUrl && typeof next.deleteAgeByUrl === 'object') {
        for (const [url, age] of Object.entries(next.deleteAgeByUrl)) {
          if (!urls.has(url)) continue;
          if (age === 'yesterday' || age === 'week' || age === 'month' || age === 'year') {
            state.deleteAgeByUrl[url] = age;
          }
        }
      }

      if (Array.isArray(next.orderByUrl)) {
        state.orderByUrl = [
          ...state.feeds.map(f => f.url).filter(url => !next.orderByUrl!.includes(url)),
          ...next.orderByUrl.filter(url => urls.has(url))
        ];
      }
    }
  }
});

export const {
  setFeeds,
  togglePinned,
  toggleFeedControls,
  setAllFeedControlsOpen,
  removeFeedLocally,
  setFeedDeleteAge,
  setFeedSummarySetting,
  setFeedResearchSetting,
  setFeedBudgetSetting,
  setFeedIntervalSetting,
  setFeedColumnSettings,
  reorderFeeds,
  hydrateFeedUiState
} = feedsSlice.actions;
export default feedsSlice.reducer;
