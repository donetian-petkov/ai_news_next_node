'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent } from '@mui/material';
import { EMERGING_FEED_URL } from '../../store/constants';
import { COLUMN_LAYOUT_TOKENS, COLUMN_STYLE_TOKENS, NEWS_CARD_COLOR_TOKENS } from './designTokens';
import { NewsCardActions } from './news-card/NewsCardActions';
import { NewsCardAskPanel } from './news-card/NewsCardAskPanel';
import { NewsCardBody } from './news-card/NewsCardBody';
import { NewsCardHeader } from './news-card/NewsCardHeader';
import { NewsCardProvider } from './news-card/context/NewsCardProvider';
import type { NewsCardProps } from './news-card/newsCard.types';

export const NewsCard = memo(function NewsCard({ view, state, handlers }: NewsCardProps) {
  const { item, summaryMode, researchMode } = state;
  const { hideAllResearch, hideAllSummaries, performanceMode, accent, soft, matchAccent } = view;
  const isEmergingCard = item.feedUrl === EMERGING_FEED_URL;
  const biasDetected = !!item.insights?.bias?.detected;
  const sensationalismDetected = !!item.insights?.sensationalism?.detected;
  const insightTint = sensationalismDetected
    ? 'linear-gradient(160deg, rgba(255,176,121,0.16), rgba(255,220,181,0.08))'
    : biasDetected
      ? 'linear-gradient(160deg, rgba(125,182,255,0.15), rgba(201,227,255,0.08))'
      : '';

  const hasSummaryBlock = !!item.summary;
  const hasResearchBlock = !!item.research && !hideAllResearch;
  const hasBodyBlock = hasSummaryBlock || hasResearchBlock;
  const researchVisible = researchMode !== 'hidden';
  const researchToggleActive = hasResearchBlock && researchVisible;

  const iconOnly = view.buttonMode === 'icons';
  const actionSx = useMemo(
    () => ({
      ...view.compactBtnSx,
      minWidth: iconOnly ? COLUMN_LAYOUT_TOKENS.newsCardActionMinWidthIcon : COLUMN_LAYOUT_TOKENS.newsCardActionMinWidthText,
      px: iconOnly ? COLUMN_LAYOUT_TOKENS.newsCardActionPaddingXIcon : COLUMN_LAYOUT_TOKENS.newsCardActionPaddingXText,
      borderRadius: performanceMode ? COLUMN_LAYOUT_TOKENS.compactControlRadiusPerformance : COLUMN_LAYOUT_TOKENS.compactControlRadius,
      color: accent,
      borderColor: accent,
      '&:hover': {
        borderColor: accent,
        backgroundColor: soft
      },
      '&.MuiButton-contained': {
        color: NEWS_CARD_COLOR_TOKENS.actionContainedText,
        border: `1px solid ${accent}`,
        backgroundColor: soft
      }
    }),
    [accent, iconOnly, performanceMode, soft, view.compactBtnSx]
  );

  const matchActionSx = useMemo(
    () => ({
      ...actionSx,
      color: matchAccent,
      borderColor: matchAccent,
      '&:hover': {
        borderColor: matchAccent,
        backgroundColor: NEWS_CARD_COLOR_TOKENS.matchHoverBg
      },
      '&.MuiButton-contained': {
        color: NEWS_CARD_COLOR_TOKENS.matchContainedText,
        border: `1px solid ${matchAccent}`,
        backgroundColor: NEWS_CARD_COLOR_TOKENS.matchContainedBg
      }
    }),
    [actionSx, matchAccent]
  );

  const contextValue = useMemo(
    () => ({
      view,
      state,
      handlers,
      ui: {
        iconOnly,
        hasSummaryBlock,
        hasResearchBlock,
        hasBodyBlock,
        researchToggleActive,
        actionSx,
        matchActionSx,
        summaryVisible: summaryMode !== 'hidden',
        researchVisible
      }
    }),
    [actionSx, handlers, hasBodyBlock, hasResearchBlock, hasSummaryBlock, iconOnly, matchActionSx, researchToggleActive, researchMode, researchVisible, state, summaryMode, view]
  );

  return (
    <NewsCardProvider value={contextValue}>
      <Card
        className="news-item-card"
        data-match={item.isMatch && !isEmergingCard ? '1' : '0'}
        data-news-id={item.id}
        data-news-feed-url={item.feedUrl}
        variant="outlined"
        sx={{
          '--ornament-accent': item.isMatch && !isEmergingCard ? matchAccent : accent,
          '--ornament-soft': soft,
          position: 'relative',
          overflow: 'hidden',
          background: performanceMode
            ? NEWS_CARD_COLOR_TOKENS.perfBackground
            : `${insightTint ? `${insightTint}, ` : ''}linear-gradient(155deg, ${NEWS_CARD_COLOR_TOKENS.gradientStart}, ${NEWS_CARD_COLOR_TOKENS.gradientEnd}), radial-gradient(550px 180px at 0% 0%, ${soft}, transparent 72%), var(--news-card-overlay)`,
          borderColor: item.isMatch && !isEmergingCard ? matchAccent : `${accent}88`,
          color: NEWS_CARD_COLOR_TOKENS.textMain,
          contentVisibility: 'auto',
          containIntrinsicSize: `${COLUMN_LAYOUT_TOKENS.newsCardIntrinsicHeightPx}px`,
          borderRadius: COLUMN_STYLE_TOKENS.newsCardRadius,
          boxShadow: performanceMode ? 'none' : `${COLUMN_STYLE_TOKENS.newsCardShadowOffset} ${NEWS_CARD_COLOR_TOKENS.shadowColor}, inset 0 1px 0 ${NEWS_CARD_COLOR_TOKENS.insetHighlight}`
        }}
      >
        <div className="cardOrnamentLayer" aria-hidden="true">
          <span className="frameTop" />
          <span className="frameBottom" />
          <span className="cornerTL" />
          <span className="cornerTR" />
          <span className="cornerBL" />
          <span className="cornerBR" />
          <span className="glyphTL" />
          <span className="glyphTR" />
          <span className="glyphBL" />
          <span className="glyphBR" />
        </div>
        <CardContent sx={{ pb: COLUMN_LAYOUT_TOKENS.cardContentPaddingBottom }}>
          <NewsCardHeader />
          <NewsCardBody />
          <NewsCardActions />
          <NewsCardAskPanel />
        </CardContent>
      </Card>
    </NewsCardProvider>
  );
}, (prev, next) => {
  return prev.view === next.view
    && prev.state === next.state
    && prev.handlers === next.handlers;
});
