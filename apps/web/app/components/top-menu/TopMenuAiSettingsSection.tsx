'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { TopMenuSelectField } from './TopMenuSelectField';
import {
  buildAiModelOptions,
  buildAiProviderOptions,
  buildBudgetOptions,
  buildMoodOptions,
  buildResearchLangOptions,
  buildSummaryLangOptions,
  buildTitleDisplayLanguageOptions,
  buildTypeOptions
} from './topMenuOptionBuilders';
import { hasProviderKeyLocal } from './actions/useTopMenuAiActions';
import { useTopMenuContext } from './context/useTopMenuContext';

const FEATURE_ROWS: Array<{ key: keyof ReturnType<typeof useTopMenuContext>['controls']['model']['aiSettings']['insightFeatures']; label: string; hint: string }> = [
  { key: 'biasDetection', label: 'Bias detector', hint: 'Political leaning, tone, and framing. Budget: standard or high.' },
  { key: 'sensationalismDetection', label: 'Rage bait detector', hint: 'Flags clickbait headlines and suggests safer alternatives. Budget: standard or high.' },
  { key: 'factHighlights', label: 'Fact highlights', hint: 'People, places, dates, numbers, and quotes under each story. Budget: standard or high.' },
  { key: 'storyImpact', label: 'Impact prediction', hint: 'Economic, political, and tech implications. Budget: high only.' },
  { key: 'perspectiveSimulator', label: 'Perspective simulator', hint: 'Investor, government, consumer, and tech views. Budget: high only.' },
  { key: 'historicalComparison', label: 'Historical comparison', hint: 'Similar past events and patterns. Budget: high only.' },
  { key: 'futureScenarioGenerator', label: 'Future scenarios', hint: 'Possible next outcomes with a disclaimer. Budget: high only.' },
  { key: 'localImpactDetector', label: 'Local impact', hint: 'How global stories affect the selected region. Budget: high only.' },
  { key: 'topicTracking', label: 'Topic tracking', hint: 'Follow recurring topics and only surface major updates. Budget: high only.' },
  { key: 'emergingStoryDetector', label: 'Emerging stories', hint: 'Optional column for repeated stories rising fast. Budget: high only.' },
  { key: 'dailyBriefing', label: 'Daily briefing', hint: 'Enables the on-demand briefing generator below. Budget: high only.' }
];

const LOCAL_IMPACT_REGION_OPTIONS = [
  'United States',
  'United Kingdom',
  'European Union',
  'Bulgaria',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Poland',
  'Romania',
  'Greece',
  'Turkey',
  'Ukraine',
  'Russia',
  'Canada',
  'Mexico',
  'Brazil',
  'Argentina',
  'Chile',
  'Australia',
  'New Zealand',
  'Japan',
  'South Korea',
  'China',
  'Taiwan',
  'Hong Kong',
  'India',
  'Singapore',
  'Indonesia',
  'Vietnam',
  'Thailand',
  'Philippines',
  'Middle East',
  'Saudi Arabia',
  'United Arab Emirates',
  'Israel',
  'Africa',
  'South Africa'
];

export function TopMenuAiSettingsSection() {
  const {
    labels,
    controls: {
      model: { aiSettings },
      actions
    }
  } = useTopMenuContext();

  const providerModels = aiSettings.availableModels[aiSettings.aiProvider];
  const [providerKeyDraft, setProviderKeyDraft] = useState('');
  const [keywordsDraft, setKeywordsDraft] = useState('');
  const [topicsDraft, setTopicsDraft] = useState('');
  const [hasSavedProviderKey, setHasSavedProviderKey] = useState(() => hasProviderKeyLocal(aiSettings.aiProvider));
  const compactActionButtonSx = {
    whiteSpace: 'nowrap',
    minWidth: { xs: 112, sm: 108 },
    alignSelf: { xs: 'flex-start', sm: 'center' },
    px: 2,
    borderRadius: '14px'
  } as const;

  const briefingFeedSelection = useMemo(() => {
    if (aiSettings.dailyBriefingFeedUrls.length) {
      return new Set(aiSettings.dailyBriefingFeedUrls);
    }
    return new Set(aiSettings.availableFeeds.map(feed => feed.url));
  }, [aiSettings.availableFeeds, aiSettings.dailyBriefingFeedUrls]);

  useEffect(() => {
    setHasSavedProviderKey(hasProviderKeyLocal(aiSettings.aiProvider));
  }, [aiSettings.aiProvider]);

  const addKeywords = () => {
    const additions = String(keywordsDraft || '')
      .split(/[,\n]+/g)
      .map(v => v.trim())
      .filter(Boolean);
    if (!additions.length) return;
    const seen = new Set(aiSettings.keywords.map(v => v.toLocaleLowerCase()));
    const next = [...aiSettings.keywords];
    additions.forEach(v => {
      const key = v.toLocaleLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      next.push(v);
    });
    actions.onSetKeywords(next);
    setKeywordsDraft('');
  };

  const removeKeyword = (keyword: string) => {
    const target = keyword.toLocaleLowerCase();
    actions.onSetKeywords(aiSettings.keywords.filter(v => v.toLocaleLowerCase() !== target));
  };

  const addTopics = () => {
    const additions = String(topicsDraft || '')
      .split(/[,\n]+/g)
      .map(v => v.trim())
      .filter(Boolean);
    if (!additions.length) return;
    const seen = new Set(aiSettings.trackedTopics.map(v => v.toLocaleLowerCase()));
    const next = [...aiSettings.trackedTopics];
    additions.forEach(v => {
      const key = v.toLocaleLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      next.push(v);
    });
    actions.onSetTrackedTopics(next);
    setTopicsDraft('');
  };

  const toggleBriefingFeed = (feedUrl: string) => {
    const current = new Set(briefingFeedSelection);
    if (current.has(feedUrl)) current.delete(feedUrl);
    else current.add(feedUrl);
    actions.onSetDailyBriefingPrefs({ dailyBriefingFeedUrls: Array.from(current) });
  };

  const openEmailDraft = () => {
    const latest = aiSettings.briefing.latest;
    if (!latest || !aiSettings.dailyBriefingEmail.trim()) return;
    const subject = encodeURIComponent(latest.title);
    const body = encodeURIComponent(latest.body);
    window.open(`mailto:${encodeURIComponent(aiSettings.dailyBriefingEmail.trim())}?subject=${subject}&body=${body}`, '_self');
  };

  const playBriefingAudio = () => {
    const latest = aiSettings.briefing.latest;
    if (!latest) return;
    const text = latest.audioScript || latest.body;
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <details className="controlSection controlSectionAi" open>
      <summary id="aiSettingsSummary">{labels.aiSettingsSummary}</summary>
      <div className="controlGroup controlGroupAi">
        <div className="topMenuFieldGrid">
          <TopMenuSelectField
            id="aiProviderSelect"
            label={labels.aiProvider}
            value={aiSettings.aiProvider}
            onChange={actions.onChangeAiProvider}
            options={buildAiProviderOptions(labels)}
            layout="stacked"
            wrapperClassName="topMenuField"
          />

          <TopMenuSelectField
            id="summaryLang"
            label={labels.summaryPrefix}
            value={aiSettings.summaryLang}
            disabled={!aiSettings.aiAvailable}
            onChange={actions.onSummaryLangChange}
            options={buildSummaryLangOptions()}
            layout="stacked"
            wrapperClassName="topMenuField"
          />

          <TopMenuSelectField
            id="researchLang"
            label={labels.researchPrefix}
            value={aiSettings.researchLang}
            disabled={!aiSettings.aiAvailable}
            onChange={actions.onResearchLangChange}
            options={buildResearchLangOptions()}
            layout="stacked"
            wrapperClassName="topMenuField"
          />

          <TopMenuSelectField
            id="titleDisplayLanguage"
            label={labels.titleDisplayLanguagePrefix || 'Title language:'}
            value={aiSettings.titleDisplayLanguage}
            onChange={actions.onTitleDisplayLanguageChange}
            options={buildTitleDisplayLanguageOptions(labels)}
            layout="stacked"
            wrapperClassName="topMenuField"
          />

          <TopMenuSelectField
            id="summaryModel"
            label={labels.summaryModelPrefix}
            value={aiSettings.summaryModel}
            disabled={!aiSettings.aiAvailable}
            onChange={actions.onSummaryModelChange}
            options={buildAiModelOptions(providerModels.summary, aiSettings.summaryModel)}
            layout="stacked"
            wrapperClassName="topMenuField"
          />

          <TopMenuSelectField
            id="researchModel"
            label={labels.researchModelPrefix}
            value={aiSettings.researchModel}
            disabled={!aiSettings.aiAvailable}
            onChange={actions.onResearchModelChange}
            options={buildAiModelOptions(providerModels.research, aiSettings.researchModel)}
            layout="stacked"
            wrapperClassName="topMenuField"
          />

          <TopMenuSelectField
            id="askModel"
            label={labels.askModelPrefix}
            value={aiSettings.askModel}
            disabled={!aiSettings.aiAvailable}
            onChange={actions.onAskModelChange}
            options={buildAiModelOptions(providerModels.ask, aiSettings.askModel)}
            layout="stacked"
            wrapperClassName="topMenuField"
          />

          {!aiSettings.performanceMode ? (
            <>
              <TopMenuSelectField
                id="moodFilter"
                label={labels.moodFilter}
                value={aiSettings.moodFilter}
                disabled={!aiSettings.aiAvailable}
                onChange={actions.onMoodFilterChange}
                options={buildMoodOptions(labels)}
                layout="stacked"
                wrapperClassName="topMenuField"
              />
              <TopMenuSelectField
                id="typeFilter"
                label={labels.typeFilter}
                value={aiSettings.typeFilter}
                disabled={!aiSettings.aiAvailable}
                onChange={actions.onTypeFilterChange}
                options={buildTypeOptions(labels)}
                layout="stacked"
                wrapperClassName="topMenuField"
              />
            </>
          ) : (
            <Alert severity="info" sx={{ py: 0 }} className="topMenuFieldGridFull">
              {labels.perfAIFiltersHidden}
            </Alert>
          )}

          <TopMenuSelectField
            id="allBudgetSelect"
            title="Apply one budget to all columns"
            label={labels.allBudgetPrefix}
            value={aiSettings.allBudget}
            disabled={!aiSettings.aiAvailable}
            onChange={budget => {
              if (budget !== 'mixed') actions.onApplyAllBudget(budget);
            }}
            options={buildBudgetOptions(labels)}
            layout="stacked"
            wrapperClassName="topMenuField"
          />

          {!aiSettings.aiAvailable ? (
            <Alert severity="info" sx={{ py: 0 }} className="topMenuFieldGridFull">
              {labels.aiUnavailable}
            </Alert>
          ) : null}
        </div>

        <Box className="topMenuCardBlock" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8, gap: 1 }}>
            <Typography variant="caption">
              {labels.providerKeyTitle || 'Provider API key'}
            </Typography>
            <Chip
              size="small"
              color={hasSavedProviderKey ? 'success' : 'default'}
              variant={hasSavedProviderKey ? 'filled' : 'outlined'}
              label={
                hasSavedProviderKey
                  ? (labels.providerKeyStoredYes || 'Saved key available')
                  : (labels.providerKeyStoredNo || 'No saved key')
              }
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              type="password"
              label={labels.providerKeyLabel || 'API key'}
              placeholder={labels.providerKeyPlaceholder || 'Paste key for selected provider'}
              value={providerKeyDraft}
              onChange={e => setProviderKeyDraft(e.target.value)}
            />
            <Button
              size="small"
              variant="contained"
              sx={compactActionButtonSx}
              onClick={() => {
                const next = String(providerKeyDraft || '').trim();
                if (!next) return;
                actions.onSetProviderApiKey(aiSettings.aiProvider, next);
                setHasSavedProviderKey(true);
                setProviderKeyDraft('');
              }}
              disabled={!String(providerKeyDraft || '').trim()}
            >
              {labels.providerKeySave || 'Save key'}
            </Button>
          </Stack>
        </Box>

        <Box className="topMenuCardBlock" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.8 }}>
            AI features
          </Typography>
          <Alert severity="info" sx={{ mb: 1.1, py: 0.2 }}>
            Feature changes apply to new or refreshed stories. Cards with AI output show an explicit AI insights status.
          </Alert>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.1 }}>
            <Box className="topMenuFeatureCard" sx={{ border: '1px solid var(--panel-border)', px: 1.2, py: 0.9, flex: 1 }}>
              <FormControlLabel
                control={<Switch size="small" checked={aiSettings.showFilteredColumn} onChange={event => actions.onToggleSpecialColumn('filtered', event.target.checked)} sx={{ ml: 0.25, mr: 0.75 }} />}
                label={<Box className="topMenuFeatureCopy"><Typography variant="body2" sx={{ fontWeight: 700 }}>Show filtered column</Typography><Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2, lineHeight: 1.55 }}>Keeps the matched-news column visible.</Typography></Box>}
                sx={{ alignItems: 'flex-start', m: 0, width: '100%', '.MuiFormControlLabel-label': { minWidth: 0, flex: 1 } }}
              />
            </Box>
            <Box className="topMenuFeatureCard" sx={{ border: '1px solid var(--panel-border)', px: 1.2, py: 0.9, flex: 1 }}>
              <FormControlLabel
                control={<Switch size="small" checked={aiSettings.showEmergingColumn} onChange={event => actions.onToggleSpecialColumn('emerging', event.target.checked)} sx={{ ml: 0.25, mr: 0.75 }} />}
                label={<Box className="topMenuFeatureCopy"><Typography variant="body2" sx={{ fontWeight: 700 }}>Show emerging column</Typography><Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2, lineHeight: 1.55 }}>Shows the separate emerging-stories column when signals exist.</Typography></Box>}
                sx={{ alignItems: 'flex-start', m: 0, width: '100%', '.MuiFormControlLabel-label': { minWidth: 0, flex: 1 } }}
              />
            </Box>
          </Stack>
          <div className="topMenuFieldGrid topMenuFeatureGrid">
            {FEATURE_ROWS.map(feature => (
              <Box key={feature.key} className="topMenuFeatureCard" sx={{ border: '1px solid var(--panel-border)', px: 1.2, py: 0.9 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={!!aiSettings.insightFeatures[feature.key]}
                      onChange={event => actions.onSetInsightFeature(feature.key, event.target.checked)}
                      sx={{ ml: 0.25, mr: 0.75 }}
                    />
                  }
                  label={
                    <Box className="topMenuFeatureCopy">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{feature.label}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2, lineHeight: 1.55 }}>{feature.hint}</Typography>
                    </Box>
                  }
                  sx={{
                    alignItems: 'flex-start',
                    m: 0,
                    width: '100%',
                    '.MuiFormControlLabel-label': {
                      minWidth: 0,
                      flex: 1
                    }
                  }}
                />
              </Box>
            ))}
          </div>
        </Box>

        <Box className="topMenuCardBlock" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.8 }}>
            {labels.matchKeywordsLabel || 'Filtered match keywords'}
          </Typography>
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
              disabled={!String(keywordsDraft || '').trim()}
            >
              {labels.matchKeywordsApply || 'Add'}
            </Button>
          </Stack>
          {aiSettings.keywords.length ? (
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              {aiSettings.keywords.map(keyword => (
                <Chip
                  key={keyword.toLocaleLowerCase()}
                  size="small"
                  label={keyword}
                  onDelete={() => removeKeyword(keyword)}
                />
              ))}
            </Stack>
          ) : null}
        </Box>

        <Box className="topMenuCardBlock" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.8 }}>
            Topic tracking
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              label="Tracked topics"
              placeholder="Artificial Intelligence, War in Ukraine, Climate Change"
              value={topicsDraft}
              onChange={e => setTopicsDraft(e.target.value)}
            />
            <Button size="small" variant="contained" onClick={addTopics} disabled={!String(topicsDraft || '').trim()}>
              Add
            </Button>
          </Stack>
          {aiSettings.trackedTopics.length ? (
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              {aiSettings.trackedTopics.map(topic => (
                <Chip
                  key={topic.toLocaleLowerCase()}
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={topic}
                  onDelete={() => actions.onSetTrackedTopics(aiSettings.trackedTopics.filter(v => v.toLocaleLowerCase() !== topic.toLocaleLowerCase()))}
                />
              ))}
            </Stack>
          ) : null}

          <Divider sx={{ my: 1.1 }} />

          <Autocomplete
            freeSolo
            fullWidth
            options={LOCAL_IMPACT_REGION_OPTIONS}
            value={aiSettings.localImpactRegion}
            inputValue={aiSettings.localImpactRegion}
            onChange={(_, value) => actions.onSetLocalImpactRegion(typeof value === 'string' ? value : '')}
            onInputChange={(_, value, reason) => {
              if (reason === 'input' || reason === 'clear') {
                actions.onSetLocalImpactRegion(value);
              }
            }}
            renderInput={params => (
              <TextField
                {...params}
                size="small"
                label="Local impact region"
                placeholder="Search region"
              />
            )}
          />
        </Box>

        <Box className="topMenuCardBlock" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
            <Typography variant="caption">
              Daily briefing
            </Typography>
            {aiSettings.briefing.loading ? <LinearProgress sx={{ width: 120 }} /> : null}
          </Stack>

          <div className="topMenuFieldGrid">
            <TopMenuSelectField
              id="dailyBriefingDelivery"
              label="Delivery"
              value={aiSettings.dailyBriefingDelivery}
              onChange={value => actions.onSetDailyBriefingPrefs({ dailyBriefingDelivery: value as typeof aiSettings.dailyBriefingDelivery })}
              options={[
                { value: 'site', label: 'Within site' },
                { value: 'email', label: 'Email draft' }
              ]}
              layout="stacked"
              wrapperClassName="topMenuField"
            />
            <TopMenuSelectField
              id="dailyBriefingFormat"
              label="Format"
              value={aiSettings.dailyBriefingFormat}
              onChange={value => actions.onSetDailyBriefingPrefs({ dailyBriefingFormat: value as typeof aiSettings.dailyBriefingFormat })}
              options={[
                { value: 'executive', label: 'Executive' },
                { value: 'bullets', label: 'Bullets' },
                { value: 'narrative', label: 'Narrative' }
              ]}
              layout="stacked"
              wrapperClassName="topMenuField"
            />
            <Box className="topMenuField" sx={{ display: 'flex', alignItems: 'center', pt: 1.2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={aiSettings.dailyBriefingAudio}
                    onChange={event => actions.onSetDailyBriefingPrefs({ dailyBriefingAudio: event.target.checked })}
                  />
                }
                label="Audio narration"
                sx={{ m: 0 }}
              />
            </Box>
          </div>

          {aiSettings.dailyBriefingDelivery === 'email' ? (
            <TextField
              size="small"
              fullWidth
              sx={{ mt: 1 }}
              label="Email"
              placeholder="briefing@example.com"
              value={aiSettings.dailyBriefingEmail}
              onChange={e => actions.onSetDailyBriefingPrefs({ dailyBriefingEmail: e.target.value })}
            />
          ) : null}

          <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 0.5 }}>
            Included columns
          </Typography>
          <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
            {aiSettings.availableFeeds.map(feed => {
              const selected = briefingFeedSelection.has(feed.url);
              return (
                <Chip
                  key={feed.url}
                  size="small"
                  clickable
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  label={feed.label}
                  onClick={() => toggleBriefingFeed(feed.url)}
                />
              );
            })}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={actions.onGenerateDailyBriefing}
              disabled={aiSettings.briefing.loading}
            >
              Generate briefing
            </Button>
            {aiSettings.dailyBriefingDelivery === 'email' ? (
              <Button
                size="small"
                variant="outlined"
                onClick={openEmailDraft}
                disabled={!aiSettings.briefing.latest || !aiSettings.dailyBriefingEmail.trim()}
              >
                Open email draft
              </Button>
            ) : null}
            <Button
              size="small"
              variant="outlined"
              onClick={playBriefingAudio}
              disabled={!aiSettings.briefing.latest}
            >
              Play audio
            </Button>
          </Stack>

          {aiSettings.briefing.error ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {aiSettings.briefing.error}
            </Alert>
          ) : null}

          {aiSettings.briefing.latest ? (
            <Box sx={{ mt: 1, p: 1, border: '1px solid var(--panel-border)', borderRadius: 1.5, background: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.4 }}>
                {aiSettings.briefing.latest.title}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
                {new Date(aiSettings.briefing.latest.generatedAtMs).toLocaleString()} · {aiSettings.briefing.latest.itemCount} stories
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {aiSettings.briefing.latest.body}
              </Typography>
            </Box>
          ) : null}
        </Box>
      </div>
    </details>
  );
}
