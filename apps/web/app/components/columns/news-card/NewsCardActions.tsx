'use client';

import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { Button, Chip, CircularProgress, Stack, Tooltip } from '@mui/material';
import { NEWS_CARD_COLOR_TOKENS } from '../designTokens';
import { useNewsCardContext } from './context/useNewsCardContext';

export function NewsCardActions() {
  const {
    view,
    state,
    handlers,
    ui
  } = useNewsCardContext();

  const { labels, vibeIcons, aiAvailable, connected } = view;
  const { item, askState, summaryPending, researchPending, summaryMode, summaryLong, researchLong } = state;
  const { onRequestSummary, onRequestResearch, onToggleAsk, onSetSummaryMode, onSetResearchMode } = handlers;
  const { iconOnly, actionSx, matchActionSx, hasSummaryBlock, hasResearchBlock, researchToggleActive, summaryVisible, researchVisible } = ui;

  const SummaryIconComp = vibeIcons.summary;
  const ResearchIconComp = vibeIcons.research;
  const AskIconComp = vibeIcons.ask;
  const summaryActionLabel = summaryPending
    ? labels.generatingSummary
    : (!item.summary ? labels.generateSummary : labels.summary);

  return (
    <Stack direction="row" spacing={0.8} sx={{ mt: 0.55, px: 0.8, pb: 0.8 }} flexWrap="wrap">
      {aiAvailable ? (
        <>
          <Tooltip title={summaryActionLabel}>
            <Button
              size="small"
              variant={summaryPending ? 'contained' : 'outlined'}
              sx={actionSx}
              onClick={() => onRequestSummary(item)}
              disabled={!connected || summaryPending}
              startIcon={!iconOnly && summaryPending ? <CircularProgress size={13} color="inherit" /> : undefined}
            >
              {iconOnly
                ? (summaryPending
                  ? <AutoFixHighIcon sx={{ fontSize: 15 }} className="spinAnim" aria-hidden />
                  : <SummaryIconComp sx={{ fontSize: 15 }} aria-hidden />)
                : summaryActionLabel}
            </Button>
          </Tooltip>
          <Tooltip title={researchPending ? labels.researching : (researchToggleActive ? labels.hideResearch : labels.research)}>
            <Button
              size="small"
              variant={researchPending ? 'contained' : (researchToggleActive ? 'contained' : 'outlined')}
              sx={researchToggleActive ? matchActionSx : actionSx}
              onClick={() => {
                if (researchToggleActive) {
                  onSetResearchMode('hidden');
                  return;
                }
                if (hasResearchBlock && !researchVisible) {
                  onSetResearchMode(researchLong ? 'collapsed' : 'expanded');
                  return;
                }
                onRequestResearch(item);
              }}
              disabled={!connected || researchPending}
              startIcon={!iconOnly && researchPending ? <CircularProgress size={13} color="inherit" /> : undefined}
            >
              {iconOnly
                ? (researchPending
                  ? <AutoFixHighIcon sx={{ fontSize: 15 }} className="spinAnim" aria-hidden />
                  : <ResearchIconComp sx={{ fontSize: 15 }} aria-hidden />)
                : (researchPending ? labels.researching : (researchToggleActive ? labels.hideResearch : labels.research))}
            </Button>
          </Tooltip>
          <Tooltip title={labels.askAgent}>
            <Button
              size="small"
              variant={askState.open ? 'contained' : 'outlined'}
              sx={actionSx}
              onClick={() => onToggleAsk(item.id, item.feedUrl)}
              disabled={!connected}
            >
              {iconOnly
                ? (askState.pending
                  ? <AutoFixHighIcon sx={{ fontSize: 15 }} className="spinAnim" aria-hidden />
                  : <AskIconComp sx={{ fontSize: 15 }} aria-hidden />)
                : labels.askAgent}
            </Button>
          </Tooltip>
        </>
      ) : (
        <Chip
          size="small"
          variant="outlined"
          label={labels.aiUnavailable}
          sx={{ color: NEWS_CARD_COLOR_TOKENS.aiUnavailableText, borderColor: NEWS_CARD_COLOR_TOKENS.aiUnavailableBorder }}
        />
      )}
      {hasSummaryBlock ? (
        <Tooltip title={summaryVisible ? labels.hideSummary : labels.showSummary}>
          <Button
            size="small"
            variant={summaryVisible ? 'contained' : 'outlined'}
            sx={summaryVisible ? matchActionSx : actionSx}
            onClick={() => onSetSummaryMode(summaryVisible ? 'hidden' : (summaryLong ? 'collapsed' : 'expanded'))}
          >
            {iconOnly ? <SummaryIconComp sx={{ fontSize: 15 }} aria-hidden /> : (summaryVisible ? labels.hideSummary : labels.showSummary)}
          </Button>
        </Tooltip>
      ) : null}
    </Stack>
  );
}
