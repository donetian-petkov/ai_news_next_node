'use client';

import type { FeedType } from '../types';

type AddStreamLabels = {
  invalidStreamUrl: string;
  invalidRedditSource: string;
  invalidYoutubeSource: string;
};

type NormalizeAddStreamInputArgs = {
  feedType: FeedType;
  rawUrl: string;
  rawLabel: string;
  labels: AddStreamLabels;
};

type NormalizeAddStreamInputResult =
  | { ok: true; url: string; label: string }
  | { ok: false; message: string };

const HTTP_PROTOCOL_RE = /^[a-z][a-z\d+.-]*:\/\//i;
const DOMAIN_LIKE_RE = /^(?:www\.)?[\w.-]+\.[a-z]{2,}(?:[/?#]|$)/i;
const REDDIT_HOST_RE = /(^|\.)reddit\.com$/i;
const YOUTUBE_HOST_RE = /(^|\.)youtube\.com$/i;
const SUBREDDIT_RE = /^[A-Za-z0-9_]+$/;
const YOUTUBE_CHANNEL_ID_RE = /^UC[\w-]{10,}$/i;

function normalizeLabel(rawLabel: string): string {
  return rawLabel.trim();
}

function withImplicitHttps(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (HTTP_PROTOCOL_RE.test(trimmed)) return trimmed;
  if (DOMAIN_LIKE_RE.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function parseHttpUrl(raw: string): URL | null {
  const candidate = withImplicitHttps(raw);
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function canonicalRedditUrl(subreddit: string): string {
  return `https://www.reddit.com/r/${subreddit}/.rss`;
}

function normalizeSubreddit(raw: string): string | null {
  const decoded = safeDecode(raw).trim();
  const trimmed = decoded.replace(/^\/+|\/+$/g, '');
  const withoutPrefix = trimmed.replace(/^r\//i, '');
  const withoutRss = withoutPrefix.replace(/\/\.rss$/i, '').replace(/\/$/g, '');
  if (!withoutRss || !SUBREDDIT_RE.test(withoutRss)) return null;
  return withoutRss;
}

function normalizeRssInput(
  rawUrl: string,
  rawLabel: string,
  labels: AddStreamLabels
): NormalizeAddStreamInputResult {
  const parsed = parseHttpUrl(rawUrl);
  if (!parsed) return { ok: false, message: labels.invalidStreamUrl };
  return {
    ok: true,
    url: parsed.toString(),
    label: normalizeLabel(rawLabel)
  };
}

function normalizeRedditInput(
  rawUrl: string,
  rawLabel: string,
  labels: AddStreamLabels
): NormalizeAddStreamInputResult {
  const parsed = parseHttpUrl(rawUrl);
  let subreddit: string | null = null;

  if (parsed) {
    if (!REDDIT_HOST_RE.test(parsed.hostname)) {
      return { ok: false, message: labels.invalidRedditSource };
    }
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments[0]?.toLowerCase() !== 'r' || !segments[1]) {
      return { ok: false, message: labels.invalidRedditSource };
    }
    subreddit = normalizeSubreddit(segments[1]);
  } else {
    subreddit = normalizeSubreddit(rawUrl);
  }

  if (!subreddit) return { ok: false, message: labels.invalidRedditSource };
  return {
    ok: true,
    url: canonicalRedditUrl(subreddit),
    label: normalizeLabel(rawLabel) || `r/${subreddit}`
  };
}

function normalizeYouTubeInput(
  rawUrl: string,
  rawLabel: string,
  labels: AddStreamLabels
): NormalizeAddStreamInputResult {
  const parsed = parseHttpUrl(rawUrl);
  let channelId = '';

  if (parsed) {
    if (!YOUTUBE_HOST_RE.test(parsed.hostname)) {
      return { ok: false, message: labels.invalidYoutubeSource };
    }
    if (parsed.pathname === '/feeds/videos.xml') {
      channelId = parsed.searchParams.get('channel_id')?.trim() || '';
    } else {
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments[0]?.toLowerCase() === 'channel' && segments[1]) {
        channelId = safeDecode(segments[1]).trim();
      }
    }
  } else {
    channelId = rawUrl.trim();
  }

  if (!YOUTUBE_CHANNEL_ID_RE.test(channelId)) {
    return { ok: false, message: labels.invalidYoutubeSource };
  }

  return {
    ok: true,
    url: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    label: normalizeLabel(rawLabel) || `YouTube ${channelId}`
  };
}

export function normalizeAddStreamInput({
  feedType,
  rawUrl,
  rawLabel,
  labels
}: NormalizeAddStreamInputArgs): NormalizeAddStreamInputResult {
  if (feedType === 'reddit') return normalizeRedditInput(rawUrl, rawLabel, labels);
  if (feedType === 'youtube') return normalizeYouTubeInput(rawUrl, rawLabel, labels);
  return normalizeRssInput(rawUrl, rawLabel, labels);
}
