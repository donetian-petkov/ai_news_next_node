'use client';

import { useMemo } from 'react';
import type { FeedColumnViewModel, CardLabels, SchemeValue, VibeValue } from '../reactColumns.types';
import { buildColumnPalette, getVibeIcons, SCHEME_LIST, VIBE_LIST } from '../reactColumns.utils';
import { COLUMN_LAYOUT_TOKENS } from '../designTokens';

type Args = {
  ui: {
    vibe: string;
    scheme: string;
    buttonMode: 'icons' | 'text';
    titleDisplayLanguage: 'original' | 'bg' | 'en';
    language: 'en' | 'bg';
    timezone: FeedColumnViewModel['timezone'];
    dateFormat: FeedColumnViewModel['dateFormat'];
    showNewsCovers: boolean;
    performanceMode: boolean;
    fontSize: 'sm' | 'md' | 'lg' | 'xl';
    moodFilter: FeedColumnViewModel['moodFilter'];
    typeFilter: FeedColumnViewModel['typeFilter'];
    searchQuery: string;
    hideAllResearch: boolean;
    hideAllSummaries: boolean;
    aiEnabled: boolean;
    aiAvailable: boolean;
    insightFeatures: FeedColumnViewModel['insightFeatures'];
    localImpactRegion: string;
    trackedTopics: string[];
    keywords: string[];
  };
  labels: Record<string, string>;
  connected: boolean;
  status: string;
};

export function useFeedColumnViewModel({ ui, labels, connected, status }: Args) {
  const fontScale = ui.fontSize === 'xl' ? 1.17 : ui.fontSize === 'lg' ? 1.09 : ui.fontSize === 'sm' ? 0.93 : 1;
  const resolvedVibe: VibeValue = (VIBE_LIST.includes(ui.vibe as VibeValue) ? ui.vibe : 'default') as VibeValue;
  const resolvedScheme: SchemeValue = (SCHEME_LIST.includes(ui.scheme as SchemeValue) ? ui.scheme : 'classic') as SchemeValue;

  const palette = useMemo(() => buildColumnPalette(resolvedVibe, resolvedScheme), [resolvedVibe, resolvedScheme]);
  const vibeIcons = useMemo(() => getVibeIcons(resolvedVibe), [resolvedVibe]);

  const compactBtnSx = useMemo(() => ({
    minHeight: COLUMN_LAYOUT_TOKENS.compactControlHeight,
    px: 1.2,
    py: 0.18,
    fontSize: `${0.82 * fontScale}rem`,
    lineHeight: 1.15,
    borderRadius: ui.performanceMode ? COLUMN_LAYOUT_TOKENS.compactControlRadiusPerformance : COLUMN_LAYOUT_TOKENS.compactControlRadius,
    whiteSpace: 'nowrap'
  }), [fontScale, ui.performanceMode]);

  const compactFormSx = useMemo(() => ({
    '& .MuiOutlinedInput-root': {
      height: COLUMN_LAYOUT_TOKENS.compactControlHeight,
      fontSize: `${0.82 * fontScale}rem`,
      background: ui.performanceMode ? 'rgba(10,16,29,0.98)' : 'rgba(12,20,38,0.92)',
      color: 'rgba(231,240,255,0.96)',
      borderRadius: ui.performanceMode ? COLUMN_LAYOUT_TOKENS.compactControlRadiusPerformance : COLUMN_LAYOUT_TOKENS.compactControlRadius
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(122,149,194,0.44)'
    },
    '& .MuiSvgIcon-root': {
      color: 'rgba(203,217,243,0.9)'
    }
  }), [fontScale, ui.performanceMode]);

  const cardLabels = useMemo<CardLabels>(() => ({
    pinNews: labels.pinNews,
    unpinNews: labels.unpinNews,
    match: labels.match,
    duplicatedMatch: labels.duplicatedMatch || labels.match,
    shareLink: labels.shareLink,
    shareOn: labels.shareOn,
    shareCopyLink: labels.shareCopyLink,
    shareCardImage: labels.shareCardImage,
    shareFacebook: labels.shareFacebook,
    shareReddit: labels.shareReddit,
    shareX: labels.shareX,
    shareTikTok: labels.shareTikTok,
    shareTikTokHint: labels.shareTikTokHint,
    copyNews: labels.copyNews,
    hideNews: labels.hideNews,
    generatingSummary: labels.generatingSummary,
    autoSummarizing: labels.autoSummarizing,
    summaryYesterdayOnly: labels.summaryYesterdayOnly || 'Summaries run only for yesterday news',
    summaryOnRequest: labels.summaryOnRequest || 'Summary available on request',
    summaryHiddenGlobally: labels.summaryHiddenGlobally || 'Summary hidden globally',
    generateSummary: labels.generateSummary || 'Generate summary',
    summary: labels.summary,
    researching: labels.researching,
    research: labels.research,
    askAgent: labels.askAgent,
    showSummary: labels.showSummary,
    hideSummary: labels.hideSummary,
    showMore: labels.showMore,
    showLess: labels.showLess,
    aiUnavailable: labels.aiUnavailable,
    autoResearching: labels.autoResearching,
    confidence: labels.confidence,
    showResearch: labels.showResearch,
    hideResearch: labels.hideResearch,
    questionsLeft: labels.questionsLeft,
    askPlaceholder: labels.askPlaceholder,
    thinking: labels.thinking,
    send: labels.send,
    showOriginalTitle: labels.showOriginalTitle || 'Show original title',
    showTranslatedTitle: labels.showTranslatedTitle || 'Show translated title',
    summaryRepeatsTitle: labels.summaryRepeatsTitle || 'Summary repeats the title',
    biasDetected: labels.biasDetected || 'Bias detected',
    sensationalismDetected: labels.sensationalismDetected || 'Headline risk',
    factHighlights: labels.factHighlights || 'Fact highlights',
    storyImpact: labels.storyImpact || 'Story impact',
    perspective: labels.perspective || 'Perspective',
    historicalComparison: labels.historicalComparison || 'Historical comparison',
    futureScenario: labels.futureScenario || 'Future scenario',
    localImpact: labels.localImpact || 'Local impact',
    topicTracking: labels.topicTracking || 'Tracked topics',
    emergingStory: labels.emergingStory || 'Emerging story',
    aiInsights: labels.aiInsights || 'AI insights',
    aiReady: labels.aiReady || 'Ready',
    showMoreAiInsights: labels.showMoreAiInsights || 'Show more AI insights',
    showFewerAiInsights: labels.showFewerAiInsights || 'Show fewer AI insights',
    showAiAnalysis: labels.showAiAnalysis || 'Show AI analysis',
    hideAiAnalysis: labels.hideAiAnalysis || 'Hide AI analysis',
    aiInsightsHint: labels.aiInsightsHint || 'Generated for this story',
    aiAnalyzing: labels.aiAnalyzing || 'Analyzing',
    aiNoSignal: labels.aiNoSignal || 'No strong signal yet',
    aiWaitingHint: labels.aiWaitingHint || 'Waiting for more story context',
    aiNoSignalHint: labels.aiNoSignalHint || 'No useful AI insight was found for this story',
    headlineRiskSection: labels.headlineRiskSection || 'Headline risk',
    biasSection: labels.biasSection || 'Bias',
    impactSection: labels.impactSection || 'Impact',
    comparisonSection: labels.comparisonSection || 'Comparison',
    outlookSection: labels.outlookSection || 'Outlook',
    localSection: labels.localSection || 'Local',
    emergingSection: labels.emergingSection || 'Emerging',
    peopleLabel: labels.peopleLabel || 'People',
    locationsLabel: labels.locationsLabel || 'Locations',
    datesLabel: labels.datesLabel || 'Dates',
    numbersLabel: labels.numbersLabel || 'Numbers',
    quotesLabel: labels.quotesLabel || 'Quotes',
    industriesLabel: labels.industriesLabel || 'Industries',
    aiHeadlineLabel: labels.aiHeadlineLabel || 'AI headline',
    relatedStories: labels.relatedStories || 'related stories',
    reasonsLabel: labels.reasonsLabel || 'Reasons',
    toneLabel: labels.toneLabel || 'Tone',
    framingLabel: labels.framingLabel || 'Framing',
    leaningLabel: labels.leaningLabel || 'Leaning',
    additionalComparisons: labels.additionalComparisons || 'Also similar',
    speculativeLabel: labels.speculativeLabel || 'Speculative',
    perspectiveInvestor: labels.perspectiveInvestor || 'Investor',
    perspectiveGovernment: labels.perspectiveGovernment || 'Government',
    perspectiveConsumer: labels.perspectiveConsumer || 'Consumer',
    perspectiveTech: labels.perspectiveTech || 'Tech industry',
    levelHigh: labels.levelHigh || 'high',
    levelMedium: labels.levelMedium || 'medium',
    levelLow: labels.levelLow || 'low',
    emergingWatch: labels.emergingWatch || 'watch',
    emergingRising: labels.emergingRising || 'rising',
    emergingViral: labels.emergingViral || 'viral'
  }), [labels]);

  const connectionStatus: FeedColumnViewModel['connectionStatus'] = connected
    ? 'connected'
    : (status === 'connecting' || status === 'error' ? status : 'disconnected');

  const viewModel = useMemo<FeedColumnViewModel>(() => ({
    palette,
    performanceMode: ui.performanceMode,
    language: ui.language,
    timezone: ui.timezone,
    dateFormat: ui.dateFormat,
    showNewsCovers: ui.showNewsCovers,
    moodFilter: ui.moodFilter,
    typeFilter: ui.typeFilter,
    searchQuery: ui.searchQuery,
    hideAllResearch: ui.hideAllResearch,
    hideAllSummaries: ui.hideAllSummaries,
    aiEnabled: ui.aiEnabled,
    aiAvailable: ui.aiAvailable,
    insightFeatures: ui.insightFeatures,
    localImpactRegion: ui.localImpactRegion,
    trackedTopics: ui.trackedTopics,
    keywords: ui.keywords,
    buttonMode: ui.buttonMode,
    titleDisplayLanguage: ui.titleDisplayLanguage,
    fontScale,
    connected,
    connectionStatus,
    compactBtnSx,
    compactFormSx,
    labels,
    cardLabels,
    vibeIcons
  }), [cardLabels, compactBtnSx, compactFormSx, connected, connectionStatus, fontScale, labels, palette, ui.aiAvailable, ui.aiEnabled, ui.buttonMode, ui.dateFormat, ui.hideAllResearch, ui.hideAllSummaries, ui.insightFeatures, ui.keywords, ui.language, ui.localImpactRegion, ui.moodFilter, ui.performanceMode, ui.searchQuery, ui.showNewsCovers, ui.timezone, ui.titleDisplayLanguage, ui.trackedTopics, ui.typeFilter, vibeIcons]);

  return viewModel;
}
