import type { RootState } from '../../store/store';

export type TopMenuVibe = RootState['ui']['vibe'];
export type TopMenuColorMode = RootState['ui']['colorMode'];
export type TopMenuTimezone = RootState['ui']['timezone'];
export type TopMenuDateFormat = RootState['ui']['dateFormat'];
export type TopMenuDeleteAge = 'yesterday' | 'week' | 'month' | 'year';
export type TopMenuAiProvider = RootState['ui']['aiProvider'];

export const VIBES: TopMenuVibe[] = ['default', 'anime', 'arcade', 'cinema', 'newspaper', 'cyberwitch', 'fantasy', 'scifi'];

const COLOR_MODE_ORDER: TopMenuColorMode[] = ['system', 'dark', 'light'];

export function getNextColorMode(current: TopMenuColorMode): TopMenuColorMode {
  const idx = COLOR_MODE_ORDER.indexOf(current);
  return COLOR_MODE_ORDER[(idx + 1) % COLOR_MODE_ORDER.length];
}

export function resolveTopMenuTimezone(timezone: TopMenuTimezone): string | undefined {
  if (timezone === 'system') return undefined;
  return timezone;
}

type FormattedDateTimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

function getFormattedDateTimeParts(
  nowMs: number,
  locale: string,
  timezone: TopMenuTimezone
): FormattedDateTimeParts | null {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: resolveTopMenuTimezone(timezone),
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(new Date(nowMs));
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find(part => part.type === type)?.value || '';

    return {
      year: read('year'),
      month: read('month'),
      day: read('day'),
      hour: read('hour'),
      minute: read('minute'),
      second: read('second')
    };
  } catch {
    return null;
  }
}

function formatTopMenuDate(parts: FormattedDateTimeParts, dateFormat: TopMenuDateFormat): string {
  if (dateFormat === 'mmddyy') return `${parts.month}/${parts.day}/${parts.year}`;
  if (dateFormat === 'yyyymmdd') return `20${parts.year}-${parts.month}-${parts.day}`;
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatTopMenuDateTimeText(
  nowMs: number,
  locale: string,
  timezone: TopMenuTimezone,
  dateFormat: TopMenuDateFormat
): string {
  const parts = getFormattedDateTimeParts(nowMs, locale, timezone);
  if (!parts) return '--:--:-- · --/--/--';
  return `${parts.hour}:${parts.minute}:${parts.second} · ${formatTopMenuDate(parts, dateFormat)}`;
}

export function formatTopMenuTimestamp(
  nowMs: number,
  locale: string,
  timezone: TopMenuTimezone,
  dateFormat: TopMenuDateFormat
): string {
  const parts = getFormattedDateTimeParts(nowMs, locale, timezone);
  if (!parts) return '';
  return `${formatTopMenuDate(parts, dateFormat)} · ${parts.hour}:${parts.minute}`;
}

export function getNextVibe(current: TopMenuVibe): TopMenuVibe {
  const idx = VIBES.indexOf(current);
  return VIBES[(idx + 1) % VIBES.length];
}

export function cutoffFromAge(age: TopMenuDeleteAge, nowMs = Date.now()): number {
  if (age === 'yesterday') return nowMs - 24 * 60 * 60 * 1000;
  if (age === 'month') return nowMs - 30 * 24 * 60 * 60 * 1000;
  if (age === 'year') return nowMs - 365 * 24 * 60 * 60 * 1000;
  return nowMs - 7 * 24 * 60 * 60 * 1000;
}

export function getProviderKeyLabel(provider: TopMenuAiProvider): string {
  if (provider === 'claude') return 'ANTHROPIC_API_KEY';
  if (provider === 'openrouter') return 'OPENROUTER_API_KEY';
  return 'OPENAI_API_KEY';
}
