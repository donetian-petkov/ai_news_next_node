import { describe, expect, it } from 'vitest';
import { normalizeAddStreamInput } from './topMenuAddStream.utils';

const labels = {
  invalidStreamUrl: 'invalid-stream-url',
  invalidRedditSource: 'invalid-reddit-source',
  invalidYoutubeSource: 'invalid-youtube-source'
};

describe('normalizeAddStreamInput', () => {
  it('normalizes bare subreddit names into reddit rss feeds', () => {
    expect(normalizeAddStreamInput({
      feedType: 'reddit',
      rawUrl: 'movies',
      rawLabel: '',
      labels
    })).toEqual({
      ok: true,
      url: 'https://www.reddit.com/r/movies/.rss',
      label: 'r/movies'
    });
  });

  it('normalizes subreddit urls without a scheme', () => {
    expect(normalizeAddStreamInput({
      feedType: 'reddit',
      rawUrl: 'reddit.com/r/movies',
      rawLabel: '',
      labels
    })).toEqual({
      ok: true,
      url: 'https://www.reddit.com/r/movies/.rss',
      label: 'r/movies'
    });
  });

  it('normalizes youtube channel ids into channel feeds', () => {
    expect(normalizeAddStreamInput({
      feedType: 'youtube',
      rawUrl: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
      rawLabel: '',
      labels
    })).toEqual({
      ok: true,
      url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw',
      label: 'YouTube UC_x5XG1OV2P6uZZ5FSM9Ttw'
    });
  });

  it('rejects invalid rss inputs locally', () => {
    expect(normalizeAddStreamInput({
      feedType: 'rss',
      rawUrl: 'not-a-url',
      rawLabel: '',
      labels
    })).toEqual({
      ok: false,
      message: 'invalid-stream-url'
    });
  });

  it('rejects unsupported youtube inputs locally', () => {
    expect(normalizeAddStreamInput({
      feedType: 'youtube',
      rawUrl: '@googledevelopers',
      rawLabel: '',
      labels
    })).toEqual({
      ok: false,
      message: 'invalid-youtube-source'
    });
  });
});
