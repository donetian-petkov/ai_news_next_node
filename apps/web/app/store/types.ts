export type FeedKind = 'rss' | 'reddit' | 'youtube';
export type BudgetMode = 'low' | 'standard' | 'high';
export type SortMode = 'newest' | 'oldest' | 'matched';

export enum NewsMoodValue {
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

export enum NewsTypeValue {
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

export enum NewsMoodFilterValue {
  All = 'all',
  Pesimistic = NewsMoodValue.Pesimistic,
  Optimistic = NewsMoodValue.Optimistic,
  Realistic = NewsMoodValue.Realistic,
  Melancholy = NewsMoodValue.Melancholy,
  Happiness = NewsMoodValue.Happiness,
  Sadness = NewsMoodValue.Sadness,
  Rage = NewsMoodValue.Rage,
  Uncertainty = NewsMoodValue.Uncertainty,
  Neutral = NewsMoodValue.Neutral,
  Curios = NewsMoodValue.Curios
}

export enum NewsTypeFilterValue {
  All = 'all',
  Science = NewsTypeValue.Science,
  Movies = NewsTypeValue.Movies,
  Politics = NewsTypeValue.Politics,
  Business = NewsTypeValue.Business,
  Technology = NewsTypeValue.Technology,
  Sports = NewsTypeValue.Sports,
  Health = NewsTypeValue.Health,
  World = NewsTypeValue.World,
  Culture = NewsTypeValue.Culture,
  Environment = NewsTypeValue.Environment,
  Crime = NewsTypeValue.Crime,
  Education = NewsTypeValue.Education,
  Other = NewsTypeValue.Other
}

export type NewsMood = `${NewsMoodValue}`;
export type NewsType = `${NewsTypeValue}`;
export type MoodFilter = `${NewsMoodFilterValue}`;
export type TypeFilter = `${NewsTypeFilterValue}`;

export type ColumnFilters = {
  onlyMatches: boolean;
  onlyResearched: boolean;
  onlySummaries: boolean;
};

export type BriefingDelivery = 'site' | 'email';
export type BriefingFormat = 'executive' | 'bullets' | 'narrative';

export type AiInsightFeatureSettings = {
  biasDetection: boolean;
  sensationalismDetection: boolean;
  factHighlights: boolean;
  storyImpact: boolean;
  dailyBriefing: boolean;
  topicTracking: boolean;
  perspectiveSimulator: boolean;
  emergingStoryDetector: boolean;
  historicalComparison: boolean;
  futureScenarioGenerator: boolean;
  localImpactDetector: boolean;
};

export type InsightConfidence = 'low' | 'medium' | 'high';
export type InsightSeverity = 'low' | 'medium' | 'high';
export type ImpactLevel = 'low' | 'medium' | 'high';

export type PerspectiveInsight = {
  id: string;
  label: string;
  text: string;
};

export type BiasInsight = {
  detected: boolean;
  leaning: string;
  emotionalTone: string;
  framing: string;
  confidence: InsightConfidence;
  severity: InsightSeverity;
  summary: string;
};

export type SensationalismInsight = {
  detected: boolean;
  level: InsightSeverity;
  reasons: string[];
  alternativeHeadline?: string;
  summary: string;
};

export type FactHighlightsInsight = {
  people: string[];
  locations: string[];
  dates: string[];
  numbers: string[];
  quotes: string[];
};

export type StoryImpactInsight = {
  score: ImpactLevel;
  economic: string;
  political: string;
  tech: string;
  industries: string[];
  summary: string;
};

export type HistoricalComparisonInsight = {
  comparisons: string[];
  explanation: string;
};

export type FutureScenarioInsight = {
  disclaimer: string;
  scenarios: string[];
  outlook: string;
};

export type LocalImpactInsight = {
  region: string;
  summary: string;
};

export type NewsInsights = {
  bias?: BiasInsight;
  sensationalism?: SensationalismInsight;
  facts?: FactHighlightsInsight;
  impact?: StoryImpactInsight;
  perspectives?: PerspectiveInsight[];
  historical?: HistoricalComparisonInsight;
  future?: FutureScenarioInsight;
  localImpact?: LocalImpactInsight;
};

export type EmergingStorySignal = {
  clusterSize: number;
  sources: string[];
  velocity: 'watch' | 'rising' | 'viral';
  reason: string;
};

export type InsightStatus = 'pending' | 'ready' | 'empty';

export type DailyBriefingResult = {
  title: string;
  body: string;
  audioScript: string;
  generatedAtMs: number;
  itemCount: number;
  delivery: BriefingDelivery;
  email?: string;
  format: BriefingFormat;
  feedUrls: string[];
};

export type FeedInfo = {
  url: string;
  label: string;
  kind: FeedKind;
  intervalSec: number;
  summaryEnabled: boolean;
  researchEnabled: boolean;
  budget: BudgetMode;
  sortMode: SortMode;
  filters: ColumnFilters;
};

export type NewsItem = {
  id: string;
  title: string;
  titleBg?: string;
  titleEn?: string;
  coverUrl?: string;
  source?: string;
  link: string;
  publishedMs: number;
  feedUrl: string;
  isMatch: boolean;
  summary?: string;
  summaryEligible?: boolean;
  summaryPending?: boolean;
  research?: string;
  insightStatus?: InsightStatus;
  insights?: NewsInsights;
  topicHits?: string[];
  emergingSignal?: EmergingStorySignal;
  mood?: NewsMood;
  newsType?: NewsType;
  filteredOk?: boolean;
};

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
