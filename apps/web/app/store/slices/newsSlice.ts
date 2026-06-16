import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { NewsItem } from '../types';
import { isNumber } from '../valueEnums';

type AskMessage = {
  q: string;
  a?: string;
  error?: string;
};

type AskItemState = {
  open: boolean;
  draft: string;
  pending: boolean;
  used: number;
  remaining: number;
  messages: AskMessage[];
};

type FeedPageCursor = {
  beforePublishedMs: number;
  beforeId: string;
};

type FeedPageState = {
  hasMore: boolean;
  nextCursor?: FeedPageCursor;
  loading: boolean;
  loadingStartedAtMs?: number;
  loaded: boolean;
  disabledUntilMs?: number;
  lastError?: string;
  lastErrorAtMs?: number;
  failCount?: number;
};

type NewsState = {
  itemsByFeed: Record<string, NewsItem[]>;
  pageInfoByFeed: Record<string, FeedPageState>;
  hiddenIds: string[];
  summaryPendingById: Record<string, true>;
  researchPendingById: Record<string, true>;
  askByItem: Record<string, AskItemState>;
  pinnedNewsById: Record<string, true>;
};

const initialState: NewsState = {
  itemsByFeed: {},
  pageInfoByFeed: {},
  hiddenIds: [],
  summaryPendingById: {},
  researchPendingById: {},
  askByItem: {},
  pinnedNewsById: {}
};

function pendingKey(id: string, feedUrl: string): string {
  return `${feedUrl}::${id}`;
}

function clearPendingKeysForNewsId(state: NewsState, id: string) {
  const suffix = `::${id}`;
  Object.keys(state.summaryPendingById).forEach(key => {
    if (key === id || key.endsWith(suffix)) delete state.summaryPendingById[key];
  });
  Object.keys(state.researchPendingById).forEach(key => {
    if (key === id || key.endsWith(suffix)) delete state.researchPendingById[key];
  });
}

function applyNewsBatch(state: NewsState, items: NewsItem[]) {
  if (!Array.isArray(items) || !items.length) return;

  const latestByKey = new Map<string, NewsItem>();
  for (const item of items) {
    if (!item || !item.id || !item.feedUrl) continue;
    if (state.hiddenIds.includes(item.id)) continue;
    latestByKey.set(`${item.feedUrl}::${item.id}`, item);
  }

  const touchedFeeds = new Set<string>();
  latestByKey.forEach(item => {
    if (!Array.isArray(state.itemsByFeed[item.feedUrl])) {
      state.itemsByFeed[item.feedUrl] = [];
    }
    const list = state.itemsByFeed[item.feedUrl];
    const idx = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...item };
    else list.push(item);
    touchedFeeds.add(item.feedUrl);

    const key = pendingKey(item.id, item.feedUrl);
    if (item.summary && item.summary.trim()) {
      delete state.summaryPendingById[key];
      delete state.summaryPendingById[item.id];
    } else if (item.summaryPending === true) {
      state.summaryPendingById[key] = true;
    } else if (item.summaryPending === false) {
      delete state.summaryPendingById[key];
      delete state.summaryPendingById[item.id];
    }
    if (item.research && item.research.trim()) {
      delete state.researchPendingById[key];
      delete state.researchPendingById[item.id];
    } else if (item.researchPending === true) {
      state.researchPendingById[key] = true;
    } else if (item.researchPending === false) {
      delete state.researchPendingById[key];
      delete state.researchPendingById[item.id];
    }
  });

  touchedFeeds.forEach(feedUrl => {
    const list = state.itemsByFeed[feedUrl];
    if (!Array.isArray(list)) return;
    list.sort((a, b) => {
      const aPinned = !!state.pinnedNewsById[a.id];
      const bPinned = !!state.pinnedNewsById[b.id];
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return b.publishedMs - a.publishedMs;
    });
  });
}

function askKey(id: string, feedUrl: string): string {
  return `${feedUrl}::${id}`;
}

function ensureAskState(state: NewsState, id: string, feedUrl: string): AskItemState {
  const k = askKey(id, feedUrl);
  if (!state.askByItem[k]) {
    state.askByItem[k] = {
      open: false,
      draft: '',
      pending: false,
      used: 0,
      remaining: 5,
      messages: []
    };
  }
  return state.askByItem[k];
}

function selectAskReplyTargetKey(
  state: NewsState,
  id: string,
  feedUrl: string,
  question: string
): string {
  const exactKey = askKey(id, feedUrl);
  const exactState = state.askByItem[exactKey];
  if (exactState?.pending) return exactKey;

  const suffix = `::${id}`;
  const pendingKeys = Object.keys(state.askByItem).filter(key => key.endsWith(suffix) && state.askByItem[key]?.pending);
  if (!pendingKeys.length) return exactKey;
  if (pendingKeys.length === 1) return pendingKeys[0];

  const q = String(question || '').trim();
  if (q) {
    const byQuestion = pendingKeys.find(key => {
      const messages = state.askByItem[key]?.messages || [];
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i].q === q && !messages[i].a && !messages[i].error) return true;
      }
      return false;
    });
    if (byQuestion) return byQuestion;
  }

  return pendingKeys[0];
}

const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    resetNewsState() {
      return { ...initialState };
    },
    setHiddenIds(state, action: PayloadAction<string[]>) {
      state.hiddenIds = action.payload;
    },
    hideItemLocally(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (!id) return;
      if (!state.hiddenIds.includes(id)) state.hiddenIds.push(id);
      Object.keys(state.itemsByFeed).forEach(feedUrl => {
        state.itemsByFeed[feedUrl] = (state.itemsByFeed[feedUrl] || []).filter(it => it.id !== id);
      });
      clearPendingKeysForNewsId(state, id);
      delete state.pinnedNewsById[id];
    },
    removeOldItemsInFeed(state, action: PayloadAction<{ feedUrl: string; cutoffMs: number }>) {
      const { feedUrl, cutoffMs } = action.payload;
      const list = state.itemsByFeed[feedUrl];
      if (!Array.isArray(list)) return;
      state.itemsByFeed[feedUrl] = list.filter(it => !Number.isFinite(it.publishedMs) || it.publishedMs >= cutoffMs);
    },
    resetAllToNewestLimit(state, action: PayloadAction<number>) {
      const limit = Math.max(1, Math.min(200, Math.floor(action.payload || 10)));
      Object.keys(state.itemsByFeed).forEach(feedUrl => {
        const list = Array.isArray(state.itemsByFeed[feedUrl]) ? [...state.itemsByFeed[feedUrl]] : [];
        list.sort((a, b) => b.publishedMs - a.publishedMs);
        state.itemsByFeed[feedUrl] = list.slice(0, limit);
        state.pageInfoByFeed[feedUrl] = {
          hasMore: state.pageInfoByFeed[feedUrl]?.hasMore ?? true,
          loading: false,
          loaded: false,
          disabledUntilMs: state.pageInfoByFeed[feedUrl]?.disabledUntilMs,
          lastError: state.pageInfoByFeed[feedUrl]?.lastError,
          lastErrorAtMs: state.pageInfoByFeed[feedUrl]?.lastErrorAtMs,
          failCount: state.pageInfoByFeed[feedUrl]?.failCount
        };
      });
    },
    setFeedPageLoading(state, action: PayloadAction<string>) {
      const feedUrl = String(action.payload || '').trim();
      if (!feedUrl) return;
      const prev = state.pageInfoByFeed[feedUrl];
      state.pageInfoByFeed[feedUrl] = {
        hasMore: prev?.hasMore ?? true,
        nextCursor: prev?.nextCursor,
        loading: true,
        loadingStartedAtMs: Date.now(),
        loaded: prev?.loaded ?? false,
        disabledUntilMs: prev?.disabledUntilMs,
        lastError: prev?.lastError,
        lastErrorAtMs: prev?.lastErrorAtMs,
        failCount: prev?.failCount
      };
    },
    setFeedPageError(state, action: PayloadAction<{
      feedUrl: string;
      error: string;
      disabledUntilMs?: number;
      failCount?: number;
    }>) {
      const feedUrl = String(action.payload.feedUrl || '').trim();
      if (!feedUrl) return;
      const prev = state.pageInfoByFeed[feedUrl];
      state.pageInfoByFeed[feedUrl] = {
        hasMore: prev?.hasMore ?? true,
        nextCursor: prev?.nextCursor,
        loading: false,
        loaded: prev?.loaded ?? false,
        disabledUntilMs: Number.isFinite(action.payload.disabledUntilMs ?? NaN) ? action.payload.disabledUntilMs : prev?.disabledUntilMs,
        lastError: String(action.payload.error || '').trim() || prev?.lastError,
        lastErrorAtMs: Date.now(),
        failCount: Number.isFinite(action.payload.failCount ?? NaN) ? action.payload.failCount : prev?.failCount
      };
    },
    receiveFeedPage(state, action: PayloadAction<{
      feedUrl: string;
      items: NewsItem[];
      hasMore: boolean;
      nextCursor?: FeedPageCursor;
      replace?: boolean;
    }>) {
      const { feedUrl, items, hasMore, nextCursor, replace } = action.payload;
      const normalizedFeedUrl = String(feedUrl || '').trim();
      if (!normalizedFeedUrl) return;

      if (replace) {
        state.itemsByFeed[normalizedFeedUrl] = [];
      }

      applyNewsBatch(state, items);
      if (replace && (!Array.isArray(items) || !items.length)) {
        state.itemsByFeed[normalizedFeedUrl] = [];
      }

      state.pageInfoByFeed[normalizedFeedUrl] = {
        hasMore: !!hasMore,
        nextCursor,
        loading: false,
        loaded: true,
        disabledUntilMs: undefined,
        lastError: undefined,
        lastErrorAtMs: undefined,
        failCount: undefined
      };
    },
    upsertNewsItem(state, action: PayloadAction<NewsItem>) {
      applyNewsBatch(state, [action.payload]);
    },
    upsertNewsBatch(state, action: PayloadAction<NewsItem[]>) {
      applyNewsBatch(state, action.payload);
    },
    setSummaryPending(state, action: PayloadAction<string>) {
      state.summaryPendingById[action.payload] = true;
    },
    clearSummaryPending(state, action: PayloadAction<string>) {
      delete state.summaryPendingById[action.payload];
    },
    clearSummaryForItem(state, action: PayloadAction<{ id: string; feedUrl: string }>) {
      const { id, feedUrl } = action.payload;
      const list = Array.isArray(state.itemsByFeed[feedUrl]) ? [...state.itemsByFeed[feedUrl]] : [];
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], summary: '' };
        state.itemsByFeed[feedUrl] = list;
      }
    },
    setResearchPending(state, action: PayloadAction<string>) {
      state.researchPendingById[action.payload] = true;
    },
    clearResearchPending(state, action: PayloadAction<string>) {
      delete state.researchPendingById[action.payload];
    },
    clearResearchForItem(state, action: PayloadAction<{ id: string; feedUrl: string }>) {
      const { id, feedUrl } = action.payload;
      const list = Array.isArray(state.itemsByFeed[feedUrl]) ? [...state.itemsByFeed[feedUrl]] : [];
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], research: '' };
        state.itemsByFeed[feedUrl] = list;
      }
    },
    togglePinnedNews(state, action: PayloadAction<string>) {
      const id = String(action.payload || '').trim();
      if (!id) return;
      if (state.pinnedNewsById[id]) delete state.pinnedNewsById[id];
      else state.pinnedNewsById[id] = true;

      Object.keys(state.itemsByFeed).forEach(feedUrl => {
        const list = state.itemsByFeed[feedUrl];
        if (!Array.isArray(list)) return;
        list.sort((a, b) => {
          const aPinned = !!state.pinnedNewsById[a.id];
          const bPinned = !!state.pinnedNewsById[b.id];
          if (aPinned !== bPinned) return aPinned ? -1 : 1;
          return b.publishedMs - a.publishedMs;
        });
      });
    },
    toggleAskOpen(state, action: PayloadAction<{ id: string; feedUrl: string }>) {
      const a = ensureAskState(state, action.payload.id, action.payload.feedUrl);
      a.open = !a.open;
    },
    setAskDraft(state, action: PayloadAction<{ id: string; feedUrl: string; draft: string }>) {
      const a = ensureAskState(state, action.payload.id, action.payload.feedUrl);
      a.draft = action.payload.draft;
    },
    enqueueAskQuestion(state, action: PayloadAction<{ id: string; feedUrl: string; question: string }>) {
      const a = ensureAskState(state, action.payload.id, action.payload.feedUrl);
      a.open = true;
      a.pending = true;
      a.draft = '';
      a.messages.push({ q: action.payload.question });
      a.used = Math.min(5, a.used + 1);
      a.remaining = Math.max(0, 5 - a.used);
    },
    receiveAskReply(state, action: PayloadAction<{
      id: string;
      feedUrl: string;
      question?: string;
      answer?: string;
      error?: string;
      used?: number;
      remaining?: number;
    }>) {
      const { id, feedUrl, question, answer, error, used, remaining } = action.payload;
      const targetKey = selectAskReplyTargetKey(state, id, feedUrl, question || '');
      const targetFeedUrl = targetKey.slice(0, Math.max(0, targetKey.lastIndexOf('::')));
      const a = ensureAskState(state, id, targetFeedUrl || feedUrl);
      a.pending = false;
      if (isNumber(used)) a.used = Math.max(0, Math.min(5, Math.floor(used)));
      if (isNumber(remaining)) a.remaining = Math.max(0, Math.min(5, Math.floor(remaining)));

      const q = String(question || '').trim();
      let idx = -1;
      if (q) {
        for (let i = a.messages.length - 1; i >= 0; i--) {
          if (a.messages[i].q === q && !a.messages[i].a) {
            idx = i;
            break;
          }
        }
      }

      const payload = {
        q: q || (a.messages[a.messages.length - 1]?.q || ''),
        a: answer ? String(answer) : undefined,
        error: error ? String(error) : undefined
      };

      if (idx >= 0) a.messages[idx] = payload;
      else a.messages.push(payload);
    }
  }
});

export const {
  resetNewsState,
  setHiddenIds,
  hideItemLocally,
  removeOldItemsInFeed,
  resetAllToNewestLimit,
  setFeedPageLoading,
  setFeedPageError,
  receiveFeedPage,
  upsertNewsItem,
  upsertNewsBatch,
  setSummaryPending,
  clearSummaryPending,
  clearSummaryForItem,
  setResearchPending,
  clearResearchPending,
  clearResearchForItem,
  togglePinnedNews,
  toggleAskOpen,
  setAskDraft,
  enqueueAskQuestion,
  receiveAskReply
} = newsSlice.actions;

export default newsSlice.reducer;
