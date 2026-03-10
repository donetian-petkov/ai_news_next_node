'use client';

import { useMemo } from 'react';
import { sendWsMessage } from '../../store/wsClient';
import { setAiSettings, setAppearanceSettings, setKeywords, setLanguage, setMoodFilter, setNotifySettings, setTitleDisplayLanguage, setTypeFilter, triggerResetNewsShownAll, triggerShowMoreNewsAll } from '../../store/slices/uiSlice';
import type { AppDispatch, RootState } from '../../store/store';

type Args = {
  dispatch: AppDispatch;
  ui: RootState['ui'];
  triggerSoundCue: (kind: 'toggle' | 'success' | 'error') => void;
  requestNotificationPermission: (enabled: boolean) => Promise<void>;
  changeAiProvider: (provider: 'openai' | 'claude' | 'openrouter') => void;
  setProviderApiKey: (provider: 'openai' | 'claude' | 'openrouter', apiKey: string) => void;
  applyAllBudget: (budget: 'low' | 'standard' | 'high') => void;
  cycleTheme: () => void;
  resetAllNewest: () => void;
  deleteOldAllColumns: () => void;
  onOpenHelp: () => void;
};

export function useTopMenuControlPanelHandlers({
  dispatch,
  ui,
  triggerSoundCue,
  requestNotificationPermission,
  changeAiProvider,
  setProviderApiKey,
  applyAllBudget,
  cycleTheme,
  resetAllNewest,
  deleteOldAllColumns,
  onOpenHelp
}: Args) {
  return useMemo(() => ({
    onResetAllNewest: resetAllNewest,
    onShowMoreNewsAll: () => dispatch(triggerShowMoreNewsAll()),
    onResetNewsShownAll: () => dispatch(triggerResetNewsShownAll()),
    onDeleteOldAllColumns: deleteOldAllColumns,
    onToggleAiEnabled: (enabled: boolean) => {
      const ok = sendWsMessage({ type: 'toggle_ai', enabled });
      if (ok) dispatch(setAiSettings({ aiEnabled: enabled }));
    },
    onOpenHelp,
    onNotifyEnabledChange: async (enabled: boolean) => {
      dispatch(setNotifySettings({ notifyEnabled: enabled }));
      await requestNotificationPermission(enabled);
    },
    onNotifyModeChange: (notifyMode: RootState['ui']['notifyMode']) => dispatch(setNotifySettings({ notifyMode })),
    onChangeAiProvider: changeAiProvider,
    onSetProviderApiKey: setProviderApiKey,
    onSetKeywords: (keywords: string[]) => {
      const cleaned = Array.isArray(keywords)
        ? keywords
          .map(v => String(v || '').trim())
          .filter(Boolean)
        : [];
      const ok = sendWsMessage({ type: 'set_keywords', keywords: cleaned });
      if (ok) dispatch(setKeywords(cleaned));
    },
    onSummaryLangChange: (lang: RootState['ui']['summaryLang']) => {
      const ok = sendWsMessage({ type: 'set_summary_lang', lang });
      if (ok) dispatch(setAiSettings({ summaryLang: lang }));
    },
    onResearchLangChange: (lang: RootState['ui']['researchLang']) => {
      const ok = sendWsMessage({ type: 'set_research_lang', lang });
      if (ok) dispatch(setAiSettings({ researchLang: lang }));
    },
    onTitleDisplayLanguageChange: (lang: RootState['ui']['titleDisplayLanguage']) => {
      dispatch(setTitleDisplayLanguage(lang));
      if (lang !== 'original') {
        sendWsMessage({ type: 'run_title_translate_backfill', max: 700 });
      }
    },
    onSummaryModelChange: (model: string) => {
      const next = String(model || '').trim();
      if (!next) return;
      const ok = sendWsMessage({ type: 'set_ai_models', summaryModel: next });
      if (ok) dispatch(setAiSettings({ summaryModel: next }));
    },
    onResearchModelChange: (model: string) => {
      const next = String(model || '').trim();
      if (!next) return;
      const ok = sendWsMessage({ type: 'set_ai_models', researchModel: next });
      if (ok) dispatch(setAiSettings({ researchModel: next }));
    },
    onAskModelChange: (model: string) => {
      const next = String(model || '').trim();
      if (!next) return;
      const ok = sendWsMessage({ type: 'set_ai_models', askModel: next });
      if (ok) dispatch(setAiSettings({ askModel: next }));
    },
    onMoodFilterChange: (value: RootState['ui']['moodFilter']) => dispatch(setMoodFilter(value)),
    onTypeFilterChange: (value: RootState['ui']['typeFilter']) => dispatch(setTypeFilter(value)),
    onApplyAllBudget: applyAllBudget,
    onSetAppearance: (patch: Partial<RootState['ui']>) => dispatch(setAppearanceSettings(patch)),
    onSetLanguage: (lang: 'en' | 'bg') => dispatch(setLanguage(lang)),
    onCycleTheme: cycleTheme,
    onTogglePerformanceMode: () => dispatch(setAppearanceSettings({ performanceMode: !ui.performanceMode })),
    onToggleSoundEnabled: () => {
      const next = !ui.soundEnabled;
      dispatch(setAppearanceSettings({ soundEnabled: next }));
      if (next) triggerSoundCue('success');
    }
  }), [applyAllBudget, changeAiProvider, cycleTheme, deleteOldAllColumns, dispatch, onOpenHelp, requestNotificationPermission, resetAllNewest, setProviderApiKey, triggerSoundCue, ui.performanceMode, ui.soundEnabled]);
}
