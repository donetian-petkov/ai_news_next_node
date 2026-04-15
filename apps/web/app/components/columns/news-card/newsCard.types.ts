import type { SxProps, Theme } from '@mui/material';
import type { AiInsightFeatureSettings, NewsItem } from '../../../store/types';
import type { BodyMode, CardLabels, FeedAskState, VibeIcons } from '../reactColumns.types';

export type NewsCardViewModel = {
  labels: CardLabels;
  vibeIcons: VibeIcons;
  compactBtnSx: SxProps<Theme>;
  buttonMode: 'icons' | 'text';
  titleDisplayLanguage: 'original' | 'bg' | 'en';
  translationEnabled: boolean;
  language: 'en' | 'bg';
  timezone: 'system' | 'UTC' | 'Europe/Sofia' | 'Europe/London' | 'Europe/Berlin' | 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles' | 'Asia/Tokyo';
  dateFormat: 'ddmmyy' | 'mmddyy' | 'yyyymmdd';
  showNewsCovers: boolean;
  aiAvailable: boolean;
  insightFeatures: AiInsightFeatureSettings;
  localImpactRegion: string;
  trackedTopics: string[];
  performanceMode: boolean;
  fontScale: number;
  connected: boolean;
  hideAllResearch: boolean;
  hideAllSummaries: boolean;
  accent: string;
  soft: string;
  matchAccent: string;
};

export type NewsCardStateModel = {
  item: NewsItem;
  isDuplicateMatch: boolean;
  askState: FeedAskState;
  summaryPending: boolean;
  researchPending: boolean;
  isPinnedNews: boolean;
  showAutoSummarizing: boolean;
  showAutoResearching: boolean;
  summaryMode: BodyMode;
  summaryLong: boolean;
  summaryText: string;
  researchMode: BodyMode;
  researchLong: boolean;
  researchText: string;
  researchConfidence: string;
};

export type NewsCardHandlers = {
  onTogglePinnedNews: (id: string) => void;
  onCopyLink: (url: string) => void;
  onShareNews: (it: NewsItem, platform: 'copy' | 'card' | 'facebook' | 'reddit' | 'x' | 'tiktok') => void;
  onCopyNews: (it: NewsItem) => void;
  onHideItem: (it: NewsItem) => void;
  onRequestSummary: (it: NewsItem) => void;
  onRequestTitleTranslation: (it: NewsItem) => void;
  onRequestResearch: (it: NewsItem) => void;
  onToggleAsk: (id: string, feedUrl: string) => void;
  onSetSummaryMode: (mode: BodyMode) => void;
  onSetResearchMode: (mode: BodyMode) => void;
  onAskDraft: (id: string, feedUrl: string, draft: string) => void;
  onAskSubmit: (it: NewsItem) => void;
};

export type NewsCardProps = {
  view: NewsCardViewModel;
  state: NewsCardStateModel;
  handlers: NewsCardHandlers;
};
