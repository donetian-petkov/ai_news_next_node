'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppDispatch } from '../../../store/store';
import {
  clearResearchForItem,
  clearResearchPending,
  clearSummaryForItem,
  clearSummaryPending,
  enqueueAskQuestion,
  hideItemLocally,
  receiveAskReply,
  setResearchPending,
  setSummaryPending
} from '../../../store/slices/newsSlice';
import { sendWsMessage } from '../../../store/wsClient';
import type { NewsItem } from '../../../store/types';
import { COLUMN_LAYOUT_TOKENS } from '../designTokens';

type AskStateMap = Record<string, { used: number; remaining: number; draft: string; pending: boolean }>;
type SharePlatform = 'copy' | 'card' | 'facebook' | 'reddit' | 'x' | 'tiktok';

type UseNewsItemActionsArgs = {
  dispatch: AppDispatch;
  connected: boolean;
  askByItem: AskStateMap;
  labels: Record<string, string>;
};

const ASK_AGENT_REPLY_TIMEOUT_MS = 45_000;

function askKey(it: NewsItem): string {
  return `${it.feedUrl}::${it.id}`;
}

function pendingKey(it: NewsItem): string {
  return `${it.feedUrl}::${it.id}`;
}

function cssEscape(value: string): string {
  const esc = (globalThis as { CSS?: { escape?: (input: string) => string } }).CSS?.escape;
  if (typeof esc === 'function') return esc(value);
  return value.replace(/["\\]/g, '\\$&');
}

export function useNewsItemActions({
  dispatch,
  connected,
  askByItem,
  labels
}: UseNewsItemActionsArgs) {
  const summaryTimeoutsRef = useRef<Record<string, number>>({});
  const researchTimeoutsRef = useRef<Record<string, number>>({});
  const askTimeoutsRef = useRef<Record<string, number>>({});
  const [clipboardNoticeOpen, setClipboardNoticeOpen] = useState(false);
  const [clipboardNotice, setClipboardNotice] = useState('');

  useEffect(() => {
    return () => {
      Object.values(summaryTimeoutsRef.current).forEach(id => window.clearTimeout(id));
      Object.values(researchTimeoutsRef.current).forEach(id => window.clearTimeout(id));
      Object.values(askTimeoutsRef.current).forEach(id => window.clearTimeout(id));
      summaryTimeoutsRef.current = {};
      researchTimeoutsRef.current = {};
      askTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    Object.keys(askTimeoutsRef.current).forEach(k => {
      const isPending = !!askByItem[k]?.pending;
      if (isPending) return;
      window.clearTimeout(askTimeoutsRef.current[k]);
      delete askTimeoutsRef.current[k];
    });
  }, [askByItem]);

  const requestSummary = useCallback((it: NewsItem) => {
    if (!connected) return;
    const key = pendingKey(it);
    dispatch(setSummaryPending(key));
    dispatch(clearSummaryForItem({ id: it.id, feedUrl: it.feedUrl }));

    if (summaryTimeoutsRef.current[key]) {
      window.clearTimeout(summaryTimeoutsRef.current[key]);
    }
    summaryTimeoutsRef.current[key] = window.setTimeout(() => {
      dispatch(clearSummaryPending(key));
      delete summaryTimeoutsRef.current[key];
    }, COLUMN_LAYOUT_TOKENS.summaryPendingTimeoutMs);

    const ok = sendWsMessage({
      type: 'run_summary_item',
      id: it.id,
      feedUrl: it.feedUrl
    });
    if (!ok) dispatch(clearSummaryPending(key));
  }, [connected, dispatch]);

  const requestResearch = useCallback((it: NewsItem) => {
    if (!connected) return;
    const key = pendingKey(it);
    dispatch(setResearchPending(key));
    dispatch(clearResearchForItem({ id: it.id, feedUrl: it.feedUrl }));

    if (researchTimeoutsRef.current[key]) {
      window.clearTimeout(researchTimeoutsRef.current[key]);
    }
    researchTimeoutsRef.current[key] = window.setTimeout(() => {
      dispatch(clearResearchPending(key));
      delete researchTimeoutsRef.current[key];
    }, COLUMN_LAYOUT_TOKENS.researchPendingTimeoutMs);

    const ok = sendWsMessage({
      type: 'run_research_item',
      id: it.id,
      feedUrl: it.feedUrl
    });
    if (!ok) dispatch(clearResearchPending(key));
  }, [connected, dispatch]);

  const hideItem = useCallback((it: NewsItem) => {
    const ok = sendWsMessage({ type: 'hide_item', id: it.id });
    if (ok) dispatch(hideItemLocally(it.id));
  }, [dispatch]);

  const copyLink = useCallback(async (url: string) => {
    const value = String(url || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setClipboardNotice(labels.linkCopied);
      setClipboardNoticeOpen(true);
    } catch {
      window.open(value, '_blank', 'noopener,noreferrer');
    }
  }, [labels.linkCopied]);

  const shareNews = useCallback(async (it: NewsItem, platform: SharePlatform) => {
    const link = String(it.link || '').trim();
    const title = String(it.title || '').trim();
    const summary = String(it.summary || '').trim();

    if (platform === 'copy') {
      if (!link) return;
      await copyLink(link);
      return;
    }

    if (platform === 'card') {
      const feedUrl = String(it.feedUrl || '').trim();
      const id = String(it.id || '').trim();
      if (!feedUrl || !id) return;

      try {
        const selector = `.news-item-card[data-news-id="${cssEscape(id)}"][data-news-feed-url="${cssEscape(feedUrl)}"]`;
        const cardNode = document.querySelector(selector) as HTMLElement | null;
        if (!cardNode) throw new Error('capture_missing_node');

        const { toBlob } = await import('html-to-image');
        const blob = await toBlob(cardNode, {
          cacheBust: true,
          pixelRatio: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
          backgroundColor: '#060d1d'
        });
        if (!blob) throw new Error('capture_failed');

        if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined' || typeof navigator.clipboard.write !== 'function') {
          throw new Error('clipboard_unsupported');
        }
        await navigator.clipboard.write([
          new window.ClipboardItem({ [blob.type || 'image/png']: blob })
        ]);
        setClipboardNotice(labels.cardImageCopied || labels.newsCopied || labels.linkCopied);
      } catch (error) {
        const code = (error as Error)?.message || '';
        setClipboardNotice(
          code === 'clipboard_unsupported'
            ? (labels.cardImageClipboardUnsupported || labels.linkCopied)
            : (labels.cardImageCaptureFailed || labels.linkCopied)
        );
      }
      setClipboardNoticeOpen(true);
      return;
    }

    if (!link) return;

    const encodedLink = encodeURIComponent(link);
    const encodedTitle = encodeURIComponent(title || link);
    const encodedShareText = encodeURIComponent(title || summary || link);

    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`, '_blank', 'noopener,noreferrer');
      return;
    }

    if (platform === 'reddit') {
      window.open(`https://www.reddit.com/submit?url=${encodedLink}&title=${encodedTitle}`, '_blank', 'noopener,noreferrer');
      return;
    }

    if (platform === 'x') {
      window.open(`https://twitter.com/intent/tweet?url=${encodedLink}&text=${encodedShareText}`, '_blank', 'noopener,noreferrer');
      return;
    }

    const payload = [title, summary, link]
      .map(x => String(x || '').trim())
      .filter(Boolean)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(payload);
      setClipboardNotice(labels.shareTikTokHint || labels.linkCopied);
      setClipboardNoticeOpen(true);
    } catch {
      // Continue to TikTok page even if clipboard write fails.
    }
    window.open('https://www.tiktok.com/upload?lang=en', '_blank', 'noopener,noreferrer');
  }, [
    copyLink,
    labels.cardImageCaptureFailed,
    labels.cardImageClipboardUnsupported,
    labels.cardImageCopied,
    labels.linkCopied,
    labels.newsCopied,
    labels.shareTikTokHint
  ]);

  const copyNewsPayload = useCallback(async (it: NewsItem) => {
    const title = String(it.title || '').trim();
    const summary = String(it.summary || '').trim();
    const research = String(it.research || '').trim();
    const link = String(it.link || '').trim();
    if (!title && !summary && !research && !link) return;

    const chunks: string[] = [];
    if (title) chunks.push(`${labels.copiedTitle}: ${title}`);
    if (summary) chunks.push(`${labels.copiedSummary}: ${summary}`);
    if (research) chunks.push(`${labels.copiedResearch}: ${research}`);
    if (link) chunks.push(`${labels.copiedLink}: ${link}`);
    const payload = chunks.join('\n\n');

    try {
      await navigator.clipboard.writeText(payload);
      setClipboardNotice(labels.newsCopied);
      setClipboardNoticeOpen(true);
    } catch {
      if (link) window.open(link, '_blank', 'noopener,noreferrer');
    }
  }, [labels.copiedLink, labels.copiedResearch, labels.copiedSummary, labels.copiedTitle, labels.newsCopied]);

  const requestAsk = useCallback((it: NewsItem) => {
    if (!connected) return;
    const k = askKey(it);
    const askState = askByItem[k] || { used: 0, remaining: 5, draft: '', pending: false };
    const question = String(askState.draft || '').trim().slice(0, COLUMN_LAYOUT_TOKENS.askQuestionMaxLength);
    if (!question || askState.pending || askState.remaining <= 0) return;

    const usedBefore = askState.used;
    const remainingBefore = askState.remaining;
    dispatch(enqueueAskQuestion({ id: it.id, feedUrl: it.feedUrl, question }));
    if (askTimeoutsRef.current[k]) {
      window.clearTimeout(askTimeoutsRef.current[k]);
      delete askTimeoutsRef.current[k];
    }

    const ok = sendWsMessage({
      type: 'ask_agent_item',
      id: it.id,
      feedUrl: it.feedUrl,
      question,
      researchMode: 'auto'
    });
    if (!ok) {
      dispatch(receiveAskReply({
        id: it.id,
        feedUrl: it.feedUrl,
        question,
        error: 'Socket unavailable. Try again.',
        used: usedBefore,
        remaining: remainingBefore
      }));
      return;
    }

    askTimeoutsRef.current[k] = window.setTimeout(() => {
      dispatch(receiveAskReply({
        id: it.id,
        feedUrl: it.feedUrl,
        question,
        error: 'Ask Agent timed out. Please try again.',
        used: usedBefore,
        remaining: remainingBefore
      }));
      delete askTimeoutsRef.current[k];
    }, ASK_AGENT_REPLY_TIMEOUT_MS);
  }, [askByItem, connected, dispatch]);

  return {
    requestSummary,
    requestResearch,
    hideItem,
    copyLink,
    shareNews,
    copyNewsPayload,
    requestAsk,
    clipboardNoticeOpen,
    clipboardNotice,
    setClipboardNoticeOpen
  };
}
