'use client';

import { useCallback } from 'react';
import type { TFunction } from 'i18next';
import { setAiSettings, enqueueToast } from '../../../store/slices/uiSlice';
import { setFeedBudgetSetting } from '../../../store/slices/feedsSlice';
import type { AppDispatch, RootState } from '../../../store/store';
import { sendWsMessage } from '../../../store/wsClient';
import { getProviderKeyLabel, type TopMenuAiProvider } from '../topMenu.services';

type Args = {
  dispatch: AppDispatch;
  t: TFunction;
  labels: Record<string, string>;
  feeds: RootState['feeds']['feeds'];
};

const PROVIDER_KEYS_STORAGE_KEY = 'ai_news_provider_keys_v1';

function readProviderKeys(): Partial<Record<TopMenuAiProvider, string>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = String(window.localStorage.getItem(PROVIDER_KEYS_STORAGE_KEY) || '').trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<TopMenuAiProvider, string>>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveProviderKeyLocal(provider: TopMenuAiProvider, apiKey: string) {
  if (typeof window === 'undefined') return;
  const next = String(apiKey || '').trim();
  if (!next) return;
  const map = readProviderKeys();
  map[provider] = next;
  window.localStorage.setItem(PROVIDER_KEYS_STORAGE_KEY, JSON.stringify(map));
}

function getProviderKeyLocal(provider: TopMenuAiProvider): string {
  const map = readProviderKeys();
  return String(map[provider] || '').trim();
}

export function useTopMenuAiActions({ dispatch, t, labels, feeds }: Args) {
  const applyAllBudget = useCallback((budget: 'low' | 'standard' | 'high') => {
    const ok = sendWsMessage({ type: 'set_all_budget', budget });
    if (!ok) return;

    dispatch(setAiSettings({ allBudget: budget }));
    feeds.forEach(feed => {
      dispatch(setFeedBudgetSetting({ feedUrl: feed.url, budget }));
    });
  }, [dispatch, feeds]);

  const setProviderApiKey = useCallback((provider: TopMenuAiProvider, apiKey: string) => {
    const next = String(apiKey || '').trim();
    if (!next) {
      dispatch(enqueueToast({ kind: 'error', message: labels.providerKeyRequired || labels.providerSwitchCancelled }));
      return;
    }

    saveProviderKeyLocal(provider, next);
    const ok = sendWsMessage({ type: 'set_ai_provider', provider, apiKey: next });
    if (!ok) {
      dispatch(enqueueToast({ kind: 'error', message: labels.noServerConnection }));
      return;
    }
    dispatch(enqueueToast({ kind: 'success', message: labels.providerKeySaved || 'Provider key saved.' }));
  }, [dispatch, labels.noServerConnection, labels.providerKeyRequired, labels.providerKeySaved, labels.providerSwitchCancelled]);

  const changeAiProvider = useCallback((provider: TopMenuAiProvider) => {
    let apiKey = getProviderKeyLocal(provider);
    if (!apiKey) {
      const keyLabel = getProviderKeyLabel(provider);
      const promptText = t('topMenu.switchProviderPrompt', { keyLabel });
      const prompted = window.prompt(promptText, '');
      if (prompted === null) return;
      apiKey = String(prompted || '').trim();
      if (!apiKey) {
        dispatch(enqueueToast({ kind: 'error', message: labels.providerSwitchCancelled }));
        return;
      }
      saveProviderKeyLocal(provider, apiKey);
    }

    const ok = sendWsMessage({ type: 'set_ai_provider', provider, apiKey });
    if (!ok) {
      dispatch(enqueueToast({ kind: 'error', message: labels.noServerConnection }));
    }
  }, [dispatch, labels.noServerConnection, labels.providerSwitchCancelled, t]);

  const requestNotificationPermission = useCallback(async (enabled: boolean) => {
    if (!enabled || typeof Notification === 'undefined') return;
    try {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch {}
  }, []);

  return {
    applyAllBudget,
    changeAiProvider,
    setProviderApiKey,
    requestNotificationPermission
  };
}
