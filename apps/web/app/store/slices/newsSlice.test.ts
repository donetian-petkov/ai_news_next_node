import { describe, expect, it } from 'vitest';
import { MAX_ITEMS_PER_COLUMN } from '../constants';
import type { NewsItem } from '../types';
import newsReducer, {
  enqueueAskQuestion,
  hideItemLocally,
  receiveAskReply,
  removeOldItemsInFeed,
  setResearchPending,
  setSummaryPending,
  upsertNewsItem
} from './newsSlice';

const makeItem = (id: string, feedUrl: string, publishedMs: number, partial: Partial<NewsItem> = {}): NewsItem => ({
  id,
  title: `Title ${id}`,
  link: `https://example.com/${id}`,
  publishedMs,
  feedUrl,
  isMatch: false,
  ...partial
});

describe('newsSlice', () => {
  it('upserts items sorted by published time and keeps max items per column', () => {
    let state = newsReducer(undefined, { type: '@@INIT' });

    for (let i = 1; i <= MAX_ITEMS_PER_COLUMN + 2; i++) {
      state = newsReducer(state, upsertNewsItem(makeItem(String(i), 'feed-a', i * 1000)));
    }

    const list = state.itemsByFeed['feed-a'];
    expect(list).toHaveLength(MAX_ITEMS_PER_COLUMN);
    expect(list[0].id).toBe(String(MAX_ITEMS_PER_COLUMN + 2));
    expect(list[list.length - 1].id).toBe('3');
  });

  it('hideItemLocally removes news from all feeds and clears pending flags', () => {
    let state = newsReducer(undefined, upsertNewsItem(makeItem('id-1', 'feed-a', 1000)));
    state = newsReducer(state, upsertNewsItem(makeItem('id-1', 'feed-b', 1000)));
    state = newsReducer(state, setSummaryPending('feed-a::id-1'));
    state = newsReducer(state, setResearchPending('feed-a::id-1'));

    state = newsReducer(state, hideItemLocally('id-1'));

    expect(state.hiddenIds).toContain('id-1');
    expect(state.itemsByFeed['feed-a']).toEqual([]);
    expect(state.itemsByFeed['feed-b']).toEqual([]);
    expect(state.summaryPendingById['feed-a::id-1']).toBeUndefined();
    expect(state.researchPendingById['feed-a::id-1']).toBeUndefined();
  });

  it('removeOldItemsInFeed filters below cutoff and keeps non-finite dates', () => {
    let state = newsReducer(undefined, upsertNewsItem(makeItem('old', 'feed-a', 100)));
    state = newsReducer(state, upsertNewsItem(makeItem('new', 'feed-a', 5000)));
    state = newsReducer(state, upsertNewsItem(makeItem('nan', 'feed-a', Number.NaN)));

    state = newsReducer(state, removeOldItemsInFeed({ feedUrl: 'feed-a', cutoffMs: 1000 }));

    expect(state.itemsByFeed['feed-a'].map(x => x.id).sort()).toEqual(['nan', 'new']);
  });

  it('receiveAskReply updates pending queued question and counters', () => {
    let state = newsReducer(undefined, enqueueAskQuestion({ id: 'id-1', feedUrl: 'feed-a', question: 'Who?' }));

    state = newsReducer(
      state,
      receiveAskReply({
        id: 'id-1',
        feedUrl: 'feed-a',
        question: 'Who?',
        answer: 'A person',
        used: 9,
        remaining: -1
      })
    );

    const ask = state.askByItem['feed-a::id-1'];
    expect(ask.pending).toBe(false);
    expect(ask.messages).toEqual([{ q: 'Who?', a: 'A person', error: undefined }]);
    expect(ask.used).toBe(5);
    expect(ask.remaining).toBe(0);
  });

  it('receiveAskReply appends message when no pending match exists', () => {
    let state = newsReducer(undefined, { type: '@@INIT' });

    state = newsReducer(
      state,
      receiveAskReply({
        id: 'id-2',
        feedUrl: 'feed-a',
        question: 'Extra?',
        error: 'No data'
      })
    );

    const ask = state.askByItem['feed-a::id-2'];
    expect(ask.messages).toEqual([{ q: 'Extra?', a: undefined, error: 'No data' }]);
    expect(ask.pending).toBe(false);
  });

  it('receiveAskReply resolves pending ask when reply feed differs (filtered/source)', () => {
    let state = newsReducer(undefined, enqueueAskQuestion({
      id: 'id-3',
      feedUrl: '__filtered__',
      question: 'Who is this about?'
    }));

    state = newsReducer(
      state,
      receiveAskReply({
        id: 'id-3',
        feedUrl: 'https://actualno.com/rss',
        question: 'Who is this about?',
        answer: 'The story references local officials.'
      })
    );

    const askFiltered = state.askByItem['__filtered__::id-3'];
    expect(askFiltered.pending).toBe(false);
    expect(askFiltered.messages).toEqual([
      { q: 'Who is this about?', a: 'The story references local officials.', error: undefined }
    ]);
    expect(state.askByItem['https://actualno.com/rss::id-3']).toBeUndefined();
  });
});
