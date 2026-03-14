'use client';

import { useState } from 'react';
import { Box, Button, Chip, CircularProgress, MenuItem, Select, Stack, Typography } from '@mui/material';
import { NEWS_CARD_COLOR_TOKENS } from '../designTokens';
import { useNewsCardContext } from './context/useNewsCardContext';

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
    performanceMode,
    localImpactRegion
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
  const [perspective, setPerspective] = useState<'investor' | 'government' | 'consumer' | 'tech'>('investor');

  const { onSetSummaryMode, onSetResearchMode } = handlers;
  const { hasSummaryBlock, hasResearchBlock, summaryVisible, researchVisible } = ui;
  const insights = item.insights;
  const narrativeReplacement = !!(insights?.historical || insights?.future || insights?.localImpact);
  const showSummaryBlock = hasSummaryBlock && !narrativeReplacement;
  const showResearchBlock = hasResearchBlock && !narrativeReplacement;
  const perspectives = insights?.perspectives;
  const selectedPerspectiveText = perspectives?.[perspective];
  const factSections = insights?.facts ? [
    ['People', insights.facts.people],
    ['Locations', insights.facts.locations],
    ['Dates', insights.facts.dates],
    ['Numbers', insights.facts.numbers],
    ['Quotes', insights.facts.quotes]
  ] as const : [];

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
        <Box>
          {summaryVisible && !hideAllSummaries ? (
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
          {summaryVisible && summaryLong ? (
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
        <Box sx={{ mt: 1 }}>
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

      {insights?.sensationalism?.detected ? (
        <Box sx={{ mt: 1 }}>
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={`${labels.sensationalismDetected}: ${insights.sensationalism.level}`}
            sx={{ mb: 0.6 }}
          />
          <Typography variant="body2" sx={{ fontSize: `${0.93 * fontScale}rem`, color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {insights.sensationalism.summary}
          </Typography>
          {insights.sensationalism.reasons.length ? (
            <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 0.6 }}>
              {insights.sensationalism.reasons.map(reason => (
                <Chip key={reason} size="small" variant="outlined" label={reason} />
              ))}
            </Stack>
          ) : null}
          {insights.sensationalism.alternativeHeadline ? (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.6, color: NEWS_CARD_COLOR_TOKENS.confidenceText }}>
              AI headline: {insights.sensationalism.alternativeHeadline}
            </Typography>
          ) : null}
        </Box>
      ) : null}

      {insights?.bias?.detected ? (
        <Box sx={{ mt: 1 }}>
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label={`${labels.biasDetected}: ${insights.bias.severity}`}
            sx={{ mb: 0.6 }}
          />
          <Typography variant="body2" sx={{ fontSize: `${0.93 * fontScale}rem`, color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {insights.bias.summary}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: NEWS_CARD_COLOR_TOKENS.confidenceText }}>
            {insights.bias.leaning} · {insights.bias.emotionalTone}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: NEWS_CARD_COLOR_TOKENS.confidenceText }}>
            {insights.bias.framing}
          </Typography>
        </Box>
      ) : null}

      {factSections.length ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.4, color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.factHighlights}
          </Typography>
          {factSections.map(([label, values]) => values.length ? (
            <Typography key={label} variant="body2" sx={{ fontSize: `${0.9 * fontScale}rem`, color: NEWS_CARD_COLOR_TOKENS.summaryText, whiteSpace: 'pre-wrap' }}>
              <strong>{label}:</strong> {values.join(' • ')}
            </Typography>
          ) : null)}
        </Box>
      ) : null}

      {insights?.impact ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.storyImpact}: {insights.impact.score}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: `${0.92 * fontScale}rem`, color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {insights.impact.summary}
          </Typography>
          {insights.impact.industries.length ? (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: NEWS_CARD_COLOR_TOKENS.confidenceText }}>
              Industries: {insights.impact.industries.join(' • ')}
            </Typography>
          ) : null}
        </Box>
      ) : null}

      {perspectives && Object.keys(perspectives).length ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.4, color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.perspective}
          </Typography>
          <Select
            size="small"
            fullWidth
            value={perspective}
            onChange={event => setPerspective(event.target.value as typeof perspective)}
            sx={{ mb: 0.5 }}
          >
            <MenuItem value="investor">Investor</MenuItem>
            <MenuItem value="government">Government</MenuItem>
            <MenuItem value="consumer">Consumer</MenuItem>
            <MenuItem value="tech">Tech industry</MenuItem>
          </Select>
          {selectedPerspectiveText ? (
            <Typography variant="body2" sx={{ fontSize: `${0.92 * fontScale}rem`, color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
              {selectedPerspectiveText}
            </Typography>
          ) : null}
        </Box>
      ) : null}

      {item.topicHits?.length ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.35, color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.topicTracking}
          </Typography>
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            {item.topicHits.map(topic => (
              <Chip key={topic} size="small" variant="outlined" label={topic} />
            ))}
          </Stack>
        </Box>
      ) : null}

      {item.emergingSignal ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.emergingStory}: {item.emergingSignal.velocity}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: NEWS_CARD_COLOR_TOKENS.confidenceText }}>
            {item.emergingSignal.reason} · {item.emergingSignal.clusterSize} related stories · {item.emergingSignal.sources.join(', ')}
          </Typography>
        </Box>
      ) : null}

      {insights?.historical ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.historicalComparison}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: `${0.92 * fontScale}rem`, color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {insights.historical.explanation}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: NEWS_CARD_COLOR_TOKENS.confidenceText }}>
            {insights.historical.comparisons.join(' • ')}
          </Typography>
        </Box>
      ) : null}

      {insights?.future ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.futureScenario}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: NEWS_CARD_COLOR_TOKENS.confidenceText }}>
            {insights.future.disclaimer}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: `${0.92 * fontScale}rem`, color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {insights.future.scenarios.join(' • ')}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.35, color: NEWS_CARD_COLOR_TOKENS.confidenceText }}>
            {insights.future.outlook}
          </Typography>
        </Box>
      ) : null}

      {insights?.localImpact ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.localImpact}: {insights.localImpact.region || localImpactRegion}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: `${0.92 * fontScale}rem`, color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {insights.localImpact.summary}
          </Typography>
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
