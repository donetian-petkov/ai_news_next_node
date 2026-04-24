import { COLUMN_LAYOUT_TOKENS } from './designTokens';

export function normalizeStoryLimit(
  value: number,
  fallback = COLUMN_LAYOUT_TOKENS.initialVisibleItems
): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.max(1, Math.min(200, parsed));
}

export function getDefaultVisibleCount(storyLimit: number): number {
  return normalizeStoryLimit(storyLimit);
}

export function clampVisibleCount(value: number | undefined, storyLimit: number): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return getDefaultVisibleCount(storyLimit);
  return Math.max(1, parsed);
}

export function getShowMoreStep(currentVisible: number | undefined, storyLimit: number): number {
  void currentVisible;
  return normalizeStoryLimit(storyLimit);
}
