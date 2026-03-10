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
  source?: string;
  link: string;
  publishedMs: number;
  feedUrl: string;
  isMatch: boolean;
  summary?: string;
  summaryPending?: boolean;
  research?: string;
  mood?: NewsMood;
  newsType?: NewsType;
  filteredOk?: boolean;
};

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
