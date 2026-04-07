'use client';

import { useCallback, useEffect, useRef } from 'react';
import { sendWsMessage, subscribeWsAcks } from '../../../store/wsClient';
import type { AddStatus, FeedType } from '../types';
import { normalizeAddStreamInput } from './topMenuAddStream.utils';

type Args = {
  feedType: FeedType;
  feedUrl: string;
  feedLabel: string;
  feedInterval: string;
  labels: Record<string, string>;
  setAddStatus: React.Dispatch<React.SetStateAction<AddStatus>>;
  setFeedUrl: React.Dispatch<React.SetStateAction<string>>;
  setFeedLabel: React.Dispatch<React.SetStateAction<string>>;
};

export function useTopMenuAddStreamAction({
  feedType,
  feedUrl,
  feedLabel,
  feedInterval,
  labels,
  setAddStatus,
  setFeedUrl,
  setFeedLabel
}: Args) {
  const pendingRequestRef = useRef<{ rawUrl: string; rawLabel: string } | null>(null);
  const currentInputRef = useRef({ feedUrl, feedLabel });

  useEffect(() => {
    currentInputRef.current = { feedUrl, feedLabel };
  }, [feedLabel, feedUrl]);

  useEffect(() => subscribeWsAcks(event => {
    if (!pendingRequestRef.current) return;

    if (event.kind === 'ok') {
      if (!event.message.startsWith('Added feed:')) return;
      const pending = pendingRequestRef.current;
      pendingRequestRef.current = null;
      setAddStatus({ kind: 'success', message: event.message });
      if (currentInputRef.current.feedUrl.trim() === pending.rawUrl) {
        setFeedUrl('');
      }
      if (currentInputRef.current.feedLabel.trim() === pending.rawLabel) {
        setFeedLabel('');
      }
      return;
    }

    if (event.message !== 'Invalid URL' && event.message !== 'URL must be http/https') return;
    pendingRequestRef.current = null;
    setAddStatus({ kind: 'error', message: event.message });
  }), [setAddStatus, setFeedLabel, setFeedUrl]);

  return useCallback(() => {
    if (!feedUrl.trim()) {
      setAddStatus({ kind: 'error', message: labels.enterValue });
      return;
    }

    const normalized = normalizeAddStreamInput({
      feedType,
      rawUrl: feedUrl,
      rawLabel: feedLabel,
      labels: {
        invalidStreamUrl: labels.invalidStreamUrl,
        invalidRedditSource: labels.invalidRedditSource,
        invalidYoutubeSource: labels.invalidYoutubeSource
      }
    });

    if (!normalized.ok) {
      setAddStatus({ kind: 'error', message: normalized.message });
      return;
    }

    setAddStatus({ kind: 'info', message: labels.adding });
    const ok = sendWsMessage({
      type: 'add_feed',
      kind: feedType,
      url: normalized.url,
      label: normalized.label,
      intervalSec: Number(feedInterval) || 120
    });

    if (!ok) {
      pendingRequestRef.current = null;
      setAddStatus({ kind: 'error', message: labels.noServerConnection });
      return;
    }

    pendingRequestRef.current = {
      rawUrl: feedUrl.trim(),
      rawLabel: feedLabel.trim()
    };
  }, [feedInterval, feedLabel, feedType, feedUrl, labels.adding, labels.enterValue, labels.invalidRedditSource, labels.invalidStreamUrl, labels.invalidYoutubeSource, labels.noServerConnection, setAddStatus]);
}
