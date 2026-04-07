'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { NEWS_CARD_COLOR_TOKENS } from '../designTokens';
import { useNewsCardContext } from './context/useNewsCardContext';

function normalizeSourceLabel(raw: string): string {
  const value = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  if (/^(unknown|source|rss|feed)$/i.test(value)) return '';
  return value.slice(0, 96);
}

function hostLabelFromUrl(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    return normalizeSourceLabel(new URL(value).hostname.replace(/^www\./i, ''));
  } catch {
    return '';
  }
}

export function NewsCardCover() {
  const { view, state } = useNewsCardContext();
  const { item } = state;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [item.coverUrl, item.id]);

  const sourceLabel = useMemo(() => {
    const direct = normalizeSourceLabel(item.source || '');
    if (direct) return direct;
    const byLink = hostLabelFromUrl(item.link);
    if (byLink) return byLink;
    return hostLabelFromUrl(item.feedUrl);
  }, [item.feedUrl, item.link, item.source]);

  if (!view.showNewsCovers) return null;

  const showImage = !!item.coverUrl && !imageFailed;
  const PlaceholderIcon = view.vibeIcons.summary;
  const placeholderText = view.language === 'bg' ? 'Няма изображение' : 'No cover';

  return (
    <Box
      sx={{
        position: 'relative',
        mb: 1.15,
        aspectRatio: '16 / 9',
        minHeight: 132,
        width: '100%',
        overflow: 'hidden',
        borderRadius: 'calc(var(--news-card-radius) - 2px)',
        border: `1px solid ${view.accent}55`,
        background: showImage
          ? 'rgba(6, 12, 24, 0.2)'
          : `linear-gradient(155deg, rgba(8, 16, 31, 0.96), rgba(8, 18, 36, 0.88)), radial-gradient(120% 120% at 0% 0%, ${view.soft}, transparent 68%)`,
        boxShadow: view.performanceMode ? 'none' : `0 10px 20px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)`
      }}
    >
      {showImage ? (
        <>
          <Box
            component="img"
            src={item.coverUrl}
            alt={`${item.title} cover`}
            loading="lazy"
            onError={() => setImageFailed(true)}
            sx={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: view.performanceMode ? 'none' : 'saturate(1.02) contrast(1.04)'
            }}
          />
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, rgba(5, 10, 20, 0.06), rgba(5, 10, 20, 0.14) 48%, rgba(5, 10, 20, 0.74))`
            }}
          />
        </>
      ) : (
        <>
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(100% 100% at 100% 0%, ${view.soft}, transparent 62%)`
            }}
          />
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              right: 16,
              bottom: 14,
              color: view.accent,
              opacity: 0.92,
              transform: 'scale(1.15)'
            }}
          >
            <PlaceholderIcon sx={{ fontSize: 24 }} />
          </Box>
        </>
      )}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 1.15
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          {sourceLabel ? (
            <Chip
              size="small"
              label={sourceLabel}
              sx={{
                height: 25,
                maxWidth: '100%',
                border: `1px solid ${view.accent}66`,
                background: 'rgba(6, 12, 24, 0.56)',
                color: NEWS_CARD_COLOR_TOKENS.textMain,
                backdropFilter: 'blur(10px)',
                '& .MuiChip-label': {
                  px: 1.05,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
              }}
            />
          ) : null}
        </Box>

        {!showImage ? (
          <Box sx={{ maxWidth: '74%' }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: NEWS_CARD_COLOR_TOKENS.headerMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                mb: 0.35
              }}
            >
              {placeholderText}
            </Typography>
            <Box
              aria-hidden="true"
              sx={{
                width: '100%',
                maxWidth: 176,
                height: 7,
                borderRadius: '999px',
                background: `linear-gradient(90deg, ${view.accent}, transparent)`
              }}
            />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
