'use client';

import { useEffect, useRef } from 'react';

type Toast = { id: string; kind: 'info' | 'success' | 'error' | 'warning'; message: string; createdAt: number };

type UseTopMenuToastLifecycleArgs = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onToastKind: (kind: Toast['kind']) => void;
};

const TOAST_AUTO_DISMISS_MS = 5000;

export function useTopMenuToastLifecycle({
  toasts,
  onDismiss,
  onToastKind
}: UseTopMenuToastLifecycleArgs) {
  const toastTimersRef = useRef<Record<string, number>>({});
  const seenToastIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const seen = seenToastIdsRef.current;
    toasts.forEach(t => {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        onToastKind(t.kind);
      }
      if (toastTimersRef.current[t.id]) return;
      toastTimersRef.current[t.id] = window.setTimeout(() => {
        onDismiss(t.id);
        delete toastTimersRef.current[t.id];
      }, TOAST_AUTO_DISMISS_MS);
    });
    const known = new Set(toasts.map(t => t.id));
    Object.keys(toastTimersRef.current).forEach(id => {
      if (known.has(id)) return;
      window.clearTimeout(toastTimersRef.current[id]);
      delete toastTimersRef.current[id];
    });
    Array.from(seen).forEach(id => {
      if (!known.has(id)) seen.delete(id);
    });
  }, [onDismiss, onToastKind, toasts]);

  useEffect(() => {
    return () => {
      Object.values(toastTimersRef.current).forEach(id => window.clearTimeout(id));
      toastTimersRef.current = {};
      seenToastIdsRef.current.clear();
    };
  }, []);
}
