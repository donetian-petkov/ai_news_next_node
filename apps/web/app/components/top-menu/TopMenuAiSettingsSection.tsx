'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { TopMenuSelectField } from './TopMenuSelectField';
import { FILTERED_FEED_URL } from '../../store/constants';
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
import { useAppSelector } from '../../store/hooks';

const FEATURE_ROWS: Array<{ key: keyof ReturnType<typeof useTopMenuContext>['controls']['model']['aiSettings']['insightFeatures']; label: string; hint: string }> = [
  { key: 'biasDetection', label: 'Bias detector', hint: 'Political leaning, tone, and framing. Budget: standard or high.' },
  { key: 'sensationalismDetection', label: 'Rage bait detector', hint: 'Flags clickbait headlines and suggests safer alternatives. Budget: standard or high.' },
  { key: 'factHighlights', label: 'Fact highlights', hint: 'People, places, dates, numbers, and quotes under each story. Budget: standard or high.' },
  { key: 'topicTracking', label: 'Topic tracking', hint: 'Follow recurring topics and only surface major updates. Budget: high only.' },
  { key: 'emergingStoryDetector', label: 'Emerging stories', hint: 'Optional column for repeated stories rising fast. Budget: high only.' },
  { key: 'dailyBriefing', label: 'Daily briefing', hint: 'Enables the on-demand briefing generator below. Budget: high only.' }
];

type AiMenuSection = 'setup' | 'analysis' | 'targeting' | 'briefing';

function SectionTabs({
  activeSection,
  onChange
}: {
  activeSection: AiMenuSection;
  onChange: (value: AiMenuSection) => void;
}) {
  return (
    <div className="topMenuSubnav" role="tablist" aria-label="AI settings sections">
      {[
        { value: 'setup', label: 'Setup' },
        { value: 'analysis', label: 'Analysis' },
        { value: 'targeting', label: 'Targeting' },
        { value: 'briefing', label: 'Briefing' }
      ].map(section => (
        <Button
          key={section.value}
          size="small"
          variant={activeSection === section.value ? 'contained' : 'outlined'}
          className="topMenuSubnavButton"
          onClick={() => onChange(section.value as AiMenuSection)}
        >
          {section.label}
        </Button>
      ))}
    </div>
  );
}

function SubsectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="topMenuSubsectionHeader">
      <Typography className="topMenuSubsectionTitle">{title}</Typography>
      <Typography className="topMenuSubsectionHint">{hint}</Typography>
    </div>
  );
}

export function TopMenuAiSettingsSection() {
  const aiUsage = useAppSelector(s => s.aiUsage);
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
  const [activeSection, setActiveSection] = useState<AiMenuSection>('setup');
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
  const recentUsage = aiUsage.recent.slice(0, 8);
  const tokenLocale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  const formatTokenCount = (value: number) => value.toLocaleString(tokenLocale);
  const runtimeStartedLabel = aiUsage.runtimeStartedAt
    ? new Date(aiUsage.runtimeStartedAt).toLocaleString(tokenLocale)
    : 'No AI calls yet in this server run.';

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
        <SectionTabs activeSection={activeSection} onChange={setActiveSection} />

        {activeSection === 'setup' ? (
          <div className="topMenuPanelStack">
            <Box className="topMenuSubsection">
              <SubsectionHeader
                title="Language and models"
                hint="Provider, output languages, model selection, and global AI budget."
              />
              <div className="topMenuFieldGrid topMenuSetupGrid">
                <TopMenuSelectField id="aiProviderSelect" label={labels.aiProvider} value={aiSettings.aiProvider} onChange={actions.onChangeAiProvider} options={buildAiProviderOptions(labels)} layout="stacked" wrapperClassName="topMenuField" />
                <TopMenuSelectField id="summaryLang" label={labels.summaryPrefix} value={aiSettings.summaryLang} disabled={!aiSettings.aiAvailable} onChange={actions.onSummaryLangChange} options={buildSummaryLangOptions()} layout="stacked" wrapperClassName="topMenuField" />
                <TopMenuSelectField id="researchLang" label={labels.researchPrefix} value={aiSettings.researchLang} disabled={!aiSettings.aiAvailable} onChange={actions.onResearchLangChange} options={buildResearchLangOptions()} layout="stacked" wrapperClassName="topMenuField" />
                <TopMenuSelectField id="titleDisplayLanguage" label={labels.titleDisplayLanguagePrefix || 'Title language:'} value={aiSettings.titleDisplayLanguage} onChange={actions.onTitleDisplayLanguageChange} options={buildTitleDisplayLanguageOptions(labels)} layout="stacked" wrapperClassName="topMenuField" />
                <TopMenuSelectField id="summaryModel" label={labels.summaryModelPrefix} value={aiSettings.summaryModel} disabled={!aiSettings.aiAvailable} onChange={actions.onSummaryModelChange} options={buildAiModelOptions(providerModels.summary, aiSettings.summaryModel)} layout="stacked" wrapperClassName="topMenuField" />
                <TopMenuSelectField id="researchModel" label={labels.researchModelPrefix} value={aiSettings.researchModel} disabled={!aiSettings.aiAvailable} onChange={actions.onResearchModelChange} options={buildAiModelOptions(providerModels.research, aiSettings.researchModel)} layout="stacked" wrapperClassName="topMenuField" />
                <TopMenuSelectField id="askModel" label={labels.askModelPrefix} value={aiSettings.askModel} disabled={!aiSettings.aiAvailable} onChange={actions.onAskModelChange} options={buildAiModelOptions(providerModels.ask, aiSettings.askModel)} layout="stacked" wrapperClassName="topMenuField" />
                {!aiSettings.performanceMode ? (
                  <>
                    <TopMenuSelectField id="moodFilter" label={labels.moodFilter} value={aiSettings.moodFilter} disabled={!aiSettings.aiAvailable} onChange={actions.onMoodFilterChange} options={buildMoodOptions(labels)} layout="stacked" wrapperClassName="topMenuField" />
                    <TopMenuSelectField id="typeFilter" label={labels.typeFilter} value={aiSettings.typeFilter} disabled={!aiSettings.aiAvailable} onChange={actions.onTypeFilterChange} options={buildTypeOptions(labels)} layout="stacked" wrapperClassName="topMenuField" />
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
            </Box>

            <Box className="topMenuCardBlock topMenuSubsection" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
              <SubsectionHeader
                title="Auto summaries by source"
                hint="Turn summaries off everywhere, then enable only the feeds you want. Keep Filtered off for strict per-source behavior."
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.1 }}>
                <Button size="small" variant="contained" onClick={() => actions.onSetAllFeedSummaries(false)}>
                  Disable all auto summaries
                </Button>
                <Button size="small" variant="outlined" onClick={() => actions.onSetAllFeedSummaries(true)}>
                  Enable all auto summaries
                </Button>
              </Stack>
              <div className="topMenuFieldGrid">
                {aiSettings.availableFeeds.map(feed => {
                  const helperText = feed.url === FILTERED_FEED_URL
                    ? 'Matched stories from any source. Leave this off if only specific feeds should auto-summarize.'
                    : `${String(feed.kind || 'rss').toUpperCase()} source`;
                  return (
                    <Box key={feed.url} className="topMenuFeatureCard" sx={{ border: '1px solid var(--panel-border)', px: 1.2, py: 0.9 }}>
                      <FormControlLabel
                        control={<Switch size="small" checked={!!feed.summaryEnabled} onChange={event => actions.onSetFeedSummaryEnabled(feed.url, event.target.checked)} sx={{ ml: 0.25, mr: 0.75 }} />}
                        label={(
                          <Box className="topMenuFeatureCopy">
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{feed.label}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2, lineHeight: 1.55 }}>
                              {helperText}
                            </Typography>
                          </Box>
                        )}
                        sx={{ alignItems: 'flex-start', m: 0, width: '100%', '.MuiFormControlLabel-label': { minWidth: 0, flex: 1 } }}
                      />
                    </Box>
                  );
                })}
              </div>
            </Box>

            <Box className="topMenuCardBlock topMenuSubsection" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
              <SubsectionHeader
                title={labels.providerKeyTitle || 'Provider API key'}
                hint="Stored locally for the selected provider."
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8, gap: 1 }}>
                <span />
                <Chip
                  size="small"
                  color={hasSavedProviderKey ? 'success' : 'default'}
                  variant={hasSavedProviderKey ? 'filled' : 'outlined'}
                  label={hasSavedProviderKey ? (labels.providerKeyStoredYes || 'Saved key available') : (labels.providerKeyStoredNo || 'No saved key')}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField size="small" fullWidth type="password" label={labels.providerKeyLabel || 'API key'} placeholder={labels.providerKeyPlaceholder || 'Paste key for selected provider'} value={providerKeyDraft} onChange={e => setProviderKeyDraft(e.target.value)} />
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

            <Box className="topMenuCardBlock topMenuSubsection" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
              <SubsectionHeader
                title="Token usage this run"
                hint="Runtime-only AI usage log. It clears when the API server restarts."
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                <Chip size="small" color="primary" variant="outlined" label={`Total: ${formatTokenCount(aiUsage.totalTokens)}`} />
                <Chip size="small" variant="outlined" label={`Input: ${formatTokenCount(aiUsage.inputTokens)}`} />
                <Chip size="small" variant="outlined" label={`Output: ${formatTokenCount(aiUsage.outputTokens)}`} />
              </Stack>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                Started: {runtimeStartedLabel}
              </Typography>
              <div className="topMenuFieldGrid">
                {([
                  ['summary', 'Summaries'],
                  ['research', 'Research'],
                  ['ask', 'Ask agent']
                ] as const).map(([kind, label]) => (
                  <Box key={kind} sx={{ border: '1px solid var(--panel-border)', borderRadius: 1.5, p: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'text.secondary' }}>
                      Requests: {formatTokenCount(aiUsage.byKind[kind].requests)} · Tokens: {formatTokenCount(aiUsage.byKind[kind].totalTokens)}
                    </Typography>
                  </Box>
                ))}
              </div>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 0.5, color: 'text.secondary' }}>
                Recent AI calls
              </Typography>
              {recentUsage.length ? (
                <Stack spacing={0.7}>
                  {recentUsage.map(entry => (
                    <Box key={entry.id} sx={{ border: '1px solid var(--panel-border)', borderRadius: 1.5, px: 1, py: 0.8, background: 'rgba(255,255,255,0.02)' }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {entry.kind.toUpperCase()} · {entry.model}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {new Date(entry.createdAt).toLocaleTimeString(tokenLocale)} · {formatTokenCount(entry.totalTokens)} tokens
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.3, color: 'text.secondary' }}>
                        {entry.label}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info" sx={{ mt: 0.5, py: 0.2 }}>
                  No AI calls recorded in this server run yet.
                </Alert>
              )}
            </Box>
          </div>
        ) : null}

        {activeSection === 'analysis' ? (
          <div className="topMenuPanelStack">
            <Box className="topMenuCardBlock topMenuSubsection" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
              <SubsectionHeader
                title="AI analysis features"
                hint="Automatic story analysis, optional insight blocks, and special columns."
              />
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
                      control={<Switch size="small" checked={!!aiSettings.insightFeatures[feature.key]} onChange={event => actions.onSetInsightFeature(feature.key, event.target.checked)} sx={{ ml: 0.25, mr: 0.75 }} />}
                      label={<Box className="topMenuFeatureCopy"><Typography variant="body2" sx={{ fontWeight: 700 }}>{feature.label}</Typography><Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2, lineHeight: 1.55 }}>{feature.hint}</Typography></Box>}
                      sx={{ alignItems: 'flex-start', m: 0, width: '100%', '.MuiFormControlLabel-label': { minWidth: 0, flex: 1 } }}
                    />
                  </Box>
                ))}
              </div>
            </Box>
          </div>
        ) : null}

        {activeSection === 'targeting' ? (
          <div className="topMenuPanelStack">
            <Box className="topMenuCardBlock topMenuSubsection" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
              <SubsectionHeader
                title={labels.matchKeywordsLabel || 'Filtered match keywords'}
                hint="Keywords that drive the filtered column."
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField size="small" fullWidth label={labels.matchKeywordsInputLabel || 'Keywords'} placeholder={labels.matchKeywordsPlaceholder || 'keyword1, keyword2, keyword3'} value={keywordsDraft} onChange={e => setKeywordsDraft(e.target.value)} />
                <Button size="small" variant="contained" onClick={addKeywords} disabled={!String(keywordsDraft || '').trim()}>
                  {labels.matchKeywordsApply || 'Add'}
                </Button>
              </Stack>
              {aiSettings.keywords.length ? (
                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {aiSettings.keywords.map(keyword => (
                    <Chip key={keyword.toLocaleLowerCase()} size="small" label={keyword} onDelete={() => removeKeyword(keyword)} />
                  ))}
                </Stack>
              ) : null}
            </Box>

            <Box className="topMenuCardBlock topMenuSubsection" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
              <SubsectionHeader
                title="Topic tracking"
                hint="Topics to watch for recurring coverage and major updates."
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField size="small" fullWidth label="Tracked topics" placeholder="Artificial Intelligence, War in Ukraine, Climate Change" value={topicsDraft} onChange={e => setTopicsDraft(e.target.value)} />
                <Button size="small" variant="contained" onClick={addTopics} disabled={!String(topicsDraft || '').trim()}>
                  Add
                </Button>
              </Stack>
              {aiSettings.trackedTopics.length ? (
                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {aiSettings.trackedTopics.map(topic => (
                    <Chip key={topic.toLocaleLowerCase()} size="small" color="primary" variant="outlined" label={topic} onDelete={() => actions.onSetTrackedTopics(aiSettings.trackedTopics.filter(v => v.toLocaleLowerCase() !== topic.toLocaleLowerCase()))} />
                  ))}
                </Stack>
              ) : null}
            </Box>
          </div>
        ) : null}

        {activeSection === 'briefing' ? (
          <div className="topMenuPanelStack">
            <Box className="topMenuCardBlock topMenuSubsection" sx={{ width: '100%', border: '1px solid var(--panel-border)', borderRadius: 2, p: 1 }}>
              <SubsectionHeader
                title="Daily briefing"
                hint="Generate a site briefing or email draft from selected columns."
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                <span />
                {aiSettings.briefing.loading ? <LinearProgress sx={{ width: 120 }} /> : null}
              </Stack>
              <div className="topMenuFieldGrid">
                <TopMenuSelectField id="dailyBriefingDelivery" label="Delivery" value={aiSettings.dailyBriefingDelivery} onChange={value => actions.onSetDailyBriefingPrefs({ dailyBriefingDelivery: value as typeof aiSettings.dailyBriefingDelivery })} options={[{ value: 'site', label: 'Within site' }, { value: 'email', label: 'Email draft' }]} layout="stacked" wrapperClassName="topMenuField" />
                <TopMenuSelectField id="dailyBriefingFormat" label="Format" value={aiSettings.dailyBriefingFormat} onChange={value => actions.onSetDailyBriefingPrefs({ dailyBriefingFormat: value as typeof aiSettings.dailyBriefingFormat })} options={[{ value: 'executive', label: 'Executive' }, { value: 'bullets', label: 'Bullets' }, { value: 'narrative', label: 'Narrative' }]} layout="stacked" wrapperClassName="topMenuField" />
                <Box className="topMenuField" sx={{ display: 'flex', alignItems: 'center', pt: 1.2 }}>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={aiSettings.dailyBriefingAudio} onChange={event => actions.onSetDailyBriefingPrefs({ dailyBriefingAudio: event.target.checked })} />}
                    label="Audio narration"
                    sx={{ m: 0 }}
                  />
                </Box>
              </div>
              {aiSettings.dailyBriefingDelivery === 'email' ? (
                <TextField size="small" fullWidth sx={{ mt: 1 }} label="Email" placeholder="briefing@example.com" value={aiSettings.dailyBriefingEmail} onChange={e => actions.onSetDailyBriefingPrefs({ dailyBriefingEmail: e.target.value })} />
              ) : null}
              <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 0.5 }}>
                Included columns
              </Typography>
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                {aiSettings.availableFeeds.map(feed => {
                  const selected = briefingFeedSelection.has(feed.url);
                  return (
                    <Chip key={feed.url} size="small" clickable color={selected ? 'primary' : 'default'} variant={selected ? 'filled' : 'outlined'} label={feed.label} onClick={() => toggleBriefingFeed(feed.url)} />
                  );
                })}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                <Button size="small" variant="contained" onClick={actions.onGenerateDailyBriefing} disabled={aiSettings.briefing.loading}>
                  Generate briefing
                </Button>
                {aiSettings.dailyBriefingDelivery === 'email' ? (
                  <Button size="small" variant="outlined" onClick={openEmailDraft} disabled={!aiSettings.briefing.latest || !aiSettings.dailyBriefingEmail.trim()}>
                    Open email draft
                  </Button>
                ) : null}
                <Button size="small" variant="outlined" onClick={playBriefingAudio} disabled={!aiSettings.briefing.latest}>
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
        ) : null}
      </div>
    </details>
  );
}
