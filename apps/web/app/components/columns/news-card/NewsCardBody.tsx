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
  const [showAllInsights, setShowAllInsights] = useState(false);

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
  const aiInsightGroupSx = {
    mt: 1.05,
    px: 1.15,
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
  const insightSectionTitleSx = {
    display: 'block',
    mb: 0.55,
    fontSize: `${0.69 * fontScale}rem`,
    lineHeight: 1.2,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontWeight: 800,
    color: NEWS_CARD_COLOR_TOKENS.confidenceText
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
          <Typography variant="overline" sx={insightSectionTitleSx}>
            Headline risk
          </Typography>
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={`${labels.sensationalismDetected}: ${insights.sensationalism.level}`}
            sx={{ mb: insights.sensationalism.reasons.length || insights.sensationalism.alternativeHeadline ? 0.55 : 0 }}
          />
          {insights.sensationalism.reasons.length ? (
            <Typography variant="caption" sx={insightMetaSx}>
              {insights.sensationalism.reasons.join(' · ')}
            </Typography>
          ) : null}
          {insights.sensationalism.alternativeHeadline ? (
            <Typography variant="caption" sx={insightMetaSx}>
              AI headline: {insights.sensationalism.alternativeHeadline}
            </Typography>
          ) : null}
        </Box>
      )
    });
  }

  if (insights?.bias?.detected) {
    const biasLabelParts = [
      `${labels.biasDetected}: ${insights.bias.severity}`,
      insights.bias.leaning,
      insights.bias.emotionalTone,
      insights.bias.framing
    ].filter(Boolean);

    insightPanels.push({
      key: 'bias',
      element: (
        <Box sx={insightSectionSx}>
          <Typography variant="overline" sx={insightSectionTitleSx}>
            Bias
          </Typography>
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label={biasLabelParts.join(' · ')}
            sx={{
              height: 'auto',
              alignItems: 'flex-start',
              '& .MuiChip-label': {
                display: 'block',
                whiteSpace: 'normal',
                paddingTop: '6px',
                paddingBottom: '6px',
                lineHeight: 1.35
              }
            }}
          />
        </Box>
      )
    });
  }

  if (factSections.length) {
    insightPanels.push({
      key: 'facts',
      element: (
        <Box sx={insightSectionSx}>
          <Typography variant="overline" sx={insightSectionTitleSx}>
            {labels.factHighlights}
          </Typography>
          {factSections.map(([label, values]) => values.length ? (
            <Typography key={label} variant="body2" sx={{ ...insightBodySx, whiteSpace: 'pre-wrap', fontSize: `${0.89 * fontScale}rem` }}>
              <strong>{label}:</strong> {values.join(' • ')}
            </Typography>
          ) : null)}
        </Box>
      )
    });
  }

  if (insights?.impact) {
    insightPanels.push({
      key: 'impact',
      element: (
        <Box sx={insightSectionSx}>
          <Typography variant="overline" sx={insightSectionTitleSx}>
            Impact
          </Typography>
          <Typography variant="subtitle2" sx={{ color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.storyImpact}: {insights.impact.score}
          </Typography>
          <Typography variant="body2" sx={insightBodySx}>
            {insights.impact.summary}
          </Typography>
          {insights.impact.industries.length ? (
            <Typography variant="caption" sx={insightMetaSx}>
              Industries: {insights.impact.industries.join(' • ')}
            </Typography>
          ) : null}
        </Box>
      )
    });
  }

  if (perspectives && Object.keys(perspectives).length) {
    insightPanels.push({
      key: 'perspective',
      element: (
        <Box sx={insightSectionSx}>
          <Typography variant="overline" sx={insightSectionTitleSx}>
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
            <Typography variant="body2" sx={insightBodySx}>
              {selectedPerspectiveText}
            </Typography>
          ) : null}
        </Box>
      )
    });
  }

  if (item.topicHits?.length) {
    insightPanels.push({
      key: 'topics',
      element: (
        <Box sx={insightSectionSx}>
          <Typography variant="overline" sx={insightSectionTitleSx}>
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
          <Typography variant="overline" sx={insightSectionTitleSx}>
            Emerging
          </Typography>
          <Typography variant="subtitle2" sx={{ color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.emergingStory}: {item.emergingSignal.velocity}
          </Typography>
          <Typography variant="caption" sx={{ ...insightMetaSx, mt: 0.2 }}>
            {item.emergingSignal.reason} · {item.emergingSignal.clusterSize} related stories · {item.emergingSignal.sources.join(', ')}
          </Typography>
        </Box>
      )
    });
  }

  if (insights?.historical) {
    insightPanels.push({
      key: 'historical',
      element: (
        <Box sx={insightSectionSx}>
          <Typography variant="overline" sx={insightSectionTitleSx}>
            Comparison
          </Typography>
          <Typography variant="subtitle2" sx={{ color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.historicalComparison}
          </Typography>
          <Typography variant="body2" sx={insightBodySx}>
            {insights.historical.explanation}
          </Typography>
          <Typography variant="caption" sx={insightMetaSx}>
            {insights.historical.comparisons.join(' • ')}
          </Typography>
        </Box>
      )
    });
  }

  if (insights?.future) {
    insightPanels.push({
      key: 'future',
      element: (
        <Box sx={insightSectionSx}>
          <Typography variant="overline" sx={insightSectionTitleSx}>
            Outlook
          </Typography>
          <Typography variant="subtitle2" sx={{ color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.futureScenario}
          </Typography>
          <Typography variant="caption" sx={{ ...insightMetaSx, mt: 0, mb: 0.35 }}>
            {insights.future.disclaimer}
          </Typography>
          <Typography variant="body2" sx={insightBodySx}>
            {insights.future.scenarios.join(' • ')}
          </Typography>
          <Typography variant="caption" sx={insightMetaSx}>
            {insights.future.outlook}
          </Typography>
        </Box>
      )
    });
  }

  if (insights?.localImpact) {
    insightPanels.push({
      key: 'local',
      element: (
        <Box sx={insightSectionSx}>
          <Typography variant="overline" sx={insightSectionTitleSx}>
            Local
          </Typography>
          <Typography variant="subtitle2" sx={{ color: NEWS_CARD_COLOR_TOKENS.summaryText }}>
            {labels.localImpact}: {insights.localImpact.region || localImpactRegion}
          </Typography>
          <Typography variant="body2" sx={insightBodySx}>
            {insights.localImpact.summary}
          </Typography>
        </Box>
      )
    });
  }

  const visibleInsightPanels = showAllInsights ? insightPanels : insightPanels.slice(0, 2);
  const hiddenInsightCount = Math.max(0, insightPanels.length - visibleInsightPanels.length);

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

      {insightPanels.length ? (
        <Box sx={aiInsightGroupSx}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 0.85 }}>
            <Typography variant="overline" sx={{ ...insightSectionTitleSx, mb: 0 }}>
              AI insights
            </Typography>
            <Chip size="small" color="success" variant="outlined" label={`Ready · ${insightPanels.length}`} />
          </Stack>
          <Stack spacing={0.9}>
            {visibleInsightPanels.map(panel => (
              <Box key={panel.key}>{panel.element}</Box>
            ))}
          </Stack>
          {hiddenInsightCount > 0 ? (
            <Button
              size="small"
              variant="text"
              onClick={() => setShowAllInsights(current => !current)}
              sx={{ mt: 0.55, color: accent, textTransform: 'none', fontWeight: 700 }}
            >
              {showAllInsights ? 'Show fewer AI insights' : `Show ${hiddenInsightCount} more AI insight${hiddenInsightCount === 1 ? '' : 's'}`}
            </Button>
          ) : null}
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
