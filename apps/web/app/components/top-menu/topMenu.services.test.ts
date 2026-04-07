import { describe, expect, it } from 'vitest';
import { formatTopMenuTimestamp, resolveTopMenuTimezone } from './topMenu.services';

describe('topMenu.services timezone handling', () => {
  it('uses the runtime local timezone when system is selected', () => {
    expect(resolveTopMenuTimezone('system')).toBeUndefined();
  });

  it('keeps explicit timezones intact', () => {
    expect(resolveTopMenuTimezone('Europe/Sofia')).toBe('Europe/Sofia');
    expect(resolveTopMenuTimezone('UTC')).toBe('UTC');
  });

  it('formats timestamps for explicit timezones differently from utc when appropriate', () => {
    const ms = Date.parse('2026-04-07T12:27:47+00:00');
    expect(formatTopMenuTimestamp(ms, 'bg-BG', 'UTC', 'ddmmyy')).toBe('07/04/26 · 12:27');
    expect(formatTopMenuTimestamp(ms, 'bg-BG', 'Europe/Sofia', 'ddmmyy')).toBe('07/04/26 · 15:27');
  });
});
