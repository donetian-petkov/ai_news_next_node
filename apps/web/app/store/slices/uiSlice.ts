import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  type AiInsightFeatureSettings,
  type BriefingDelivery,
  type BriefingFormat,
  type MoodFilter,
  NewsMoodFilterValue,
  type TypeFilter,
  NewsTypeFilterValue
} from '../types';
import { isMoodFilter, isTypeFilter } from '../valueEnums';

const isVibe = (value: string): value is UiState['vibe'] =>
  value === 'default'
  || value === 'anime'
  || value === 'arcade'
  || value === 'cinema'
  || value === 'newspaper'
  || value === 'cyberwitch'
  || value === 'fantasy'
  || value === 'scifi';

const isTimezone = (value: string): value is UiState['timezone'] =>
  value === 'system'
  || value === 'UTC'
  || value === 'Europe/Sofia'
  || value === 'Europe/London'
  || value === 'Europe/Berlin'
  || value === 'America/New_York'
  || value === 'America/Chicago'
  || value === 'America/Denver'
  || value === 'America/Los_Angeles'
  || value === 'Asia/Tokyo';

type AiProvider = 'openai' | 'claude' | 'openrouter' | 'local';
type AiModelKind = 'summary' | 'research' | 'ask';
type AiProviderModelOptions = Record<AiModelKind, string[]>;
type AiModelsByProvider = Record<AiProvider, AiProviderModelOptions>;
type UiToastKind = 'info' | 'success' | 'error' | 'warning';
type UiNotification = {
  id: string;
  kind: UiToastKind;
  message: string;
  createdAt: number;
  count?: number;
};

const MAX_ACTIVE_TOASTS = 8;
const MAX_NOTIFICATION_HISTORY = 60;

const DEFAULT_AI_INSIGHT_FEATURES: AiInsightFeatureSettings = {
  biasDetection: false,
  sensationalismDetection: false,
  factHighlights: false,
  storyImpact: false,
  dailyBriefing: false,
  topicTracking: false,
  perspectiveSimulator: false,
  emergingStoryDetector: false,
  historicalComparison: false,
  futureScenarioGenerator: false,
  localImpactDetector: false
};

const DEFAULT_AI_MODELS: AiModelsByProvider = {
  openai: {
    summary: ['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1'],
    research: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
    ask: ['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4o-mini']
  },
  claude: {
    summary: ['claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest'],
    research: ['claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
    ask: ['claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest']
  },
  openrouter: {
    summary: ['openai/gpt-4.1-mini', 'openai/gpt-4.1', 'anthropic/claude-3.5-haiku'],
    research: ['openai/gpt-4.1', 'openai/gpt-4.1-mini', 'anthropic/claude-3.7-sonnet'],
    ask: ['openai/gpt-4.1-mini', 'openai/gpt-4.1-nano', 'anthropic/claude-3.5-haiku']
  },
  local: {
    summary: ['llama3.1'],
    research: ['llama3.1'],
    ask: ['llama3.1']
  }
};

function dedupeNonEmptyStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function dedupeKeywords(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function dedupeTrimmedList(values: unknown, max = 80): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function normalizeInsightFeatures(
  value: Partial<AiInsightFeatureSettings> | undefined,
  fallback: AiInsightFeatureSettings
): AiInsightFeatureSettings {
  return {
    biasDetection: typeof value?.biasDetection === 'boolean' ? value.biasDetection : fallback.biasDetection,
    sensationalismDetection: typeof value?.sensationalismDetection === 'boolean' ? value.sensationalismDetection : fallback.sensationalismDetection,
    factHighlights: typeof value?.factHighlights === 'boolean' ? value.factHighlights : fallback.factHighlights,
    storyImpact: false,
    dailyBriefing: typeof value?.dailyBriefing === 'boolean' ? value.dailyBriefing : fallback.dailyBriefing,
    topicTracking: typeof value?.topicTracking === 'boolean' ? value.topicTracking : fallback.topicTracking,
    perspectiveSimulator: false,
    emergingStoryDetector: typeof value?.emergingStoryDetector === 'boolean' ? value.emergingStoryDetector : fallback.emergingStoryDetector,
    historicalComparison: false,
    futureScenarioGenerator: false,
    localImpactDetector: false
  };
}

function normalizeStoriesPerColumn(value: unknown, fallback = 10): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.max(1, Math.min(200, parsed));
}

type UiState = {
  language: 'en' | 'bg';
  colorMode: 'system' | 'dark' | 'light';
  searchQuery: string;
  menuCollapsed: boolean;
  controlsCollapsed: boolean;
  searchVisible: boolean;
  addStreamVisible: boolean;
  allColumnControlsHidden: boolean;
  showFilteredColumn: boolean;
  showEmergingColumn: boolean;
  hideAllResearchSeq: number;
  hideAllResearch: boolean;
  hideAllSummaries: boolean;
  storiesPerColumn: number;
  showMoreNewsAllSeq: number;
  resetNewsShownAllSeq: number;
  helpOpen: boolean;
  notifyEnabled: boolean;
  notifyMode: 'matched' | 'matched_pinned' | 'pinned' | 'all';
  aiAvailable: boolean;
  aiEnabled: boolean;
  aiProvider: AiProvider;
  keywords: string[];
  moodFilter: MoodFilter;
  typeFilter: TypeFilter;
  summaryLang: 'bilingual' | 'bg' | 'en';
  researchLang: 'bg' | 'en';
  titleDisplayLanguage: 'original' | 'bg' | 'en';
  insightFeatures: AiInsightFeatureSettings;
  localImpactRegion: string;
  trackedTopics: string[];
  summaryModel: string;
  researchModel: string;
  askModel: string;
  localLlmBaseUrl: string;
  availableModels: AiModelsByProvider;
  allBudget: 'mixed' | 'low' | 'standard' | 'high';
  dailyBriefingDelivery: BriefingDelivery;
  dailyBriefingEmail: string;
  dailyBriefingFormat: BriefingFormat;
  dailyBriefingAudio: boolean;
  dailyBriefingFeedUrls: string[];
  font: 'system' | 'manrope' | 'grotesk' | 'sora' | 'plex' | 'serif' | 'mono';
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  scheme: 'classic' | 'vivid' | 'sunset' | 'neon' | 'ocean' | 'forest';
  timezone: 'system' | 'UTC' | 'Europe/Sofia' | 'Europe/London' | 'Europe/Berlin' | 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles' | 'Asia/Tokyo';
  dateFormat: 'ddmmyy' | 'mmddyy' | 'yyyymmdd';
  showNewsCovers: boolean;
  performanceMode: boolean;
  buttonMode: 'icons' | 'text';
  menuHintMode: 'text' | 'buttons';
  effectIntensity: 'low' | 'medium' | 'high';
  soundEnabled: boolean;
  soundTheme: 'vibe' | 'default' | 'anime' | 'arcade' | 'cinema' | 'newspaper' | 'cyberwitch' | 'fantasy' | 'scifi';
  vibe: 'default' | 'anime' | 'arcade' | 'cinema' | 'newspaper' | 'cyberwitch' | 'fantasy' | 'scifi';
  toasts: UiNotification[];
  notificationInbox: UiNotification[];
};

const initialState: UiState = {
  language: 'en',
  colorMode: 'system',
  searchQuery: '',
  menuCollapsed: false,
  controlsCollapsed: false,
  searchVisible: true,
  addStreamVisible: false,
  allColumnControlsHidden: false,
  showFilteredColumn: true,
  showEmergingColumn: true,
  hideAllResearchSeq: 0,
  hideAllResearch: false,
  hideAllSummaries: false,
  storiesPerColumn: 10,
  showMoreNewsAllSeq: 0,
  resetNewsShownAllSeq: 0,
  helpOpen: false,
  notifyEnabled: false,
  notifyMode: 'matched',
  aiAvailable: false,
  aiEnabled: false,
  aiProvider: 'openai',
  keywords: [],
  moodFilter: NewsMoodFilterValue.All,
  typeFilter: NewsTypeFilterValue.All,
  summaryLang: 'bilingual',
  researchLang: 'bg',
  titleDisplayLanguage: 'original',
  insightFeatures: { ...DEFAULT_AI_INSIGHT_FEATURES },
  localImpactRegion: 'United States',
  trackedTopics: [],
  summaryModel: DEFAULT_AI_MODELS.openai.summary[0],
  researchModel: DEFAULT_AI_MODELS.openai.research[0],
  askModel: DEFAULT_AI_MODELS.openai.ask[0],
  localLlmBaseUrl: 'http://localhost:11434/v1',
  availableModels: DEFAULT_AI_MODELS,
  allBudget: 'standard',
  dailyBriefingDelivery: 'site',
  dailyBriefingEmail: '',
  dailyBriefingFormat: 'executive',
  dailyBriefingAudio: false,
  dailyBriefingFeedUrls: [],
  font: 'system',
  fontSize: 'md',
  scheme: 'classic',
  timezone: 'system',
  dateFormat: 'ddmmyy',
  showNewsCovers: true,
  performanceMode: false,
  buttonMode: 'icons',
  menuHintMode: 'text',
  effectIntensity: 'medium',
  soundEnabled: true,
  soundTheme: 'vibe',
  vibe: 'default',
  toasts: [],
  notificationInbox: []
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<'en' | 'bg'>) {
      state.language = action.payload;
    },
    setColorMode(state, action: PayloadAction<'system' | 'dark' | 'light'>) {
      state.colorMode = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = String(action.payload || '');
    },
    setTopUiState(state, action: PayloadAction<Partial<Pick<UiState, 'menuCollapsed' | 'controlsCollapsed' | 'searchVisible' | 'addStreamVisible' | 'allColumnControlsHidden' | 'showFilteredColumn' | 'showEmergingColumn' | 'vibe'>>>) {
      const next = action.payload;
      if (typeof next.menuCollapsed === 'boolean') state.menuCollapsed = next.menuCollapsed;
      if (typeof next.controlsCollapsed === 'boolean') state.controlsCollapsed = next.controlsCollapsed;
      if (typeof next.searchVisible === 'boolean') state.searchVisible = next.searchVisible;
      if (typeof next.addStreamVisible === 'boolean') state.addStreamVisible = next.addStreamVisible;
      if (typeof next.allColumnControlsHidden === 'boolean') state.allColumnControlsHidden = next.allColumnControlsHidden;
      if (typeof next.showFilteredColumn === 'boolean') state.showFilteredColumn = next.showFilteredColumn;
      if (typeof next.showEmergingColumn === 'boolean') state.showEmergingColumn = next.showEmergingColumn;
      if (typeof next.vibe === 'string' && isVibe(next.vibe)) state.vibe = next.vibe;
    },
    triggerHideAllResearch(state) {
      state.hideAllResearchSeq += 1;
      state.hideAllResearch = true;
    },
    setHideAllResearch(state, action: PayloadAction<boolean>) {
      state.hideAllResearch = !!action.payload;
      if (state.hideAllResearch) state.hideAllResearchSeq += 1;
    },
    setHideAllSummaries(state, action: PayloadAction<boolean>) {
      state.hideAllSummaries = !!action.payload;
    },
    setStoriesPerColumn(state, action: PayloadAction<number>) {
      state.storiesPerColumn = normalizeStoriesPerColumn(action.payload, state.storiesPerColumn);
    },
    triggerShowMoreNewsAll(state) {
      state.showMoreNewsAllSeq += 1;
    },
    triggerResetNewsShownAll(state) {
      state.resetNewsShownAllSeq += 1;
    },
    setHelpOpen(state, action: PayloadAction<boolean>) {
      state.helpOpen = !!action.payload;
    },
    setNotifySettings(state, action: PayloadAction<Partial<Pick<UiState, 'notifyEnabled' | 'notifyMode'>>>) {
      const next = action.payload;
      if (typeof next.notifyEnabled === 'boolean') state.notifyEnabled = next.notifyEnabled;
      if (next.notifyMode === 'matched' || next.notifyMode === 'matched_pinned' || next.notifyMode === 'pinned' || next.notifyMode === 'all') {
        state.notifyMode = next.notifyMode;
      }
    },
    setAiSettings(state, action: PayloadAction<Partial<Pick<UiState, 'aiAvailable' | 'aiEnabled' | 'aiProvider' | 'summaryLang' | 'researchLang' | 'titleDisplayLanguage' | 'insightFeatures' | 'localImpactRegion' | 'trackedTopics' | 'summaryModel' | 'researchModel' | 'askModel' | 'localLlmBaseUrl' | 'availableModels' | 'allBudget' | 'dailyBriefingDelivery' | 'dailyBriefingEmail' | 'dailyBriefingFormat' | 'dailyBriefingAudio' | 'dailyBriefingFeedUrls'>>>) {
      const next = action.payload;
      if (typeof next.aiAvailable === 'boolean') state.aiAvailable = next.aiAvailable;
      if (typeof next.aiEnabled === 'boolean') state.aiEnabled = next.aiEnabled;
      if (next.aiProvider === 'openai' || next.aiProvider === 'claude' || next.aiProvider === 'openrouter' || next.aiProvider === 'local') state.aiProvider = next.aiProvider;
      if (next.summaryLang === 'bg' || next.summaryLang === 'en' || next.summaryLang === 'bilingual') state.summaryLang = next.summaryLang;
      if (next.researchLang === 'bg' || next.researchLang === 'en') state.researchLang = next.researchLang;
      if (next.titleDisplayLanguage === 'original' || next.titleDisplayLanguage === 'bg' || next.titleDisplayLanguage === 'en') {
        state.titleDisplayLanguage = next.titleDisplayLanguage;
      }
      if (next.insightFeatures && typeof next.insightFeatures === 'object') {
        state.insightFeatures = normalizeInsightFeatures(next.insightFeatures, state.insightFeatures);
      }
      if (typeof next.localImpactRegion === 'string') {
        state.localImpactRegion = next.localImpactRegion.trim().slice(0, 120);
      }
      if (Array.isArray(next.trackedTopics)) {
        state.trackedTopics = dedupeTrimmedList(next.trackedTopics, 80);
      }
      if (typeof next.summaryModel === 'string' && next.summaryModel.trim()) state.summaryModel = next.summaryModel.trim();
      if (typeof next.researchModel === 'string' && next.researchModel.trim()) state.researchModel = next.researchModel.trim();
      if (typeof next.askModel === 'string' && next.askModel.trim()) state.askModel = next.askModel.trim();
      if (typeof next.localLlmBaseUrl === 'string') {
        state.localLlmBaseUrl = next.localLlmBaseUrl.trim().slice(0, 500);
      }
      if (next.availableModels && typeof next.availableModels === 'object') {
        const openaiSummary = dedupeNonEmptyStrings(next.availableModels.openai?.summary);
        const openaiResearch = dedupeNonEmptyStrings(next.availableModels.openai?.research);
        const openaiAsk = dedupeNonEmptyStrings(next.availableModels.openai?.ask);
        const claudeSummary = dedupeNonEmptyStrings(next.availableModels.claude?.summary);
        const claudeResearch = dedupeNonEmptyStrings(next.availableModels.claude?.research);
        const claudeAsk = dedupeNonEmptyStrings(next.availableModels.claude?.ask);
        const openrouterSummary = dedupeNonEmptyStrings(next.availableModels.openrouter?.summary);
        const openrouterResearch = dedupeNonEmptyStrings(next.availableModels.openrouter?.research);
        const openrouterAsk = dedupeNonEmptyStrings(next.availableModels.openrouter?.ask);
        const localSummary = dedupeNonEmptyStrings((next.availableModels as AiModelsByProvider).local?.summary);
        const localResearch = dedupeNonEmptyStrings((next.availableModels as AiModelsByProvider).local?.research);
        const localAsk = dedupeNonEmptyStrings((next.availableModels as AiModelsByProvider).local?.ask);
        state.availableModels = {
          openai: {
            summary: openaiSummary.length ? openaiSummary : state.availableModels.openai.summary,
            research: openaiResearch.length ? openaiResearch : state.availableModels.openai.research,
            ask: openaiAsk.length ? openaiAsk : state.availableModels.openai.ask
          },
          claude: {
            summary: claudeSummary.length ? claudeSummary : state.availableModels.claude.summary,
            research: claudeResearch.length ? claudeResearch : state.availableModels.claude.research,
            ask: claudeAsk.length ? claudeAsk : state.availableModels.claude.ask
          },
          openrouter: {
            summary: openrouterSummary.length ? openrouterSummary : state.availableModels.openrouter.summary,
            research: openrouterResearch.length ? openrouterResearch : state.availableModels.openrouter.research,
            ask: openrouterAsk.length ? openrouterAsk : state.availableModels.openrouter.ask
          },
          local: {
            summary: localSummary.length ? localSummary : state.availableModels.local.summary,
            research: localResearch.length ? localResearch : state.availableModels.local.research,
            ask: localAsk.length ? localAsk : state.availableModels.local.ask
          }
        };
      }
      if (next.allBudget === 'mixed' || next.allBudget === 'low' || next.allBudget === 'standard' || next.allBudget === 'high') state.allBudget = next.allBudget;
      if (next.dailyBriefingDelivery === 'site' || next.dailyBriefingDelivery === 'email') {
        state.dailyBriefingDelivery = next.dailyBriefingDelivery;
      }
      if (typeof next.dailyBriefingEmail === 'string') {
        state.dailyBriefingEmail = next.dailyBriefingEmail.trim().slice(0, 200);
      }
      if (next.dailyBriefingFormat === 'executive' || next.dailyBriefingFormat === 'bullets' || next.dailyBriefingFormat === 'narrative') {
        state.dailyBriefingFormat = next.dailyBriefingFormat;
      }
      if (typeof next.dailyBriefingAudio === 'boolean') {
        state.dailyBriefingAudio = next.dailyBriefingAudio;
      }
      if (Array.isArray(next.dailyBriefingFeedUrls)) {
        state.dailyBriefingFeedUrls = dedupeTrimmedList(next.dailyBriefingFeedUrls, 80);
      }
    },
    setTitleDisplayLanguage(state, action: PayloadAction<UiState['titleDisplayLanguage']>) {
      const next = action.payload;
      if (next === 'original' || next === 'bg' || next === 'en') {
        state.titleDisplayLanguage = next;
      }
    },
    setKeywords(state, action: PayloadAction<string[]>) {
      state.keywords = dedupeKeywords(action.payload);
    },
    setMoodFilter(state, action: PayloadAction<UiState['moodFilter']>) {
      if (state.performanceMode) {
        state.moodFilter = NewsMoodFilterValue.All;
        return;
      }
      const next = action.payload;
      if (isMoodFilter(next)) {
        state.moodFilter = next;
      }
    },
    setTypeFilter(state, action: PayloadAction<UiState['typeFilter']>) {
      if (state.performanceMode) {
        state.typeFilter = NewsTypeFilterValue.All;
        return;
      }
      const next = action.payload;
      if (isTypeFilter(next)) {
        state.typeFilter = next;
      }
    },
    setAppearanceSettings(state, action: PayloadAction<Partial<Pick<UiState, 'font' | 'fontSize' | 'scheme' | 'timezone' | 'dateFormat' | 'showNewsCovers' | 'performanceMode' | 'buttonMode' | 'menuHintMode' | 'effectIntensity' | 'soundEnabled' | 'soundTheme' | 'vibe' | 'colorMode'>>>) {
      const next = action.payload;
      if (next.font === 'system' || next.font === 'manrope' || next.font === 'grotesk' || next.font === 'sora' || next.font === 'plex' || next.font === 'serif' || next.font === 'mono') {
        state.font = next.font;
      }
      if (next.fontSize === 'sm' || next.fontSize === 'md' || next.fontSize === 'lg' || next.fontSize === 'xl') {
        state.fontSize = next.fontSize;
      }
      if (next.scheme === 'classic' || next.scheme === 'vivid' || next.scheme === 'sunset' || next.scheme === 'neon' || next.scheme === 'ocean' || next.scheme === 'forest') {
        state.scheme = next.scheme;
      }
      if (typeof next.timezone === 'string' && isTimezone(next.timezone)) {
        state.timezone = next.timezone;
      }
      if (next.dateFormat === 'ddmmyy' || next.dateFormat === 'mmddyy' || next.dateFormat === 'yyyymmdd') {
        state.dateFormat = next.dateFormat;
      }
      if (typeof next.showNewsCovers === 'boolean') {
        state.showNewsCovers = next.showNewsCovers;
      }
      if (typeof next.performanceMode === 'boolean') {
        state.performanceMode = next.performanceMode;
        if (next.performanceMode) {
          state.moodFilter = NewsMoodFilterValue.All;
          state.typeFilter = NewsTypeFilterValue.All;
          state.soundEnabled = false;
        }
      }
      if (next.buttonMode === 'icons' || next.buttonMode === 'text') {
        state.buttonMode = next.buttonMode;
      }
      if (next.menuHintMode === 'text' || next.menuHintMode === 'buttons') {
        state.menuHintMode = next.menuHintMode;
      }
      if (next.effectIntensity === 'low' || next.effectIntensity === 'medium' || next.effectIntensity === 'high') {
        state.effectIntensity = next.effectIntensity;
      }
      if (typeof next.soundEnabled === 'boolean') {
        state.soundEnabled = next.soundEnabled;
      }
      if (
        next.soundTheme === 'vibe'
        || next.soundTheme === 'default'
        || next.soundTheme === 'anime'
        || next.soundTheme === 'arcade'
        || next.soundTheme === 'cinema'
        || next.soundTheme === 'newspaper'
        || next.soundTheme === 'cyberwitch'
        || next.soundTheme === 'fantasy'
        || next.soundTheme === 'scifi'
      ) {
        state.soundTheme = next.soundTheme;
      }
      if (next.colorMode === 'system' || next.colorMode === 'dark' || next.colorMode === 'light') {
        state.colorMode = next.colorMode;
      }
      if (typeof next.vibe === 'string' && isVibe(next.vibe)) state.vibe = next.vibe;
      if (state.performanceMode) {
        state.soundEnabled = false;
      }
    },
    hydrateUiSettings(state, action: PayloadAction<Partial<Pick<UiState, 'language' | 'colorMode' | 'menuCollapsed' | 'controlsCollapsed' | 'searchVisible' | 'addStreamVisible' | 'allColumnControlsHidden' | 'showFilteredColumn' | 'showEmergingColumn' | 'hideAllResearch' | 'hideAllSummaries' | 'storiesPerColumn' | 'notifyEnabled' | 'notifyMode' | 'moodFilter' | 'typeFilter' | 'aiProvider' | 'summaryLang' | 'researchLang' | 'titleDisplayLanguage' | 'insightFeatures' | 'localImpactRegion' | 'trackedTopics' | 'summaryModel' | 'researchModel' | 'askModel' | 'localLlmBaseUrl' | 'allBudget' | 'keywords' | 'dailyBriefingDelivery' | 'dailyBriefingEmail' | 'dailyBriefingFormat' | 'dailyBriefingAudio' | 'dailyBriefingFeedUrls' | 'font' | 'fontSize' | 'scheme' | 'timezone' | 'dateFormat' | 'showNewsCovers' | 'performanceMode' | 'buttonMode' | 'menuHintMode' | 'effectIntensity' | 'soundEnabled' | 'soundTheme' | 'vibe'>>>) {
      const next = action.payload;
      if (next.language === 'en' || next.language === 'bg') state.language = next.language;
      if (next.colorMode === 'system' || next.colorMode === 'dark' || next.colorMode === 'light') state.colorMode = next.colorMode;
      if (typeof next.menuCollapsed === 'boolean') state.menuCollapsed = next.menuCollapsed;
      if (typeof next.controlsCollapsed === 'boolean') state.controlsCollapsed = next.controlsCollapsed;
      if (typeof next.searchVisible === 'boolean') state.searchVisible = next.searchVisible;
      if (typeof next.addStreamVisible === 'boolean') state.addStreamVisible = next.addStreamVisible;
      if (typeof next.allColumnControlsHidden === 'boolean') state.allColumnControlsHidden = next.allColumnControlsHidden;
      if (typeof next.showFilteredColumn === 'boolean') state.showFilteredColumn = next.showFilteredColumn;
      if (typeof next.showEmergingColumn === 'boolean') state.showEmergingColumn = next.showEmergingColumn;
      if (typeof next.storiesPerColumn !== 'undefined') state.storiesPerColumn = normalizeStoriesPerColumn(next.storiesPerColumn, state.storiesPerColumn);
      if (typeof next.notifyEnabled === 'boolean') state.notifyEnabled = next.notifyEnabled;
      if (next.notifyMode === 'matched' || next.notifyMode === 'matched_pinned' || next.notifyMode === 'pinned' || next.notifyMode === 'all') state.notifyMode = next.notifyMode;
      if (isMoodFilter(next.moodFilter)) state.moodFilter = next.moodFilter;
      if (isTypeFilter(next.typeFilter)) state.typeFilter = next.typeFilter;
      if (next.aiProvider === 'openai' || next.aiProvider === 'claude' || next.aiProvider === 'openrouter' || next.aiProvider === 'local') state.aiProvider = next.aiProvider;
      if (next.summaryLang === 'bg' || next.summaryLang === 'en' || next.summaryLang === 'bilingual') state.summaryLang = next.summaryLang;
      if (next.researchLang === 'bg' || next.researchLang === 'en') state.researchLang = next.researchLang;
      if (next.titleDisplayLanguage === 'original' || next.titleDisplayLanguage === 'bg' || next.titleDisplayLanguage === 'en') {
        state.titleDisplayLanguage = next.titleDisplayLanguage;
      }
      if (next.insightFeatures && typeof next.insightFeatures === 'object') {
        state.insightFeatures = normalizeInsightFeatures(next.insightFeatures, state.insightFeatures);
      }
      if (typeof next.localImpactRegion === 'string') {
        state.localImpactRegion = next.localImpactRegion.trim().slice(0, 120);
      }
      if (Array.isArray(next.trackedTopics)) {
        state.trackedTopics = dedupeTrimmedList(next.trackedTopics, 80);
      }
      if (typeof next.summaryModel === 'string' && next.summaryModel.trim()) state.summaryModel = next.summaryModel.trim().slice(0, 120);
      if (typeof next.researchModel === 'string' && next.researchModel.trim()) state.researchModel = next.researchModel.trim().slice(0, 120);
      if (typeof next.askModel === 'string' && next.askModel.trim()) state.askModel = next.askModel.trim().slice(0, 120);
      if (typeof next.localLlmBaseUrl === 'string') {
        state.localLlmBaseUrl = next.localLlmBaseUrl.trim().slice(0, 500);
      }
      if (next.allBudget === 'mixed' || next.allBudget === 'low' || next.allBudget === 'standard' || next.allBudget === 'high') {
        state.allBudget = next.allBudget;
      }
      if (Array.isArray(next.keywords)) {
        state.keywords = dedupeKeywords(next.keywords);
      }
      if (next.dailyBriefingDelivery === 'site' || next.dailyBriefingDelivery === 'email') {
        state.dailyBriefingDelivery = next.dailyBriefingDelivery;
      }
      if (typeof next.dailyBriefingEmail === 'string') {
        state.dailyBriefingEmail = next.dailyBriefingEmail.trim().slice(0, 200);
      }
      if (next.dailyBriefingFormat === 'executive' || next.dailyBriefingFormat === 'bullets' || next.dailyBriefingFormat === 'narrative') {
        state.dailyBriefingFormat = next.dailyBriefingFormat;
      }
      if (typeof next.dailyBriefingAudio === 'boolean') {
        state.dailyBriefingAudio = next.dailyBriefingAudio;
      }
      if (Array.isArray(next.dailyBriefingFeedUrls)) {
        state.dailyBriefingFeedUrls = dedupeTrimmedList(next.dailyBriefingFeedUrls, 80);
      }
      if (next.font === 'system' || next.font === 'manrope' || next.font === 'grotesk' || next.font === 'sora' || next.font === 'plex' || next.font === 'serif' || next.font === 'mono') state.font = next.font;
      if (next.fontSize === 'sm' || next.fontSize === 'md' || next.fontSize === 'lg' || next.fontSize === 'xl') state.fontSize = next.fontSize;
      if (next.scheme === 'classic' || next.scheme === 'vivid' || next.scheme === 'sunset' || next.scheme === 'neon' || next.scheme === 'ocean' || next.scheme === 'forest') state.scheme = next.scheme;
      if (typeof next.timezone === 'string' && isTimezone(next.timezone)) state.timezone = next.timezone;
      if (next.dateFormat === 'ddmmyy' || next.dateFormat === 'mmddyy' || next.dateFormat === 'yyyymmdd') state.dateFormat = next.dateFormat;
      if (typeof next.showNewsCovers === 'boolean') state.showNewsCovers = next.showNewsCovers;
      if (typeof next.performanceMode === 'boolean') state.performanceMode = next.performanceMode;
      if (state.performanceMode) {
        state.moodFilter = NewsMoodFilterValue.All;
        state.typeFilter = NewsTypeFilterValue.All;
        state.soundEnabled = false;
      }
      if (next.buttonMode === 'icons' || next.buttonMode === 'text') state.buttonMode = next.buttonMode;
      if (next.menuHintMode === 'text' || next.menuHintMode === 'buttons') state.menuHintMode = next.menuHintMode;
      if (next.effectIntensity === 'low' || next.effectIntensity === 'medium' || next.effectIntensity === 'high') state.effectIntensity = next.effectIntensity;
      if (typeof next.soundEnabled === 'boolean') state.soundEnabled = next.soundEnabled;
      if (
        next.soundTheme === 'vibe'
        || next.soundTheme === 'default'
        || next.soundTheme === 'anime'
        || next.soundTheme === 'arcade'
        || next.soundTheme === 'cinema'
        || next.soundTheme === 'newspaper'
        || next.soundTheme === 'cyberwitch'
        || next.soundTheme === 'fantasy'
        || next.soundTheme === 'scifi'
      ) state.soundTheme = next.soundTheme;
      if (state.performanceMode) {
        state.soundEnabled = false;
      }
      if (typeof next.vibe === 'string' && isVibe(next.vibe)) state.vibe = next.vibe;
    },
    enqueueToast(state, action: PayloadAction<{ kind: UiToastKind; message: string }>) {
      const message = String(action.payload.message || '').trim();
      if (!message) return;
      const createdAt = Date.now();
      const id = `${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
      const nextToast = { id, kind: action.payload.kind, message, createdAt, count: 1 };
      const existingToastIndex = state.toasts.findIndex(t => t.kind === nextToast.kind && t.message === nextToast.message);
      if (existingToastIndex >= 0) {
        const existingToast = state.toasts[existingToastIndex];
        state.toasts.splice(existingToastIndex, 1);
        state.toasts.push({
          ...existingToast,
          createdAt,
          count: (existingToast.count ?? 1) + 1
        });
      } else {
        state.toasts.push(nextToast);
      }
      if (state.toasts.length > MAX_ACTIVE_TOASTS) {
        state.toasts.splice(0, state.toasts.length - MAX_ACTIVE_TOASTS);
      }
      state.notificationInbox.push({ ...nextToast });
      if (state.notificationInbox.length > MAX_NOTIFICATION_HISTORY) {
        state.notificationInbox.splice(0, state.notificationInbox.length - MAX_NOTIFICATION_HISTORY);
      }
    },
    dismissToast(state, action: PayloadAction<string>) {
      const id = String(action.payload || '');
      if (!id) return;
      state.toasts = state.toasts.filter(t => t.id !== id);
    },
    dismissNotification(state, action: PayloadAction<string>) {
      const id = String(action.payload || '');
      if (!id) return;
      state.notificationInbox = state.notificationInbox.filter(t => t.id !== id);
      state.toasts = state.toasts.filter(t => t.id !== id);
    },
    dismissAllNotifications(state) {
      state.notificationInbox = [];
      state.toasts = [];
    }
  }
});

export const {
  setLanguage,
  setColorMode,
  setSearchQuery,
  setTopUiState,
  triggerHideAllResearch,
  setHideAllResearch,
  setHideAllSummaries,
  setStoriesPerColumn,
  triggerShowMoreNewsAll,
  triggerResetNewsShownAll,
  setHelpOpen,
  setNotifySettings,
  setAiSettings,
  setTitleDisplayLanguage,
  setKeywords,
  setMoodFilter,
  setTypeFilter,
  setAppearanceSettings,
  hydrateUiSettings,
  enqueueToast,
  dismissToast,
  dismissNotification,
  dismissAllNotifications
} = uiSlice.actions;
export default uiSlice.reducer;
