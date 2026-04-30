import { z } from 'zod';

export const summaryLangSchema = z.union([z.literal('bg'), z.literal('en'), z.literal('bilingual')]);
export const researchLangSchema = z.union([z.literal('bg'), z.literal('en')]);
export const feedKindSchema = z.union([z.literal('rss'), z.literal('reddit'), z.literal('youtube')]);
export const budgetModeSchema = z.union([z.literal('low'), z.literal('standard'), z.literal('high')]);
export const sortModeSchema = z.union([z.literal('newest'), z.literal('oldest'), z.literal('matched')]);
export const aiProviderSchema = z.union([z.literal('openai'), z.literal('claude'), z.literal('openrouter')]);
export const aiModelIdSchema = z.string().trim().min(1);
export const briefingDeliverySchema = z.union([z.literal('site'), z.literal('email')]);
export const briefingFormatSchema = z.union([z.literal('executive'), z.literal('bullets'), z.literal('narrative')]);
export const aiFeatureSettingsSchema = z.object({
  biasDetection: z.boolean().optional(),
  sensationalismDetection: z.boolean().optional(),
  factHighlights: z.boolean().optional(),
  storyImpact: z.boolean().optional(),
  dailyBriefing: z.boolean().optional(),
  topicTracking: z.boolean().optional(),
  perspectiveSimulator: z.boolean().optional(),
  emergingStoryDetector: z.boolean().optional(),
  historicalComparison: z.boolean().optional(),
  futureScenarioGenerator: z.boolean().optional(),
  localImpactDetector: z.boolean().optional()
});

export const columnFiltersSchema = z.object({
  onlyMatches: z.boolean(),
  onlyResearched: z.boolean(),
  onlySummaries: z.boolean(),
});

export const feedPageCursorSchema = z.object({
  beforePublishedMs: z.number(),
  beforeId: z.string().trim().min(1)
});

export const clientMsgSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('toggle_ai'), enabled: z.boolean() }),
  z.object({ type: z.literal('set_ai_provider'), provider: aiProviderSchema, apiKey: z.string().optional() }),
  z.object({
    type: z.literal('set_ai_models'),
    summaryModel: aiModelIdSchema.optional(),
    researchModel: aiModelIdSchema.optional(),
    askModel: aiModelIdSchema.optional()
  }),
  z.object({ type: z.literal('set_summary_lang'), lang: summaryLangSchema }),
  z.object({ type: z.literal('set_research_lang'), lang: researchLangSchema }),
  z.object({
    type: z.literal('set_keywords'),
    keywords: z.union([
      z.string(),
      z.array(z.string())
    ])
  }),
  z.object({
    type: z.literal('set_ai_features'),
    features: aiFeatureSettingsSchema.optional(),
    localRegion: z.string().trim().min(1).max(120).optional(),
    trackedTopics: z.array(z.string().trim().min(1).max(120)).max(80).optional()
  }),
  z.object({ type: z.literal('add_feed'), url: z.string(), label: z.string().optional(), kind: feedKindSchema.optional(), intervalSec: z.number().optional() }),
  z.object({ type: z.literal('remove_feed'), feedUrl: z.string() }),
  z.object({ type: z.literal('set_feed_summary'), feedUrl: z.string(), enabled: z.boolean() }),
  z.object({ type: z.literal('set_feed_translation'), feedUrl: z.string(), enabled: z.boolean() }),
  z.object({ type: z.literal('set_feed_research'), feedUrl: z.string(), enabled: z.boolean() }),
  z.object({ type: z.literal('set_feed_budget'), feedUrl: z.string(), budget: budgetModeSchema }),
  z.object({ type: z.literal('set_all_budget'), budget: budgetModeSchema }),
  z.object({ type: z.literal('set_feed_interval'), feedUrl: z.string(), intervalSec: z.number() }),
  z.object({ type: z.literal('set_feed_column_settings'), feedUrl: z.string(), sortMode: sortModeSchema, filters: columnFiltersSchema }),
  z.object({ type: z.literal('hide_item'), id: z.string() }),
  z.object({ type: z.literal('unhide_item'), id: z.string() }),
  z.object({ type: z.literal('run_research_item'), id: z.string(), feedUrl: z.string() }),
  z.object({ type: z.literal('run_summary_item'), id: z.string(), feedUrl: z.string() }),
  z.object({
    type: z.literal('load_feed_page'),
    feedUrl: z.string(),
    limit: z.number().optional(),
    cursor: feedPageCursorSchema.optional(),
    replace: z.boolean().optional()
  }),
  z.object({
    type: z.literal('run_item_auto'),
    id: z.string(),
    feedUrl: z.string(),
    summary: z.boolean().optional(),
    research: z.boolean().optional(),
    titleTranslate: z.boolean().optional(),
    mood: z.boolean().optional(),
    newsType: z.boolean().optional()
  }),
  z.object({
    type: z.literal('generate_daily_briefing'),
    delivery: briefingDeliverySchema.optional(),
    email: z.string().trim().max(200).optional(),
    format: briefingFormatSchema.optional(),
    includeAudio: z.boolean().optional(),
    feedUrls: z.array(z.string()).max(80).optional()
  }),
  z.object({ type: z.literal('ask_agent_item'), id: z.string(), feedUrl: z.string(), question: z.string(), researchMode: z.union([z.literal('auto'), z.literal('force'), z.literal('reuse')]).optional() }),
]);

export type ClientMsg = z.infer<typeof clientMsgSchema>;
