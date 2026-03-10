import express from 'express';
import Parser from 'rss-parser';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { aiProviderSchema, clientMsgSchema, type ClientMsg } from '@ai-news/shared';
import { z } from 'zod';

function bootstrapEnv() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), '..', '..', '.env'),
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
    path.resolve(__dirname, '..', '..', '..', '.env')
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }

  if (!process.env.DATABASE_URL) {
    const prismaDirCandidates = [
      path.resolve(process.cwd(), 'prisma'),
      path.resolve(process.cwd(), 'apps', 'api', 'prisma'),
      path.resolve(__dirname, '..', 'prisma'),
      path.resolve(__dirname, '..', '..', 'apps', 'api', 'prisma')
    ];
    const prismaDir = prismaDirCandidates.find(dir => fs.existsSync(path.join(dir, 'schema.prisma')))
      || prismaDirCandidates[0];
    try {
      fs.mkdirSync(prismaDir, { recursive: true });
    } catch {}
    const sqlitePath = path.join(prismaDir, 'dev.db');
    process.env.DATABASE_URL = `file:${sqlitePath}`;
  }
}

bootstrapEnv();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

type SummaryLang = 'bg' | 'en' | 'bilingual';
type ResearchLang = 'bg' | 'en';
type AIProvider = z.infer<typeof aiProviderSchema>;

enum MoodValue {
  Pesimistic = 'pesimistic',
  Optimistic = 'optimistic',
  Realistic = 'realistic',
  Melancholy = 'melancholy',
  Happiness = 'happiness',
  Sadness = 'sadness',
  Rage = 'rage',
  Uncertainty = 'uncertainty',
  Neutral = 'neutral',
  Curios = 'curios'
}

enum NewsTypeValue {
  Science = 'science',
  Movies = 'movies',
  Politics = 'politics',
  Business = 'business',
  Technology = 'technology',
  Sports = 'sports',
  Health = 'health',
  World = 'world',
  Culture = 'culture',
  Environment = 'environment',
  Crime = 'crime',
  Education = 'education',
  Other = 'other'
}

type Mood = `${MoodValue}`;
type NewsType = `${NewsTypeValue}`;

type FeedKind = 'rss' | 'reddit' | 'youtube';

type BudgetMode = 'low' | 'standard' | 'high';

type SortMode = 'newest' | 'oldest' | 'matched';

type ColumnFilters = {
  onlyMatches: boolean;
  onlyResearched: boolean;
  onlySummaries: boolean;
};

type FeedInfo = {
  url: string;
  label: string;
  kind: FeedKind;
  intervalSec: number;
};

type FeedRuntime = {
  etag?: string;
  lastModified?: string;

  failCount: number;
  disabledUntilMs: number; // circuit breaker
  nextPollAtMs: number;

  lastFetchMs: number;
};

type FeedSettings = {
  summaryEnabled: boolean;
  researchEnabled: boolean;

  // auto-research guardrails
  budget: BudgetMode;

  // UI controls (persisted)
  sortMode: SortMode;
  filters: ColumnFilters;

  // polling
  intervalSec: number; // persisted override
  kind: FeedKind;
  label?: string;
};

type News = {
  type: 'news';
  id: string;
  title: string;
  titleBg?: string;
  titleEn?: string;
  link: string;
  source: string;
  published?: string;
  publishedMs: number;
  feedUrl: string;

  isMatch: boolean;
  matchScore: number;
  filteredOk: boolean;

  summary?: string;
  summaryPending?: boolean;
  research?: string;
  mood?: Mood;
  newsType?: NewsType;
};

type NewsInternal = News & {
  __ctx?: string;
  __linkText?: string; // extracted article text
};

type AiModelKind = 'summary' | 'research' | 'ask';
type AiModelSelection = Record<AiModelKind, string>;
type ProviderModelOptions = Record<AiModelKind, string[]>;
type ModelOptionsByProvider = Record<AIProvider, ProviderModelOptions>;

type Config = {
  type: 'config';
  keywords: string[];

  aiProvider: AIProvider;
  aiAvailable: boolean;
  aiEnabled: boolean;

  summaryLang: SummaryLang;
  researchLang: ResearchLang;
  summaryModel: string;
  researchModel: string;
  askModel: string;
  availableModels: ModelOptionsByProvider;

  matchThreshold: number;
  dedupeThreshold: number;

  filteredAiDedupe: boolean;
  filteredDedupeThreshold: number;

  feeds: FeedInfo[];
  feedSettings: Record<string, FeedSettings>; // by feedUrl
  hiddenIds: string[];
  aiUsageInputTokens: number;
  aiUsageOutputTokens: number;
  aiUsageTotalTokens: number;
};

type AskAgentReply = {
  type: 'ask_agent_reply';
  id: string;
  feedUrl: string;
  question?: string;
  answer?: string;
  error?: string;
  used: number;
  remaining: number;
};

const parser: Parser = new Parser({ timeout: 10_000 });

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-news-api' });
});

const server = app.listen(PORT, () =>
  console.log(`Live RSS running at http://localhost:${PORT}`)
);

const wss = new WebSocketServer({ server });

// -------------------- Runtime timer (exit after X hours) --------------------
const RUNTIME_HOURS = parseFloat(process.env.RUNTIME_HOURS || '0');
const RUNTIME_MS =
  Number.isFinite(RUNTIME_HOURS) && RUNTIME_HOURS > 0
    ? RUNTIME_HOURS * 60 * 60 * 1000
    : 0;

function shutdown(reason: string) {
  console.log(`Shutting down: ${reason}`);
  try {
    wss.clients.forEach((c: WebSocket) => {
      try { c.close(); } catch {}
    });
  } catch {}
  try { wss.close(); } catch {}
  try { server.close(() => process.exit(0)); } catch { process.exit(0); }
  void prisma.$disconnect().catch(() => {});
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
// ---------------------------------------------------------------------------

const FILTERED_FEED_URL = '__filtered__';

// ✅ Default feeds — ORDER MATTERS
const defaultFeeds: FeedInfo[] = [
  { url: 'https://www.dnevnik.bg/rss/', label: 'dnevnik.bg', kind: 'rss', intervalSec: 75 },
  { url: 'https://standartnews.com/rss?p=1', label: 'standartnews.com', kind: 'rss', intervalSec: 90 },
  { url: 'https://www.bta.bg/en/rss/free', label: 'BTA', kind: 'rss', intervalSec: 120 },
  { url: 'https://capital.bg/rss', label: 'capital.bg', kind: 'rss', intervalSec: 90 },
  { url: 'https://actualno.com/rss', label: 'actualno.com', kind: 'rss', intervalSec: 90 },
  { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', label: 'BBC World', kind: 'rss', intervalSec: 120 },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', label: 'NYT World', kind: 'rss', intervalSec: 150 },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', label: 'Al Jazeera', kind: 'rss', intervalSec: 120 },
  { url: 'https://hollywoodreporter.com/feed', label: 'Hollywood Reporter', kind: 'rss', intervalSec: 180 },
  { url: 'https://hollywoodreporter.com/c/movies/feed', label: 'THR Movies', kind: 'rss', intervalSec: 240 },
  { url: 'https://hollywoodreporter.com/c/tv/feed', label: 'THR TV', kind: 'rss', intervalSec: 240 },
  { url: 'https://hollywoodreporter.com/c/music/feed', label: 'THR Music', kind: 'rss', intervalSec: 240 },
  { url: 'https://www.npr.org/rss/rss.php?id=1008', label: 'NPR Music', kind: 'rss', intervalSec: 180 },
  { url: 'https://www.npr.org/rss/rss.php?id=1045', label: 'NPR Movies', kind: 'rss', intervalSec: 180 },
  { url: 'https://feeds.feedburner.com/variety/headlines', label: 'Variety', kind: 'rss', intervalSec: 180 },
  { url: 'https://www.rollingstone.com/music/music-news/feed/', label: 'Rolling Stone', kind: 'rss', intervalSec: 180 },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Movies.xml', label: 'NYT Movies', kind: 'rss', intervalSec: 180 },
  { url: 'https://www.svobodnaevropa.bg/api/epiqq', label: 'SvobodnaEvropa', kind: 'rss', intervalSec: 180 }
];

function normalizeKeywordList(input: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const value = String(raw || '').trim();
    if (!value) continue;
    const key = normalizeText(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function parseKeywordsCsv(raw: string): string[] {
  return normalizeKeywordList(
    String(raw || '')
      .split(/[,\n]+/g)
      .map(s => s.trim())
      .filter(Boolean)
  );
}

function parseKeywordsPayload(payload: unknown): string[] {
  if (typeof payload === 'string') {
    return parseKeywordsCsv(payload);
  }
  if (Array.isArray(payload)) {
    return normalizeKeywordList(payload.map(v => (typeof v === 'string' ? v : '')));
  }
  return [];
}

function parseKeywords(): string[] {
  const fromArg = process.argv.find(a => a.startsWith('--keywords='));
  const raw =
    (fromArg ? fromArg.slice('--keywords='.length) : '') ||
    process.env.KEYWORDS ||
    '';
  return parseKeywordsCsv(raw);
}
let keywords = parseKeywords();

// ---- AI configuration (.env) ----
const aiProviderParsed = aiProviderSchema.safeParse(process.env.AI_PROVIDER || 'openai');
let aiProvider: AIProvider = aiProviderParsed.success ? aiProviderParsed.data : 'openai';

const providerApiKeys: Record<AIProvider, string> = {
  openai: String(process.env.OPENAI_API_KEY || '').trim(),
  claude: String(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim(),
  openrouter: String(process.env.OPENROUTER_API_KEY || '').trim()
};

const EMBED_MODEL =
  process.env.OPENAI_EMBED_MODEL ||
  process.env.EMBED_MODEL ||
  'text-embedding-3-small';

const OPENAI_SUMMARY_MODEL =
  process.env.OPENAI_SUMMARY_MODEL ||
  process.env.SUMMARY_MODEL ||
  'gpt-4.1-nano';

const OPENAI_RESEARCH_MODEL =
  process.env.OPENAI_RESEARCH_MODEL ||
  process.env.RESEARCH_MODEL ||
  'gpt-4.1-mini';

const OPENAI_ASK_MODEL =
  process.env.OPENAI_ASK_MODEL ||
  process.env.ASK_MODEL ||
  'gpt-4.1-nano';

const CLAUDE_SUMMARY_MODEL =
  process.env.CLAUDE_SUMMARY_MODEL ||
  process.env.SUMMARY_MODEL ||
  'claude-3-5-haiku-latest';

const CLAUDE_RESEARCH_MODEL =
  process.env.CLAUDE_RESEARCH_MODEL ||
  process.env.RESEARCH_MODEL ||
  'claude-3-7-sonnet-latest';

const CLAUDE_ASK_MODEL =
  process.env.CLAUDE_ASK_MODEL ||
  process.env.ASK_MODEL ||
  'claude-3-5-haiku-latest';

const OPENROUTER_SUMMARY_MODEL =
  process.env.OPENROUTER_SUMMARY_MODEL ||
  process.env.SUMMARY_MODEL ||
  'openai/gpt-4.1-mini';

const OPENROUTER_RESEARCH_MODEL =
  process.env.OPENROUTER_RESEARCH_MODEL ||
  process.env.RESEARCH_MODEL ||
  'openai/gpt-4.1';

const OPENROUTER_ASK_MODEL =
  process.env.OPENROUTER_ASK_MODEL ||
  process.env.ASK_MODEL ||
  'openai/gpt-4.1-mini';

function parseModelCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

function uniqueModels(models: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const model of models) {
    const id = String(model || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function buildModelOptions(primary: string, fallback: string[]): string[] {
  return uniqueModels([primary, ...fallback]);
}

const modelOptionsByProvider: ModelOptionsByProvider = {
  openai: {
    summary: buildModelOptions(
      OPENAI_SUMMARY_MODEL,
      parseModelCsv(process.env.OPENAI_SUMMARY_MODEL_OPTIONS)
        .concat(['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1'])
    ),
    research: buildModelOptions(
      OPENAI_RESEARCH_MODEL,
      parseModelCsv(process.env.OPENAI_RESEARCH_MODEL_OPTIONS)
        .concat(['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'])
    ),
    ask: buildModelOptions(
      OPENAI_ASK_MODEL,
      parseModelCsv(process.env.OPENAI_ASK_MODEL_OPTIONS)
        .concat(['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4o-mini'])
    )
  },
  claude: {
    summary: buildModelOptions(
      CLAUDE_SUMMARY_MODEL,
      parseModelCsv(process.env.CLAUDE_SUMMARY_MODEL_OPTIONS)
        .concat(['claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest'])
    ),
    research: buildModelOptions(
      CLAUDE_RESEARCH_MODEL,
      parseModelCsv(process.env.CLAUDE_RESEARCH_MODEL_OPTIONS)
        .concat(['claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'])
    ),
    ask: buildModelOptions(
      CLAUDE_ASK_MODEL,
      parseModelCsv(process.env.CLAUDE_ASK_MODEL_OPTIONS)
        .concat(['claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest'])
    )
  },
  openrouter: {
    summary: buildModelOptions(
      OPENROUTER_SUMMARY_MODEL,
      parseModelCsv(process.env.OPENROUTER_SUMMARY_MODEL_OPTIONS)
        .concat(['openai/gpt-4.1-mini', 'openai/gpt-4.1', 'anthropic/claude-3.5-haiku'])
    ),
    research: buildModelOptions(
      OPENROUTER_RESEARCH_MODEL,
      parseModelCsv(process.env.OPENROUTER_RESEARCH_MODEL_OPTIONS)
        .concat(['openai/gpt-4.1', 'openai/gpt-4.1-mini', 'anthropic/claude-3.7-sonnet'])
    ),
    ask: buildModelOptions(
      OPENROUTER_ASK_MODEL,
      parseModelCsv(process.env.OPENROUTER_ASK_MODEL_OPTIONS)
        .concat(['openai/gpt-4.1-mini', 'openai/gpt-4.1-nano', 'anthropic/claude-3.5-haiku'])
    )
  }
};

const selectedModelsByProvider: Record<AIProvider, AiModelSelection> = {
  openai: {
    summary: modelOptionsByProvider.openai.summary[0] || OPENAI_SUMMARY_MODEL,
    research: modelOptionsByProvider.openai.research[0] || OPENAI_RESEARCH_MODEL,
    ask: modelOptionsByProvider.openai.ask[0] || OPENAI_ASK_MODEL
  },
  claude: {
    summary: modelOptionsByProvider.claude.summary[0] || CLAUDE_SUMMARY_MODEL,
    research: modelOptionsByProvider.claude.research[0] || CLAUDE_RESEARCH_MODEL,
    ask: modelOptionsByProvider.claude.ask[0] || CLAUDE_ASK_MODEL
  },
  openrouter: {
    summary: modelOptionsByProvider.openrouter.summary[0] || OPENROUTER_SUMMARY_MODEL,
    research: modelOptionsByProvider.openrouter.research[0] || OPENROUTER_RESEARCH_MODEL,
    ask: modelOptionsByProvider.openrouter.ask[0] || OPENROUTER_ASK_MODEL
  }
};

const ASK_AGENT_MAX_QUESTIONS = 5;
const ASK_AGENT_MAX_CHARS = 400;
const ASK_AGENT_RESEARCH_TIMEOUT_MS = 8_000;
const ASK_AGENT_ANSWER_TIMEOUT_MS = 22_000;

const MATCH_THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD || '0.72');
const DEDUPE_THRESHOLD = parseFloat(process.env.DEDUPE_THRESHOLD || '0.92');

const FILTERED_AI_DEDUPE =
  (process.env.FILTERED_AI_DEDUPE || 'true') !== 'false';

const FILTERED_DEDUPE_THRESHOLD = parseFloat(
  process.env.FILTERED_DEDUPE_THRESHOLD || '0.90'
);

// Summary defaults
const SUMMARY_DEFAULT_FILTERED =
  (process.env.SUMMARY_DEFAULT_FILTERED || 'true') !== 'false';
const SUMMARY_DEFAULT_ALL =
  (process.env.SUMMARY_DEFAULT_ALL || 'false') === 'true';

// Research defaults
const RESEARCH_DEFAULT_FILTERED =
  (process.env.RESEARCH_DEFAULT_FILTERED || 'false') === 'true';
const RESEARCH_DEFAULT_ALL =
  (process.env.RESEARCH_DEFAULT_ALL || 'false') === 'true';

let openaiEmbeddingClient: OpenAI | null = null;
let openaiGenerationClient: OpenAI | null = null;
let openrouterGenerationClient: OpenAI | null = null;
let aiAvailable: boolean = false;

function activeModel(kind: AiModelKind): string {
  return selectedModelsByProvider[aiProvider][kind] || 'none';
}

function providerSupportsModel(provider: AIProvider, kind: AiModelKind, model: string): boolean {
  return modelOptionsByProvider[provider][kind].includes(model);
}

function currentModelSelection(provider: AIProvider): AiModelSelection {
  return { ...selectedModelsByProvider[provider] };
}

function activeOpenAiLikeClient(): OpenAI | null {
  if (aiProvider === 'openrouter') return openrouterGenerationClient;
  if (aiProvider === 'openai') return openaiGenerationClient;
  return null;
}

function activeProviderHasKey(provider: AIProvider): boolean {
  return provider === 'claude'
    ? !!providerApiKeys.claude
    : provider === 'openrouter'
      ? !!openrouterGenerationClient
      : !!openaiGenerationClient;
}

function refreshAiClients() {
  openaiEmbeddingClient = providerApiKeys.openai
    ? new OpenAI({ apiKey: providerApiKeys.openai })
    : null;
  openaiGenerationClient = providerApiKeys.openai
    ? new OpenAI({ apiKey: providerApiKeys.openai })
    : null;
  openrouterGenerationClient = providerApiKeys.openrouter
    ? new OpenAI({
      apiKey: providerApiKeys.openrouter,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
    })
    : null;
  aiAvailable = activeProviderHasKey(aiProvider);
}

function setAiProviderKey(provider: AIProvider, apiKey?: string) {
  const next = String(apiKey || '').trim();
  if (next) providerApiKeys[provider] = next;
  refreshAiClients();
}

refreshAiClients();

let aiEnabled: boolean =
  (process.env.AI_ENABLED ? process.env.AI_ENABLED !== 'false' : true) &&
  aiAvailable;

let summaryLang: SummaryLang = (process.env.SUMMARY_LANG as SummaryLang) || 'bilingual';
if (!['bg', 'en', 'bilingual'].includes(summaryLang)) summaryLang = 'bilingual';

let researchLang: ResearchLang = (process.env.RESEARCH_LANG as ResearchLang) || 'bg';
if (!['bg', 'en'].includes(researchLang)) researchLang = 'bg';

let aiUsageInputTokens = 0;
let aiUsageOutputTokens = 0;
let aiUsageTotalTokens = 0;

function trackUsage(inputRaw: unknown, outputRaw: unknown, totalRaw: unknown) {
  const input = Number(inputRaw || 0);
  const output = Number(outputRaw || 0);
  const total = Number(totalRaw || (input + output) || 0);
  if (!Number.isFinite(input) && !Number.isFinite(output) && !Number.isFinite(total)) return;

  aiUsageInputTokens += Number.isFinite(input) ? Math.max(0, Math.floor(input)) : 0;
  aiUsageOutputTokens += Number.isFinite(output) ? Math.max(0, Math.floor(output)) : 0;
  aiUsageTotalTokens += Number.isFinite(total)
    ? Math.max(0, Math.floor(total))
    : Math.max(0, Math.floor(input + output));

  const payload = JSON.stringify({
    type: 'ai_usage',
    inputTokens: aiUsageInputTokens,
    outputTokens: aiUsageOutputTokens,
    totalTokens: aiUsageTotalTokens
  });
  wss.clients.forEach((c: WebSocket) => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  void prisma.aiUsageSnapshot.create({
    data: {
      inputTokens: aiUsageInputTokens,
      outputTokens: aiUsageOutputTokens,
      totalTokens: aiUsageTotalTokens
    }
  }).catch(() => {});
}

function trackUsageFromResponse(resp: any) {
  const usage = (resp && typeof resp === 'object') ? (resp as any).usage : null;
  if (!usage || typeof usage !== 'object') return;

  trackUsage(
    usage.input_tokens || usage.prompt_tokens || 0,
    usage.output_tokens || usage.completion_tokens || 0,
    usage.total_tokens || 0
  );
}

// ---------------- Persistence (JSON) ----------------
const DATA_DIR = path.join(__dirname, '.data');
const STATE_PATH = path.join(DATA_DIR, 'state.json');
const APP_STATE_ROW_ID = 1;

type PersistedState = {
  version: number;
  keywords?: string[];
  feeds: FeedInfo[];
  feedSettings: Record<string, FeedSettings>;
  hiddenIds: string[];
  feedRuntime: Record<string, FeedRuntime>;
  recent: NewsInternal[];
};

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}

function safeReadJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

let persistDirty = false;
function markDirty() { persistDirty = true; }

async function saveStateToDb(st: PersistedState) {
  try {
    await prisma.appState.upsert({
      where: { id: APP_STATE_ROW_ID },
      create: { id: APP_STATE_ROW_ID, payload: JSON.stringify(st) },
      update: { payload: JSON.stringify(st) }
    });
  } catch (e) {
    console.error('Failed to save Prisma state:', (e as Error).message);
  }
}

async function readStateFromDb(): Promise<PersistedState | null> {
  try {
    const row = await prisma.appState.findUnique({ where: { id: APP_STATE_ROW_ID } });
    if (!row?.payload) return null;
    const parsed = JSON.parse(row.payload) as PersistedState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStateNow() {
  if (!persistDirty) return;
  persistDirty = false;

  ensureDataDir();
  const st: PersistedState = {
    version: 1,
    keywords,
    feeds: feedsList,
    feedSettings: feedSettingsObj(),
    hiddenIds: Array.from(hiddenIds),
    feedRuntime: feedRuntimeObj(),
    recent: recent.slice(-PERSISTED_RECENT_ITEMS) // bounded
  };

  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(st, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save state:', (e as Error).message);
  }

  void saveStateToDb(st);
}

// Save periodically + on exit
setInterval(saveStateNow, 2500);
process.on('exit', () => {
  try { saveStateNow(); } catch {}
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  try { saveStateNow(); } catch {}
  process.exit(1);
});
// ----------------------------------------------------

// -------- feeds (ordered list) + settings ----------
let feedsList: FeedInfo[] = [...defaultFeeds];

// per-feed settings store (persisted)
const feedSettings = new Map<string, FeedSettings>();

// runtime-only fetch cache + breaker
const feedRuntime = new Map<string, FeedRuntime>();
const lastFeedErrorBroadcastMs = new Map<string, number>();

// hidden items (persisted)
const hiddenIds = new Set<string>();

// labels override
function labelForFeed(info: FeedInfo): string {
  return info.label || info.url;
}

function feedSettingsObj(): Record<string, FeedSettings> {
  const obj: Record<string, FeedSettings> = {};
  for (const [k, v] of feedSettings.entries()) obj[k] = v;
  return obj;
}

function feedRuntimeObj(): Record<string, FeedRuntime> {
  const obj: Record<string, FeedRuntime> = {};
  for (const [k, v] of feedRuntime.entries()) obj[k] = v;
  return obj;
}

function defaultSettingsForFeed(fi: FeedInfo): FeedSettings {
  const summaryEnabled =
    fi.url === FILTERED_FEED_URL ? SUMMARY_DEFAULT_FILTERED : SUMMARY_DEFAULT_ALL;
  const researchEnabled =
    fi.url === FILTERED_FEED_URL ? RESEARCH_DEFAULT_FILTERED : RESEARCH_DEFAULT_ALL;

  return {
    summaryEnabled,
    researchEnabled,
    budget: 'standard',
    sortMode: 'newest',
    filters: { onlyMatches: false, onlyResearched: false, onlySummaries: false },
    intervalSec: fi.intervalSec,
    kind: fi.kind,
    label: fi.label
  };
}

function ensureFeedRuntime(url: string) {
  if (!feedRuntime.has(url)) {
    feedRuntime.set(url, {
      failCount: 0,
      disabledUntilMs: 0,
      nextPollAtMs: 0,
      lastFetchMs: 0
    });
  }
}

function ensureFeedSettings(fi: FeedInfo) {
  if (!feedSettings.has(fi.url)) {
    feedSettings.set(fi.url, defaultSettingsForFeed(fi));
  } else {
    // keep kind/interval/label in sync if missing
    const s = feedSettings.get(fi.url)!;
    if (!s.kind) s.kind = fi.kind;
    if (!s.intervalSec) s.intervalSec = fi.intervalSec;
    if (!s.label && fi.label) s.label = fi.label;
  }
}

function currentFeeds(): FeedInfo[] {
  return feedsList.map(f => ({
    url: f.url,
    label: labelForFeed(f),
    kind: f.kind,
    intervalSec: feedSettings.get(f.url)?.intervalSec ?? f.intervalSec
  }));
}
// ---------------------------------------------------

// ---- memory for seen/recent ----
let seen = new Set<string>();
const recent: NewsInternal[] = [];

// ---- embeddings caches ----
let keywordVecs: { keyword: string; vec: number[] }[] = [];
const titleVecCache = new Map<string, number[]>();
const TITLE_VEC_CACHE_MAX = 3000;

// global AI dedupe window (across feeds)
type DedupeItem = { vec: number[]; publishedMs: number };
let dedupeWindow: DedupeItem[] = [];
const DEDUPE_WINDOW_MAX = 1400;
const DEDUPE_COMPARE_LAST_N = 400;
const MAX_RECENT_ITEMS = 5000;
const PERSISTED_RECENT_ITEMS = 5000;
const MAX_SEEN_IDS = 30000;
const SEEN_TRIM_TO = 18000;

// Filtered-only semantic dedupe window
let filteredDedupeWindow: number[][] = [];
const FILTERED_DEDUPE_MAX = 700;
const FILTERED_DEDUPE_COMPARE_LAST_N = 250;

function normalizeText(s: string): string {
  return String(s || '').normalize('NFKC').toLocaleLowerCase('bg').trim();
}

function toPublishedMs(item: any): { published?: string; publishedMs: number } {
  const published =
    (typeof item.isoDate === 'string' && item.isoDate) ||
    (typeof item.pubDate === 'string' && item.pubDate) ||
    undefined;
  const ms = published ? Date.parse(published) : NaN;
  return { published, publishedMs: Number.isFinite(ms) ? ms : Date.now() };
}

function dot(a: number[], b: number[]) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}
function norm(a: number[]) { return Math.sqrt(dot(a, a)); }
function cosine(a: number[], b: number[]) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  return dot(a, b) / (na * nb);
}

async function embed(text: string): Promise<number[] | null> {
  if (!openaiEmbeddingClient) return null;

  const key = normalizeText(text);
  if (!key) return null;

  const cached = titleVecCache.get(key);
  if (cached) return cached;

  const res = await openaiEmbeddingClient.embeddings.create({
    model: EMBED_MODEL,
    input: text,
    encoding_format: 'float'
  });

  const vec = res.data[0]?.embedding as unknown as number[] | undefined;
  if (!vec) return null;

  titleVecCache.set(key, vec);
  if (titleVecCache.size > TITLE_VEC_CACHE_MAX) {
    const firstKey = titleVecCache.keys().next().value;
    if (firstKey) titleVecCache.delete(firstKey);
  }

  return vec;
}

async function initKeywordEmbeddings() {
  keywordVecs = [];
  if (!openaiEmbeddingClient || !aiEnabled || keywords.length === 0) return;

  for (const kw of keywords) {
    const v = await embed(kw);
    if (v) keywordVecs.push({ keyword: kw, vec: v });
  }

  console.log(
    `AI enabled: ${aiEnabled}. Keyword embeddings loaded: ${keywordVecs.length}/${keywords.length}`
  );
}

function substringHit(title: string): boolean {
  if (!keywords.length) return false;
  const t = normalizeText(title);
  if (!t) return false;
  return keywords.some(k => t.includes(normalizeText(k)));
}

async function hybridMatch(
  title: string
): Promise<{ isMatch: boolean; score: number; vec: number[] | null }> {
  const hit = substringHit(title);

  if (!openaiEmbeddingClient || !aiEnabled || keywordVecs.length === 0) {
    return { isMatch: hit, score: hit ? 1 : 0, vec: null };
  }

  const vec = await embed(title);
  if (!vec) return { isMatch: hit, score: hit ? 1 : 0, vec: null };

  let best = -1;
  for (const k of keywordVecs) {
    const s = cosine(vec, k.vec);
    if (s > best) best = s;
  }

  const semScore = Number.isFinite(best) ? best : 0;
  const semMatch = semScore >= MATCH_THRESHOLD;

  if (hit) return { isMatch: true, score: Math.max(1, semScore), vec };
  return { isMatch: semMatch, score: semScore, vec };
}

async function refreshMatchStateForRecent() {
  filteredDedupeWindow = [];
  const sorted = recent.slice().sort((a, b) => b.publishedMs - a.publishedMs);
  for (const it of sorted) {
    let isMatch = false;
    let matchScore = 0;
    let titleVec: number[] | null = null;

    try {
      const m = await hybridMatch(it.title);
      isMatch = m.isMatch;
      matchScore = m.score;
      titleVec = m.vec;
    } catch {
      const hit = substringHit(it.title);
      isMatch = hit;
      matchScore = hit ? 1 : 0;
      titleVec = null;
    }

    let filteredOk = isMatch;
    if (filteredOk && aiEnabled && FILTERED_AI_DEDUPE && titleVec) {
      if (isFilteredDuplicate(titleVec)) filteredOk = false;
      else addToFilteredDedupe(titleVec);
    }

    it.isMatch = isMatch;
    it.matchScore = matchScore;
    it.filteredOk = filteredOk;
  }

  for (const it of sorted) {
    broadcastNewsUpdate(it);
  }
}

function isDuplicate(vec: number[] | null): boolean {
  if (!vec || !aiEnabled) return false;
  const start = Math.max(0, dedupeWindow.length - DEDUPE_COMPARE_LAST_N);
  for (let i = start; i < dedupeWindow.length; i++) {
    const s = cosine(vec, dedupeWindow[i].vec);
    if (s >= DEDUPE_THRESHOLD) return true;
  }
  return false;
}
function addToDedupeWindow(vec: number[] | null, publishedMs: number) {
  if (!vec || !aiEnabled) return;
  dedupeWindow.push({ vec, publishedMs });
  if (dedupeWindow.length > DEDUPE_WINDOW_MAX) {
    dedupeWindow = dedupeWindow.slice(dedupeWindow.length - DEDUPE_WINDOW_MAX);
  }
}

function isFilteredDuplicate(vec: number[]): boolean {
  const start = Math.max(0, filteredDedupeWindow.length - FILTERED_DEDUPE_COMPARE_LAST_N);
  for (let i = start; i < filteredDedupeWindow.length; i++) {
    const s = cosine(vec, filteredDedupeWindow[i]);
    if (s >= FILTERED_DEDUPE_THRESHOLD) return true;
  }
  return false;
}
function addToFilteredDedupe(vec: number[]) {
  filteredDedupeWindow.push(vec);
  if (filteredDedupeWindow.length > FILTERED_DEDUPE_MAX) {
    filteredDedupeWindow = filteredDedupeWindow.slice(
      filteredDedupeWindow.length - FILTERED_DEDUPE_MAX
    );
  }
}

function stripHtml(input: string): string {
  return String(input || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function pickRssContextCombined(item: any, limitChars: number): string {
  const partsRaw: string[] = [];
  const pushIf = (v: any) => { if (typeof v === 'string' && v.trim()) partsRaw.push(v); };

  pushIf(item.contentSnippet);
  pushIf(item.summary);
  pushIf(item.description);
  pushIf(item.content);

  if (!partsRaw.length) return '';

  const cleanedParts: string[] = [];
  const seenKeys = new Set<string>();

  for (const p of partsRaw) {
    const cleaned = stripHtml(p);
    if (!cleaned) continue;

    const key = normalizeText(cleaned).slice(0, 220);
    if (!key) continue;
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    cleanedParts.push(cleaned);
  }

  if (!cleanedParts.length) return '';
  return cleanedParts.join(' -- ').slice(0, Math.max(0, limitChars));
}

function summaryInstruction(lang: SummaryLang): string {
  if (lang === 'bg') return 'Write ONE short sentence in Bulgarian (max 18 words).';
  if (lang === 'en') return 'Write ONE short sentence in English (max 18 words).';
  return 'Write TWO short sentences: first Bulgarian (max 14 words), then English (max 14 words). Separate with " / ".';
}

// ---------------- Better Research Prompt ----------------
function researchInstruction(lang: ResearchLang): string {
  const common = [
    'Write a concise but detailed research note (1–2 paragraphs).',
    'Cover: what happened, who is involved, why it matters, what to watch next.',
    'Be explicit when context is insufficient.',
    'End all paragraphs with complete sentences. Do not cut off mid-sentence.',
    'End with: "Confidence: Low/Medium/High".',
    'If Confidence is Low, add one more sentence starting with "What to verify:" describing what sources/details are missing.',
    'Neutral tone. No quotes. No bullet points.'
  ].join(' ');

  if (lang === 'bg') return common + ' Write in Bulgarian.';
  return common + ' Write in English.';
}

function titleTranslateInstruction(): string {
  return [
    'Translate the headline to Bulgarian and English.',
    'Return strict JSON only with exactly two keys: "bg" and "en".',
    'Do not add markdown, code fences, or extra keys.',
    'Keep meaning and names intact.',
    'Keep each headline concise and natural.'
  ].join(' ');
}

function titleTranslateSingleInstruction(lang: 'bg' | 'en'): string {
  if (lang === 'bg') {
    return [
      'Translate this headline to Bulgarian.',
      'Return plain text only.',
      'No quotes, no markdown, no extra commentary.'
    ].join(' ');
  }
  return [
    'Translate this headline to English.',
    'Return plain text only.',
    'No quotes, no markdown, no extra commentary.'
  ].join(' ');
}

function normalizeTitleValue(raw: unknown): string {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320);
}

function normalizedTitleKey(raw: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function letterScriptRatios(raw: string): { cyr: number; lat: number } {
  const text = String(raw || '');
  const cyr = (text.match(/[А-Яа-яЁёЍѝ]/g) || []).length;
  const lat = (text.match(/[A-Za-z]/g) || []).length;
  const total = cyr + lat;
  if (!total) return { cyr: 0, lat: 0 };
  return { cyr: cyr / total, lat: lat / total };
}

function looksBulgarianTitle(raw: string): boolean {
  const { cyr } = letterScriptRatios(raw);
  return cyr >= 0.45;
}

function looksEnglishTitle(raw: string): boolean {
  const { lat } = letterScriptRatios(raw);
  return lat >= 0.55;
}

function parseTitleTranslation(raw: string): { bg: string; en: string } | undefined {
  const text = String(raw || '').trim();
  if (!text) return undefined;

  const normalized = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const tryParse = (candidate: string): { bg: string; en: string } | undefined => {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const bg = normalizeTitleValue(parsed.bg);
      const en = normalizeTitleValue(parsed.en);
      if (!bg || !en) return undefined;
      return { bg, en };
    } catch {
      return undefined;
    }
  };

  const direct = tryParse(normalized);
  if (direct) return direct;

  const m = normalized.match(/\{[\s\S]*\}/);
  if (!m) return undefined;
  return tryParse(m[0]);
}

function hasValidOppositeLanguageTitle(
  originalTitle: string,
  titleBgRaw: string | undefined,
  titleEnRaw: string | undefined
): boolean {
  const original = normalizeTitleValue(originalTitle);
  if (!original) return false;
  const sourceKey = normalizedTitleKey(original);

  const bg = normalizeTitleValue(titleBgRaw || '');
  const en = normalizeTitleValue(titleEnRaw || '');
  const bgKey = normalizedTitleKey(bg);
  const enKey = normalizedTitleKey(en);

  const sourceLooksBg = looksBulgarianTitle(original);
  const sourceLooksEn = looksEnglishTitle(original);

  if (sourceLooksBg && !sourceLooksEn) {
    return !!en && !!enKey && enKey !== sourceKey && looksEnglishTitle(en);
  }

  if (sourceLooksEn && !sourceLooksBg) {
    return !!bg && !!bgKey && bgKey !== sourceKey && looksBulgarianTitle(bg);
  }

  // Fallback for mixed/unknown script sources.
  return !!bg && !!en && !!bgKey && !!enKey && bgKey !== enKey;
}

function needsTitleTranslation(
  originalTitle: string,
  titleBgRaw: string | undefined,
  titleEnRaw: string | undefined
): boolean {
  return !hasValidOppositeLanguageTitle(originalTitle, titleBgRaw, titleEnRaw);
}

function normalizeMood(raw: string): Mood | undefined {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
    .replace(/\s+/g, ' ');
  const direct = s.replace(/[\s_-]/g, '');

  if (direct === 'pesimistic' || direct === 'pessimistic') return MoodValue.Pesimistic;
  if (direct === 'optimistic') return MoodValue.Optimistic;
  if (direct === 'realistic') return MoodValue.Realistic;
  if (direct === 'melancholy' || direct === 'melancholic') return MoodValue.Melancholy;
  if (direct === 'happiness' || direct === 'happy' || direct === 'joy' || direct === 'joyful') return MoodValue.Happiness;
  if (direct === 'sadness' || direct === 'sad') return MoodValue.Sadness;
  if (direct === 'rage' || direct === 'angry' || direct === 'anger' || direct === 'furious') return MoodValue.Rage;
  if (direct === 'uncertainty' || direct === 'uncertain' || direct === 'anxiety' || direct === 'anxious') return MoodValue.Uncertainty;
  if (direct === 'neutral') return MoodValue.Neutral;
  if (direct === 'curios' || direct === 'curious' || direct === 'curiosity') return MoodValue.Curios;

  if (s.includes('pesimistic') || s.includes('pessimistic')) return MoodValue.Pesimistic;
  if (s.includes('optimistic')) return MoodValue.Optimistic;
  if (s.includes('realistic')) return MoodValue.Realistic;
  if (s.includes('melancholy') || s.includes('melancholic')) return MoodValue.Melancholy;
  if (s.includes('happiness') || s.includes('joy')) return MoodValue.Happiness;
  if (s.includes('sadness') || s.includes(' sad')) return MoodValue.Sadness;
  if (s.includes('rage') || s.includes('anger') || s.includes('angry')) return MoodValue.Rage;
  if (s.includes('uncertainty') || s.includes('uncertain') || s.includes('anxiety')) return MoodValue.Uncertainty;
  if (s.includes('neutral')) return MoodValue.Neutral;
  if (s.includes('curios') || s.includes('curious') || s.includes('curiosity')) return MoodValue.Curios;
  return undefined;
}

function moodInstruction(): string {
  return [
    'Classify the overall mood of this news into exactly one label.',
    'Allowed labels only:',
    `${Object.values(MoodValue).join(', ')}.`,
    'Return exactly one label with no extra words or punctuation.'
  ].join(' ');
}

function normalizeNewsType(raw: string): NewsType | undefined {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
    .replace(/\s+/g, ' ');
  const direct = s.replace(/[\s_-]/g, '');

  if (direct === 'science' || direct === 'scientific') return NewsTypeValue.Science;
  if (direct === 'movies' || direct === 'movie' || direct === 'film' || direct === 'cinema') return NewsTypeValue.Movies;
  if (direct === 'politics' || direct === 'political') return NewsTypeValue.Politics;
  if (direct === 'business' || direct === 'finance' || direct === 'economy' || direct === 'economic') return NewsTypeValue.Business;
  if (direct === 'technology' || direct === 'tech') return NewsTypeValue.Technology;
  if (direct === 'sports' || direct === 'sport') return NewsTypeValue.Sports;
  if (direct === 'health' || direct === 'medical' || direct === 'medicine') return NewsTypeValue.Health;
  if (direct === 'world' || direct === 'international') return NewsTypeValue.World;
  if (direct === 'culture' || direct === 'arts' || direct === 'art') return NewsTypeValue.Culture;
  if (direct === 'environment' || direct === 'climate') return NewsTypeValue.Environment;
  if (direct === 'crime' || direct === 'criminal' || direct === 'law') return NewsTypeValue.Crime;
  if (direct === 'education' || direct === 'school' || direct === 'academic') return NewsTypeValue.Education;
  if (direct === 'other') return NewsTypeValue.Other;

  if (s.includes('science')) return NewsTypeValue.Science;
  if (s.includes('movie') || s.includes('film') || s.includes('cinema')) return NewsTypeValue.Movies;
  if (s.includes('politic')) return NewsTypeValue.Politics;
  if (s.includes('business') || s.includes('finance') || s.includes('econom')) return NewsTypeValue.Business;
  if (s.includes('technology') || s.includes('tech')) return NewsTypeValue.Technology;
  if (s.includes('sport')) return NewsTypeValue.Sports;
  if (s.includes('health') || s.includes('medical') || s.includes('medicine')) return NewsTypeValue.Health;
  if (s.includes('world') || s.includes('international')) return NewsTypeValue.World;
  if (s.includes('culture') || s.includes('art')) return NewsTypeValue.Culture;
  if (s.includes('environment') || s.includes('climate')) return NewsTypeValue.Environment;
  if (s.includes('crime') || s.includes('criminal') || s.includes('law')) return NewsTypeValue.Crime;
  if (s.includes('education') || s.includes('school') || s.includes('academic')) return NewsTypeValue.Education;
  return undefined;
}

function newsTypeInstruction(): string {
  return [
    'Classify the news topic into exactly one label.',
    'Allowed labels only:',
    `${Object.values(NewsTypeValue).join(', ')}.`,
    'Return exactly one label with no extra words or punctuation.'
  ].join(' ');
}

function budgetToTokensSummary(b: BudgetMode) {
  if (b === 'low') return 55;
  if (b === 'high') return 95;
  return 70;
}

function budgetToTokensResearch(b: BudgetMode) {
  if (b === 'low') return 320;
  if (b === 'high') return 760;
  return 540;
}

function budgetToTokensAsk(b: BudgetMode) {
  if (b === 'low') return 130;
  if (b === 'high') return 260;
  return 190;
}

function budgetAllowsAutoResearch(b: BudgetMode) {
  // Low mode: research only on manual click
  return b !== 'low';
}

// --------------- Optional article fetch + extraction ---------------
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function extractMainTextFromHtml(html: string): string {
  const cleaned = String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ');

  // Prefer <article> if present
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i);
  const chunk = articleMatch ? articleMatch[0] : cleaned;

  // Strip tags -> text
  const text = stripHtml(chunk);

  // Light de-noise: remove too many repeats / huge whitespace already handled
  return text;
}

async function fetchArticleText(link: string, maxChars: number): Promise<string> {
  if (!link || !/^https?:\/\//i.test(link)) return '';
  try {
    const res = await fetchWithTimeout(
      link,
      {
        headers: {
          'User-Agent': 'live-news-ai/1.0 (+rss-research)',
          'Accept': 'text/html,application/xhtml+xml'
        }
      },
      9000
    );
    if (!res.ok) return '';
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('text/html')) return '';
    const html = await res.text();
    const text = extractMainTextFromHtml(html);
    return text.slice(0, Math.max(0, maxChars));
  } catch {
    return '';
  }
}
// ------------------------------------------------------------------

// ---------------- AI calls ----------------
async function generateWithOpenAiLike(
  model: string,
  input: string,
  maxOutputTokens: number,
  temperature: number
): Promise<string | undefined> {
  const client = activeOpenAiLikeClient();
  if (!client) return undefined;
  const resp = await client.responses.create({
    model,
    input,
    max_output_tokens: maxOutputTokens,
    temperature
  });
  trackUsageFromResponse(resp);
  const text = (resp.output_text || '').trim();
  return text || undefined;
}

async function generateWithClaude(
  model: string,
  input: string,
  maxOutputTokens: number,
  temperature: number
): Promise<string | undefined> {
  if (!providerApiKeys.claude) return undefined;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': providerApiKeys.claude,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      temperature,
      messages: [{ role: 'user', content: input }]
    })
  });

  if (!res.ok) {
    throw new Error(`Claude HTTP ${res.status}`);
  }

  const json = await res.json() as any;
  const usage = json?.usage || {};
  trackUsage(usage.input_tokens || 0, usage.output_tokens || 0, 0);

  const text = Array.isArray(json?.content)
    ? json.content
      .filter((x: any) => x && x.type === 'text' && typeof x.text === 'string')
      .map((x: any) => String(x.text))
      .join('\n')
      .trim()
    : '';
  return text || undefined;
}

async function generateAiText(
  kind: 'summary' | 'research' | 'ask',
  input: string,
  maxOutputTokens: number,
  temperature: number
): Promise<string | undefined> {
  if (!aiEnabled || !aiAvailable) return undefined;
  const model = activeModel(kind);
  if (!model || model === 'none') return undefined;

  if (aiProvider === 'claude') {
    return generateWithClaude(model, input, maxOutputTokens, temperature);
  }
  return generateWithOpenAiLike(model, input, maxOutputTokens, temperature);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function oneLineSummary(
  title: string,
  source: string,
  context: string,
  budget: BudgetMode
): Promise<string | undefined> {
  const input =
    `${summaryInstruction(summaryLang)} No quotes.\n` +
    `Source: ${source}\n` +
    `Headline: ${title}\n` +
    (context ? `Context: ${context}\n` : '');

  return generateAiText('summary', input, budgetToTokensSummary(budget), 0.2);
}

async function translateTitleBilingual(
  title: string,
  source: string,
  budget: BudgetMode
): Promise<{ bg: string; en: string } | undefined> {
  const originalTitle = normalizeTitleValue(title);
  if (!originalTitle) return undefined;
  const srcKey = normalizedTitleKey(originalTitle);
  const sourceLooksBg = looksBulgarianTitle(originalTitle);
  const sourceLooksEn = looksEnglishTitle(originalTitle);
  const maxTokens = Math.max(90, Math.min(220, budgetToTokensSummary(budget) + 70));

  const translateSingle = async (lang: 'bg' | 'en'): Promise<string> => {
    const retryText = await generateAiText(
      'summary',
      `${titleTranslateSingleInstruction(lang)}\nSource: ${source}\nHeadline: ${originalTitle}\n`,
      maxTokens,
      0
    );
    return normalizeTitleValue(retryText || '');
  };

  const input =
    `${titleTranslateInstruction()}\n` +
    `Source: ${source}\n` +
    `Headline: ${originalTitle}\n`;

  const text = await generateAiText('summary', input, maxTokens, 0);
  const parsed = text ? parseTitleTranslation(text) : undefined;

  let bg = normalizeTitleValue(parsed?.bg || '');
  let en = normalizeTitleValue(parsed?.en || '');

  // If the source is clearly one language, keep that side exactly as the original title
  // and only translate the opposite side.
  if (sourceLooksBg && !sourceLooksEn) {
    bg = originalTitle;
    let enKey = normalizedTitleKey(en);
    if (!en || enKey === srcKey || !looksEnglishTitle(en)) {
      en = await translateSingle('en');
      enKey = normalizedTitleKey(en);
    }
    if (!en || enKey === srcKey) return undefined;
    return { bg, en };
  }

  if (sourceLooksEn && !sourceLooksBg) {
    en = originalTitle;
    let bgKey = normalizedTitleKey(bg);
    if (!bg || bgKey === srcKey || !looksBulgarianTitle(bg)) {
      bg = await translateSingle('bg');
      bgKey = normalizedTitleKey(bg);
    }
    if (!bg || bgKey === srcKey) return undefined;
    return { bg, en };
  }

  const bgNeedsRetry = !bg || !looksBulgarianTitle(bg);
  const enNeedsRetry = !en || !looksEnglishTitle(en);

  if (bgNeedsRetry) {
    const retryBg = await translateSingle('bg');
    if (retryBg && looksBulgarianTitle(retryBg)) bg = retryBg;
  }

  if (enNeedsRetry) {
    const retryEn = await translateSingle('en');
    if (retryEn && looksEnglishTitle(retryEn)) en = retryEn;
  }

  if (!bg || !en) return undefined;

  const bgKey = normalizedTitleKey(bg);
  const enKey = normalizedTitleKey(en);

  if (bgKey && enKey && bgKey === enKey) {
    if (looksBulgarianTitle(title)) {
      // Source is likely BG; keep BG and keep EN only if it differs.
      if (enKey === srcKey) return undefined;
    } else if (looksEnglishTitle(title)) {
      // Source is likely EN; keep EN and keep BG only if it differs.
      if (bgKey === srcKey) return undefined;
    } else {
      return undefined;
    }
  }

  return { bg, en };
}

async function oneItemResearch(
  title: string,
  source: string,
  link: string,
  context: string,
  linkText: string,
  budget: BudgetMode
): Promise<string | undefined> {
  const input =
    `${researchInstruction(researchLang)}\n` +
    `Source: ${source}\n` +
    `Headline: ${title}\n` +
    `Link: ${link}\n` +
    (context ? `RSS context: ${context}\n` : '') +
    (linkText ? `Article text (may be partial): ${linkText}\n` : '');

  return generateAiText('research', input, budgetToTokensResearch(budget), 0.25);
}

async function oneItemResearchFallback(
  title: string,
  source: string,
  link: string,
  context: string,
  budget: BudgetMode
): Promise<string | undefined> {
  const input =
    `${researchInstruction(researchLang)}\n` +
    `Source: ${source}\n` +
    `Headline: ${title}\n` +
    `Link: ${link}\n` +
    (context ? `RSS context: ${context}\n` : '') +
    'Note: article body fetch was slow/unavailable. Use available context only.';

  const maxTokens = Math.max(220, Math.floor(budgetToTokensResearch(budget) * 0.62));
  return generateAiText('research', input, maxTokens, 0.2);
}

async function classifyMoodForItem(
  title: string,
  source: string,
  context: string,
  summary: string,
  research: string,
  budget: BudgetMode
): Promise<Mood | undefined> {
  const input =
    `${moodInstruction()}\n` +
    `Source: ${source}\n` +
    `Headline: ${title}\n` +
    (context ? `Context: ${context}\n` : '') +
    (summary ? `Summary: ${summary}\n` : '') +
    (research ? `Research: ${research}\n` : '');
  const text = await generateAiText('research', input, Math.max(12, Math.min(28, budgetToTokensSummary(budget))), 0);
  if (!text) return undefined;
  return normalizeMood(text);
}

async function classifyNewsTypeForItem(
  title: string,
  source: string,
  context: string,
  summary: string,
  research: string,
  budget: BudgetMode
): Promise<NewsType | undefined> {
  const input =
    `${newsTypeInstruction()}\n` +
    `Source: ${source}\n` +
    `Headline: ${title}\n` +
    (context ? `Context: ${context}\n` : '') +
    (summary ? `Summary: ${summary}\n` : '') +
    (research ? `Research: ${research}\n` : '');
  const text = await generateAiText('research', input, Math.max(16, Math.min(34, budgetToTokensSummary(budget))), 0);
  if (!text) return undefined;
  return normalizeNewsType(text) || 'other';
}

function askAgentInstruction(lang: ResearchLang): string {
  const langText = lang === 'bg' ? 'Reply in Bulgarian.' : 'Reply in English.';
  return [
    'You are an assistant for exactly one news item.',
    'Answer only questions that are about this exact item and only with the supplied item context.',
    'If the question is off-topic for this item, reply exactly: "I can only answer questions about this specific news item."',
    'If context is missing, say it briefly and stay grounded in the provided text.',
    'Keep the answer concise (max 4 sentences).',
    langText
  ].join(' ');
}

async function askAgentAboutItem(
  question: string,
  item: NewsInternal,
  budget: BudgetMode,
  chatResearch?: string
): Promise<string | undefined> {
  const safeQuestion = String(question || '').slice(0, ASK_AGENT_MAX_CHARS);
  const input =
    `${askAgentInstruction(researchLang)}\n` +
    `Question: ${safeQuestion}\n` +
    `Source: ${item.source}\n` +
    `Headline: ${item.title}\n` +
    `Link: ${item.link}\n` +
    (item.summary ? `Summary: ${item.summary}\n` : '') +
    ((chatResearch && chatResearch.trim()) || (item.research && item.research.trim())
      ? `Research: ${(chatResearch && chatResearch.trim()) ? chatResearch : item.research}\n`
      : '') +
    (item.__ctx ? `RSS context: ${item.__ctx}\n` : '') +
    (item.__linkText ? `Article text (may be partial): ${item.__linkText}\n` : '');

  return generateAiText('ask', input, budgetToTokensAsk(budget), 0.2);
}
// -----------------------------------------

function broadcastConfig() {
  const activeSelection = currentModelSelection(aiProvider);
  const cfg: Config = {
    type: 'config',
    keywords,

    aiProvider,
    aiAvailable,
    aiEnabled,

    summaryLang,
    researchLang,
    summaryModel: activeSelection.summary,
    researchModel: activeSelection.research,
    askModel: activeSelection.ask,
    availableModels: modelOptionsByProvider,

    matchThreshold: MATCH_THRESHOLD,
    dedupeThreshold: DEDUPE_THRESHOLD,

    filteredAiDedupe: FILTERED_AI_DEDUPE,
    filteredDedupeThreshold: FILTERED_DEDUPE_THRESHOLD,

    feeds: currentFeeds(),
    feedSettings: feedSettingsObj(),
    hiddenIds: Array.from(hiddenIds),
    aiUsageInputTokens,
    aiUsageOutputTokens,
    aiUsageTotalTokens
  };

  const payload = JSON.stringify(cfg);
  wss.clients.forEach((c: WebSocket) => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });
}

function broadcastNewsUpdate(it: NewsInternal) {
  if (hiddenIds.has(it.id)) return;

  const payload = JSON.stringify({
    type: 'news',
    id: it.id,
    title: it.title,
    titleBg: it.titleBg,
    titleEn: it.titleEn,
    link: it.link,
    source: it.source,
    published: it.published,
    publishedMs: it.publishedMs,
    feedUrl: it.feedUrl,
    isMatch: it.isMatch,
    matchScore: it.matchScore,
    filteredOk: it.filteredOk,
    summary: it.summary,
    summaryPending: hasSummaryJobQueuedOrRunning(it.id, it.feedUrl),
    research: it.research,
    mood: it.mood,
    newsType: it.newsType
  } satisfies News);

  wss.clients.forEach((c: WebSocket) => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });
}

function broadcastFeedError(fi: FeedInfo, error: string) {
  const now = Date.now();
  const last = lastFeedErrorBroadcastMs.get(fi.url) || 0;
  if (now - last < 15_000) return;
  lastFeedErrorBroadcastMs.set(fi.url, now);

  const rt = feedRuntime.get(fi.url);
  const payload = JSON.stringify({
    type: 'feed_error',
    feedUrl: fi.url,
    feedLabel: labelForFeed(fi),
    error,
    failCount: rt?.failCount ?? 0,
    disabledUntilMs: rt?.disabledUntilMs ?? 0
  });

  wss.clients.forEach((c: WebSocket) => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });
}

function eligibleForFeed(it: NewsInternal, feedUrl: string): boolean {
  if (feedUrl === FILTERED_FEED_URL) return it.isMatch && it.filteredOk !== false;
  return it.feedUrl === feedUrl;
}

function shouldHaveSummary(it: NewsInternal): boolean {
  const ownFeedSummary = !!feedSettings.get(it.feedUrl)?.summaryEnabled;
  const filteredSummary =
    !!feedSettings.get(FILTERED_FEED_URL)?.summaryEnabled &&
    !!it.isMatch &&
    it.filteredOk !== false;
  return ownFeedSummary || filteredSummary;
}

// ---------------- AI JOB QUEUE (non-blocking) ----------------
type AiJobKind = 'summary' | 'title_translate' | 'research' | 'mood' | 'news_type';
type AiJobInput = { kind: AiJobKind; id: string; feedUrl: string; manual?: boolean };
type AiJob = AiJobInput & { enqueuedAtMs: number };
type DeadLetterAiJob = {
  kind: AiJobKind;
  id: string;
  feedUrl: string;
  manual?: boolean;
  enqueuedAtMs: number;
  droppedAtMs: number;
  reason: string;
};

const aiQueue: AiJob[] = [];
const aiInFlight = new Set<string>();
const aiDeadLetters: DeadLetterAiJob[] = [];
const lastAiJobErrorAtMs = new Map<string, number>();

const AI_MAX_CONCURRENCY = Math.max(1, parseInt(process.env.AI_MAX_CONCURRENCY || '1', 10));
const AI_QUEUE_MAX = Math.max(200, parseInt(process.env.AI_QUEUE_MAX || '600', 10));
const AI_JOB_TTL_MS = Math.max(15_000, Number.parseInt(process.env.AI_JOB_TTL_MS ?? '180_000', 10) || 180_000);
const AI_DEAD_LETTER_MAX = Math.max(50, Number.parseInt(process.env.AI_DEAD_LETTER_MAX ?? '400', 10) || 400);
const AI_SUMMARY_TIMEOUT_MS = Math.max(4_000, Number.parseInt(process.env.AI_SUMMARY_TIMEOUT_MS ?? '22_000', 10) || 22_000);
const AI_TITLE_TRANSLATE_TIMEOUT_MS = Math.max(6_000, Number.parseInt(process.env.AI_TITLE_TRANSLATE_TIMEOUT_MS ?? '24_000', 10) || 24_000);
const AI_RESEARCH_TIMEOUT_MS = Math.max(8_000, Number.parseInt(process.env.AI_RESEARCH_TIMEOUT_MS ?? '45_000', 10) || 45_000);
const AI_RESEARCH_TIMEOUT_MANUAL_MS = Math.max(
  AI_RESEARCH_TIMEOUT_MS,
  Number.parseInt(process.env.AI_RESEARCH_TIMEOUT_MANUAL_MS ?? '60_000', 10) || 60_000
);
const AI_CLASSIFY_TIMEOUT_MS = Math.max(6_000, Number.parseInt(process.env.AI_CLASSIFY_TIMEOUT_MS ?? '22_000', 10) || 22_000);
const AI_ERROR_TOAST_COOLDOWN_MS = Math.max(5_000, Number.parseInt(process.env.AI_ERROR_TOAST_COOLDOWN_MS ?? '20_000', 10) || 20_000);

function jobKey(j: AiJob) {
  return `${j.kind}:${j.feedUrl || ''}::${j.id}`;
}

function hasSummaryJobQueuedOrRunning(id: string, feedUrl: string): boolean {
  const k = `summary:${feedUrl || ''}::${id}`;
  if (aiInFlight.has(k)) return true;
  return aiQueue.some(job => job.kind === 'summary' && job.id === id && job.feedUrl === feedUrl);
}

function hasTitleTranslateJobQueuedOrRunning(id: string, feedUrl: string): boolean {
  const k = `title_translate:${feedUrl || ''}::${id}`;
  if (aiInFlight.has(k)) return true;
  return aiQueue.some(job => job.kind === 'title_translate' && job.id === id && job.feedUrl === feedUrl);
}

function isJobExpired(job: AiJob, nowMs = Date.now()): boolean {
  return nowMs - job.enqueuedAtMs > AI_JOB_TTL_MS;
}

function pushDeadLetter(job: AiJob, reason: string) {
  aiDeadLetters.push({
    kind: job.kind,
    id: job.id,
    feedUrl: job.feedUrl,
    manual: job.manual,
    enqueuedAtMs: job.enqueuedAtMs,
    droppedAtMs: Date.now(),
    reason
  });
  if (aiDeadLetters.length > AI_DEAD_LETTER_MAX) {
    aiDeadLetters.splice(0, aiDeadLetters.length - AI_DEAD_LETTER_MAX);
  }
}

function resolveJobItem(job: AiJob): NewsInternal | undefined {
  return recent.find(x => x.id === job.id && x.feedUrl === job.feedUrl)
    || recent.find(x => x.id === job.id);
}

function dropJob(job: AiJob, reason: string) {
  pushDeadLetter(job, reason);
  const it = resolveJobItem(job);
  if (it) {
    broadcastNewsUpdate(it);
  }
}

function purgeExpiredQueuedJobs() {
  if (!aiQueue.length) return;
  const nowMs = Date.now();
  for (let i = aiQueue.length - 1; i >= 0; i -= 1) {
    const job = aiQueue[i];
    if (!isJobExpired(job, nowMs)) continue;
    aiQueue.splice(i, 1);
    dropJob(job, 'ttl_expired_queue');
  }
}

function jobPriority(j: AiJob): number {
  if (j.kind === 'summary') return j.manual ? 0 : 1;
  if (j.kind === 'research') return j.manual ? 2 : 4;
  if (j.kind === 'title_translate') return 3;
  if (j.kind === 'mood') return 5;
  return 6; // news_type
}

function dequeueNextJob(): AiJob | undefined {
  while (aiQueue.length) {
    let bestIndex = 0;
    let bestPriority = jobPriority(aiQueue[0]);
    for (let i = 1; i < aiQueue.length; i += 1) {
      const priority = jobPriority(aiQueue[i]);
      if (priority < bestPriority) {
        bestPriority = priority;
        bestIndex = i;
        if (bestPriority === 0) break;
      }
    }
    const next = aiQueue.splice(bestIndex, 1)[0];
    if (!next) return undefined;
    if (isJobExpired(next)) {
      dropJob(next, 'ttl_expired_dequeue');
      continue;
    }
    return next;
  }
  return undefined;
}

function broadcastAiJobError(job: AiJob, item: NewsInternal | undefined, error: unknown) {
  const message = (error as Error)?.message || String(error || 'unknown error');
  const dedupeKey = `${job.kind}:${job.feedUrl}:${job.id}:${message}`;
  const now = Date.now();
  const last = lastAiJobErrorAtMs.get(dedupeKey) || 0;
  if (now - last < AI_ERROR_TOAST_COOLDOWN_MS) return;
  lastAiJobErrorAtMs.set(dedupeKey, now);

  const label = item?.source || item?.feedUrl || job.feedUrl || 'feed';
  const payload = JSON.stringify({
    type: 'error',
    message: `AI ${job.kind} failed for ${label}: ${message}`
  });
  wss.clients.forEach((c: WebSocket) => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });
}

function isTimeoutError(error: unknown): boolean {
  const message = (error as Error)?.message || String(error || '');
  return message.toLowerCase().includes('timeout');
}

function enqueueJob(job: AiJobInput) {
  if (!aiEnabled || !aiAvailable) return;
  const nextJob: AiJob = { ...job, enqueuedAtMs: Date.now() };
  const k = jobKey(nextJob);
  if (aiInFlight.has(k)) return;
  if (aiQueue.some(x => jobKey(x) === k)) return;

  if (aiQueue.length >= AI_QUEUE_MAX) {
    // drop oldest non-manual first
    const idx = aiQueue.findIndex(x => !x.manual);
    const dropped = idx >= 0 ? aiQueue.splice(idx, 1)[0] : aiQueue.shift();
    if (dropped) dropJob(dropped, 'queue_overflow');
  }

  aiQueue.push(nextJob);
}

function enqueueTitleTranslateBackfill(options?: {
  feedUrl?: string;
  max?: number;
  manual?: boolean;
}): number {
  if (!aiEnabled || !aiAvailable) return 0;
  if (activeModel('summary') === 'none') return 0;

  const targetFeedUrl = String(options?.feedUrl || '').trim();
  const max = Math.max(1, Math.min(2_000, Math.floor(options?.max ?? 320)));
  const manual = !!options?.manual;
  const list = recent.slice().sort((a, b) => b.publishedMs - a.publishedMs);
  let done = 0;

  for (const it of list) {
    if (done >= max) break;
    if (targetFeedUrl && !eligibleForFeed(it, targetFeedUrl)) continue;
    if (hiddenIds.has(it.id)) continue;
    if (!needsTitleTranslation(it.title, it.titleBg, it.titleEn)) continue;

    const itemBudget = feedSettings.get(it.feedUrl)?.budget || 'standard';
    if (!manual && itemBudget !== 'high') continue;
    if (hasTitleTranslateJobQueuedOrRunning(it.id, it.feedUrl)) continue;

    enqueueJob({ kind: 'title_translate', id: it.id, feedUrl: it.feedUrl, manual });
    done++;
  }

  return done;
}

async function runOneJob(job: AiJob) {
  const k = jobKey(job);
  aiInFlight.add(k);
  let itemForError: NewsInternal | undefined;

  try {
    if (isJobExpired(job)) {
      dropJob(job, 'ttl_expired_before_run');
      return;
    }

    const it = resolveJobItem(job);
    if (!it) return;
    itemForError = it;
    if (hiddenIds.has(it.id)) return;

    const s = feedSettings.get(it.feedUrl) || defaultSettingsForFeed({ url: it.feedUrl, label: it.source, kind: 'rss', intervalSec: 120 });
    const budget = s.budget || 'standard';

    if (job.kind === 'summary') {
      if (it.summary && it.summary.trim()) return;
      if (activeModel('summary') === 'none') return;

      const ctx = it.__ctx || '';
      const text = await withTimeout(
        oneLineSummary(it.title, it.source, ctx, budget),
        AI_SUMMARY_TIMEOUT_MS,
        `summary:${it.id}`
      );
      if (text) {
        it.summary = text;
        broadcastNewsUpdate(it);
        markDirty();
      }
      return;
    }

    if (job.kind === 'title_translate') {
      if (!job.manual && budget !== 'high') return;
      if (activeModel('summary') === 'none') return;
      if (!needsTitleTranslation(it.title, it.titleBg, it.titleEn)) return;

      const translated = await withTimeout(
        translateTitleBilingual(it.title, it.source, budget),
        AI_TITLE_TRANSLATE_TIMEOUT_MS,
        `title_translate:${it.id}`
      );
      if (translated) {
        it.titleBg = translated.bg;
        it.titleEn = translated.en;
        broadcastNewsUpdate(it);
        markDirty();
      }
      return;
    }

    if (job.kind === 'mood') {
      if (it.mood) return;
      if (activeModel('research') === 'none') return;
      const mood = await withTimeout(
        classifyMoodForItem(
          it.title,
          it.source,
          it.__ctx || '',
          it.summary || '',
          it.research || '',
          budget
        ),
        AI_CLASSIFY_TIMEOUT_MS,
        `mood:${it.id}`
      );
      if (mood) {
        it.mood = mood;
        broadcastNewsUpdate(it);
        markDirty();
      }
      return;
    }

    if (job.kind === 'news_type') {
      if (it.newsType) return;
      if (activeModel('research') === 'none') return;
      const newsType = await withTimeout(
        classifyNewsTypeForItem(
          it.title,
          it.source,
          it.__ctx || '',
          it.summary || '',
          it.research || '',
          budget
        ),
        AI_CLASSIFY_TIMEOUT_MS,
        `news_type:${it.id}`
      );
      if (newsType) {
        it.newsType = newsType;
        broadcastNewsUpdate(it);
        markDirty();
      }
      return;
    }

    if (job.kind === 'research') {
      if (it.research && it.research.trim() && !job.manual) return;
      if (activeModel('research') === 'none') return;

      // If budget is low and not manual -> skip auto research
      if (!job.manual && !budgetAllowsAutoResearch(budget)) return;

      const ctx = it.__ctx || '';

      // Optional article fetch for real research (bounded)
      let linkText = it.__linkText || '';
      if (!linkText) {
        try {
          linkText = await fetchArticleText(it.link, 2600);
        } catch {
          linkText = '';
        }
        it.__linkText = linkText;
      }

      const timeoutMs = job.manual ? AI_RESEARCH_TIMEOUT_MANUAL_MS : AI_RESEARCH_TIMEOUT_MS;
      let text: string | undefined;
      try {
        text = await withTimeout(
          oneItemResearch(it.title, it.source, it.link, ctx, linkText, budget),
          timeoutMs,
          `research:${it.id}`
        );
      } catch (err) {
        if (!isTimeoutError(err)) throw err;
        text = await withTimeout(
          oneItemResearchFallback(it.title, it.source, it.link, ctx, budget),
          timeoutMs,
          `research_fallback:${it.id}`
        );
      }
      if (text) {
        it.research = text;
        broadcastNewsUpdate(it);
        markDirty();
      }
      return;
    }
  } catch (err) {
    const message = (err as Error)?.message || String(err);
    const classifyJob = job.kind === 'mood' || job.kind === 'news_type';
    if (classifyJob && isTimeoutError(err)) {
      return;
    }

    if (classifyJob) {
      console.warn(`AI classify job skipped (${job.kind}:${job.id})`, message);
      return;
    }

    console.error(`AI job failed (${job.kind}:${job.id})`, message);
    broadcastAiJobError(job, itemForError, err);
  } finally {
    aiInFlight.delete(k);
  }
}

async function tickAiQueue() {
  if (!aiEnabled || !aiAvailable) return;
  purgeExpiredQueuedJobs();
  if (!aiQueue.length) return;

  while (aiInFlight.size < AI_MAX_CONCURRENCY && aiQueue.length) {
    const job = dequeueNextJob();
    if (!job) break;
    const k = jobKey(job);
    if (aiInFlight.has(k)) continue;

    runOneJob(job).catch(() => {}).finally(() => {});
  }
}
// -------------------------------------------------------------

// ---------------- Robust feed fetch (ETag, LM, retry, breaker) ----------------
function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function jitter(ms: number) {
  const j = Math.floor(Math.random() * Math.min(450, Math.max(50, ms * 0.2)));
  return ms + j;
}

function isSocial(fi: FeedInfo) {
  return fi.kind === 'reddit' || fi.kind === 'youtube';
}

function defaultIntervalForKind(kind: FeedKind) {
  if (kind === 'reddit') return 45;
  if (kind === 'youtube') return 120;
  return 120;
}

function shouldUseRedditHeaders(kind: FeedKind) {
  return kind === 'reddit';
}

async function fetchFeedXml(fi: FeedInfo): Promise<{ xml: string | null; notModified: boolean }> {
  ensureFeedRuntime(fi.url);
  const rt = feedRuntime.get(fi.url)!;

  const now = Date.now();
  if (rt.disabledUntilMs && now < rt.disabledUntilMs) {
    return { xml: null, notModified: true };
  }

  const headers: Record<string, string> = {
    'User-Agent': 'live-news-ai/1.0 (+rss)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  };

  if (shouldUseRedditHeaders(fi.kind)) {
    headers['User-Agent'] = 'live-news-ai/1.0 (reddit rss)';
  }

  if (rt.etag) headers['If-None-Match'] = rt.etag;
  if (rt.lastModified) headers['If-Modified-Since'] = rt.lastModified;

  const timeoutMs = 9000;

  const maxAttempts = 3;
  let attempt = 0;
  let backoff = 800;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const res = await fetchWithTimeout(fi.url, { headers }, timeoutMs);

      if (res.status === 304) {
        rt.failCount = 0;
        rt.lastFetchMs = now;
        return { xml: null, notModified: true };
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const etag = res.headers.get('etag') || undefined;
      const lm = res.headers.get('last-modified') || undefined;
      if (etag) rt.etag = etag;
      if (lm) rt.lastModified = lm;

      const xml = await res.text();
      rt.failCount = 0;
      rt.lastFetchMs = now;

      return { xml, notModified: false };
    } catch (e) {
      rt.failCount += 1;

      // circuit breaker: after 6 fails, pause longer
      if (rt.failCount >= 6) {
        rt.disabledUntilMs = now + 10 * 60 * 1000; // 10 min
      } else if (rt.failCount >= 3) {
        rt.disabledUntilMs = now + 2 * 60 * 1000; // 2 min
      }

      if (attempt >= maxAttempts) {
        throw e;
      }

      await sleep(jitter(backoff));
      backoff = Math.min(6000, backoff * 2);
    }
  }

  return { xml: null, notModified: true };
}
// ---------------------------------------------------------------------------

async function processFeed(fi: FeedInfo) {
  ensureFeedSettings(fi);
  ensureFeedRuntime(fi.url);

  const s = feedSettings.get(fi.url)!;
  const rt = feedRuntime.get(fi.url)!;
  const budget = s.budget || 'standard';

  // compute interval (per-feed override)
  const intervalSec = Math.max(20, Math.min(3600, Number(s.intervalSec || fi.intervalSec || defaultIntervalForKind(fi.kind))));
  const now = Date.now();

  if (rt.nextPollAtMs && now < rt.nextPollAtMs) return;
  if (rt.disabledUntilMs && now < rt.disabledUntilMs) {
    rt.nextPollAtMs = now + intervalSec * 1000;
    return;
  }

  rt.nextPollAtMs = now + intervalSec * 1000;

  try {
    const { xml, notModified } = await fetchFeedXml(fi);
    if (notModified || !xml) return;

    const feed = await parser.parseString(xml);

    // improve label from feed title if missing
    if (feed.title && (!fi.label || fi.label === fi.url)) {
      fi.label = feed.title;
      s.label = feed.title;
      markDirty();
    }

    for (const item of feed.items) {
      const id = String(item.guid ?? item.link ?? item.title ?? '');
      const link = String(item.link ?? item.guid ?? '#');

      if (!id || seen.has(id)) continue;
      seen.add(id);

      if (seen.size > MAX_SEEN_IDS) {
        seen = new Set(Array.from(seen).slice(-SEEN_TRIM_TO));
      }

      const { published, publishedMs } = toPublishedMs(item);

      const title = item.title ?? '(no title)';
      const source = feed.title ?? labelForFeed(fi) ?? 'unknown';

      // match (+ embedding if AI)
      let isMatch = false;
      let matchScore = 0;
      let titleVec: number[] | null = null;

      try {
        const m = await hybridMatch(title);
        isMatch = m.isMatch;
        matchScore = m.score;
        titleVec = m.vec;
      } catch {
        const hit = substringHit(title);
        isMatch = hit;
        matchScore = hit ? 1 : 0;
        titleVec = null;
      }

      // global AI dedupe (across feeds)
      if (aiEnabled && titleVec) {
        if (isDuplicate(titleVec)) continue;
        addToDedupeWindow(titleVec, publishedMs);
      }

      // Filtered-only AI dedupe
      let filteredOk = isMatch;
      if (filteredOk && aiEnabled && FILTERED_AI_DEDUPE && titleVec) {
        if (isFilteredDuplicate(titleVec)) filteredOk = false;
        else addToFilteredDedupe(titleVec);
      }

      const ctx = pickRssContextCombined(item, 1500);

      const pkt: NewsInternal = {
        type: 'news',
        id,
        title,
        titleBg: undefined,
        titleEn: undefined,
        link,
        source,
        published,
        publishedMs,
        feedUrl: fi.url,
        isMatch,
        matchScore,
        filteredOk,
        summary: undefined,
        research: undefined,
        mood: undefined,
        newsType: undefined,
        __ctx: ctx
      };

      recent.push(pkt);
      if (recent.length > MAX_RECENT_ITEMS) recent.shift();

      // enqueue AI jobs (auto per-column)
      if (aiEnabled && aiAvailable) {
        const wantFeedSummary = s.summaryEnabled;
        const wantFilteredSummary =
          feedSettings.get(FILTERED_FEED_URL)?.summaryEnabled && filteredOk;

        const wantFeedResearch = s.researchEnabled;
        const wantFilteredResearch =
          feedSettings.get(FILTERED_FEED_URL)?.researchEnabled && filteredOk;

        if (wantFeedSummary || wantFilteredSummary) enqueueJob({ kind: 'summary', id, feedUrl: fi.url });
        if (budget === 'high') enqueueJob({ kind: 'title_translate', id, feedUrl: fi.url });
        enqueueJob({ kind: 'mood', id, feedUrl: fi.url });
        enqueueJob({ kind: 'news_type', id, feedUrl: fi.url });
        if (wantFeedResearch || wantFilteredResearch) enqueueJob({ kind: 'research', id, feedUrl: fi.url });
      }

      broadcastNewsUpdate(pkt);
    }

    markDirty();
  } catch (err) {
    console.error(`✗ ${fi.url}`, (err as Error).message);
    broadcastFeedError(fi, (err as Error).message);
    markDirty();
  }
}

// ---------------- Scheduler (per-feed interval) ----------------
let schedulerTimer: NodeJS.Timeout | null = null;

async function schedulerTick() {
  // run AI queue
  try { await tickAiQueue(); } catch {}

  const now = Date.now();
  for (const fi of feedsList) {
    // skip filtered pseudo-feed
    if (fi.url === FILTERED_FEED_URL) continue;

    ensureFeedSettings(fi);
    ensureFeedRuntime(fi.url);

    const rt = feedRuntime.get(fi.url)!;
    const s = feedSettings.get(fi.url)!;

    const intervalSec = Math.max(20, Math.min(3600, Number(s.intervalSec || fi.intervalSec)));
    if (!rt.nextPollAtMs) rt.nextPollAtMs = now + Math.floor(Math.random() * 6000);

    if (now >= rt.nextPollAtMs) {
      processFeed(fi).catch(() => {});
      // nextPollAtMs set inside processFeed()
    } else {
      // keep
    }
  }
}

function startScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = setInterval(schedulerTick, 350);
}
// ---------------------------------------------------------------

// ---------------- Load persisted state ----------------
function applyLoadedState(st: PersistedState | null) {
  if (!st || st.version !== 1) return;

  if (Array.isArray(st.keywords)) {
    keywords = normalizeKeywordList(st.keywords);
  }

  if (Array.isArray(st.feeds) && st.feeds.length) {
    feedsList = st.feeds;
  }

  if (st.feedSettings && typeof st.feedSettings === 'object') {
    for (const [url, s] of Object.entries(st.feedSettings)) {
      feedSettings.set(url, s);
    }
  }

  if (st.feedRuntime && typeof st.feedRuntime === 'object') {
    for (const [url, rt] of Object.entries(st.feedRuntime)) {
      feedRuntime.set(url, rt);
    }
  }

  if (Array.isArray(st.hiddenIds)) {
    for (const id of st.hiddenIds) hiddenIds.add(id);
  }

  if (Array.isArray(st.recent)) {
    // restore recent items
    for (const it of st.recent) {
      if (it && it.id && it.title) recent.push(it);
      if (it?.id) seen.add(it.id);
    }
  }

  // ensure settings for all feeds
  for (const fi of feedsList) ensureFeedSettings(fi);

  // ensure filtered settings exist too
  if (!feedSettings.has(FILTERED_FEED_URL)) {
    feedSettings.set(FILTERED_FEED_URL, {
      summaryEnabled: SUMMARY_DEFAULT_FILTERED,
      researchEnabled: RESEARCH_DEFAULT_FILTERED,
      budget: 'standard',
      sortMode: 'newest',
      filters: { onlyMatches: true, onlyResearched: false, onlySummaries: false },
      intervalSec: 0,
      kind: 'rss',
      label: 'Filtered'
    });
  }
}

async function loadState() {
  ensureDataDir();
  const dbState = await readStateFromDb();
  if (dbState) {
    applyLoadedState(dbState);
    return;
  }
  const fileState = safeReadJson<PersistedState>(STATE_PATH);
  applyLoadedState(fileState);
}
// ------------------------------------------------------

// ensure filtered pseudo-feed exists in settings
if (!feedSettings.has(FILTERED_FEED_URL)) {
  feedSettings.set(FILTERED_FEED_URL, {
    summaryEnabled: SUMMARY_DEFAULT_FILTERED,
    researchEnabled: RESEARCH_DEFAULT_FILTERED,
    budget: 'standard',
    sortMode: 'newest',
    filters: { onlyMatches: true, onlyResearched: false, onlySummaries: false },
    intervalSec: 0,
    kind: 'rss',
    label: 'Filtered'
  });
}

// ---------------- WebSocket handling ----------------
wss.on('connection', (ws: WebSocket) => {
  const askAgentCountByItem = new Map<string, number>();
  const activeSelection = currentModelSelection(aiProvider);

  ws.send(JSON.stringify({
    type: 'config',
    keywords,

    aiProvider,
    aiAvailable,
    aiEnabled,

    summaryLang,
    researchLang,
    summaryModel: activeSelection.summary,
    researchModel: activeSelection.research,
    askModel: activeSelection.ask,
    availableModels: modelOptionsByProvider,

    matchThreshold: MATCH_THRESHOLD,
    dedupeThreshold: DEDUPE_THRESHOLD,

    filteredAiDedupe: FILTERED_AI_DEDUPE,
    filteredDedupeThreshold: FILTERED_DEDUPE_THRESHOLD,

    feeds: currentFeeds(),
    feedSettings: feedSettingsObj(),
    hiddenIds: Array.from(hiddenIds),
    aiUsageInputTokens,
    aiUsageOutputTokens,
    aiUsageTotalTokens
  } satisfies Config));

  // Send snapshot (newest first)
  const snapshot = recent.slice().sort((a, b) => b.publishedMs - a.publishedMs);
  snapshot.forEach(item => {
    if (!hiddenIds.has(item.id)) ws.send(JSON.stringify(item));
  });

  ws.on('message', async data => {
    let raw: unknown;
    try { raw = JSON.parse(String(data)); } catch { return; }

    // Handle keyword updates directly from raw payload too, so this works
    // even if a stale @ai-news/shared build is still in use at runtime.
    if (raw && typeof raw === 'object' && (raw as { type?: unknown }).type === 'set_keywords') {
      const beforeMatchCount = recent.reduce((acc, it) => acc + (it.isMatch ? 1 : 0), 0);
      keywords = parseKeywordsPayload((raw as { keywords?: unknown }).keywords);

      titleVecCache.clear();
      filteredDedupeWindow = [];
      keywordVecs = [];

      await initKeywordEmbeddings();
      await refreshMatchStateForRecent();
      broadcastConfig();

      const afterMatchCount = recent.reduce((acc, it) => acc + (it.isMatch ? 1 : 0), 0);
      ws.send(JSON.stringify({
        type: 'ok',
        message: `Updated ${keywords.length} keywords. Reprocessed ${recent.length} stored news items (${beforeMatchCount} -> ${afterMatchCount} matches).`
      }));
      markDirty();
      return;
    }

    if (raw && typeof raw === 'object' && (raw as { type?: unknown }).type === 'run_title_translate_item') {
      const id = String((raw as { id?: unknown }).id || '').trim();
      const feedUrl = String((raw as { feedUrl?: unknown }).feedUrl || '').trim();
      if (!id || !feedUrl) return;
      if (!aiEnabled || !aiAvailable || activeModel('summary') === 'none') return;

      const it = recent.find(x => x.id === id && x.feedUrl === feedUrl) || recent.find(x => x.id === id);
      if (!it) return;
      enqueueJob({ kind: 'title_translate', id: it.id, feedUrl: it.feedUrl, manual: true });
      ws.send(JSON.stringify({ type: 'ok', message: 'Title translation requested.' }));
      return;
    }

    if (raw && typeof raw === 'object' && (raw as { type?: unknown }).type === 'run_title_translate_backfill') {
      if (!aiEnabled || !aiAvailable || activeModel('summary') === 'none') return;
      const feedUrl = String((raw as { feedUrl?: unknown }).feedUrl || '').trim();
      const maxRaw = Number((raw as { max?: unknown }).max);
      const max = Number.isFinite(maxRaw) ? Math.max(1, Math.min(2_000, Math.floor(maxRaw))) : 500;
      const done = enqueueTitleTranslateBackfill({
        feedUrl: feedUrl || undefined,
        max,
        manual: true
      });
      ws.send(JSON.stringify({ type: 'ok', message: `Queued ${done} title translations.` }));
      return;
    }

    const parsed = clientMsgSchema.safeParse(raw);
    if (!parsed.success) return;
    const msg: ClientMsg = parsed.data;

    if (msg.type === 'toggle_ai') {
      const desired = !!msg.enabled;
      aiEnabled = desired && aiAvailable;

      // reset AI-dependent caches/windows
      titleVecCache.clear();
      dedupeWindow = [];
      filteredDedupeWindow = [];

      aiQueue.length = 0;
      aiInFlight.clear();

      await initKeywordEmbeddings();
      if (aiEnabled && aiAvailable) {
        enqueueTitleTranslateBackfill({ max: 360 });
      }
      broadcastConfig();
      markDirty();
      return;
    }

    if (msg.type === 'set_ai_provider') {
      const provider = msg.provider;
      const nextKey = typeof msg.apiKey === 'string' ? msg.apiKey.trim() : '';
      if (typeof msg.apiKey === 'string' && !nextKey) {
        ws.send(JSON.stringify({ type: 'error', message: 'API key is required for provider switch.' }));
        return;
      }

      aiProvider = provider;
      if (nextKey) {
        setAiProviderKey(provider, nextKey);
      } else {
        refreshAiClients();
      }

      aiEnabled = aiEnabled && aiAvailable;

      titleVecCache.clear();
      dedupeWindow = [];
      filteredDedupeWindow = [];
      aiQueue.length = 0;
      aiInFlight.clear();

      await initKeywordEmbeddings();
      if (aiEnabled && aiAvailable) {
        enqueueTitleTranslateBackfill({ max: 360 });
      }
      broadcastConfig();
      ws.send(JSON.stringify({
        type: 'ok',
        message: `AI provider switched to ${provider}`
      }));
      markDirty();
      return;
    }

    if (msg.type === 'set_ai_models') {
      const provider = aiProvider;
      const current = selectedModelsByProvider[provider];
      const updates: Partial<AiModelSelection> = {};
      const rejected: string[] = [];
      if (!msg.summaryModel && !msg.researchModel && !msg.askModel) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'At least one model must be provided.'
        }));
        return;
      }

      if (msg.summaryModel) {
        if (providerSupportsModel(provider, 'summary', msg.summaryModel)) {
          updates.summary = msg.summaryModel;
        } else {
          rejected.push(`summary=${msg.summaryModel}`);
        }
      }
      if (msg.researchModel) {
        if (providerSupportsModel(provider, 'research', msg.researchModel)) {
          updates.research = msg.researchModel;
        } else {
          rejected.push(`research=${msg.researchModel}`);
        }
      }
      if (msg.askModel) {
        if (providerSupportsModel(provider, 'ask', msg.askModel)) {
          updates.ask = msg.askModel;
        } else {
          rejected.push(`ask=${msg.askModel}`);
        }
      }

      if (rejected.length > 0) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unsupported model for ${provider}: ${rejected.join(', ')}`
        }));
        return;
      }

      if (updates.summary) current.summary = updates.summary;
      if (updates.research) current.research = updates.research;
      if (updates.ask) current.ask = updates.ask;

      aiQueue.length = 0;
      aiInFlight.clear();

      broadcastConfig();
      markDirty();
      return;
    }

    if (msg.type === 'set_summary_lang') {
      const lang = msg.lang;
      if (lang === 'bg' || lang === 'en' || lang === 'bilingual') {
        const prev = summaryLang;
        summaryLang = lang;
        broadcastConfig();

        // Re-render existing summaries in the newly selected global language.
        if (prev !== lang && aiEnabled && aiAvailable && activeModel('summary') !== 'none') {
          const MAX = 260;
          const list = recent.slice().sort((a, b) => b.publishedMs - a.publishedMs);
          let done = 0;
          for (const it of list) {
            if (done >= MAX) break;
            if (hiddenIds.has(it.id)) continue;
            if (!shouldHaveSummary(it)) continue;
            if (!it.summary || !it.summary.trim()) continue;

            it.summary = '';
            enqueueJob({ kind: 'summary', id: it.id, feedUrl: it.feedUrl });
            broadcastNewsUpdate(it);
            done++;
          }
          if (done > 0) {
            ws.send(JSON.stringify({
              type: 'ok',
              message: `Refreshing ${done} summaries for ${lang.toUpperCase()}`
            }));
          }
        }

        markDirty();
      }
      return;
    }

    if (msg.type === 'set_research_lang') {
      const lang = msg.lang;
      if (lang === 'bg' || lang === 'en') {
        researchLang = lang;
        broadcastConfig();
        markDirty();
      }
      return;
    }

    if (msg.type === 'set_keywords') {
      const beforeMatchCount = recent.reduce((acc, it) => acc + (it.isMatch ? 1 : 0), 0);
      keywords = parseKeywordsPayload(msg.keywords);

      titleVecCache.clear();
      filteredDedupeWindow = [];
      keywordVecs = [];

      await initKeywordEmbeddings();
      await refreshMatchStateForRecent();
      broadcastConfig();
      const afterMatchCount = recent.reduce((acc, it) => acc + (it.isMatch ? 1 : 0), 0);
      ws.send(JSON.stringify({
        type: 'ok',
        message: `Updated ${keywords.length} keywords. Reprocessed ${recent.length} stored news items (${beforeMatchCount} -> ${afterMatchCount} matches).`
      }));
      markDirty();
      return;
    }

    if (msg.type === 'set_feed_summary') {
      const feedUrl = String(msg.feedUrl || '').trim();
      const enabled = !!msg.enabled;
      if (!feedUrl) return;

      if (!feedSettings.has(feedUrl)) {
        feedSettings.set(feedUrl, defaultSettingsForFeed({ url: feedUrl, label: feedUrl, kind: 'rss', intervalSec: 120 }));
      }

      feedSettings.get(feedUrl)!.summaryEnabled = enabled;
      broadcastConfig();

      for (const it of recent) {
        if (!eligibleForFeed(it, feedUrl)) continue;
        if (!it.summary && !it.research) continue;
        it.summary = '';
        it.research = '';
        if (enabled && aiEnabled && aiAvailable && activeModel('summary') !== 'none') {
          enqueueJob({ kind: 'summary', id: it.id, feedUrl: it.feedUrl });
        }
        broadcastNewsUpdate(it);
      }

      // enqueue bounded backfill
      if (enabled && aiEnabled && aiAvailable && activeModel('summary') !== 'none') {
        const MAX = 220;
        const list = recent.slice().sort((a, b) => b.publishedMs - a.publishedMs);
        let done = 0;
        for (const it of list) {
          if (done >= MAX) break;
          if (!eligibleForFeed(it, feedUrl)) continue;
          if (it.summary && it.summary.trim()) continue;
          const before = hasSummaryJobQueuedOrRunning(it.id, it.feedUrl);
          enqueueJob({ kind: 'summary', id: it.id, feedUrl: it.feedUrl });
          const after = hasSummaryJobQueuedOrRunning(it.id, it.feedUrl);
          if (!before && after) done++;
          broadcastNewsUpdate(it);
        }
      }

      if (!enabled) {
        // ensure summaryPending is cleared on UI for this feed when summary is turned off
        for (const it of recent) {
          if (!eligibleForFeed(it, feedUrl)) continue;
          broadcastNewsUpdate(it);
        }
      }

      markDirty();
      return;
    }

    if (msg.type === 'set_feed_research') {
      const feedUrl = String(msg.feedUrl || '').trim();
      const enabled = !!msg.enabled;
      if (!feedUrl) return;

      if (!feedSettings.has(feedUrl)) {
        feedSettings.set(feedUrl, defaultSettingsForFeed({ url: feedUrl, label: feedUrl, kind: 'rss', intervalSec: 120 }));
      }

      feedSettings.get(feedUrl)!.researchEnabled = enabled;
      broadcastConfig();

      for (const it of recent) {
        if (!eligibleForFeed(it, feedUrl)) continue;
        if (!it.summary && !it.research) continue;
        it.summary = '';
        it.research = '';
        broadcastNewsUpdate(it);
      }

      // bounded backfill research
      if (enabled && aiEnabled && aiAvailable && activeModel('research') !== 'none') {
        const MAX = 120;
        const list = recent.slice().sort((a, b) => b.publishedMs - a.publishedMs);
        let done = 0;
        for (const it of list) {
          if (done >= MAX) break;
          if (!eligibleForFeed(it, feedUrl)) continue;
          if (it.research && it.research.trim()) continue;
          enqueueJob({ kind: 'research', id: it.id, feedUrl: it.feedUrl });
          done++;
        }
      }

      markDirty();
      return;
    }

    if (msg.type === 'set_feed_budget') {
      const feedUrl = String(msg.feedUrl || '').trim();
      const budget = msg.budget;
      if (!feedUrl) return;
      if (budget !== 'low' && budget !== 'standard' && budget !== 'high') return;

      if (!feedSettings.has(feedUrl)) {
        feedSettings.set(feedUrl, defaultSettingsForFeed({ url: feedUrl, label: feedUrl, kind: 'rss', intervalSec: 120 }));
      }

      feedSettings.get(feedUrl)!.budget = budget;

      if (budget === 'high' && aiEnabled && aiAvailable && activeModel('summary') !== 'none') {
        const MAX = 260;
        const list = recent.slice().sort((a, b) => b.publishedMs - a.publishedMs);
        let done = 0;
        for (const it of list) {
          if (done >= MAX) break;
          if (!eligibleForFeed(it, feedUrl)) continue;
          if (!needsTitleTranslation(it.title, it.titleBg, it.titleEn)) continue;
          enqueueJob({ kind: 'title_translate', id: it.id, feedUrl: it.feedUrl });
          done++;
        }
      }

      broadcastConfig();
      markDirty();
      return;
    }

    if (msg.type === 'set_all_budget') {
      const budget = msg.budget;
      if (budget !== 'low' && budget !== 'standard' && budget !== 'high') return;

      for (const fi of currentFeeds()) {
        if (!feedSettings.has(fi.url)) {
          feedSettings.set(fi.url, defaultSettingsForFeed(fi));
        }
        feedSettings.get(fi.url)!.budget = budget;
      }

      if (feedSettings.has(FILTERED_FEED_URL)) {
        feedSettings.get(FILTERED_FEED_URL)!.budget = budget;
      }

      if (budget === 'high' && aiEnabled && aiAvailable && activeModel('summary') !== 'none') {
        const MAX = 420;
        const list = recent.slice().sort((a, b) => b.publishedMs - a.publishedMs);
        let done = 0;
        for (const it of list) {
          if (done >= MAX) break;
          if (!needsTitleTranslation(it.title, it.titleBg, it.titleEn)) continue;
          enqueueJob({ kind: 'title_translate', id: it.id, feedUrl: it.feedUrl });
          done++;
        }
      }

      broadcastConfig();
      markDirty();
      return;
    }

    if (msg.type === 'set_feed_interval') {
      const feedUrl = String(msg.feedUrl || '').trim();
      const intervalSec = Number(msg.intervalSec);
      if (!feedUrl || !Number.isFinite(intervalSec)) return;

      const v = Math.max(20, Math.min(3600, Math.floor(intervalSec)));

      if (!feedSettings.has(feedUrl)) {
        feedSettings.set(feedUrl, defaultSettingsForFeed({ url: feedUrl, label: feedUrl, kind: 'rss', intervalSec: v }));
      }

      feedSettings.get(feedUrl)!.intervalSec = v;

      // update feedsList display interval too
      const fi = feedsList.find(x => x.url === feedUrl);
      if (fi) fi.intervalSec = v;

      broadcastConfig();
      markDirty();
      return;
    }

    if (msg.type === 'set_feed_column_settings') {
      const feedUrl = String(msg.feedUrl || '').trim();
      if (!feedUrl) return;

      const sortMode = msg.sortMode;
      const filters = msg.filters;

      if (!feedSettings.has(feedUrl)) {
        feedSettings.set(feedUrl, defaultSettingsForFeed({ url: feedUrl, label: feedUrl, kind: 'rss', intervalSec: 120 }));
      }

      const s = feedSettings.get(feedUrl)!;

      if (sortMode === 'newest' || sortMode === 'oldest' || sortMode === 'matched') {
        s.sortMode = sortMode;
      }

      if (filters && typeof filters === 'object') {
        s.filters = {
          onlyMatches: !!filters.onlyMatches,
          onlyResearched: !!filters.onlyResearched,
          onlySummaries: !!filters.onlySummaries
        };
      }

      broadcastConfig();
      markDirty();
      return;
    }

    if (msg.type === 'hide_item') {
      const id = String(msg.id || '').trim();
      if (!id) return;
      hiddenIds.add(id);
      broadcastConfig();
      markDirty();
      return;
    }

    if (msg.type === 'unhide_item') {
      const id = String(msg.id || '').trim();
      if (!id) return;
      hiddenIds.delete(id);
      broadcastConfig();
      markDirty();
      return;
    }

    if (msg.type === 'run_research_item') {
      if (!aiEnabled || !aiAvailable || activeModel('research') === 'none') return;
      const id = String(msg.id || '').trim();
      if (!id) return;

      const it = recent.find(x => x.id === id);
      if (it) {
        it.summary = '';
        it.research = '';
        broadcastNewsUpdate(it);
        markDirty();
      }

      enqueueJob({ kind: 'research', id, feedUrl: String(msg.feedUrl || ''), manual: true });
      return;
    }

    if (msg.type === 'run_summary_item') {
      if (!aiEnabled || !aiAvailable || activeModel('summary') === 'none') return;
      const id = String(msg.id || '').trim();
      if (!id) return;

      const it = recent.find(x => x.id === id);
      if (it) {
        it.summary = '';
        it.research = '';
      }
      enqueueJob({ kind: 'summary', id, feedUrl: String(msg.feedUrl || ''), manual: true });
      if (it) {
        broadcastNewsUpdate(it);
        markDirty();
      }
      return;
    }

    if (msg.type === 'ask_agent_item') {
      if (!aiEnabled || !aiAvailable || activeModel('ask') === 'none') {
        const unavailable: AskAgentReply = {
          type: 'ask_agent_reply',
          id: String(msg.id || ''),
          feedUrl: String(msg.feedUrl || ''),
          question: String(msg.question || ''),
          error: 'AI is unavailable right now.',
          used: 0,
          remaining: ASK_AGENT_MAX_QUESTIONS
        };
        ws.send(JSON.stringify(unavailable));
        return;
      }

      const id = String(msg.id || '').trim();
      const feedUrl = String(msg.feedUrl || '').trim();
      const question = String(msg.question || '').trim().slice(0, ASK_AGENT_MAX_CHARS);
      if (!id || !question) return;

      const it = recent.find(x => x.id === id && x.feedUrl === feedUrl) || recent.find(x => x.id === id);
      if (!it) {
        const notFound: AskAgentReply = {
          type: 'ask_agent_reply',
          id,
          feedUrl,
          question,
          error: 'News item not found. Try again from the latest card.',
          used: 0,
          remaining: ASK_AGENT_MAX_QUESTIONS
        };
        ws.send(JSON.stringify(notFound));
        return;
      }

      const key = `${it.feedUrl}::${it.id}`;
      const usedBefore = askAgentCountByItem.get(key) || 0;
      if (usedBefore >= ASK_AGENT_MAX_QUESTIONS) {
        const limit: AskAgentReply = {
          type: 'ask_agent_reply',
          id: it.id,
          feedUrl: feedUrl || it.feedUrl,
          question,
          error: `Question limit reached for this news (${ASK_AGENT_MAX_QUESTIONS}/${ASK_AGENT_MAX_QUESTIONS}).`,
          used: ASK_AGENT_MAX_QUESTIONS,
          remaining: 0
        };
        ws.send(JSON.stringify(limit));
        return;
      }

      const usedNow = usedBefore + 1;
      askAgentCountByItem.set(key, usedNow);

      const budget = feedSettings.get(it.feedUrl)?.budget || 'standard';
      const requestedResearchMode = msg.researchMode === 'force' || msg.researchMode === 'reuse'
        ? msg.researchMode
        : 'auto';
      try {
        // Ask latency policy:
        // - force: always refresh research first
        // - reuse: never refresh research first
        // - auto (default): refresh only for high budget OR when no research exists yet
        const hasExistingResearch = !!String(it.research || '').trim();
        const shouldRefreshResearch = requestedResearchMode === 'force'
          ? true
          : requestedResearchMode === 'reuse'
            ? false
            : (budget === 'high' || !hasExistingResearch);

        let chatResearch = '';
        if (shouldRefreshResearch) {
          const ctx = it.__ctx || '';
          const linkText = it.__linkText || '';
          try {
            const refreshedResearch = await withTimeout(
              oneItemResearch(it.title, it.source, it.link, ctx, linkText, budget),
              ASK_AGENT_RESEARCH_TIMEOUT_MS,
              'ask_agent_research'
            );
            if (refreshedResearch) {
              // Keep chat-triggered research private to Ask Agent panel.
              chatResearch = refreshedResearch;
            }
          } catch {
            // Do not fail Ask Agent when optional refresh-research is slow.
          }
        }

        const answer = await withTimeout(
          askAgentAboutItem(question, it, budget, chatResearch),
          ASK_AGENT_ANSWER_TIMEOUT_MS,
          'ask_agent_answer'
        );
        const ok: AskAgentReply = {
          type: 'ask_agent_reply',
          id: it.id,
          feedUrl: feedUrl || it.feedUrl,
          question,
          answer: answer || 'I can only answer questions about this specific news item.',
          used: usedNow,
          remaining: Math.max(0, ASK_AGENT_MAX_QUESTIONS - usedNow)
        };
        ws.send(JSON.stringify(ok));
      } catch {
        // Do not consume quota on transport/model failure.
        askAgentCountByItem.set(key, usedBefore);
        const fail: AskAgentReply = {
          type: 'ask_agent_reply',
          id: it.id,
          feedUrl: feedUrl || it.feedUrl,
          question,
          error: 'Ask Agent failed. Please try again.',
          used: usedBefore,
          remaining: Math.max(0, ASK_AGENT_MAX_QUESTIONS - usedBefore)
        };
        ws.send(JSON.stringify(fail));
      }
      return;
    }

    if (msg.type === 'add_feed') {
      const url = String(msg.url || '').trim();
      if (!url) return;

      let parsed: URL;
      try { parsed = new URL(url); } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid URL' }));
        return;
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        ws.send(JSON.stringify({ type: 'error', message: 'URL must be http/https' }));
        return;
      }

      const kind: FeedKind = (msg.kind === 'reddit' || msg.kind === 'youtube') ? msg.kind : 'rss';

      const intervalSecRaw = Number(msg.intervalSec);
      const intervalSec = Number.isFinite(intervalSecRaw)
        ? Math.max(20, Math.min(3600, Math.floor(intervalSecRaw)))
        : defaultIntervalForKind(kind);

      const label = String(msg.label || '').trim() || parsed.hostname;

      if (!feedsList.some(f => f.url === url)) {
        const fi: FeedInfo = { url, label, kind, intervalSec };
        feedsList.push(fi);
        ensureFeedSettings(fi);
        feedSettings.get(url)!.intervalSec = intervalSec;
        feedSettings.get(url)!.kind = kind;
        feedSettings.get(url)!.label = label;
        ensureFeedRuntime(url);

        markDirty();
      }

      broadcastConfig();
      ws.send(JSON.stringify({ type: 'ok', message: `Added feed: ${label}` }));
      return;
    }

    if (msg.type === 'remove_feed') {
      const feedUrl = String(msg.feedUrl || '').trim();
      if (!feedUrl || feedUrl === FILTERED_FEED_URL) return;

      const before = feedsList.length;
      feedsList = feedsList.filter(f => f.url !== feedUrl);
      if (feedsList.length === before) {
        ws.send(JSON.stringify({ type: 'error', message: 'Feed not found' }));
        return;
      }

      feedSettings.delete(feedUrl);
      feedRuntime.delete(feedUrl);

      // Drop queued AI work for removed feed.
      for (let i = aiQueue.length - 1; i >= 0; i--) {
        if (aiQueue[i].feedUrl === feedUrl) aiQueue.splice(i, 1);
      }

      // Remove recent items for removed feed so it fully disappears from client snapshots.
      for (let i = recent.length - 1; i >= 0; i--) {
        if (recent[i].feedUrl === feedUrl) recent.splice(i, 1);
      }

      broadcastConfig();
      ws.send(JSON.stringify({ type: 'ok', message: `Removed feed` }));
      markDirty();
      return;
    }
  });
});

// ---------------- Startup ----------------
(async () => {
  await loadState();

  // ensure settings for each feed
  for (const fi of feedsList) ensureFeedSettings(fi);

  // load embeddings once
  if (aiEnabled) await initKeywordEmbeddings();
  if (aiEnabled && aiAvailable) {
    enqueueTitleTranslateBackfill({ max: 420 });
  }

  // start scheduler
  startScheduler();

  if (RUNTIME_MS > 0) {
    console.log(`Runtime limit set to ${RUNTIME_HOURS} hours`);
    setTimeout(() => shutdown(`runtime limit reached (${RUNTIME_HOURS} hours)`), RUNTIME_MS);
  }
})();
