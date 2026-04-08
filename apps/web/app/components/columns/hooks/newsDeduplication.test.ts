import { describe, expect, it } from 'vitest';
import type { NewsItem } from '../../../store/types';
import { dedupeNewsItemsBySignature } from './newsDeduplication';

function makeItem(overrides: Partial<NewsItem>): NewsItem {
  return {
    id: 'item-1',
    title: 'Story title',
    link: 'https://example.com/story',
    publishedMs: Date.parse('2026-04-08T20:50:00Z'),
    feedUrl: 'https://feed.example.com/rss',
    isMatch: true,
    ...overrides
  };
}

describe('newsDeduplication', () => {
  it('dedupes near-identical stories by headline even when summaries differ', () => {
    const items = [
      makeItem({
        id: 'older-no-cover',
        titleBg: 'Митчъл Финк, дългогодишен журналист в областта на развлеченията и клюкарски колумнист, почина на 82 години',
        summary: 'История за дългото му наследство в развлекателната индустрия.',
        coverUrl: undefined
      }),
      makeItem({
        id: 'newer-with-cover',
        titleBg: 'Митчъл Финк, клюкарски журналист, автор и телевизионна личност в развлекателната индустрия, почина на 82 години',
        summary: 'Телевизионната личност и автор почина на 82 години.',
        link: 'https://variety.example.com/mitchell-fink',
        coverUrl: 'https://images.example.com/mitchell-fink.jpg'
      })
    ];

    const unique = dedupeNewsItemsBySignature(items, {
      prefer: (candidate, current) => Boolean(candidate.coverUrl) && !current.coverUrl
    });

    expect(unique).toHaveLength(1);
    expect(unique[0].id).toBe('newer-with-cover');
  });

  it('dedupes normalized article links with tracking params removed', () => {
    const items = [
      makeItem({
        id: 'base',
        title: 'Reuters: Example story',
        link: 'https://www.reuters.com/world/example-story/?utm_source=feed'
      }),
      makeItem({
        id: 'tracked',
        title: 'Reuters Example story',
        link: 'https://www.reuters.com/world/example-story/?utm_source=other&fbclid=abc123'
      })
    ];

    const unique = dedupeNewsItemsBySignature(items);

    expect(unique).toHaveLength(1);
    expect(unique[0].id).toBe('base');
  });
});
