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
  return Math.min(COLUMN_LAYOUT_TOKENS.initialVisibleItems, normalizeStoryLimit(storyLimit));
}

export function clampVisibleCount(value: number | undefined, storyLimit: number): number {
  const limit = normalizeStoryLimit(storyLimit);
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return getDefaultVisibleCount(limit);
  return Math.max(1, Math.min(limit, parsed));
}

export function getShowMoreStep(currentVisible: number | undefined, storyLimit: number): number {
  const limit = normalizeStoryLimit(storyLimit);
  const visible = clampVisibleCount(currentVisible, limit);
  return Math.max(0, Math.min(COLUMN_LAYOUT_TOKENS.visibleItemsStep, limit - visible));
}
