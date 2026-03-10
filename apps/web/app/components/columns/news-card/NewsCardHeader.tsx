'use client';

import { useEffect, useMemo, useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FacebookIcon from '@mui/icons-material/Facebook';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PushPinIcon from '@mui/icons-material/PushPin';
import RedditIcon from '@mui/icons-material/Reddit';
import XIcon from '@mui/icons-material/X';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { Box, Button, Chip, Link as MuiLink, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { formatTime } from '../reactColumns.utils';
import { NEWS_CARD_COLOR_TOKENS } from '../designTokens';
import { useNewsCardContext } from './context/useNewsCardContext';

function detectTitleLanguage(raw: string): 'bg' | 'en' | 'unknown' {
  const text = String(raw || '');
  const cyr = (text.match(/[А-Яа-яЁёЍѝ]/g) || []).length;
  const lat = (text.match(/[A-Za-z]/g) || []).length;
  const total = cyr + lat;
  if (!total) return 'unknown';
  const cyrRatio = cyr / total;
  const latRatio = lat / total;
  if (cyrRatio >= 0.45 && cyrRatio > latRatio) return 'bg';
  if (latRatio >= 0.55 && latRatio > cyrRatio) return 'en';
  return 'unknown';
}

function hostLabelFromUrl(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    return new URL(value).hostname.replace(/^www\./i, '').trim();
  } catch {
    return '';
  }
}

export function NewsCardHeader() {
  const {
    view,
    state,
    handlers,
    ui
  } = useNewsCardContext();

  const { labels, vibeIcons, connected, fontScale, matchAccent } = view;
  const { item, isPinnedNews, isDuplicateMatch } = state;
  const { onTogglePinnedNews, onShareNews, onCopyNews, onHideItem, onRequestTitleTranslation } = handlers;
  const { iconOnly, hasBodyBlock, actionSx, matchActionSx } = ui;
  const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);
  const shareMenuOpen = Boolean(shareAnchorEl);

  const ShareIconComp = vibeIcons.share;
  const HideIconComp = vibeIcons.hide;
  const CopyIconComp = vibeIcons.copy;
  const titleBg = String(item.titleBg || '').trim();
  const titleEn = String(item.titleEn || '').trim();
  const sourceLabel = useMemo(() => {
    const source = String(item.source || '').trim();
    if (source) return source;
    const byLink = hostLabelFromUrl(item.link);
    if (byLink) return byLink;
    return hostLabelFromUrl(item.feedUrl);
  }, [item.feedUrl, item.link, item.source]);
  const [titleOverride, setTitleOverride] = useState<'auto' | 'translated' | 'original'>('auto');
  const sourceTitleLanguage = useMemo(() => detectTitleLanguage(item.title), [item.title]);
  const translatedCandidate = useMemo(() => {
    const bgCandidate = titleBg && titleBg !== item.title ? titleBg : '';
    const enCandidate = titleEn && titleEn !== item.title ? titleEn : '';

    if (view.titleDisplayLanguage === 'bg') {
      if (sourceTitleLanguage === 'bg') return '';
      return bgCandidate;
    }

    if (view.titleDisplayLanguage === 'en') {
      if (sourceTitleLanguage === 'en') return '';
      return enCandidate;
    }

    if (sourceTitleLanguage === 'bg') return enCandidate;
    if (sourceTitleLanguage === 'en') return bgCandidate;
    return bgCandidate || enCandidate;
  }, [item.title, sourceTitleLanguage, titleBg, titleEn, view.titleDisplayLanguage]);
  const hasAnyTranslation = !!translatedCandidate;
  const displayTranslated = titleOverride === 'translated'
    || (titleOverride === 'auto' && view.titleDisplayLanguage !== 'original' && hasAnyTranslation);
  const displayedTitle = displayTranslated && translatedCandidate ? translatedCandidate : item.title;

  useEffect(() => {
    setTitleOverride('auto');
  }, [item.id, view.titleDisplayLanguage, titleBg, titleEn]);

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{
          mb: 0.9,
          pt: 0.35,
          px: 0.8,
          flexWrap: 'nowrap',
          rowGap: 0.6,
          columnGap: 0.7,
          '@media (max-width: 860px)': {
            flexWrap: 'wrap'
          }
        }}
      >
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0, flex: '1 1 auto', flexWrap: 'nowrap', rowGap: 0.45 }}>
          {sourceLabel ? (
            <Typography
              variant="caption"
              sx={{
                color: NEWS_CARD_COLOR_TOKENS.headerMuted,
                opacity: 0.92,
                maxWidth: 188,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 700,
                letterSpacing: 0.2
              }}
              title={sourceLabel}
            >
              {sourceLabel}
            </Typography>
          ) : null}
          {sourceLabel ? (
            <Typography variant="caption" sx={{ color: NEWS_CARD_COLOR_TOKENS.headerMuted, opacity: 0.6, flexShrink: 0 }}>
              •
            </Typography>
          ) : null}
          <Typography
            variant="caption"
            sx={{ color: NEWS_CARD_COLOR_TOKENS.headerMuted, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {formatTime(item.publishedMs)}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={0.6}
          alignItems="center"
          sx={{
            pr: 0.2,
            ml: 'auto',
            flex: '0 1 auto',
            flexWrap: 'nowrap',
            justifyContent: 'flex-end',
            rowGap: 0.45,
            '@media (max-width: 860px)': {
              width: '100%',
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
              ml: 0
            }
          }}
        >
          {item.isMatch ? (
            <Chip
              size="small"
              label={isDuplicateMatch ? labels.duplicatedMatch : labels.match}
              variant="outlined"
              sx={{
                color: matchAccent,
                borderColor: matchAccent,
                fontWeight: 800,
                flexShrink: 0,
                whiteSpace: isDuplicateMatch ? 'pre-line' : 'nowrap',
                height: isDuplicateMatch ? 'auto' : undefined,
                '& .MuiChip-label': isDuplicateMatch
                  ? {
                    px: 1.1,
                    py: 0.2,
                    lineHeight: 1.05,
                    textAlign: 'center'
                  }
                  : undefined
              }}
            />
          ) : null}
          <Tooltip title={isPinnedNews ? labels.unpinNews : labels.pinNews}>
            <Button
              size="small"
              variant={isPinnedNews ? 'contained' : 'outlined'}
              sx={{ ...actionSx, minWidth: 36, px: iconOnly ? 0.8 : 1.05 }}
              onClick={() => onTogglePinnedNews(item.id)}
            >
              <PushPinIcon sx={{ fontSize: 15 }} aria-hidden />
            </Button>
          </Tooltip>
          <Tooltip title={labels.shareOn}>
            <Button
              size="small"
              variant="outlined"
              sx={actionSx}
              onClick={(e) => setShareAnchorEl(e.currentTarget)}
            >
              {iconOnly ? <ShareIconComp sx={{ fontSize: 15 }} aria-hidden /> : labels.shareLink}
            </Button>
          </Tooltip>
          <Menu
            anchorEl={shareAnchorEl}
            open={shareMenuOpen}
            onClose={() => setShareAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { onShareNews(item, 'copy'); setShareAnchorEl(null); }}>
              <ContentCopyIcon sx={{ fontSize: 16, mr: 1 }} />
              {labels.shareCopyLink}
            </MenuItem>
            <MenuItem onClick={() => { onShareNews(item, 'card'); setShareAnchorEl(null); }}>
              <ImageIcon sx={{ fontSize: 16, mr: 1 }} />
              {labels.shareCardImage}
            </MenuItem>
            <MenuItem onClick={() => { onShareNews(item, 'facebook'); setShareAnchorEl(null); }}>
              <FacebookIcon sx={{ fontSize: 16, mr: 1 }} />
              {labels.shareFacebook}
            </MenuItem>
            <MenuItem onClick={() => { onShareNews(item, 'reddit'); setShareAnchorEl(null); }}>
              <RedditIcon sx={{ fontSize: 16, mr: 1 }} />
              {labels.shareReddit}
            </MenuItem>
            <MenuItem onClick={() => { onShareNews(item, 'x'); setShareAnchorEl(null); }}>
              <XIcon sx={{ fontSize: 16, mr: 1 }} />
              {labels.shareX}
            </MenuItem>
            <MenuItem onClick={() => { onShareNews(item, 'tiktok'); setShareAnchorEl(null); }}>
              <MusicNoteIcon sx={{ fontSize: 16, mr: 1 }} />
              {labels.shareTikTok}
            </MenuItem>
          </Menu>
          <Tooltip title={labels.copyNews}>
            <Button
              size="small"
              variant="outlined"
              sx={actionSx}
              onClick={() => onCopyNews(item)}
            >
              {iconOnly ? <CopyIconComp sx={{ fontSize: 15 }} aria-hidden /> : labels.copyNews}
            </Button>
          </Tooltip>
          <Tooltip title={labels.hideNews}>
            <Button
              size="small"
              variant="outlined"
              sx={matchActionSx}
              onClick={() => onHideItem(item)}
              disabled={!connected}
            >
              {iconOnly ? <HideIconComp sx={{ fontSize: 15 }} aria-hidden /> : labels.hideNews}
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="flex-start" spacing={0.7} sx={{ mb: 1.1 }}>
        <Tooltip
          title={displayTranslated ? labels.showOriginalTitle : labels.showTranslatedTitle}
        >
          <Typography
            component="button"
            type="button"
            onClick={() => {
              if (hasAnyTranslation) {
                setTitleOverride(displayTranslated ? 'original' : 'translated');
                return;
              }
              onRequestTitleTranslation(item);
            }}
            sx={{
              p: 0,
              m: 0,
              border: 0,
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: `${1.12 * fontScale}rem`,
              lineHeight: 1.36,
              fontWeight: 800,
              color: NEWS_CARD_COLOR_TOKENS.title,
              fontFamily: 'var(--news-title-font-family, var(--font-family))'
            }}
          >
            {displayedTitle}
          </Typography>
        </Tooltip>
        <MuiLink
          href={item.link}
          target="_blank"
          rel="noreferrer"
          underline="none"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            color: NEWS_CARD_COLOR_TOKENS.title,
            mt: 0.2
          }}
          aria-label={item.title}
        >
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </MuiLink>
      </Stack>

      {hasBodyBlock ? (
        <Box
          sx={{
            borderTop: view.performanceMode
              ? `1px solid ${NEWS_CARD_COLOR_TOKENS.dividerSoft}`
              : `1px solid ${NEWS_CARD_COLOR_TOKENS.dividerStrong}`,
            mb: 1.1
          }}
        />
      ) : null}
    </>
  );
}
