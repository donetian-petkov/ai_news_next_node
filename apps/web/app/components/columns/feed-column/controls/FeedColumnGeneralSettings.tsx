'use client';

import { Button, FormControl, MenuItem, Select } from '@mui/material';
import { FILTERED_FEED_URL } from '../../../../store/constants';
import type { SortMode } from '../../../../store/types';
import type { FeedFilterPreset } from '../../reactColumns.types';
import { getFeedFilterPreset } from '../../reactColumns.utils';
import { useFeedColumnsContext } from '../../context/useFeedColumnsContext';
import { useFeedColumnContext } from '../context/useFeedColumnContext';

export function FeedColumnGeneralSettings() {
  const { feed } = useFeedColumnContext();
  const { view, state, handlers } = useFeedColumnsContext();
  const { connected, compactBtnSx, compactFormSx, labels } = view;
  const advancedControlsOpen = !!state.advancedControlsByUrl[feed.url];
  const { onSetFeedInterval, onSetFeedSortMode, onSetFeedFilterPreset, onToggleAdvancedControls } = handlers;
  const presetPollIntervals = [45, 60, 90, 120, 180, 300];
  const isFilteredColumn = feed.url === FILTERED_FEED_URL || String(feed.label || '').toLowerCase().startsWith('filtered');
  const currentPoll = isFilteredColumn
    ? 120
    : Math.max(20, Math.min(3600, Math.floor(Number(feed.intervalSec) || 120)));
  const hasCustomPoll = !isFilteredColumn && !presetPollIntervals.includes(currentPoll);

  return (
    <>
      <FormControl size="small" fullWidth sx={compactFormSx}>
        <Select
          value={String(currentPoll)}
          onChange={e => onSetFeedInterval(feed, Number(e.target.value) || 120)}
          disabled={!connected || isFilteredColumn}
        >
          {hasCustomPoll ? (
            <MenuItem value={String(currentPoll)}>{`Poll: ${currentPoll}s`}</MenuItem>
          ) : null}
          <MenuItem value="45">{labels.poll45}</MenuItem>
          <MenuItem value="60">{labels.poll60}</MenuItem>
          <MenuItem value="90">{labels.poll90}</MenuItem>
          <MenuItem value="120">{labels.poll120}</MenuItem>
          <MenuItem value="180">{labels.poll180}</MenuItem>
          <MenuItem value="300">{labels.poll300}</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" fullWidth sx={compactFormSx}>
        <Select
          value={feed.sortMode}
          onChange={e => onSetFeedSortMode(feed, e.target.value as SortMode)}
          disabled={!connected}
        >
          <MenuItem value="newest">{labels.sortNewest}</MenuItem>
          <MenuItem value="oldest">{labels.sortOldest}</MenuItem>
          <MenuItem value="matched">{labels.sortMatched}</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" fullWidth sx={compactFormSx}>
        <Select
          value={getFeedFilterPreset(feed.filters)}
          onChange={e => onSetFeedFilterPreset(feed, e.target.value as FeedFilterPreset)}
          disabled={!connected}
        >
          <MenuItem value="all">{labels.filterAll}</MenuItem>
          <MenuItem value="matches">{labels.filterMatches}</MenuItem>
          <MenuItem value="researched">{labels.filterResearched}</MenuItem>
          <MenuItem value="summaries">{labels.filterSummaries}</MenuItem>
          <MenuItem value="matches_researched">{labels.filterMatchesResearched}</MenuItem>
          <MenuItem value="matches_summaries">{labels.filterMatchesSummaries}</MenuItem>
          <MenuItem value="researched_summaries">{labels.filterResearchedSummaries}</MenuItem>
          <MenuItem value="all_flags">{labels.filterAllFlags}</MenuItem>
        </Select>
      </FormControl>
      <Button
        size="small"
        variant="outlined"
        fullWidth
        onClick={() => onToggleAdvancedControls(feed.url)}
        sx={{ ...compactBtnSx, gridColumn: '1 / -1' }}
      >
        {advancedControlsOpen ? labels.lessOptions : labels.moreOptions}
      </Button>
    </>
  );
}
