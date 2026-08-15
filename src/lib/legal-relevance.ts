/**
 * Relevance filter for the Recent Legal & Regulatory Updates feed
 * (src/app/compliance/RecentLegalUpdates.tsx, fed by
 * /api/compliance/legal?type=updates).
 *
 * The Space Policy Online feed (and other LegalSource feeds) is ingested
 * indiscriminately by scripts/compliance-fetcher.ts and can include generic
 * space news ("Chinese LM-7A Rocket Fails") alongside genuine regulatory
 * items. This module is a pure, testable filter applied at the read layer
 * (not the fetcher) so the "Recent Legal Updates" list only surfaces items
 * with real regulatory/legal substance.
 */

// Keywords/phrases that indicate genuine regulatory or legal substance.
// Matched case-insensitively as whole-word-ish substrings against the
// title + excerpt. Kept broad enough to catch real filings/rulings/bills
// without requiring exact phrasing.
const RELEVANCE_KEYWORDS: string[] = [
  'regulat', // regulation, regulatory, regulator, deregulat...
  'legislat', // legislation, legislative
  'license',
  'licensing',
  'licence',
  'fcc',
  'faa',
  'itar',
  'ear', // paired with export-control context below to avoid false positives on the bare word
  'export control',
  'export-control',
  'treaty',
  'ruling',
  'lawsuit',
  ' law ',
  'space law',
  'bill',
  'senate',
  'congress',
  'policy',
  'compliance',
  'tariff',
  'spectrum',
  'liability',
  'statute',
  'rulemaking',
  'comment period',
  'nprm', // Notice of Proposed Rulemaking
  'doj',
  'ftc',
  'sec filing',
  'antitrust',
  'sanction',
  'export administration',
  'international traffic in arms',
  'noaa remote sensing',
  'copuos',
  'artemis accords',
  'outer space treaty',
  'launch license',
  'reentry license',
  'part 450',
  'part 25',
  'ddtc',
  'bis',
];

// Bare-word keywords (from RELEVANCE_KEYWORDS above) that require a
// word-boundary match, otherwise they'd match substrings inside unrelated
// words, e.g. "ear" inside "early"/"hear", "bill" inside "billion",
// "bis" inside random tokens.
const WORD_BOUNDARY_KEYWORDS: string[] = ['bill', 'ear', 'bis'];

function normalize(text: string): string {
  return ` ${text.toLowerCase()} `;
}

/**
 * Congress/Senate on their own are too generic (could be any bill); only
 * count them as relevant when paired with space-industry context.
 */
function hasCongressSpaceContext(haystack: string): boolean {
  const mentionsCongress = /\b(congress|senate|house of representatives)\b/.test(haystack);
  if (!mentionsCongress) return false;
  return /\b(space|satellite|launch|orbital|nasa|spectrum|export|itar)\b/.test(haystack);
}

/**
 * Returns true if the given title/excerpt contains enough regulatory or
 * legal substance to belong in the Recent Legal Updates feed.
 */
export function isRegulatoryRelevant(title: string | null | undefined, excerpt?: string | null): boolean {
  const haystack = normalize(`${title || ''} ${excerpt || ''}`);

  if (/\bcongress\b|\bsenate\b/.test(haystack)) {
    // Congress/Senate mentions are only relevant with space context; if
    // that context is missing, fall through to the rest of the keyword
    // checks below (other keywords may still make it relevant).
    if (hasCongressSpaceContext(haystack)) return true;
  }

  for (const keyword of RELEVANCE_KEYWORDS) {
    if (keyword === 'congress' || keyword === 'senate') continue; // handled above

    if (WORD_BOUNDARY_KEYWORDS.includes(keyword)) {
      const re = new RegExp(`\\b${keyword}\\b`, 'i');
      if (re.test(haystack)) return true;
      continue;
    }

    if (haystack.includes(keyword.toLowerCase())) return true;
  }

  return false;
}

export interface RelevanceFilterable {
  title: string;
  excerpt?: string | null;
}

/**
 * Filters a list of legal/regulatory update-like items down to only the
 * ones with regulatory or legal substance.
 */
export function filterRegulatoryRelevant<T extends RelevanceFilterable>(items: T[]): T[] {
  return items.filter((item) => isRegulatoryRelevant(item.title, item.excerpt));
}
