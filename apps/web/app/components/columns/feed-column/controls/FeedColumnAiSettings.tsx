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
  const { onToggleFeedSummary, onToggleFeedTranslation, onToggleFeedResearch, onSetFeedDiscordWebhook, onSetFeedBudget, onSetKeywords } = handlers;
  const [keywordsDraft, setKeywordsDraft] = useState('');
  const [discordWebhookDraft, setDiscordWebhookDraft] = useState(feed.discordWebhookUrl || '');

  useEffect(() => {
    setDiscordWebhookDraft(feed.discordWebhookUrl || '');
  }, [feed.discordWebhookUrl, feed.url]);

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

  const saveDiscordWebhook = () => {
    onSetFeedDiscordWebhook(feed, discordWebhookDraft);
  };

  const savedWebhookHint = feed.discordWebhookUrl
    ? `${labels.discordWebhookSaved || 'Saved for this feed'}: ${maskDiscordWebhookUrl(feed.discordWebhookUrl)}`
    : labels.discordWebhookPlaceholder || 'https://discord.com/api/webhooks/...';

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
        variant={feed.translationEnabled ? 'contained' : 'outlined'}
        onClick={() => onToggleFeedTranslation(feed)}
        disabled={!connected}
        sx={compactBtnSx}
      >
        {feed.translationEnabled ? labels.translationsOn : labels.translationsOff}
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
      <TextField
        size="small"
        fullWidth
        label={labels.discordWebhookLabel || 'Discord webhook'}
        placeholder={labels.discordWebhookPlaceholder || 'https://discord.com/api/webhooks/...'}
        value={discordWebhookDraft}
        onChange={e => setDiscordWebhookDraft(e.target.value)}
        onBlur={saveDiscordWebhook}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveDiscordWebhook();
          }
        }}
        disabled={!connected}
        helperText={savedWebhookHint}
        sx={compactFormSx}
      />
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

function maskDiscordWebhookUrl(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return `${parsed.hostname}/api/webhooks/••••/••••`;
  } catch {
    return 'discord.com/api/webhooks/••••/••••';
  }
}
