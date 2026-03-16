'use client';

import { useMemo } from 'react';
import { sendWsMessage } from '../../store/wsClient';
import { setAiSettings, setAppearanceSettings, setKeywords, setLanguage, setMoodFilter, setNotifySettings, setTitleDisplayLanguage, setTopUiState, setTypeFilter, triggerResetNewsShownAll, triggerShowMoreNewsAll } from '../../store/slices/uiSlice';
import { failBriefing, requestBriefing } from '../../store/slices/briefingSlice';
import type { AppDispatch, RootState } from '../../store/store';
import type { TopMenuControlsActions } from './types';

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
    onToggleSpecialColumn: (column: 'filtered' | 'emerging', enabled: boolean) => {
      dispatch(setTopUiState({
        ...(column === 'filtered' ? { showFilteredColumn: enabled } : {}),
        ...(column === 'emerging' ? { showEmergingColumn: enabled } : {})
      }));
    },
    onSetInsightFeature: (key: keyof RootState['ui']['insightFeatures'], enabled: boolean) => {
      const features = { ...ui.insightFeatures, [key]: enabled };
      const ok = sendWsMessage({
        type: 'set_ai_features',
        features,
        localRegion: ui.localImpactRegion,
        trackedTopics: ui.trackedTopics
      });
      if (ok) dispatch(setAiSettings({ insightFeatures: features }));
    },
    onSetLocalImpactRegion: (region: string) => {
      const next = String(region || '').trim();
      dispatch(setAiSettings({ localImpactRegion: next }));
      sendWsMessage({
        type: 'set_ai_features',
        features: ui.insightFeatures,
        localRegion: next,
        trackedTopics: ui.trackedTopics
      });
    },
    onSetTrackedTopics: (topics: string[]) => {
      const cleaned = Array.isArray(topics)
        ? topics.map(v => String(v || '').trim()).filter(Boolean)
        : [];
      const ok = sendWsMessage({
        type: 'set_ai_features',
        features: ui.insightFeatures,
        localRegion: ui.localImpactRegion,
        trackedTopics: cleaned
      });
      if (ok) dispatch(setAiSettings({ trackedTopics: cleaned }));
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
    onSetDailyBriefingPrefs: (patch: Parameters<TopMenuControlsActions['onSetDailyBriefingPrefs']>[0]) => dispatch(setAiSettings(patch)),
    onGenerateDailyBriefing: () => {
      dispatch(requestBriefing());
      const ok = sendWsMessage({
        type: 'generate_daily_briefing',
        delivery: ui.dailyBriefingDelivery,
        email: ui.dailyBriefingEmail,
        format: ui.dailyBriefingFormat,
        includeAudio: ui.dailyBriefingAudio,
        feedUrls: ui.dailyBriefingFeedUrls
      });
      if (!ok) {
        dispatch(failBriefing('WebSocket is disconnected. Daily briefing was not sent.'));
      }
    },
    onSetAppearance: (patch: Partial<RootState['ui']>) => dispatch(setAppearanceSettings(patch)),
    onSetLanguage: (lang: 'en' | 'bg') => dispatch(setLanguage(lang)),
    onCycleTheme: cycleTheme,
    onTogglePerformanceMode: () => dispatch(setAppearanceSettings({ performanceMode: !ui.performanceMode })),
    onToggleSoundEnabled: () => {
      const next = !ui.soundEnabled;
      dispatch(setAppearanceSettings({ soundEnabled: next }));
      if (next) triggerSoundCue('success');
    }
  }), [applyAllBudget, changeAiProvider, cycleTheme, deleteOldAllColumns, dispatch, onOpenHelp, requestNotificationPermission, resetAllNewest, setProviderApiKey, triggerSoundCue, ui.dailyBriefingAudio, ui.dailyBriefingDelivery, ui.dailyBriefingEmail, ui.dailyBriefingFeedUrls, ui.dailyBriefingFormat, ui.insightFeatures, ui.localImpactRegion, ui.performanceMode, ui.soundEnabled, ui.trackedTopics]);
}
