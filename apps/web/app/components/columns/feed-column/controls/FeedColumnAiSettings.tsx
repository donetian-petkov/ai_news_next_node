'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, FormControl, MenuItem, Select, Stack, TextField } from '@mui/material';
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

  const addKeywords = () => {
    const additions = String(keywordsDraft || '')
      .split(/[,\n]+/g)
      .map(v => v.trim())
      .filter(Boolean);
    if (!additions.length) return;
    const seen = new Set(keywords.map(v => v.toLocaleLowerCase()));
    const next = [...keywords];
    additions.forEach(v => {
      const key = v.toLocaleLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      next.push(v);
    });
    onSetKeywords(next);
    setKeywordsDraft('');
  };

  const removeKeyword = (keyword: string) => {
    const target = keyword.toLocaleLowerCase();
    onSetKeywords(keywords.filter(v => v.toLocaleLowerCase() !== target));
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
              onClick={addKeywords}
              disabled={!connected || !String(keywordsDraft || '').trim()}
              sx={compactBtnSx}
            >
              {labels.matchKeywordsApply || 'Add'}
            </Button>
          </Stack>
          {keywords.length ? (
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              {keywords.map(keyword => (
                <Chip
                  key={keyword.toLocaleLowerCase()}
                  size="small"
                  label={keyword}
                  onDelete={() => removeKeyword(keyword)}
                  disabled={!connected}
                />
              ))}
            </Stack>
          ) : null}
        </Box>
      ) : null}
    </>
  );
}
