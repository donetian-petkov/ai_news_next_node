'use client';

import { NewsMoodFilterValue, NewsTypeFilterValue } from '../../store/types';
import type { Option } from './TopMenuSelectField';
import type { TopMenuColorMode, TopMenuDateFormat, TopMenuTimezone, TopMenuVibe } from './topMenu.services';

export function buildAiProviderOptions(labels: Record<string, string>): Option<'openai' | 'claude' | 'openrouter' | 'local'>[] {
  return [
    { value: 'openai', label: labels.openai },
    { value: 'claude', label: labels.claude },
    { value: 'openrouter', label: labels.openrouter },
    { value: 'local', label: labels.local || 'Local' }
  ];
}

export function buildSummaryLangOptions(): Option<'bilingual' | 'bg' | 'en'>[] {
  return [
    { value: 'bilingual', label: 'BG / EN' },
    { value: 'bg', label: 'BG' },
    { value: 'en', label: 'EN' }
  ];
}

export function buildResearchLangOptions(): Option<'bg' | 'en'>[] {
  return [
    { value: 'bg', label: 'BG' },
    { value: 'en', label: 'EN' }
  ];
}

export function buildTitleDisplayLanguageOptions(
  labels: Record<string, string>
): Option<'original' | 'bg' | 'en'>[] {
  return [
    { value: 'original', label: labels.titleLanguageOriginal || 'Original' },
    { value: 'bg', label: labels.titleLanguageBg || 'BG' },
    { value: 'en', label: labels.titleLanguageEn || 'EN' }
  ];
}

export function buildAiModelOptions(models: string[], selected?: string): Option<string>[] {
  const values = new Set<string>();
  if (selected && selected.trim()) values.add(selected.trim());
  for (const model of models) {
    const value = String(model || '').trim();
    if (!value) continue;
    values.add(value);
  }
  return Array.from(values).map(value => ({ value, label: value }));
}

export function buildMoodOptions(labels: Record<string, string>): Option<`${NewsMoodFilterValue}`>[] {
  return [
    { value: NewsMoodFilterValue.All, label: labels.moodAll },
    { value: NewsMoodFilterValue.Pesimistic, label: labels.moodPesimistic },
    { value: NewsMoodFilterValue.Optimistic, label: labels.moodOptimistic },
    { value: NewsMoodFilterValue.Realistic, label: labels.moodRealistic },
    { value: NewsMoodFilterValue.Melancholy, label: labels.moodMelancholy },
    { value: NewsMoodFilterValue.Happiness, label: labels.moodHappiness },
    { value: NewsMoodFilterValue.Sadness, label: labels.moodSadness },
    { value: NewsMoodFilterValue.Rage, label: labels.moodRage },
    { value: NewsMoodFilterValue.Uncertainty, label: labels.moodUncertainty },
    { value: NewsMoodFilterValue.Neutral, label: labels.moodNeutral },
    { value: NewsMoodFilterValue.Curios, label: labels.moodCurios }
  ];
}

export function buildTypeOptions(labels: Record<string, string>): Option<`${NewsTypeFilterValue}`>[] {
  return [
    { value: NewsTypeFilterValue.All, label: labels.typeAll },
    { value: NewsTypeFilterValue.Science, label: labels.typeScience },
    { value: NewsTypeFilterValue.Movies, label: labels.typeMovies },
    { value: NewsTypeFilterValue.Politics, label: labels.typePolitics },
    { value: NewsTypeFilterValue.Business, label: labels.typeBusiness },
    { value: NewsTypeFilterValue.Technology, label: labels.typeTechnology },
    { value: NewsTypeFilterValue.Sports, label: labels.typeSports },
    { value: NewsTypeFilterValue.Health, label: labels.typeHealth },
    { value: NewsTypeFilterValue.World, label: labels.typeWorld },
    { value: NewsTypeFilterValue.Culture, label: labels.typeCulture },
    { value: NewsTypeFilterValue.Environment, label: labels.typeEnvironment },
    { value: NewsTypeFilterValue.Crime, label: labels.typeCrime },
    { value: NewsTypeFilterValue.Education, label: labels.typeEducation },
    { value: NewsTypeFilterValue.Other, label: labels.typeOther }
  ];
}

export function buildBudgetOptions(labels: Record<string, string>): Option<'mixed' | 'low' | 'standard' | 'high'>[] {
  return [
    { value: 'mixed', label: labels.budgetMixed },
    { value: 'low', label: labels.budgetLow },
    { value: 'standard', label: labels.budgetStandard },
    { value: 'high', label: labels.budgetHigh }
  ];
}

export function buildFontOptions(labels: Record<string, string>): Option<'system' | 'manrope' | 'grotesk' | 'sora' | 'plex' | 'serif' | 'mono'>[] {
  return [
    { value: 'system', label: labels.fontSystem },
    { value: 'manrope', label: labels.fontManrope },
    { value: 'grotesk', label: labels.fontGrotesk },
    { value: 'sora', label: labels.fontSora },
    { value: 'plex', label: labels.fontPlex },
    { value: 'serif', label: labels.fontSerif },
    { value: 'mono', label: labels.fontMono }
  ];
}

export function buildFontSizeOptions(labels: Record<string, string>): Option<'sm' | 'md' | 'lg' | 'xl'>[] {
  return [
    { value: 'sm', label: labels.fontSizeSmall },
    { value: 'md', label: labels.fontSizeMedium },
    { value: 'lg', label: labels.fontSizeLarge },
    { value: 'xl', label: labels.fontSizeXL }
  ];
}

export function buildSchemeOptions(labels: Record<string, string>): Option<'classic' | 'vivid' | 'sunset' | 'neon' | 'ocean' | 'forest'>[] {
  return [
    { value: 'classic', label: labels.schemeClassic },
    { value: 'vivid', label: labels.schemeVivid },
    { value: 'sunset', label: labels.schemeSunset },
    { value: 'neon', label: labels.schemeNeon },
    { value: 'ocean', label: labels.schemeOcean },
    { value: 'forest', label: labels.schemeForest }
  ];
}

export function buildButtonModeOptions(labels: Record<string, string>): Option<'icons' | 'text'>[] {
  return [
    { value: 'icons', label: labels.buttonsIcons },
    { value: 'text', label: labels.buttonsText }
  ];
}

export function buildMenuHintOptions(labels: Record<string, string>): Option<'text' | 'buttons'>[] {
  return [
    { value: 'text', label: labels.menuHintsText },
    { value: 'buttons', label: labels.menuHintsButtons }
  ];
}

export function buildEffectIntensityOptions(labels: Record<string, string>): Option<'low' | 'medium' | 'high'>[] {
  return [
    { value: 'low', label: labels.effectLow },
    { value: 'medium', label: labels.effectMedium },
    { value: 'high', label: labels.effectHigh }
  ];
}

export function buildVibeOptions(labels: Record<string, string>): Option<TopMenuVibe>[] {
  return [
    { value: 'default', label: labels.defaultVibe },
    { value: 'anime', label: labels.anime },
    { value: 'arcade', label: labels.arcade },
    { value: 'cinema', label: labels.cinema },
    { value: 'newspaper', label: labels.newspaper },
    { value: 'cyberwitch', label: labels.cyberwitch },
    { value: 'fantasy', label: labels.fantasy },
    { value: 'scifi', label: labels.scifi }
  ];
}

export function buildSoundThemeOptions(
  labels: Record<string, string>
): Option<'vibe' | TopMenuVibe>[] {
  return [
    { value: 'vibe', label: labels.soundVibeLinked },
    ...buildVibeOptions(labels)
  ];
}

export function buildLanguageOptions(): Option<'en' | 'bg'>[] {
  return [
    { value: 'en', label: 'EN' },
    { value: 'bg', label: 'BG' }
  ];
}

export function buildTimezoneOptions(labels: Record<string, string>): Option<TopMenuTimezone>[] {
  return [
    { value: 'system', label: labels.timezoneSystem },
    { value: 'UTC', label: labels.timezoneUtc },
    { value: 'Europe/Sofia', label: labels.timezoneSofia },
    { value: 'Europe/London', label: labels.timezoneLondon },
    { value: 'Europe/Berlin', label: labels.timezoneBerlin },
    { value: 'America/New_York', label: labels.timezoneNewYork },
    { value: 'America/Chicago', label: labels.timezoneChicago },
    { value: 'America/Denver', label: labels.timezoneDenver },
    { value: 'America/Los_Angeles', label: labels.timezoneLosAngeles },
    { value: 'Asia/Tokyo', label: labels.timezoneTokyo }
  ];
}

export function buildDateFormatOptions(labels: Record<string, string>): Option<TopMenuDateFormat>[] {
  return [
    { value: 'ddmmyy', label: labels.dateFormatDdmmyy },
    { value: 'mmddyy', label: labels.dateFormatMmddyy },
    { value: 'yyyymmdd', label: labels.dateFormatYyyymmdd }
  ];
}

export function buildColorModeOptions(labels: Record<string, string>): Option<TopMenuColorMode>[] {
  return [
    { value: 'system', label: labels.colorModeSystem || labels.timezoneSystem },
    { value: 'dark', label: labels.colorModeDark || 'Dark' },
    { value: 'light', label: labels.colorModeLight || 'Light' }
  ];
}

export function buildToggleOptions(onLabel: string, offLabel: string): Option<'on' | 'off'>[] {
  return [
    { value: 'off', label: offLabel },
    { value: 'on', label: onLabel }
  ];
}
