import type { DragEvent } from 'react';
import type { AiInsightFeatureSettings, BudgetMode, FeedInfo, MoodFilter, NewsItem, SortMode, TypeFilter } from '../../store/types';

export type BodyMode = 'collapsed' | 'expanded' | 'hidden';
export type VibeValue = 'default' | 'anime' | 'arcade' | 'cinema' | 'newspaper' | 'cyberwitch' | 'fantasy' | 'scifi';
export type SchemeValue = 'classic' | 'vivid' | 'sunset' | 'neon' | 'ocean' | 'forest';
export type FeedFilterPreset =
  | 'all'
  | 'matches'
  | 'researched'
  | 'summaries'
  | 'matches_researched'
  | 'matches_summaries'
  | 'researched_summaries'
  | 'all_flags';

export type ColumnPalette = {
  a: string;
  b: string;
  m: string;
  aSoft: string;
  bSoft: string;
  mSoft: string;
};

export type AskCardState = {
  open: boolean;
  draft: string;
  pending: boolean;
  remaining: number;
  messages: Array<{ q: string; a?: string; error?: string }>;
};

export type CardLabels = {
  pinNews: string;
  unpinNews: string;
  match: string;
  duplicatedMatch: string;
  shareLink: string;
  shareOn: string;
  shareCopyLink: string;
  shareCardImage: string;
  shareFacebook: string;
  shareReddit: string;
  shareX: string;
  shareTikTok: string;
  shareTikTokHint: string;
  copyNews: string;
  hideNews: string;
  generatingSummary: string;
  autoSummarizing: string;
  summaryYesterdayOnly: string;
  summaryOnRequest: string;
  summaryHiddenGlobally: string;
  generateSummary: string;
  summary: string;
  researching: string;
  research: string;
  askAgent: string;
  showSummary: string;
  hideSummary: string;
  showMore: string;
  showLess: string;
  aiUnavailable: string;
  autoResearching: string;
  confidence: string;
  showResearch: string;
  hideResearch: string;
  questionsLeft: string;
  askPlaceholder: string;
  thinking: string;
  send: string;
  showOriginalTitle: string;
  showTranslatedTitle: string;
  summaryRepeatsTitle: string;
  biasDetected: string;
  sensationalismDetected: string;
  factHighlights: string;
  storyImpact: string;
  perspective: string;
  historicalComparison: string;
  futureScenario: string;
  localImpact: string;
  topicTracking: string;
  emergingStory: string;
  aiInsights: string;
  aiReady: string;
  showMoreAiInsights: string;
  showFewerAiInsights: string;
  showAiAnalysis: string;
  hideAiAnalysis: string;
  aiInsightsHint: string;
  aiAnalyzing: string;
  aiNoSignal: string;
  aiWaitingHint: string;
  aiNoSignalHint: string;
  imageUnavailable: string;
  headlineRiskSection: string;
  biasSection: string;
  impactSection: string;
  comparisonSection: string;
  outlookSection: string;
  localSection: string;
  emergingSection: string;
  peopleLabel: string;
  locationsLabel: string;
  datesLabel: string;
  numbersLabel: string;
  quotesLabel: string;
  industriesLabel: string;
  aiHeadlineLabel: string;
  relatedStories: string;
  reasonsLabel: string;
  toneLabel: string;
  framingLabel: string;
  leaningLabel: string;
  additionalComparisons: string;
  speculativeLabel: string;
  perspectiveInvestor: string;
  perspectiveGovernment: string;
  perspectiveConsumer: string;
  perspectiveTech: string;
  levelHigh: string;
  levelMedium: string;
  levelLow: string;
  emergingWatch: string;
  emergingRising: string;
  emergingViral: string;
};

export type VibeIcons = {
  summary: React.ElementType;
  research: React.ElementType;
  ask: React.ElementType;
  share: React.ElementType;
  hide: React.ElementType;
  copy: React.ElementType;
};

export type FeedFilters = FeedInfo['filters'];

export type FeedAskState = {
  open: boolean;
  draft: string;
  pending: boolean;
  remaining: number;
  messages: Array<{ q: string; a?: string; error?: string }>;
};

export type FeedPageInfo = {
  hasMore: boolean;
  nextCursor?: {
    beforePublishedMs: number;
    beforeId: string;
  };
  loading: boolean;
  loaded: boolean;
  disabledUntilMs?: number;
  lastError?: string;
  lastErrorAtMs?: number;
  failCount?: number;
};

export type FeedColumnViewModel = {
  palette: ColumnPalette;
  performanceMode: boolean;
  language: 'en' | 'bg';
  timezone: 'system' | 'UTC' | 'Europe/Sofia' | 'Europe/London' | 'Europe/Berlin' | 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles' | 'Asia/Tokyo';
  dateFormat: 'ddmmyy' | 'mmddyy' | 'yyyymmdd';
  showNewsCovers: boolean;
  moodFilter: MoodFilter;
  typeFilter: TypeFilter;
  searchQuery: string;
  hideAllResearch: boolean;
  hideAllSummaries: boolean;
  storiesPerColumn: number;
  aiEnabled: boolean;
  aiAvailable: boolean;
  insightFeatures: AiInsightFeatureSettings;
  localImpactRegion: string;
  trackedTopics: string[];
  keywords: string[];
  buttonMode: 'icons' | 'text';
  titleDisplayLanguage: 'original' | 'bg' | 'en';
  fontScale: number;
  connected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  compactBtnSx: Record<string, unknown>;
  compactFormSx: Record<string, unknown>;
  labels: Record<string, string>;
  cardLabels: CardLabels;
  vibeIcons: VibeIcons;
};

export type FeedColumnStateModel = {
  filteredColumnItems: NewsItem[];
  duplicateMatchById: Record<string, true>;
  itemsByFeed: Record<string, NewsItem[]>;
  pageInfoByFeed: Record<string, FeedPageInfo>;
  visibleByFeed: Record<string, number>;
  hydratedColumns: Record<string, true>;
  pinnedByUrl: Record<string, boolean>;
  controlsOpenByUrl: Record<string, boolean>;
  advancedControlsByUrl: Record<string, boolean>;
  deleteAgeByUrl: Record<string, 'yesterday' | 'week' | 'month' | 'year'>;
  summaryPendingById: Record<string, true>;
  researchPendingById: Record<string, true>;
  pinnedNewsById: Record<string, true>;
  askByItem: Record<string, FeedAskState>;
  bodyModes: Record<string, BodyMode>;
};

export type FeedColumnHandlers = {
  getBodyMode: (key: string, text: string, threshold: number) => BodyMode;
  getDefaultBodyMode: (text: string, threshold: number) => BodyMode;
  setBodyMode: (key: string, mode: BodyMode) => void;
  onTogglePinnedColumn: (feedUrl: string) => void;
  onMoveFeedToTop: (feedUrl: string) => void;
  onRemoveFeed: (feedUrl: string) => void;
  onToggleFeedControls: (feedUrl: string) => void;
  onToggleFeedSummary: (feed: FeedInfo) => void;
  onToggleFeedTranslation: (feed: FeedInfo) => void;
  onToggleFeedResearch: (feed: FeedInfo) => void;
  onSetFeedBudget: (feed: FeedInfo, budget: BudgetMode) => void;
  onSetFeedInterval: (feed: FeedInfo, intervalSec: number) => void;
  onSetFeedSortMode: (feed: FeedInfo, sortMode: SortMode) => void;
  onSetFeedFilterPreset: (feed: FeedInfo, preset: FeedFilterPreset) => void;
  onSetKeywords: (keywords: string[]) => void;
  onToggleAdvancedControls: (feedUrl: string) => void;
  onSetDeleteAge: (feedUrl: string, age: 'yesterday' | 'week' | 'month' | 'year') => void;
  onRemoveOldInFeed: (feed: FeedInfo) => void;
  onShowMoreNews: (feedUrl: string) => void;
  onResetNewsToTen: (feedUrl: string) => void;
  onTogglePinnedNews: (id: string) => void;
  onCopyLink: (url: string) => void;
  onShareNews: (it: NewsItem, platform: 'copy' | 'card' | 'facebook' | 'reddit' | 'x' | 'tiktok') => void;
  onCopyNewsPayload: (it: NewsItem) => void;
  onHideItem: (it: NewsItem) => void;
  onRequestSummary: (it: NewsItem) => void;
  onRequestTitleTranslation: (it: NewsItem) => void;
  onRequestResearch: (it: NewsItem) => void;
  onRequestAutoActions: (
    it: NewsItem,
    actions: { summary?: boolean; research?: boolean; titleTranslate?: boolean; mood?: boolean; newsType?: boolean }
  ) => boolean;
  onToggleAsk: (id: string, feedUrl: string) => void;
  onSetAskDraft: (id: string, feedUrl: string, draft: string) => void;
  onAskSubmit: (it: NewsItem) => void;
};

export type FeedColumnDragState = {
  canDrag: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragEnter: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  setNode: (node: HTMLDivElement | null) => void;
};
