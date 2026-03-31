'use client';

import { useEffect, useRef } from 'react';
import type { NewsItem } from '../../../store/types';

type NotifyMode = 'matched' | 'matched_pinned' | 'pinned' | 'all';

type Args = {
  itemsByFeed: Record<string, NewsItem[]>;
  notifyEnabled: boolean;
  notifyMode: NotifyMode;
  pinnedByUrl: Record<string, boolean>;
  topicTrackingEnabled: boolean;
  trackedTopics: string[];
};

export function useDesktopNewsNotifications({
  itemsByFeed,
  notifyEnabled,
  notifyMode,
  pinnedByUrl,
  topicTrackingEnabled,
  trackedTopics
}: Args) {
  const seenNewsIdsRef = useRef<Set<string>>(new Set());
  const notificationsPrimedRef = useRef(false);

  useEffect(() => {
    if (!notificationsPrimedRef.current) {
      Object.values(itemsByFeed).forEach(items => {
        (items || []).forEach(item => {
          if (item?.id) seenNewsIdsRef.current.add(item.id);
        });
      });
      notificationsPrimedRef.current = true;
      return;
    }

    const newlySeen: Array<{ feedUrl: string; item: NewsItem }> = [];
    Object.entries(itemsByFeed).forEach(([feedUrl, items]) => {
      const list = Array.isArray(items) ? items : [];
      // Lists are kept newest-first; stop scanning once we hit first known id.
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item?.id) continue;
        if (seenNewsIdsRef.current.has(item.id)) break;
        newlySeen.push({ feedUrl, item });
      }
    });

    if (!newlySeen.length) return;

    const notificationsAllowed = notifyEnabled
      && typeof Notification !== 'undefined'
      && Notification.permission === 'granted';

    const shouldNotify = (feedUrl: string, it: NewsItem): boolean => {
      if (topicTrackingEnabled && trackedTopics.length) {
        const majorTrackedUpdate = !!it.topicHits?.length
          && (it.emergingSignal?.clusterSize || 0) >= 3;
        if (!majorTrackedUpdate) return false;
      }
      if (notifyMode === 'all') return true;
      if (notifyMode === 'pinned') return !!pinnedByUrl[feedUrl];
      if (notifyMode === 'matched_pinned') return !!it.isMatch && !!pinnedByUrl[feedUrl];
      return !!it.isMatch;
    };

    // Notify in chronological order when multiple items land in one batch.
    for (let i = newlySeen.length - 1; i >= 0; i--) {
      const { feedUrl, item } = newlySeen[i];
      seenNewsIdsRef.current.add(item.id);
      if (!notificationsAllowed) continue;
      if (!shouldNotify(feedUrl, item)) continue;
      const body = String(item.summary || item.research || '').trim();
      const n = new Notification(item.isMatch ? `MATCH · ${item.title}` : item.title, {
        body: body || item.link
      });
      n.onclick = () => window.open(item.link, '_blank', 'noopener,noreferrer');
    }
  }, [itemsByFeed, notifyEnabled, notifyMode, pinnedByUrl, topicTrackingEnabled, trackedTopics]);
}
