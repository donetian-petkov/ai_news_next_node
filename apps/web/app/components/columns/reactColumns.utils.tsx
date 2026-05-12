import AnimationIcon from '@mui/icons-material/Animation';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BoltIcon from '@mui/icons-material/Bolt';
import ChatIcon from '@mui/icons-material/Chat';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import LinkIcon from '@mui/icons-material/Link';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import MicIcon from '@mui/icons-material/Mic';
import MovieIcon from '@mui/icons-material/Movie';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ScienceIcon from '@mui/icons-material/Science';
import SendIcon from '@mui/icons-material/Send';
import ShieldMoonIcon from '@mui/icons-material/ShieldMoon';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WizardHatIcon from '@mui/icons-material/AutoAwesome';
import type { FeedInfo } from '../../store/types';
import type { TopMenuDateFormat, TopMenuTimezone } from '../top-menu/topMenu.services';
import { formatTopMenuTimestamp } from '../top-menu/topMenu.services';
import type { ColumnPalette, FeedFilterPreset, SchemeValue, VibeIcons, VibeValue } from './reactColumns.types';
import { COLUMN_LAYOUT_TOKENS } from './designTokens';

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };
type ThemeMode = 'light' | 'dark';

export const VIBE_LIST: VibeValue[] = ['default', 'anime', 'arcade', 'cinema', 'newspaper', 'cyberwitch', 'fantasy', 'scifi'];
export const SCHEME_LIST: SchemeValue[] = ['classic', 'vivid', 'sunset', 'neon', 'ocean', 'forest'];

const VIBE_BASE_COLORS: Record<VibeValue, [string, string, string]> = {
  default: ['#3d95ff', '#20cb7d', '#ffac1a'],
  anime: ['#ff63bc', '#5fd5ff', '#ffd764'],
  arcade: ['#57ff3b', '#ff4de6', '#00d8ff'],
  cinema: ['#f6b35e', '#cf5a76', '#ffdba2'],
  newspaper: ['#8f9eab', '#627a92', '#d9b770'],
  cyberwitch: ['#cc66ff', '#00e5ff', '#ff86d4'],
  fantasy: ['#4fd08e', '#9b784e', '#ffd06f'],
  scifi: ['#25d8ff', '#7f8cff', '#7affd8']
};

const SCHEME_TUNING: Record<SchemeValue, { hueShift: number; satMul: number; lightMul: number; softAlpha: number }> = {
  classic: { hueShift: 0, satMul: 1.0, lightMul: 1.0, softAlpha: 0.26 },
  vivid: { hueShift: 10, satMul: 1.16, lightMul: 1.02, softAlpha: 0.30 },
  sunset: { hueShift: -22, satMul: 1.08, lightMul: 0.96, softAlpha: 0.29 },
  neon: { hueShift: 32, satMul: 1.28, lightMul: 1.04, softAlpha: 0.27 },
  ocean: { hueShift: -52, satMul: 1.03, lightMul: 0.94, softAlpha: 0.30 },
  forest: { hueShift: -105, satMul: 0.82, lightMul: 0.86, softAlpha: 0.28 }
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex: string): Rgb {
  const clean = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return { r: 61, g: 149, b: 255 };
  const n = Number.parseInt(clean, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hh < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (hh < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (hh < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (hh < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (hh < 5) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  };
}

function transformHex(hex: string, tuning: { hueShift: number; satMul: number; lightMul: number }, mode: ThemeMode): Rgb {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const h = ((hsl.h + tuning.hueShift) % 360 + 360) % 360;
  const s = clamp(hsl.s * tuning.satMul * (mode === 'light' ? 1.08 : 1), 0.14, 1);
  const l = mode === 'light'
    ? clamp((hsl.l * 0.66) + 0.12, 0.18, 0.72)
    : clamp(hsl.l * tuning.lightMul, 0.10, 0.86);
  return hslToRgb(h, s, l);
}

function rgba(rgb: Rgb, alpha = 1): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function buildColumnPalette(vibe: VibeValue, scheme: SchemeValue, mode: ThemeMode = 'dark'): ColumnPalette {
  const base = VIBE_BASE_COLORS[vibe] || VIBE_BASE_COLORS.default;
  const tuning = SCHEME_TUNING[scheme] || SCHEME_TUNING.classic;
  const a = transformHex(base[0], tuning, mode);
  const b = transformHex(base[1], tuning, mode);
  const m = transformHex(base[2], tuning, mode);
  const softAlpha = mode === 'light' ? Math.min(0.42, tuning.softAlpha + 0.08) : tuning.softAlpha;
  return {
    a: rgba(a, 1),
    b: rgba(b, 1),
    m: rgba(m, 1),
    aSoft: rgba(a, softAlpha),
    bSoft: rgba(b, Math.max(mode === 'light' ? 0.20 : 0.16, softAlpha - 0.03)),
    mSoft: rgba(m, Math.min(mode === 'light' ? 0.44 : 0.36, softAlpha + 0.03))
  };
}

export function getFeedFilterPreset(filters: FeedInfo['filters']): FeedFilterPreset {
  const m = !!filters.onlyMatches;
  const r = !!filters.onlyResearched;
  const s = !!filters.onlySummaries;
  if (!m && !r && !s) return 'all';
  if (m && !r && !s) return 'matches';
  if (!m && r && !s) return 'researched';
  if (!m && !r && s) return 'summaries';
  if (m && r && !s) return 'matches_researched';
  if (m && !r && s) return 'matches_summaries';
  if (!m && r && s) return 'researched_summaries';
  return 'all_flags';
}

export function presetToFeedFilters(preset: FeedFilterPreset): FeedInfo['filters'] {
  if (preset === 'matches') return { onlyMatches: true, onlyResearched: false, onlySummaries: false };
  if (preset === 'researched') return { onlyMatches: false, onlyResearched: true, onlySummaries: false };
  if (preset === 'summaries') return { onlyMatches: false, onlyResearched: false, onlySummaries: true };
  if (preset === 'matches_researched') return { onlyMatches: true, onlyResearched: true, onlySummaries: false };
  if (preset === 'matches_summaries') return { onlyMatches: true, onlyResearched: false, onlySummaries: true };
  if (preset === 'researched_summaries') return { onlyMatches: false, onlyResearched: true, onlySummaries: true };
  if (preset === 'all_flags') return { onlyMatches: true, onlyResearched: true, onlySummaries: true };
  return { onlyMatches: false, onlyResearched: false, onlySummaries: false };
}

export function getVibeIcons(vibe: VibeValue): VibeIcons {
  if (vibe === 'anime') {
    return { summary: AnimationIcon, research: WizardHatIcon, ask: TheaterComedyIcon, share: SendIcon, hide: PersonOffIcon, copy: MicIcon };
  }
  if (vibe === 'arcade') {
    return { summary: SportsEsportsIcon, research: BoltIcon, ask: SmartToyIcon, share: RocketLaunchIcon, hide: VisibilityOffIcon, copy: FactCheckIcon };
  }
  if (vibe === 'cinema') {
    return { summary: MovieIcon, research: MicIcon, ask: TheaterComedyIcon, share: OpenInNewIcon, hide: VisibilityOffIcon, copy: LocalLibraryIcon };
  }
  if (vibe === 'newspaper') {
    return { summary: NewspaperIcon, research: FactCheckIcon, ask: HistoryEduIcon, share: LinkIcon, hide: VisibilityOffIcon, copy: AutoStoriesIcon };
  }
  if (vibe === 'cyberwitch') {
    return { summary: WizardHatIcon, research: ScienceIcon, ask: SupportAgentIcon, share: RocketLaunchIcon, hide: ShieldMoonIcon, copy: AnimationIcon };
  }
  if (vibe === 'fantasy') {
    return { summary: LocalLibraryIcon, research: WizardHatIcon, ask: HelpOutlineIcon, share: LinkIcon, hide: ShieldMoonIcon, copy: HistoryEduIcon };
  }
  if (vibe === 'scifi') {
    return { summary: SmartToyIcon, research: PrecisionManufacturingIcon, ask: ChatIcon, share: RocketLaunchIcon, hide: VisibilityOffIcon, copy: ScienceIcon };
  }
  return { summary: AutoStoriesIcon, research: ManageSearchIcon, ask: ChatIcon, share: OpenInNewIcon, hide: VisibilityOffIcon, copy: ContentCopyIcon };
}

export function formatTime(
  ms: number,
  options?: {
    locale?: string;
    timezone?: TopMenuTimezone;
    dateFormat?: TopMenuDateFormat;
  }
): string {
  if (!Number.isFinite(ms)) return '';
  try {
    return formatTopMenuTimestamp(
      ms,
      options?.locale || 'bg-BG',
      options?.timezone || 'system',
      options?.dateFormat || 'ddmmyy'
    );
  } catch {
    return '';
  }
}

export function extractConfidence(research: string): string {
  const m = String(research || '').match(/confidence\s*:\s*(low|medium|high)/i);
  if (!m) return '';
  const level = String(m[1] || '').toLowerCase();
  if (level === 'high') return 'High';
  if (level === 'medium') return 'Medium';
  if (level === 'low') return 'Low';
  return '';
}

export function compactResearch(research: string): string {
  const normalized = String(research || '').replace(/\s+/g, ' ').trim();
  return normalized.length > COLUMN_LAYOUT_TOKENS.researchCollapseThreshold
    ? `${normalized.slice(0, COLUMN_LAYOUT_TOKENS.researchCollapseThreshold)}...`
    : normalized;
}

export function collapseText(text: string, maxChars: number): string {
  const normalized = String(text || '').trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}...`;
}

export function cutoffFromAge(age: 'yesterday' | 'week' | 'month' | 'year'): number {
  const now = Date.now();
  if (age === 'yesterday') return now - 24 * 60 * 60 * 1000;
  if (age === 'month') return now - 30 * 24 * 60 * 60 * 1000;
  if (age === 'year') return now - 365 * 24 * 60 * 60 * 1000;
  return now - 7 * 24 * 60 * 60 * 1000;
}
