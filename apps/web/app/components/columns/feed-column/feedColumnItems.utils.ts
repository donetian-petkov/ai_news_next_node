'use client';

import type { NewsItem } from '../../../store/types';
import type { FeedAskState } from '../reactColumns.types';

export type PendingScrollTarget =
  | { mode: 'news'; newsId: string }
  | { mode: 'top' };

export function itemActionFeedUrl(it: NewsItem): string {
  return String(it.originFeedUrl || it.feedUrl || '').trim();
}

export function askKey(it: NewsItem): string {
  return `${itemActionFeedUrl(it)}::${it.id}`;
}

export function bodyKey(it: NewsItem, kind: 'summary' | 'research'): string {
  return `${it.feedUrl}::${it.id}::${kind}`;
}

export function getDefaultAskState(): FeedAskState {
  return {
    open: false,
    draft: '',
    pending: false,
    remaining: 5,
    messages: []
  };
}

export function cssEscape(value: string): string {
  const esc = (globalThis as { CSS?: { escape?: (input: string) => string } }).CSS?.escape;
  if (typeof esc === 'function') return esc(value);
  return value.replace(/["\\]/g, '\\$&');
}
