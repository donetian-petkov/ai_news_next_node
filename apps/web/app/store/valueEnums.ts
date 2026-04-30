import {
  type BudgetMode,
  type FeedKind,
  type MoodFilter,
  type NewsMood,
  NewsMoodFilterValue,
  NewsMoodValue,
  type NewsType,
  NewsTypeFilterValue,
  NewsTypeValue,
  type SortMode,
  type TypeFilter
} from './types';

export enum PrimitiveType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object'
}

export enum WsMessageType {
  News = 'news',
  FeedPage = 'feed_page',
  Config = 'config',
  AiUsage = 'ai_usage',
  DailyBriefing = 'daily_briefing',
  AskAgentReply = 'ask_agent_reply',
  Error = 'error',
  Ok = 'ok',
  FeedError = 'feed_error'
}

export enum FeedKindValue {
  Rss = 'rss',
  Reddit = 'reddit',
  Youtube = 'youtube'
}

export enum BudgetModeValue {
  Low = 'low',
  Standard = 'standard',
  High = 'high'
}

export enum SortModeValue {
  Newest = 'newest',
  Oldest = 'oldest',
  Matched = 'matched'
}

export enum AiProviderValue {
  OpenAI = 'openai',
  Claude = 'claude',
  OpenRouter = 'openrouter'
}

export enum SummaryLangValue {
  Bg = 'bg',
  En = 'en',
  Bilingual = 'bilingual'
}

export enum ResearchLangValue {
  Bg = 'bg',
  En = 'en'
}

export enum FontPresetValue {
  System = 'system',
  Manrope = 'manrope',
  Grotesk = 'grotesk',
  Sora = 'sora',
  Plex = 'plex',
  Serif = 'serif',
  Mono = 'mono'
}

export enum FontSizeValue {
  Sm = 'sm',
  Md = 'md',
  Lg = 'lg',
  Xl = 'xl'
}

const BUDGET_MODE_SET = new Set<BudgetMode>(Object.values(BudgetModeValue) as BudgetMode[]);
const SORT_MODE_SET = new Set<SortMode>(Object.values(SortModeValue) as SortMode[]);
const FEED_KIND_SET = new Set<FeedKind>(Object.values(FeedKindValue) as FeedKind[]);
const NEWS_MOOD_SET = new Set<NewsMood>(Object.values(NewsMoodValue) as NewsMood[]);
const NEWS_TYPE_SET = new Set<NewsType>(Object.values(NewsTypeValue) as NewsType[]);
const NEWS_MOOD_FILTER_SET = new Set<MoodFilter>(Object.values(NewsMoodFilterValue) as MoodFilter[]);
const NEWS_TYPE_FILTER_SET = new Set<TypeFilter>(Object.values(NewsTypeFilterValue) as TypeFilter[]);
const FONT_PRESET_SET = new Set<string>(Object.values(FontPresetValue));
const FONT_SIZE_SET = new Set<string>(Object.values(FontSizeValue));
const AI_PROVIDER_SET = new Set<string>(Object.values(AiProviderValue));
const SUMMARY_LANG_SET = new Set<string>(Object.values(SummaryLangValue));
const RESEARCH_LANG_SET = new Set<string>(Object.values(ResearchLangValue));

export function isString(value: unknown): value is string {
  return typeof value === PrimitiveType.String;
}

export function isNumber(value: unknown): value is number {
  return typeof value === PrimitiveType.Number;
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === PrimitiveType.Boolean;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === PrimitiveType.Object;
}

export function isBudgetMode(value: unknown): value is BudgetMode {
  return isString(value) && BUDGET_MODE_SET.has(value as BudgetMode);
}

export function isSortMode(value: unknown): value is SortMode {
  return isString(value) && SORT_MODE_SET.has(value as SortMode);
}

export function isFeedKind(value: unknown): value is FeedKind {
  return isString(value) && FEED_KIND_SET.has(value as FeedKind);
}

export function isNewsMood(value: unknown): value is NewsMood {
  return isString(value) && NEWS_MOOD_SET.has(value as NewsMood);
}

export function isNewsType(value: unknown): value is NewsType {
  return isString(value) && NEWS_TYPE_SET.has(value as NewsType);
}

export function isMoodFilter(value: unknown): value is MoodFilter {
  return isString(value) && NEWS_MOOD_FILTER_SET.has(value as MoodFilter);
}

export function isTypeFilter(value: unknown): value is TypeFilter {
  return isString(value) && NEWS_TYPE_FILTER_SET.has(value as TypeFilter);
}

export function isAiProvider(value: unknown): value is AiProviderValue {
  return isString(value) && AI_PROVIDER_SET.has(value);
}

export function isFontPreset(value: unknown): value is FontPresetValue {
  return isString(value) && FONT_PRESET_SET.has(value);
}

export function isFontSize(value: unknown): value is FontSizeValue {
  return isString(value) && FONT_SIZE_SET.has(value);
}

export function isSummaryLang(value: unknown): value is SummaryLangValue {
  return isString(value) && SUMMARY_LANG_SET.has(value);
}

export function isResearchLang(value: unknown): value is ResearchLangValue {
  return isString(value) && RESEARCH_LANG_SET.has(value);
}
