import type { NewsItem } from '../../../store/types';

const DUPLICATE_MATCH_SIMILARITY_THRESHOLD = 0.9;
const DUPLICATE_MATCH_TITLE_SIMILARITY_THRESHOLD = 0.78;
const DUPLICATE_MATCH_TOKEN_OVERLAP_THRESHOLD = 0.6;
const DUPLICATE_MATCH_TITLE_TOKEN_OVERLAP_THRESHOLD = 0.67;
const DUPLICATE_MATCH_MIN_SHARED_TOKENS = 3;
const BULGARIAN_NOISE_STEMS = new Set<string>([
  '\u0441\u043b\u0443\u0436\u0435\u0431\u043d'
]);
const STORY_LINK_DROP_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
  't'
]);

type TextVector = {
  counts: Map<string, number>;
  norm: number;
};

type DuplicateSignature = {
  combinedVector: TextVector;
  combinedTokens: Set<string>;
  titleVector: TextVector;
  titleTokens: Set<string>;
  publishedMs: number;
  linkKey: string;
};

type DuplicateEntry = {
  item: NewsItem;
  signature: DuplicateSignature;
};

type DeduplicateOptions = {
  maxTimeDeltaMs: number;
  prefer?: (candidate: NewsItem, current: NewsItem) => boolean;
};

function normalizeText(raw: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\u045d/g, '\u0438')
    .replace(/\u0439/g, '\u0438')
    .replace(/\u044a/g, '\u0430')
    .replace(/\u044c/g, '')
    .replace(/\u044e/g, '\u0443')
    .replace(/\u044f/g, '\u0430');
}

function normalizeStoryLink(raw: string): string {
  const input = String(raw || '').trim();
  if (!input) return '';
  try {
    const url = new URL(input);
    url.hash = '';
    Array.from(url.searchParams.keys()).forEach(key => {
      const normalizedKey = key.toLocaleLowerCase();
      if (STORY_LINK_DROP_QUERY_PARAMS.has(normalizedKey) || normalizedKey.startsWith('utm_')) {
        url.searchParams.delete(key);
      }
    });
    url.searchParams.sort();
    url.protocol = url.protocol.toLocaleLowerCase();
    url.hostname = url.hostname.toLocaleLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return normalizeText(url.toString());
  } catch {
    return normalizeText(input.replace(/#.*$/, ''));
  }
}

function normalizedTokens(text: string): string[] {
  return normalizeText(text)
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\u0400-\u04ff\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 2)
    .map(token => token.slice(0, Math.min(7, token.length)));
}

function uniqueTexts(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )
  );
}

function similarityTexts(item: NewsItem): string[] {
  return uniqueTexts([
    item.titleBg,
    item.titleEn,
    item.title,
    item.summary,
    item.research
  ]);
}

function titleTexts(item: NewsItem): string[] {
  const titles = uniqueTexts([
    item.titleBg,
    item.titleEn,
    item.title
  ]);
  return titles.length ? titles : similarityTexts(item);
}

function toVector(texts: string[]): TextVector {
  const counts = new Map<string, number>();
  texts.flatMap(normalizedTokens).forEach(token => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  const norm = Math.sqrt(Array.from(counts.values()).reduce((sum, value) => sum + value * value, 0));
  return { counts, norm };
}

function toTokenSet(texts: string[]): Set<string> {
  return new Set(
    texts
      .flatMap(normalizedTokens)
      .filter(token => token.length >= 4)
      .filter(token => !BULGARIAN_NOISE_STEMS.has(token))
  );
}

function toSignature(item: NewsItem): DuplicateSignature {
  const combinedTexts = similarityTexts(item);
  const headlineTexts = titleTexts(item);
  return {
    combinedVector: toVector(combinedTexts),
    combinedTokens: toTokenSet(combinedTexts),
    titleVector: toVector(headlineTexts),
    titleTokens: toTokenSet(headlineTexts),
    publishedMs: Number(item.publishedMs || 0),
    linkKey: normalizeStoryLink(item.link)
  };
}

function cosineSimilarity(a: TextVector, b: TextVector): number {
  if (!a.norm || !b.norm) return 0;
  let dot = 0;
  a.counts.forEach((count, token) => {
    const other = b.counts.get(token);
    if (!other) return;
    dot += count * other;
  });
  return dot / (a.norm * b.norm);
}

function tokenOverlapSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  smaller.forEach(token => {
    if (larger.has(token)) intersection += 1;
  });
  return intersection / smaller.size;
}

function sharedTokenCount(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  smaller.forEach(token => {
    if (larger.has(token)) intersection += 1;
  });
  return intersection;
}

function oneEditApart(a: string, b: string): boolean {
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < lenA && j < lenB) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (lenA > lenB) {
      i += 1;
    } else if (lenB > lenA) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < lenA || j < lenB) edits += 1;
  return edits <= 1;
}

function fuzzyTokenOverlapSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  const [smaller, larger] = a.size <= b.size ? [Array.from(a), Array.from(b)] : [Array.from(b), Array.from(a)];
  let matches = 0;

  smaller.forEach(token => {
    if (larger.includes(token)) {
      matches += 1;
      return;
    }

    const hasNear = larger.some(candidate => {
      if (Math.abs(candidate.length - token.length) > 1) return false;
      return oneEditApart(token, candidate);
    });
    if (hasNear) matches += 1;
  });

  return matches / smaller.length;
}

function isWithinTimeWindow(a: DuplicateSignature, b: DuplicateSignature, maxTimeDeltaMs: number): boolean {
  if (!a.publishedMs || !b.publishedMs) return true;
  return Math.abs(a.publishedMs - b.publishedMs) <= maxTimeDeltaMs;
}

function matchesByTokens(
  aTokens: Set<string>,
  bTokens: Set<string>,
  overlapThreshold: number
): boolean {
  const overlap = tokenOverlapSimilarity(aTokens, bTokens);
  const fuzzyOverlap = fuzzyTokenOverlapSimilarity(aTokens, bTokens);
  const sharedTokens = sharedTokenCount(aTokens, bTokens);
  const maxOverlap = Math.max(overlap, fuzzyOverlap);
  return (
    maxOverlap >= DUPLICATE_MATCH_SIMILARITY_THRESHOLD
    || (maxOverlap >= overlapThreshold && sharedTokens >= DUPLICATE_MATCH_MIN_SHARED_TOKENS)
  );
}

function isDuplicate(a: DuplicateSignature, b: DuplicateSignature, maxTimeDeltaMs: number): boolean {
  if (a.linkKey && b.linkKey && a.linkKey === b.linkKey) return true;
  if (!isWithinTimeWindow(a, b, maxTimeDeltaMs)) return false;

  const titleCosine = cosineSimilarity(a.titleVector, b.titleVector);
  if (titleCosine >= DUPLICATE_MATCH_TITLE_SIMILARITY_THRESHOLD) return true;
  if (matchesByTokens(a.titleTokens, b.titleTokens, DUPLICATE_MATCH_TITLE_TOKEN_OVERLAP_THRESHOLD)) return true;

  const combinedCosine = cosineSimilarity(a.combinedVector, b.combinedVector);
  if (combinedCosine >= DUPLICATE_MATCH_SIMILARITY_THRESHOLD) return true;
  return matchesByTokens(a.combinedTokens, b.combinedTokens, DUPLICATE_MATCH_TOKEN_OVERLAP_THRESHOLD);
}

export function dedupeNewsItemsBySignature(
  items: NewsItem[],
  options: Partial<DeduplicateOptions> = {}
): NewsItem[] {
  const { maxTimeDeltaMs = 12 * 60 * 60 * 1000, prefer } = options;
  const kept: DuplicateEntry[] = [];

  for (const item of items) {
    const signature = toSignature(item);
    const duplicateIndex = kept.findIndex(entry => isDuplicate(signature, entry.signature, maxTimeDeltaMs));
    if (duplicateIndex === -1) {
      kept.push({ item, signature });
      continue;
    }

    if (prefer?.(item, kept[duplicateIndex].item)) {
      kept[duplicateIndex] = { item, signature };
    }
  }

  return kept.map(entry => entry.item);
}
