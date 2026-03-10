'use client';

import { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FacebookIcon from '@mui/icons-material/Facebook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PushPinIcon from '@mui/icons-material/PushPin';
import RedditIcon from '@mui/icons-material/Reddit';
import XIcon from '@mui/icons-material/X';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { Box, Button, Chip, Link as MuiLink, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { formatTime } from '../reactColumns.utils';
import { NEWS_CARD_COLOR_TOKENS } from '../designTokens';
import { useNewsCardContext } from './context/useNewsCardContext';

export function NewsCardHeader() {
  const {
    view,
    state,
    handlers,
    ui
  } = useNewsCardContext();

  const { labels, vibeIcons, connected, fontScale, matchAccent } = view;
  const { item, isPinnedNews, isDuplicateMatch } = state;
  const { onTogglePinnedNews, onShareNews, onCopyNews, onHideItem } = handlers;
  const { iconOnly, hasBodyBlock, actionSx, matchActionSx } = ui;
  const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);
  const shareMenuOpen = Boolean(shareAnchorEl);

  const ShareIconComp = vibeIcons.share;
  const HideIconComp = vibeIcons.hide;
  const CopyIconComp = vibeIcons.copy;

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 0.9, pt: 0.35, px: 0.8, flexWrap: 'wrap', rowGap: 0.6, columnGap: 0.7 }}
      >
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0, flex: '1 1 auto', flexWrap: 'wrap', rowGap: 0.45 }}>
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
            flex: '0 0 auto',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            rowGap: 0.45,
            '@media (max-width: 660px)': {
              width: '100%',
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

      <MuiLink
        href={item.link}
        target="_blank"
        rel="noreferrer"
        underline="hover"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.6,
          fontSize: `${1.12 * fontScale}rem`,
          lineHeight: 1.36,
          fontWeight: 800,
          color: NEWS_CARD_COLOR_TOKENS.title,
          mb: 1.1,
          fontFamily: 'var(--news-title-font-family, var(--font-family))'
        }}
      >
        <span>{item.title}</span>
        <OpenInNewIcon sx={{ fontSize: 14 }} />
      </MuiLink>

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
