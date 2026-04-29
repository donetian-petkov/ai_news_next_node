'use client';

import { useEffect, useMemo, useRef } from 'react';
import { sendWsMessage } from '../../store/wsClient';
import type { AppDispatch } from '../../store/store';
import { hydrateUiSettings } from '../../store/slices/uiSlice';
import type { TopMenuUiState } from './types';

export type PersistedUiPrefs = Parameters<typeof hydrateUiSettings>[0] & {
  persistedAtMs?: number;
};
export const UI_PREFS_STORAGE_KEY = 'aiNews.uiPrefs.v3';

export function parsePersistedUiPrefs(raw: string): PersistedUiPrefs | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as PersistedUiPrefs;
  } catch {
    return null;
  }
}

type UseTopMenuUiPersistenceArgs = {
  dispatch: AppDispatch;
  ui: TopMenuUiState;
  resolvedColorMode: 'dark' | 'light';
};

export function useTopMenuUiPersistence({ dispatch, ui, resolvedColorMode }: UseTopMenuUiPersistenceArgs) {
  const persistReadyRef = useRef(false);
  const persistedUiPrefs = useMemo<PersistedUiPrefs>(() => ({
    language: ui.language,
    colorMode: ui.colorMode,
    menuCollapsed: ui.menuCollapsed,
    controlsCollapsed: ui.controlsCollapsed,
    searchVisible: ui.searchVisible,
    addStreamVisible: ui.addStreamVisible,
    allColumnControlsHidden: ui.allColumnControlsHidden,
    showFilteredColumn: ui.showFilteredColumn,
    showEmergingColumn: ui.showEmergingColumn,
    storiesPerColumn: ui.storiesPerColumn,
    notifyEnabled: ui.notifyEnabled,
    notifyMode: ui.notifyMode,
    moodFilter: ui.moodFilter,
    typeFilter: ui.typeFilter,
    aiProvider: ui.aiProvider,
    summaryLang: ui.summaryLang,
    researchLang: ui.researchLang,
    titleDisplayLanguage: ui.titleDisplayLanguage,
    insightFeatures: ui.insightFeatures,
    localImpactRegion: ui.localImpactRegion,
    trackedTopics: ui.trackedTopics,
    summaryModel: ui.summaryModel,
    researchModel: ui.researchModel,
    askModel: ui.askModel,
    allBudget: ui.allBudget,
    keywords: ui.keywords,
    dailyBriefingDelivery: ui.dailyBriefingDelivery,
    dailyBriefingEmail: ui.dailyBriefingEmail,
    dailyBriefingFormat: ui.dailyBriefingFormat,
    dailyBriefingAudio: ui.dailyBriefingAudio,
    dailyBriefingFeedUrls: ui.dailyBriefingFeedUrls,
    font: ui.font,
    fontSize: ui.fontSize,
    scheme: ui.scheme,
    timezone: ui.timezone,
    dateFormat: ui.dateFormat,
    showNewsCovers: ui.showNewsCovers,
    performanceMode: ui.performanceMode,
    buttonMode: ui.buttonMode,
    menuHintMode: ui.menuHintMode,
    effectIntensity: ui.effectIntensity,
    soundEnabled: ui.soundEnabled,
    soundTheme: ui.soundTheme,
    vibe: ui.vibe
  }), [
    ui.addStreamVisible,
    ui.allColumnControlsHidden,
    ui.showFilteredColumn,
    ui.showEmergingColumn,
    ui.storiesPerColumn,
    ui.buttonMode,
    ui.colorMode,
    ui.controlsCollapsed,
    ui.effectIntensity,
    ui.font,
    ui.fontSize,
    ui.timezone,
    ui.dateFormat,
    ui.showNewsCovers,
    ui.insightFeatures,
    ui.language,
    ui.localImpactRegion,
    ui.menuCollapsed,
    ui.menuHintMode,
    ui.moodFilter,
    ui.notifyEnabled,
    ui.notifyMode,
    ui.dailyBriefingAudio,
    ui.dailyBriefingDelivery,
    ui.dailyBriefingEmail,
    ui.dailyBriefingFeedUrls,
    ui.dailyBriefingFormat,
    ui.aiProvider,
    ui.summaryLang,
    ui.researchLang,
    ui.summaryModel,
    ui.researchModel,
    ui.askModel,
    ui.allBudget,
    ui.keywords,
    ui.titleDisplayLanguage,
    ui.performanceMode,
    ui.scheme,
    ui.searchVisible,
    ui.soundEnabled,
    ui.soundTheme,
    ui.trackedTopics,
    ui.typeFilter,
    ui.vibe
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let parsed: PersistedUiPrefs | null = null;
    const raw = window.localStorage.getItem(UI_PREFS_STORAGE_KEY);
    if (raw) {
      parsed = parsePersistedUiPrefs(raw);
      if (parsed) {
        dispatch(hydrateUiSettings(parsed));
      }
    }

    if (parsed) {
      const replayPersistedServerPrefs = (attempt = 0) => {
        const sent: boolean[] = [];
        if (parsed.summaryLang === 'bg' || parsed.summaryLang === 'en' || parsed.summaryLang === 'bilingual') {
          sent.push(sendWsMessage({ type: 'set_summary_lang', lang: parsed.summaryLang }));
        }
        if (parsed.researchLang === 'bg' || parsed.researchLang === 'en') {
          sent.push(sendWsMessage({ type: 'set_research_lang', lang: parsed.researchLang }));
        }
        if (parsed.aiProvider === 'openai' || parsed.aiProvider === 'claude' || parsed.aiProvider === 'openrouter') {
          sent.push(sendWsMessage({ type: 'set_ai_provider', provider: parsed.aiProvider }));
        }
        if (parsed.summaryModel || parsed.researchModel || parsed.askModel) {
          sent.push(sendWsMessage({
            type: 'set_ai_models',
            ...(typeof parsed.summaryModel === 'string' && parsed.summaryModel.trim() ? { summaryModel: parsed.summaryModel.trim() } : {}),
            ...(typeof parsed.researchModel === 'string' && parsed.researchModel.trim() ? { researchModel: parsed.researchModel.trim() } : {}),
            ...(typeof parsed.askModel === 'string' && parsed.askModel.trim() ? { askModel: parsed.askModel.trim() } : {})
          }));
        }
        if (Array.isArray(parsed.keywords)) {
          sent.push(sendWsMessage({ type: 'set_keywords', keywords: parsed.keywords }));
        }
        if (parsed.allBudget === 'low' || parsed.allBudget === 'standard' || parsed.allBudget === 'high') {
          sent.push(sendWsMessage({ type: 'set_all_budget', budget: parsed.allBudget }));
        }
        if (parsed.insightFeatures || typeof parsed.localImpactRegion === 'string' || Array.isArray(parsed.trackedTopics)) {
          sent.push(sendWsMessage({
            type: 'set_ai_features',
            ...(parsed.insightFeatures ? { features: parsed.insightFeatures } : {}),
            ...(typeof parsed.localImpactRegion === 'string' ? { localRegion: parsed.localImpactRegion } : {}),
            ...(Array.isArray(parsed.trackedTopics) ? { trackedTopics: parsed.trackedTopics } : {})
          }));
        }
        if (sent.length && sent.some(Boolean)) return;
        if (attempt >= 12) return;
        window.setTimeout(() => replayPersistedServerPrefs(attempt + 1), 500);
      };

      replayPersistedServerPrefs();
    }

    window.setTimeout(() => {
      persistReadyRef.current = true;
    }, 0);
  }, [dispatch]);

  useEffect(() => {
    document.body.classList.toggle('menu-collapsed', ui.menuCollapsed);
    document.body.classList.toggle('controls-collapsed', ui.controlsCollapsed);
    document.body.dataset.vibe = ui.vibe;
    document.body.dataset.font = ui.font;
    document.body.dataset.fontSize = ui.fontSize;
    document.body.dataset.scheme = ui.scheme;
    document.body.dataset.performance = ui.performanceMode ? 'on' : 'off';
    document.body.dataset.effectIntensity = ui.effectIntensity;
    document.body.dataset.itemButtons = ui.buttonMode;
    document.body.dataset.theme = resolvedColorMode;
    document.documentElement.dataset.theme = resolvedColorMode;
    document.body.dataset.themeSource = ui.colorMode;
    document.documentElement.dataset.themeSource = ui.colorMode;
    document.documentElement.lang = ui.language;
  }, [resolvedColorMode, ui.buttonMode, ui.colorMode, ui.controlsCollapsed, ui.effectIntensity, ui.font, ui.fontSize, ui.language, ui.menuCollapsed, ui.performanceMode, ui.scheme, ui.vibe]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!persistReadyRef.current) return;
    try {
      window.localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify({
        ...persistedUiPrefs,
        persistedAtMs: Date.now()
      }));
    } catch {}
  }, [persistedUiPrefs]);
}
