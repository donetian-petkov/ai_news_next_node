'use client';

import { useEffect, useMemo } from 'react';
import type { AppDispatch } from '../../store/store';
import { hydrateUiSettings } from '../../store/slices/uiSlice';
import type { TopMenuUiState } from './types';

export type PersistedUiPrefs = Parameters<typeof hydrateUiSettings>[0];
export const UI_PREFS_STORAGE_KEY = 'aiNews.uiPrefs.v2';

function parsePersistedUiPrefs(raw: string): PersistedUiPrefs | null {
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
  const persistedUiPrefs = useMemo<PersistedUiPrefs>(() => ({
    language: ui.language,
    colorMode: ui.colorMode,
    menuCollapsed: ui.menuCollapsed,
    controlsCollapsed: ui.controlsCollapsed,
    searchVisible: ui.searchVisible,
    addStreamVisible: ui.addStreamVisible,
    allColumnControlsHidden: ui.allColumnControlsHidden,
    hideAllResearch: ui.hideAllResearch,
    hideAllSummaries: ui.hideAllSummaries,
    notifyEnabled: ui.notifyEnabled,
    notifyMode: ui.notifyMode,
    moodFilter: ui.moodFilter,
    typeFilter: ui.typeFilter,
    titleDisplayLanguage: ui.titleDisplayLanguage,
    font: ui.font,
    fontSize: ui.fontSize,
    scheme: ui.scheme,
    timezone: ui.timezone,
    dateFormat: ui.dateFormat,
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
    ui.buttonMode,
    ui.colorMode,
    ui.controlsCollapsed,
    ui.effectIntensity,
    ui.font,
    ui.fontSize,
    ui.timezone,
    ui.dateFormat,
    ui.hideAllResearch,
    ui.hideAllSummaries,
    ui.language,
    ui.menuCollapsed,
    ui.menuHintMode,
    ui.moodFilter,
    ui.notifyEnabled,
    ui.notifyMode,
    ui.titleDisplayLanguage,
    ui.performanceMode,
    ui.scheme,
    ui.searchVisible,
    ui.soundEnabled,
    ui.soundTheme,
    ui.typeFilter,
    ui.vibe
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(UI_PREFS_STORAGE_KEY);
    if (!raw) return;
    const parsed = parsePersistedUiPrefs(raw);
    if (parsed) dispatch(hydrateUiSettings(parsed));
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
    try {
      window.localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(persistedUiPrefs));
    } catch {}
  }, [persistedUiPrefs]);
}
