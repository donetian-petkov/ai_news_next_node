'use client';

import { useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Button, Chip, CircularProgress, Collapse, Stack, Typography } from '@mui/material';
import { NEWS_CARD_COLOR_TOKENS } from '../designTokens';
import { useNewsCardContext } from './context/useNewsCardContext';

function normalizeSummaryComparisonText(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[“”„"'"'`’]/g, '')
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSummaryComparisonText(value: string): string[] {
  return normalizeSummaryComparisonText(value)
    .split(' ')
    .filter(token => token.length > 2);
}

function isSummaryRedundantWithTitle(summary: string, titleCandidates: string[]): boolean {
  const normalizedSummary = normalizeSummaryComparisonText(summary);
  if (!normalizedSummary) return false;

  return titleCandidates.some(title => {
    const normalizedTitle = normalizeSummaryComparisonText(title);
    if (!normalizedTitle) return false;
    if (normalizedSummary === normalizedTitle) return true;
    if ((normalizedSummary.includes(normalizedTitle) || normalizedTitle.includes(normalizedSummary))
      && Math.abs(normalizedSummary.length - normalizedTitle.length) <= 24) {
      return true;
    }

    const titleTokens = Array.from(new Set(tokenizeSummaryComparisonText(normalizedTitle)));
    const summaryTokens = Array.from(new Set(tokenizeSummaryComparisonText(normalizedSummary)));
    if (!titleTokens.length || !summaryTokens.length) return false;

    const overlap = titleTokens.filter(token => summaryTokens.includes(token)).length;
    const titleCoverage = overlap / titleTokens.length;
    const summaryCoverage = overlap / summaryTokens.length;

    return titleCoverage >= 0.8 && summaryCoverage >= 0.68 && summaryTokens.length <= titleTokens.length + 4;
  });
}

export function NewsCardBody() {
  const {
    view,
    state,
    handlers,
    ui
  } = useNewsCardContext();

  const {
    labels,
    fontScale,
    accent,
    hideAllSummaries,
    hideAllResearch,
    performanceMode
  } = view;

  const {
    item,
    showAutoResearching,
    showAutoSummarizing,
    summaryPending,
    researchPending,
    summaryMode,
    summaryLong,
    summaryText,
    researchMode,
    researchLong,
    researchText,
    researchConfidence
  } = state;
  const [showAiInsights, setShowAiInsights] = useState(false);

  const { onSetSummaryMode, onSetResearchMode } = handlers;
  const { hasSummaryBlock, hasResearchBlock, summaryVisible, researchVisible } = ui;
  const insights = item.insights;
  const insightStatus = item.insightStatus;
  const showSummaryBlock = hasSummaryBlock;
  const showResearchBlock = hasResearchBlock;
  const summaryRedundantWithTitle = summaryVisible && !hideAllSummaries && isSummaryRedundantWithTitle(summaryText, [
    item.title,
    item.titleBg || '',
    item.titleEn || ''
  ]);
  const levelLabels: Record<'high' | 'medium' | 'low', string> = {
    high: labels.levelHigh,
    medium: labels.levelMedium,
    low: labels.levelLow
  };
  const velocityLabels: Record<'watch' | 'rising' | 'viral', string> = {
    watch: labels.emergingWatch,
    rising: labels.emergingRising,
    viral: labels.emergingViral
  };
  const factSections = insights?.facts ? [
    [labels.peopleLabel, insights.facts.people],
    [labels.locationsLabel, insights.facts.locations],
    [labels.datesLabel, insights.facts.dates],
    [labels.numbersLabel, insights.facts.numbers],
    [labels.quotesLabel, insights.facts.quotes]
  ] as const : [];
  const visibleFactSections = factSections.filter(([, values]) => values.length);

  const sectionShellSx = {
    mt: 1.05
  } as const;
  const sectionTitleSx = {
    display: 'block',
    mb: 0.45,
    fontSize: `${0.69 * fontScale}rem`,
    lineHeight: 1.2,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontWeight: 800,
    color: NEWS_CARD_COLOR_TOKENS.confidenceText
  } as const;
  const aiInsightGroupSx = {
    mt: 0.9,
    px: 1.05,
    py: 0.95,
    border: `1px solid ${NEWS_CARD_COLOR_TOKENS.dividerStrong}`,
    borderRadius: '14px',
    background: `linear-gradient(180deg, ${NEWS_CARD_COLOR_TOKENS.insetHighlight}, rgba(255,255,255,0.02))`
  } as const;
  const insightSectionSx = {
    mt: 0,
    px: 1,
    py: 0.82,
    border: `1px solid ${NEWS_CARD_COLOR_TOKENS.dividerSoft}`,
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.018)'
  } as const;
  const insightBodySx = {
    fontSize: `${0.91 * fontScale}rem`,
    lineHeight: 1.5,
    color: NEWS_CARD_COLOR_TOKENS.summaryText
  } as const;
  const insightMetaSx = {
    display: 'block',
    mt: 0.45,
    color: NEWS_CARD_COLOR_TOKENS.confidenceText,
    lineHeight: 1.45
  } as const;
  const insightPanels: Array<{ key: string; element: JSX.Element }> = [];

  if (insights?.sensationalism?.detected) {
    insightPanels.push({
      key: 'sensationalism',
      element: (
        <Box sx={insightSectionSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.55 }}>
            <Typography variant="overline" sx={{ ...sectionTitleSx, mb: 0 }}>
              {labels.headlineRiskSection}
            </Typography>
            <Chip size="small" color="warning" variant="outlined" label={levelLabels[insights.sensationalism.level]} />
          </Stack>
          <Typography variant="body2" sx={{ ...insightBodySx, fontWeight: 700 }}>
            {insights.sensationalism.summary}
          </Typography>
          {insights.sensationalism.reasons.length ? (
            <Typography variant="caption" sx={insightMetaSx}>
              {labels.reasonsLabel}: {insights.sensationalism.reasons.join(' · ')}
            </Typography>
          ) : null}
          {insights.sensationalism.alternativeHeadline ? (
            <Typography variant="body2" sx={{ ...insightBodySx, mt: 0.55 }}>
              {labels.aiHeadlineLabel}: {insights.sensationalism.alternativeHeadline}
            </Typography>
          ) : null}
        </Box>
      )
    });
  }

  if (insights?.bias?.detected) {
    insightPanels.push({
      key: 'bias',
      element: (
        <Box sx={insightSectionSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.55 }}>
            <Typography variant="overline" sx={{ ...sectionTitleSx, mb: 0 }}>
              {labels.biasSection}
            </Typography>
            <Chip size="small" color="info" variant="outlined" label={levelLabels[insights.bias.severity]} />
          </Stack>
          <Typography variant="body2" sx={{ ...insightBodySx, fontWeight: 700 }}>
            {insights.bias.summary}
          </Typography>
          <Typography variant="caption" sx={insightMetaSx}>
            {labels.leaningLabel}: {insights.bias.leaning}
          </Typography>
          <Typography variant="caption" sx={{ ...insightMetaSx, mt: 0.2 }}>
            {labels.toneLabel}: {insights.bias.emotionalTone}
          </Typography>
          <Typography variant="caption" sx={{ ...insightMetaSx, mt: 0.2 }}>
            {labels.framingLabel}: {insights.bias.framing}
          </Typography>
        </Box>
      )
    });
  }

  if (visibleFactSections.length) {
    insightPanels.push({
      key: 'facts',
      element: (
        <Box sx={insightSectionSx}>
          <Typography variant="overline" sx={sectionTitleSx}>
            {labels.factHighlights}
          </Typography>
          {visibleFactSections.map(([label, values]) => (
            <Typography key={label} variant="body2" sx={{ ...insightBodySx, whiteSpace: 'pre-wrap', fontSize: `${0.89 * fontScale}rem` }}>
              <strong>{label}:</strong> {values.join(' • ')}
            </Typography>
          ))}
        </Box>
      )
    });
  }

  if (item.topicHits?.length) {
    insightPanels.push({
      key: 'topics',
      element: (
        <Box sx={insightSectionSx}>
          <Typography variant="overline" sx={sectionTitleSx}>
            {labels.topicTracking}
          </Typography>
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            {item.topicHits.map(topic => (
              <Chip key={topic} size="small" variant="outlined" label={topic} />
            ))}
          </Stack>
        </Box>
      )
    });
  }

  if (item.emergingSignal) {
    insightPanels.push({
      key: 'emerging',
      element: (
        <Box sx={insightSectionSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.55 }}>
            <Typography variant="overline" sx={{ ...sectionTitleSx, mb: 0 }}>
              {labels.emergingSection}
            </Typography>
            <Chip size="small" color="warning" variant="outlined" label={velocityLabels[item.emergingSignal.velocity]} />
          </Stack>
          <Typography variant="body2" sx={insightBodySx}>
            {item.emergingSignal.reason}
          </Typography>
          <Typography variant="caption" sx={insightMetaSx}>
            {item.emergingSignal.clusterSize} {labels.relatedStories} · {item.emergingSignal.sources.join(', ')}
          </Typography>
        </Box>
      )
    });
  }

  return (
    <>
      {summaryPending ? (
        <Chip
          size="small"
          label={labels.generatingSummary}
          icon={<CircularProgress size={11} color="inherit" />}
          variant="outlined"
          sx={{ mb: 0.8, color: NEWS_CARD_COLOR_TOKENS.summaryPendingText, borderColor: NEWS_CARD_COLOR_TOKENS.summaryPendingBorder }}
        />
      ) : null}

      {!summaryPending && showAutoSummarizing ? (
        <Chip
          size="small"
          label={labels.autoSummarizing}
          icon={<CircularProgress size={11} color="inherit" />}
          variant="outlined"
          sx={{ mb: 0.8, color: NEWS_CARD_COLOR_TOKENS.summaryPendingText, borderColor: NEWS_CARD_COLOR_TOKENS.summaryPendingBorder }}
        />
      ) : null}

      {!summaryPending && !showAutoSummarizing && !item.summary && item.summaryEligible === false ? (
        <Chip
          size="small"
          label={labels.summaryOnRequest}
          variant="outlined"
          sx={{ mb: 0.8, color: NEWS_CARD_COLOR_TOKENS.summaryPendingText, borderColor: NEWS_CARD_COLOR_TOKENS.summaryPendingBorder }}
        />
      ) : null}

      {researchPending ? (
        <Chip
          size="small"
          label={labels.researching}
          icon={<CircularProgress size={11} color="inherit" />}
          variant="outlined"
          sx={{ mb: 0.8, color: NEWS_CARD_COLOR_TOKENS.researchPendingText, borderColor: NEWS_CARD_COLOR_TOKENS.researchPendingBorder }}
        />
      ) : null}

      {showSummaryBlock ? (
        <Box sx={sectionShellSx}>
          <Stack direction="row" spacing={0.8} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mb: 0.45 }}>
            <Typography variant="overline" sx={{ ...sectionTitleSx, mb: 0 }}>
              {labels.summary}
            </Typography>
            {summaryRedundantWithTitle ? (
              <Chip size="small" variant="outlined" label={labels.summaryRepeatsTitle} />
            ) : hideAllSummaries ? (
              <Chip size="small" variant="outlined" label={labels.summaryHiddenGlobally} />
            ) : null}
          </Stack>
          {summaryVisible && !hideAllSummaries && !summaryRedundantWithTitle ? (
            <Typography
              variant="body2"
              sx={{
                fontSize: `${0.96 * fontScale}rem`,
                lineHeight: 1.52,
                color: NEWS_CARD_COLOR_TOKENS.summaryText,
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--news-body-font-family, var(--font-family))'
              }}
            >
              {summaryText}
            </Typography>
          ) : null}
          {summaryVisible && summaryLong && !summaryRedundantWithTitle ? (
            <Button
              size="small"
              variant="text"
              onClick={() => onSetSummaryMode(summaryMode === 'collapsed' ? 'expanded' : 'collapsed')}
              sx={{ mt: 0.35, color: accent, textTransform: 'none', fontWeight: 700 }}
            >
              {summaryMode === 'collapsed' ? labels.showMore : labels.showLess}
            </Button>
          ) : null}
        </Box>
      ) : null}

      {showAutoResearching ? (
        <Chip
          size="small"
          label={labels.autoResearching}
          icon={<CircularProgress size={11} color="inherit" />}
          variant="outlined"
          sx={{ mb: 0.9, color: NEWS_CARD_COLOR_TOKENS.autoResearchText, borderColor: NEWS_CARD_COLOR_TOKENS.autoResearchBorder }}
        />
      ) : null}

      {showResearchBlock && !hideAllResearch ? (
        <Box sx={{ ...sectionShellSx, pt: 0.95, borderTop: `1px solid ${NEWS_CARD_COLOR_TOKENS.dividerSoft}` }}>
          <Typography variant="overline" sx={sectionTitleSx}>
            {labels.research}
          </Typography>
          {researchVisible ? (
            <>
              {researchConfidence ? (
                <Typography variant="caption" sx={{ color: NEWS_CARD_COLOR_TOKENS.confidenceText, display: 'block', mb: 0.35 }}>
                  {labels.confidence}: {researchConfidence}
                </Typography>
              ) : null}
              <Typography
                variant="body2"
                sx={{
                  fontSize: `${0.98 * fontScale}rem`,
                  lineHeight: 1.52,
                  color: NEWS_CARD_COLOR_TOKENS.researchText,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--news-body-font-family, var(--font-family))'
                }}
              >
                {researchText}
              </Typography>
            </>
          ) : null}
          {researchVisible && researchLong ? (
            <Button
              size="small"
              variant="text"
              onClick={() => onSetResearchMode(researchMode === 'collapsed' ? 'expanded' : 'collapsed')}
              sx={{ mt: 0.35, color: accent, textTransform: 'none', fontWeight: 700 }}
            >
              {researchMode === 'collapsed' ? labels.showMore : labels.showLess}
            </Button>
          ) : null}
        </Box>
      ) : null}

      {(insightPanels.length || insightStatus) ? (
        <Box sx={{ mt: 1.3, pt: 1.05, borderTop: `1px solid ${NEWS_CARD_COLOR_TOKENS.dividerStrong}` }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap flexWrap="wrap">
            <Box>
              <Typography variant="overline" sx={sectionTitleSx}>
                {labels.aiInsights}
              </Typography>
              <Typography variant="caption" sx={{ color: NEWS_CARD_COLOR_TOKENS.confidenceText, display: 'block', mt: -0.1 }}>
                {labels.aiInsightsHint}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
              {insightStatus === 'ready' ? (
                <Chip size="small" color="success" variant="outlined" label={`${labels.aiReady} · ${insightPanels.length}`} />
              ) : null}
              {insightStatus === 'pending' ? (
                <Chip
                  size="small"
                  color="info"
                  variant="outlined"
                  icon={<CircularProgress size={11} color="inherit" />}
                  label={labels.aiAnalyzing}
                />
              ) : null}
              {insightStatus === 'empty' ? (
                <Chip size="small" color="default" variant="outlined" label={labels.aiNoSignal} />
              ) : null}
              {insightPanels.length ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setShowAiInsights(current => !current)}
                  endIcon={<ExpandMoreIcon sx={{ transform: showAiInsights ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }} />}
                  sx={{ color: accent, textTransform: 'none', fontWeight: 700 }}
                >
                  {showAiInsights ? labels.hideAiAnalysis : labels.showAiAnalysis}
                </Button>
              ) : null}
            </Stack>
          </Stack>
          {!insightPanels.length && insightStatus === 'pending' ? (
            <Typography variant="caption" sx={{ color: NEWS_CARD_COLOR_TOKENS.confidenceText, display: 'block', mt: 0.8 }}>
              {labels.aiWaitingHint}
            </Typography>
          ) : null}
          {!insightPanels.length && insightStatus === 'empty' ? (
            <Typography variant="caption" sx={{ color: NEWS_CARD_COLOR_TOKENS.confidenceText, display: 'block', mt: 0.8 }}>
              {labels.aiNoSignalHint}
            </Typography>
          ) : null}
          <Collapse in={showAiInsights} timeout="auto" unmountOnExit>
            <Box sx={aiInsightGroupSx}>
              <Stack spacing={0.9}>
                {insightPanels.map(panel => (
                  <Box key={panel.key}>{panel.element}</Box>
                ))}
              </Stack>
            </Box>
          </Collapse>
        </Box>
      ) : null}

      {(showSummaryBlock || showResearchBlock || !!insights || !!item.topicHits?.length || !!item.emergingSignal) ? (
        <Box
          sx={{
            mt: 1.2,
            pt: 0.95,
            borderTop: performanceMode
              ? `1px solid ${NEWS_CARD_COLOR_TOKENS.footerDividerSoft}`
              : `1px dashed ${NEWS_CARD_COLOR_TOKENS.footerDividerDashed}`
          }}
        />
      ) : null}
    </>
  );
}
