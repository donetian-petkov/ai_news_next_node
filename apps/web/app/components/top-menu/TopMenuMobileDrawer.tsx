'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { AddStreamSection } from './AddStreamSection';
import { QuickVibeSelect } from './QuickVibeSelect';
import { SearchSection } from './SearchSection';
import { TopMenuControlsPanel } from './TopMenuControlsPanel';
import { FILTERED_FEED_URL } from '../../store/constants';
import { useTopMenuContext } from './context/useTopMenuContext';

type MobileAnchorTarget = 'search' | 'add';

export function TopMenuMobileDrawer() {
  const {
    isMobile,
    labels,
    searchLabel,
    addStreamLabel,
    allColumnLabel,
    hideAllResearchLabel,
    hideAllSummariesLabel,
    orderedFeeds,
    searchVisible,
    addStreamVisible,
    onToggleSearch,
    onToggleAddStream,
    onToggleAllColumnControls,
    onToggleHideAllResearch,
    onToggleHideAllSummaries,
    onReorderFeeds,
    mobileDrawer
  } = useTopMenuContext();
  const { open, onClose } = mobileDrawer;
  const [pendingAnchor, setPendingAnchor] = useState<MobileAnchorTarget | null>(null);
  const drawerBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !pendingAnchor) return;
    const targetVisible =
      pendingAnchor === 'search'
        ? searchVisible
        : addStreamVisible;
    if (!targetVisible) return;

    const timer = window.setTimeout(() => {
      const target = drawerBodyRef.current?.querySelector(`[data-mobile-anchor="${pendingAnchor}"]`) as HTMLElement | null;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingAnchor(null);
    }, 40);
    return () => window.clearTimeout(timer);
  }, [addStreamVisible, open, pendingAnchor, searchVisible]);

  if (!isMobile) return null;

  return (
    <Drawer anchor="left" open={open} onClose={onClose} PaperProps={{ className: 'mobileDrawerPaper' }}>
      <Box className="mobileDrawerHeader">
        <Typography className="mobileDrawerTitle" variant="h6">{labels.title}</Typography>
        <IconButton className="mobileDrawerCloseBtn" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider className="mobileDrawerDivider" />
      <Box className="mobileDrawerBody" ref={drawerBodyRef}>
        <Stack className="mobileDrawerVibeRow" direction="row" spacing={1} alignItems="center">
          <QuickVibeSelect fullWidth />
        </Stack>
        <Stack spacing={1}>
          <Button
            variant="outlined"
            onClick={() => {
              if (!searchVisible) setPendingAnchor('search');
              onToggleSearch();
            }}
            startIcon={<SearchIcon fontSize="small" />}
          >
            {searchLabel}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              if (!addStreamVisible) setPendingAnchor('add');
              onToggleAddStream();
            }}
            startIcon={<AddIcon fontSize="small" />}
          >
            {addStreamLabel}
          </Button>
          <Button variant="outlined" onClick={onToggleAllColumnControls}>
            {allColumnLabel}
          </Button>
          <Button variant="outlined" onClick={onToggleHideAllResearch}>
            {hideAllResearchLabel}
          </Button>
          <Button variant="outlined" onClick={onToggleHideAllSummaries}>
            {hideAllSummariesLabel}
          </Button>
        </Stack>
        <Box className="mobileDrawerReorderSection">
          <Typography variant="subtitle2" className="mobileDrawerReorderTitle">
            {labels.reorderColumns}
          </Typography>
          <Stack spacing={0.7}>
            {orderedFeeds.map((feed, idx) => {
              const isFixed = feed.url === FILTERED_FEED_URL;
              const prev = orderedFeeds[idx - 1];
              const next = orderedFeeds[idx + 1];
              const canMoveUp = !isFixed && !!prev && prev.url !== FILTERED_FEED_URL;
              const canMoveDown = !isFixed && !!next;
              return (
                <Stack
                  key={`mobile-order-${feed.url}`}
                  className="mobileDrawerReorderItem"
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="body2" className="mobileDrawerReorderLabel">
                    {feed.label}
                  </Typography>
                  <Stack direction="row" spacing={0.4}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (!canMoveUp || !prev) return;
                        onReorderFeeds(feed.url, prev.url);
                      }}
                      disabled={!canMoveUp}
                      aria-label={labels.moveUp}
                      className="mobileDrawerArrowBtn"
                    >
                      <ArrowUpwardIcon fontSize="inherit" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (!canMoveDown || !next) return;
                        onReorderFeeds(feed.url, next.url);
                      }}
                      disabled={!canMoveDown}
                      aria-label={labels.moveDown}
                      className="mobileDrawerArrowBtn"
                    >
                      <ArrowDownwardIcon fontSize="inherit" />
                    </IconButton>
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </Box>
        {searchVisible ? (
          <Box data-mobile-anchor="search">
            <SearchSection />
          </Box>
        ) : null}
        {addStreamVisible ? (
          <Box data-mobile-anchor="add">
            <AddStreamSection />
          </Box>
        ) : null}
        <TopMenuControlsPanel />
      </Box>
    </Drawer>
  );
}
