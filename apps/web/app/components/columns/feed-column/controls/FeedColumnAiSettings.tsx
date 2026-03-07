'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, FormControl, MenuItem, Select, Stack, TextField } from '@mui/material';
import type { BudgetMode } from '../../../../store/types';
import { useFeedColumnsContext } from '../../context/useFeedColumnsContext';
import { useFeedColumnContext } from '../context/useFeedColumnContext';

export function FeedColumnAiSettings() {
  const { feed, isMatchColumn } = useFeedColumnContext();
  const { view, handlers } = useFeedColumnsContext();
  const { aiAvailable, connected, compactBtnSx, compactFormSx, labels, keywords } = view;
  const { onToggleFeedSummary, onToggleFeedResearch, onSetFeedBudget, onSetKeywords } = handlers;
  const [keywordsDraft, setKeywordsDraft] = useState(keywords.join(', '));

  useEffect(() => {
    setKeywordsDraft(keywords.join(', '));
  }, [keywords]);

  const applyKeywords = () => {
    const next = String(keywordsDraft || '')
      .split(/[,\n]+/g)
      .map(v => v.trim())
      .filter(Boolean);
    onSetKeywords(next);
  };

  if (!aiAvailable) {
    return (
      <Alert severity="info" variant="outlined" sx={{ gridColumn: '1 / -1' }}>
        {labels.aiUnavailable}
      </Alert>
    );
  }

  return (
    <>
      <Button
        size="small"
        fullWidth
        variant={feed.summaryEnabled ? 'contained' : 'outlined'}
        onClick={() => onToggleFeedSummary(feed)}
        disabled={!connected}
        sx={compactBtnSx}
      >
        {feed.summaryEnabled ? labels.summariesOn : labels.summariesOff}
      </Button>
      <Button
        size="small"
        fullWidth
        variant={feed.researchEnabled ? 'contained' : 'outlined'}
        onClick={() => onToggleFeedResearch(feed)}
        disabled={!connected}
        sx={compactBtnSx}
      >
        {feed.researchEnabled ? labels.researchOn : labels.researchOff}
      </Button>
      <FormControl size="small" fullWidth sx={compactFormSx}>
        <Select
          value={feed.budget}
          onChange={e => onSetFeedBudget(feed, e.target.value as BudgetMode)}
          disabled={!connected}
        >
          <MenuItem value="low">{labels.budgetLow}</MenuItem>
          <MenuItem value="standard">{labels.budgetStandard}</MenuItem>
          <MenuItem value="high">{labels.budgetHigh}</MenuItem>
        </Select>
      </FormControl>
      {isMatchColumn ? (
        <Box sx={{ gridColumn: '1 / -1', border: '1px solid var(--ctl-border)', borderRadius: 2, p: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              label={labels.matchKeywordsInputLabel || 'Keywords'}
              placeholder={labels.matchKeywordsPlaceholder || 'keyword1, keyword2, keyword3'}
              value={keywordsDraft}
              onChange={e => setKeywordsDraft(e.target.value)}
            />
            <Button
              size="small"
              variant="contained"
              onClick={applyKeywords}
              disabled={!connected}
              sx={compactBtnSx}
            >
              {labels.matchKeywordsApply || 'Apply'}
            </Button>
          </Stack>
        </Box>
      ) : null}
    </>
  );
}
