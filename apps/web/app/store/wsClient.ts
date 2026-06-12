'use client';

import type { AppDispatch } from './store';
import type {
  AiInsightFeatureSettings,
  BudgetMode,
  DailyBriefingResult,
  EmergingStorySignal,
  FeedInfo,
  NewsInsights,
  NewsItem,
  SortMode
} from './types';
import { FILTERED_FEED_URL } from './constants';
import {
  AiProviderValue,
  BudgetModeValue,
  FeedKindValue,
  isAiProvider,
  isBoolean,
  isBudgetMode,
  isFeedKind,
  isNewsMood,
  isNewsType,
  isNumber,
  isRecord,
  isResearchLang,
  isSortMode,
  isString,
  isSummaryLang,
  ResearchLangValue,
  SortModeValue,
  SummaryLangValue,
  WsMessageType
} from './valueEnums';
import { setStatus } from './slices/connectionSlice';
import { setFeeds } from './slices/feedsSlice';
import { receiveAskReply, receiveFeedPage, resetNewsState, setFeedPageError, setHiddenIds, upsertNewsBatch } from './slices/newsSlice';
import { setUsage } from './slices/aiUsageSlice';
import { enqueueToast, setAiSettings, setKeywords } from './slices/uiSlice';
import { failBriefing, receiveBriefing } from './slices/briefingSlice';

let ws: WebSocket | null = null;
let wsUrlCurrent = '';
let hiddenIds = new Set<string>();
let pendingNews: NewsItem[] = [];
let pendingNewsTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let shouldReconnect = false;

const NEWS_FLUSH_INTERVAL_MS = 45;
const NEWS_FLUSH_MAX_BATCH = 80;
const WS_RECONNECT_BASE_DELAY_MS = 500;
const WS_RECONNECT_MAX_DELAY_MS = 10_000;
const WS_RECONNECT_JITTER_MS = 350;
const DEFAULT_AI_FEATURES: AiInsightFeatureSettings = {
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

type FeedSettingsWire = {
  summaryEnabled?: unknown;
  translationEnabled?: unknown;
  researchEnabled?: unknown;
  budget?: unknown;
  sortMode?: unknown;
  filters?: unknown;
};

type AiModelOptionsWire = {
  summary?: unknown;
  research?: unknown;
  ask?: unknown;
};

type AiModelOptions = {
  summary: string[];
  research: string[];
  ask: string[];
};

type AiModelsByProvider = {
  openai: AiModelOptions;
  claude: AiModelOptions;
  openrouter: AiModelOptions;
  local: AiModelOptions;
};
type AiUsageKind = 'summary' | 'research' | 'ask';
type AiUsageKindStats = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};
type AiUsageRecentEntry = {
  id: string;
  kind: AiUsageKind;
  model: string;
  label: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  createdAt: number;
};
type WsAckEvent = {
  kind: 'ok' | 'error';
  message: string;
};

const wsAckListeners = new Set<(event: WsAckEvent) => void>();

function emitWsAck(event: WsAckEvent) {
  wsAckListeners.forEach(listener => {
    try {
      listener(event);
    } catch {}
  });
}

function parseModelList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isString(item)) continue;
    const model = item.trim();
    if (!model || seen.has(model)) continue;
    seen.add(model);
    out.push(model);
  }
  return out;
}

function parseKeywordList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isString(item)) continue;
    const value = item.trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function parseTrimmedList(raw: unknown, max = 80): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isString(item)) continue;
    const value = item.trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function parseAiUsageKind(raw: unknown): AiUsageKind | undefined {
  return raw === 'summary' || raw === 'research' || raw === 'ask' ? raw : undefined;
}

function emptyAiUsageByKind(): Record<AiUsageKind, AiUsageKindStats> {
  return {
    summary: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    research: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    ask: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  };
}

function parseAiUsageKindStats(raw: unknown): AiUsageKindStats {
  if (!isRecord(raw)) return { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  const src = raw as Record<string, unknown>;
  return {
    requests: isNumber(src.requests) ? src.requests : 0,
    inputTokens: isNumber(src.inputTokens) ? src.inputTokens : 0,
    outputTokens: isNumber(src.outputTokens) ? src.outputTokens : 0,
    totalTokens: isNumber(src.totalTokens) ? src.totalTokens : 0
  };
}

function parseAiUsageByKind(raw: unknown): Record<AiUsageKind, AiUsageKindStats> {
  if (!isRecord(raw)) return emptyAiUsageByKind();
  const src = raw as Record<string, unknown>;
  return {
    summary: parseAiUsageKindStats(src.summary),
    research: parseAiUsageKindStats(src.research),
    ask: parseAiUsageKindStats(src.ask)
  };
}

function parseAiUsageRecent(raw: unknown): AiUsageRecentEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: AiUsageRecentEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const kind = parseAiUsageKind(item.kind);
    if (!kind) continue;
    out.push({
      id: isString(item.id) ? item.id : `${kind}-${out.length}`,
      kind,
      model: isString(item.model) ? item.model : 'unknown',
      label: isString(item.label) ? item.label : `${kind} request`,
      inputTokens: isNumber(item.inputTokens) ? item.inputTokens : 0,
      outputTokens: isNumber(item.outputTokens) ? item.outputTokens : 0,
      totalTokens: isNumber(item.totalTokens) ? item.totalTokens : 0,
      createdAt: isNumber(item.createdAt) ? item.createdAt : 0
    });
    if (out.length >= 80) break;
  }
  return out;
}

function parseAiFeatureSettings(raw: unknown): AiInsightFeatureSettings | undefined {
  if (!isRecord(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  return {
    biasDetection: isBoolean(src.biasDetection) ? src.biasDetection : DEFAULT_AI_FEATURES.biasDetection,
    sensationalismDetection: isBoolean(src.sensationalismDetection) ? src.sensationalismDetection : DEFAULT_AI_FEATURES.sensationalismDetection,
    factHighlights: isBoolean(src.factHighlights) ? src.factHighlights : DEFAULT_AI_FEATURES.factHighlights,
    storyImpact: false,
    dailyBriefing: isBoolean(src.dailyBriefing) ? src.dailyBriefing : DEFAULT_AI_FEATURES.dailyBriefing,
    topicTracking: isBoolean(src.topicTracking) ? src.topicTracking : DEFAULT_AI_FEATURES.topicTracking,
    perspectiveSimulator: false,
    emergingStoryDetector: isBoolean(src.emergingStoryDetector) ? src.emergingStoryDetector : DEFAULT_AI_FEATURES.emergingStoryDetector,
    historicalComparison: false,
    futureScenarioGenerator: false,
    localImpactDetector: false
  };
}

function parseInsights(raw: unknown): NewsInsights | undefined {
  if (!isRecord(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const insights: NewsInsights = {};

  if (isRecord(src.bias)) {
    const bias = src.bias as Record<string, unknown>;
    insights.bias = {
      detected: !!bias.detected,
      leaning: isString(bias.leaning) ? bias.leaning : '',
      emotionalTone: isString(bias.emotionalTone) ? bias.emotionalTone : '',
      framing: isString(bias.framing) ? bias.framing : '',
      confidence: bias.confidence === 'low' || bias.confidence === 'medium' || bias.confidence === 'high' ? bias.confidence : 'medium',
      severity: bias.severity === 'low' || bias.severity === 'medium' || bias.severity === 'high' ? bias.severity : 'medium',
      summary: isString(bias.summary) ? bias.summary : ''
    };
  }

  if (isRecord(src.sensationalism)) {
    const sensationalism = src.sensationalism as Record<string, unknown>;
    insights.sensationalism = {
      detected: !!sensationalism.detected,
      level: sensationalism.level === 'low' || sensationalism.level === 'medium' || sensationalism.level === 'high' ? sensationalism.level : 'medium',
      reasons: parseTrimmedList(sensationalism.reasons, 12),
      alternativeHeadline: isString(sensationalism.alternativeHeadline) ? sensationalism.alternativeHeadline : undefined,
      summary: isString(sensationalism.summary) ? sensationalism.summary : ''
    };
  }

  if (isRecord(src.facts)) {
    const facts = src.facts as Record<string, unknown>;
    insights.facts = {
      people: parseTrimmedList(facts.people, 12),
      locations: parseTrimmedList(facts.locations, 12),
      dates: parseTrimmedList(facts.dates, 12),
      numbers: parseTrimmedList(facts.numbers, 12),
      quotes: parseTrimmedList(facts.quotes, 12)
    };
  }

  return Object.keys(insights).length ? insights : undefined;
}

function parseEmergingSignal(raw: unknown): EmergingStorySignal | undefined {
  if (!isRecord(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  return {
    clusterSize: isNumber(src.clusterSize) ? Math.max(0, Math.floor(src.clusterSize)) : 0,
    sources: parseTrimmedList(src.sources, 12),
    velocity: src.velocity === 'watch' || src.velocity === 'rising' || src.velocity === 'viral' ? src.velocity : 'watch',
    reason: isString(src.reason) ? src.reason : ''
  };
}

function parseAvailableModels(raw: unknown): AiModelsByProvider | undefined {
  if (!isRecord(raw)) return undefined;
  const modelMap = raw as {
    openai?: AiModelOptionsWire;
    claude?: AiModelOptionsWire;
    openrouter?: AiModelOptionsWire;
    local?: AiModelOptionsWire;
  };
  return {
    openai: isRecord(modelMap.openai)
      ? {
        summary: parseModelList(modelMap.openai.summary),
        research: parseModelList(modelMap.openai.research),
        ask: parseModelList(modelMap.openai.ask)
      }
      : { summary: [], research: [], ask: [] },
    claude: isRecord(modelMap.claude)
      ? {
        summary: parseModelList(modelMap.claude.summary),
        research: parseModelList(modelMap.claude.research),
        ask: parseModelList(modelMap.claude.ask)
      }
      : { summary: [], research: [], ask: [] },
    openrouter: isRecord(modelMap.openrouter)
      ? {
        summary: parseModelList(modelMap.openrouter.summary),
        research: parseModelList(modelMap.openrouter.research),
        ask: parseModelList(modelMap.openrouter.ask)
      }
      : { summary: [], research: [], ask: [] },
    local: isRecord(modelMap.local)
      ? {
        summary: parseModelList(modelMap.local.summary),
        research: parseModelList(modelMap.local.research),
        ask: parseModelList(modelMap.local.ask)
      }
      : { summary: [], research: [], ask: [] }
  };
}

function parseFeedInfos(v: unknown, feedSettingsRaw: unknown): FeedInfo[] {
  if (!Array.isArray(v)) return [];
  const feedSettings = isRecord(feedSettingsRaw)
    ? (feedSettingsRaw as Record<string, FeedSettingsWire>)
    : {};
  const out: FeedInfo[] = [];
  for (const x of v) {
    if (!isRecord(x)) continue;
    const m = x as Record<string, unknown>;
    const url = isString(m.url) ? m.url : '';
    if (!url || url === FILTERED_FEED_URL) continue;

    const rawSettings = isRecord(feedSettings[url])
      ? feedSettings[url]
      : {};
    const budget = isBudgetMode(rawSettings.budget)
      ? rawSettings.budget as BudgetMode
      : BudgetModeValue.Standard;
    const sortMode = isSortMode(rawSettings.sortMode)
      ? rawSettings.sortMode as SortMode
      : SortModeValue.Newest;
    const filtersRaw = isRecord(rawSettings.filters)
      ? rawSettings.filters as Record<string, unknown>
      : {};

    out.push({
      url,
      label: isString(m.label) && m.label.trim() ? m.label : url,
      kind: isFeedKind(m.kind) && m.kind !== FeedKindValue.Rss ? m.kind : FeedKindValue.Rss,
      intervalSec: isNumber(m.intervalSec) ? m.intervalSec : 120,
      summaryEnabled: isBoolean(rawSettings.summaryEnabled) ? rawSettings.summaryEnabled : false,
      translationEnabled: isBoolean(rawSettings.translationEnabled) ? rawSettings.translationEnabled : true,
      researchEnabled: isBoolean(rawSettings.researchEnabled) ? rawSettings.researchEnabled : false,
      budget,
      sortMode,
      filters: {
        onlyMatches: !!filtersRaw.onlyMatches,
        onlyResearched: !!filtersRaw.onlyResearched,
        onlySummaries: !!filtersRaw.onlySummaries
      }
    });
  }

  const filteredSettings = isRecord(feedSettings[FILTERED_FEED_URL])
    ? feedSettings[FILTERED_FEED_URL]
    : null;
  if (filteredSettings && !out.some(f => f.url === FILTERED_FEED_URL)) {
    const budget = isBudgetMode(filteredSettings.budget)
      ? filteredSettings.budget as BudgetMode
      : BudgetModeValue.Standard;
    const sortMode = isSortMode(filteredSettings.sortMode)
      ? filteredSettings.sortMode as SortMode
      : SortModeValue.Newest;
    const filtersRaw = isRecord(filteredSettings.filters)
      ? filteredSettings.filters as Record<string, unknown>
      : {};
    out.unshift({
      url: FILTERED_FEED_URL,
      label: 'Filtered',
      kind: FeedKindValue.Rss,
      intervalSec: 0,
      summaryEnabled: isBoolean(filteredSettings.summaryEnabled) ? filteredSettings.summaryEnabled : false,
      translationEnabled: isBoolean(filteredSettings.translationEnabled) ? filteredSettings.translationEnabled : true,
      researchEnabled: isBoolean(filteredSettings.researchEnabled) ? filteredSettings.researchEnabled : false,
      budget,
      sortMode,
      filters: {
        onlyMatches: isBoolean(filtersRaw.onlyMatches) ? !!filtersRaw.onlyMatches : true,
        onlyResearched: !!filtersRaw.onlyResearched,
        onlySummaries: !!filtersRaw.onlySummaries
      }
    });
  }

  return out;
}

function deriveAllBudget(feeds: FeedInfo[]): 'mixed' | 'low' | 'standard' | 'high' {
  if (!feeds.length) return 'standard';
  const first = feeds[0].budget;
  for (const f of feeds) {
    if (f.budget !== first) return 'mixed';
  }
  return first;
}

function parseNews(v: unknown): NewsItem | null {
  if (!isRecord(v)) return null;
  const m = v as Record<string, unknown>;
  if (m.type !== WsMessageType.News) return null;
  const id = isString(m.id) ? m.id : '';
  const title = isString(m.title) ? m.title : '';
  const feedUrl = isString(m.feedUrl) ? m.feedUrl : '';
  if (!id || !title || !feedUrl) return null;
  const mood = isNewsMood(m.mood)
    ? m.mood
    : undefined;
  const newsType = isNewsType(m.newsType)
    ? m.newsType
    : undefined;
  return {
    id,
    title,
    titleBg: isString(m.titleBg) ? m.titleBg : '',
    titleEn: isString(m.titleEn) ? m.titleEn : '',
    originFeedUrl: isString(m.originFeedUrl) ? m.originFeedUrl : undefined,
    coverUrl: isString(m.coverUrl) ? m.coverUrl : '',
    source: isString(m.source) ? m.source : '',
    link: isString(m.link) && m.link ? m.link : '#',
    feedUrl,
    publishedMs: isNumber(m.publishedMs) ? m.publishedMs : Date.now(),
    isMatch: !!m.isMatch,
    summary: isString(m.summary) ? m.summary : '',
    summaryEligible: isBoolean(m.summaryEligible) ? m.summaryEligible : undefined,
    summaryPending: isBoolean(m.summaryPending) ? m.summaryPending : undefined,
    research: isString(m.research) ? m.research : '',
    researchPending: isBoolean(m.researchPending) ? m.researchPending : undefined,
    insightStatus: m.insightStatus === 'pending' || m.insightStatus === 'ready' || m.insightStatus === 'empty' ? m.insightStatus : undefined,
    insights: parseInsights(m.insights),
    topicHits: parseTrimmedList(m.topicHits, 20),
    emergingSignal: parseEmergingSignal(m.emergingSignal),
    mood,
    newsType,
    filteredOk: isBoolean(m.filteredOk) ? m.filteredOk : true
  };
}

function parseFeedPageMessage(raw: Record<string, unknown>) {
  if (raw.type !== WsMessageType.FeedPage) return null;
  const feedUrl = isString(raw.feedUrl) ? raw.feedUrl.trim() : '';
  if (!feedUrl) return null;
  const items = Array.isArray(raw.items)
    ? raw.items.map(item => parseNews(item)).filter((item): item is NewsItem => !!item)
    : [];
  const cursorRaw = isRecord(raw.nextCursor) ? raw.nextCursor : null;
  const cursor = cursorRaw
    && isNumber(cursorRaw.beforePublishedMs)
    && isString(cursorRaw.beforeId)
      ? {
          beforePublishedMs: cursorRaw.beforePublishedMs,
          beforeId: cursorRaw.beforeId
        }
      : undefined;
  return {
    feedUrl,
    items,
    hasMore: !!raw.hasMore,
    nextCursor: cursor,
    replace: !!raw.replace
  };
}

function parseFeedErrorMessage(raw: Record<string, unknown>) {
  if (raw.type !== WsMessageType.FeedError) return null;
  const feedUrl = isString(raw.feedUrl) ? raw.feedUrl.trim() : '';
  if (!feedUrl) return null;
  return {
    feedUrl,
    feedLabel: isString(raw.feedLabel) ? raw.feedLabel.trim() : '',
    error: isString(raw.error) ? raw.error.trim() : '',
    disabledUntilMs: isNumber(raw.disabledUntilMs) ? raw.disabledUntilMs : undefined,
    failCount: isNumber(raw.failCount) ? raw.failCount : undefined
  };
}

function resolveWsUrl(explicitUrl: string): string {
  if (explicitUrl && explicitUrl.trim()) return explicitUrl.trim();
  if (typeof window !== 'undefined') {
    const globalUrl = (window as unknown as { __AI_NEWS_WS_URL?: string }).__AI_NEWS_WS_URL;
    if (globalUrl && globalUrl.trim()) return globalUrl.trim();
    return `${window.location.protocol === 'https:' ? 'wss://' : 'ws://'}${window.location.host}`;
  }
  return 'ws://localhost:4000';
}

function flushPendingNews(dispatch: AppDispatch) {
  if (!pendingNews.length) return;
  const batch = pendingNews;
  pendingNews = [];
  dispatch(upsertNewsBatch(batch));
}

function schedulePendingNewsFlush(dispatch: AppDispatch) {
  if (pendingNewsTimer) return;
  pendingNewsTimer = setTimeout(() => {
    pendingNewsTimer = null;
    flushPendingNews(dispatch);
  }, NEWS_FLUSH_INTERVAL_MS);
}

function resetPendingNews() {
  pendingNews = [];
  if (pendingNewsTimer) {
    clearTimeout(pendingNewsTimer);
    pendingNewsTimer = null;
  }
}

function clearReconnectTimer() {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function nextReconnectDelayMs() {
  const exponential = Math.min(
    WS_RECONNECT_MAX_DELAY_MS,
    WS_RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempt)
  );
  const jitter = Math.floor(Math.random() * WS_RECONNECT_JITTER_MS);
  reconnectAttempt = Math.min(reconnectAttempt + 1, 8);
  return exponential + jitter;
}

function scheduleReconnect(dispatch: AppDispatch) {
  if (!shouldReconnect || reconnectTimer || !wsUrlCurrent) return;
  const delayMs = nextReconnectDelayMs();
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!shouldReconnect || !wsUrlCurrent) return;
    openWsConnection(dispatch, wsUrlCurrent, true);
  }, delayMs);
}

function openWsConnection(dispatch: AppDispatch, nextUrl: string, isReconnect: boolean) {
  resetPendingNews();
  if (ws && wsUrlCurrent === nextUrl && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  if (ws) {
    try { ws.close(); } catch {}
  }

  if (!isReconnect) {
    reconnectAttempt = 0;
  }
  wsUrlCurrent = nextUrl;
  dispatch(resetNewsState());
  const socket = new WebSocket(nextUrl);
  ws = socket;
  dispatch(setStatus('connecting'));

  socket.onopen = () => {
    if (ws !== socket) return;
    clearReconnectTimer();
    reconnectAttempt = 0;
    dispatch(setStatus('connected'));
  };

  socket.onclose = () => {
    if (ws !== socket) return;
    ws = null;
    resetPendingNews();
    dispatch(setStatus('disconnected'));
    scheduleReconnect(dispatch);
  };

  socket.onerror = () => {
    if (ws !== socket) return;
    resetPendingNews();
    dispatch(setStatus('error'));
    scheduleReconnect(dispatch);
  };

  socket.onmessage = (event: MessageEvent<string>) => {
    let raw: unknown;
    try {
      raw = JSON.parse(String(event.data || ''));
    } catch {
      return;
    }
    if (!isRecord(raw)) return;
    const msg = raw as Record<string, unknown>;

    if (msg.type === WsMessageType.Config) {
      const parsedFeeds = parseFeedInfos(msg.feeds, msg.feedSettings);
      const parsedModels = parseAvailableModels(msg.availableModels);
      const parsedKeywords = parseKeywordList(msg.keywords);
      dispatch(setFeeds(parsedFeeds));
      dispatch(setKeywords(parsedKeywords));
      dispatch(setAiSettings({
        aiAvailable: !!msg.aiAvailable,
        aiEnabled: !!msg.aiEnabled,
        aiProvider: isAiProvider(msg.aiProvider)
          ? msg.aiProvider
          : AiProviderValue.OpenAI,
        summaryLang: isSummaryLang(msg.summaryLang)
          ? msg.summaryLang
          : SummaryLangValue.Bilingual,
        researchLang: isResearchLang(msg.researchLang)
          ? msg.researchLang
          : ResearchLangValue.Bg,
        summaryModel: isString(msg.summaryModel) ? msg.summaryModel : undefined,
        researchModel: isString(msg.researchModel) ? msg.researchModel : undefined,
        askModel: isString(msg.askModel) ? msg.askModel : undefined,
        availableModels: parsedModels,
        allBudget: deriveAllBudget(parsedFeeds),
        insightFeatures: parseAiFeatureSettings(msg.aiFeatures),
        localImpactRegion: isString(msg.localRegion) ? msg.localRegion : undefined,
        trackedTopics: parseTrimmedList(msg.trackedTopics, 80),
        localLlmBaseUrl: isString(msg.localLlmBaseUrl) ? msg.localLlmBaseUrl : undefined
      }));

      const hidden: string[] = [];
      if (Array.isArray(msg.hiddenIds)) {
        for (const id of msg.hiddenIds) {
          if (isString(id) && id) hidden.push(id);
        }
      }
      hiddenIds = new Set(hidden);
      dispatch(setHiddenIds(hidden));

      dispatch(setUsage({
        inputTokens: isNumber(msg.aiUsageInputTokens) ? msg.aiUsageInputTokens : 0,
        outputTokens: isNumber(msg.aiUsageOutputTokens) ? msg.aiUsageOutputTokens : 0,
        totalTokens: isNumber(msg.aiUsageTotalTokens) ? msg.aiUsageTotalTokens : 0,
        runtimeStartedAt: isNumber(msg.aiUsageRuntimeStartedAt) ? msg.aiUsageRuntimeStartedAt : 0,
        byKind: parseAiUsageByKind(msg.aiUsageByKind),
        recent: parseAiUsageRecent(msg.aiUsageRecent)
      }));
      return;
    }

    const page = parseFeedPageMessage(msg);
    if (page) {
      dispatch(receiveFeedPage(page));
      return;
    }

    if (msg.type === WsMessageType.AiUsage) {
      dispatch(setUsage({
        inputTokens: isNumber(msg.inputTokens) ? msg.inputTokens : 0,
        outputTokens: isNumber(msg.outputTokens) ? msg.outputTokens : 0,
        totalTokens: isNumber(msg.totalTokens) ? msg.totalTokens : 0,
        runtimeStartedAt: isNumber(msg.runtimeStartedAt) ? msg.runtimeStartedAt : 0,
        byKind: parseAiUsageByKind(msg.byKind),
        recent: parseAiUsageRecent(msg.recent)
      }));
      return;
    }

    if (msg.type === WsMessageType.AskAgentReply) {
      const id = isString(msg.id) ? msg.id : '';
      const feedUrl = isString(msg.feedUrl) ? msg.feedUrl : '';
      if (!id || !feedUrl) return;
      dispatch(receiveAskReply({
        id,
        feedUrl,
        question: isString(msg.question) ? msg.question : '',
        answer: isString(msg.answer) ? msg.answer : undefined,
        error: isString(msg.error) ? msg.error : undefined,
        used: isNumber(msg.used) ? msg.used : undefined,
        remaining: isNumber(msg.remaining) ? msg.remaining : undefined
      }));
      return;
    }

    if (msg.type === WsMessageType.DailyBriefing) {
      const briefing: DailyBriefingResult = {
        title: isString(msg.title) ? msg.title : 'Daily briefing',
        body: isString(msg.body) ? msg.body : '',
        audioScript: isString(msg.audioScript) ? msg.audioScript : '',
        generatedAtMs: isNumber(msg.generatedAtMs) ? msg.generatedAtMs : Date.now(),
        itemCount: isNumber(msg.itemCount) ? msg.itemCount : 0,
        delivery: msg.delivery === 'email' ? 'email' : 'site',
        email: isString(msg.email) ? msg.email : undefined,
        format: msg.format === 'bullets' || msg.format === 'narrative' ? msg.format : 'executive',
        feedUrls: parseTrimmedList(msg.feedUrls, 80)
      };
      dispatch(receiveBriefing(briefing));
      return;
    }

    if (msg.type === WsMessageType.Error) {
      const message = isString(msg.message) ? msg.message : 'Server error';
      emitWsAck({ kind: 'error', message });
      if (message.toLocaleLowerCase().includes('briefing')) {
        dispatch(failBriefing(message));
      }
      dispatch(enqueueToast({
        kind: 'error',
        message
      }));
      return;
    }

    if (msg.type === WsMessageType.Ok) {
      const message = isString(msg.message) ? msg.message : 'Done';
      emitWsAck({ kind: 'ok', message });
      dispatch(enqueueToast({
        kind: 'success',
        message
      }));
      return;
    }

    if (msg.type === WsMessageType.FeedError) {
      const error = parseFeedErrorMessage(msg);
      const label = error?.feedLabel || (isString(msg.feedUrl) ? msg.feedUrl : 'feed');
      const reason = error?.error || 'poll failed';
      if (error?.feedUrl) {
        dispatch(setFeedPageError({
          feedUrl: error.feedUrl,
          error: reason,
          disabledUntilMs: error.disabledUntilMs,
          failCount: error.failCount
        }));
      }
      dispatch(enqueueToast({
        kind: 'error',
        message: `${label}: ${reason}`
      }));
      return;
    }

    const news = parseNews(msg);
    if (!news) return;
    if (hiddenIds.has(news.id)) return;
    pendingNews.push(news);
    if (pendingNews.length >= NEWS_FLUSH_MAX_BATCH) {
      if (pendingNewsTimer) {
        clearTimeout(pendingNewsTimer);
        pendingNewsTimer = null;
      }
      flushPendingNews(dispatch);
      return;
    }
    schedulePendingNewsFlush(dispatch);
  };
}

export function startWsConnection(dispatch: AppDispatch, explicitUrl: string) {
  shouldReconnect = true;
  clearReconnectTimer();
  const nextUrl = resolveWsUrl(explicitUrl);
  openWsConnection(dispatch, nextUrl, false);
}

export function stopWsConnection() {
  shouldReconnect = false;
  reconnectAttempt = 0;
  clearReconnectTimer();
  resetPendingNews();
  if (!ws) {
    wsUrlCurrent = '';
    return;
  }
  const socket = ws;
  ws = null;
  wsUrlCurrent = '';
  try { socket.close(); } catch {}
}

export function subscribeWsAcks(listener: (event: WsAckEvent) => void) {
  wsAckListeners.add(listener);
  return () => {
    wsAckListeners.delete(listener);
  };
}

export function sendWsMessage(payload: unknown): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(payload));
  return true;
}

export function requestFeedPage(
  feedUrl: string,
  limit: number,
  cursor?: { beforePublishedMs: number; beforeId: string },
  replace = false
): boolean {
  return sendWsMessage({
    type: 'load_feed_page',
    feedUrl,
    limit,
    ...(cursor ? { cursor } : {}),
    ...(replace ? { replace: true } : {})
  });
}
