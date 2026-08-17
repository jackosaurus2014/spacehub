/**
 * Regulatory Radar categorizer — pure keyword/agency-based classification of
 * regulatory actions (Federal Register documents, congressional actions,
 * agency filings) into radar categories. No AI, fully deterministic, tested
 * in src/lib/__tests__/regulatory-categorizer.test.ts.
 */

export const RADAR_CATEGORIES = [
  'enforcement',
  'export-controls',
  'launch-licensing',
  'spectrum',
  'remote-sensing',
  'procurement-policy',
  'space-traffic',
  'other',
] as const;

export type RadarCategory = (typeof RADAR_CATEGORIES)[number];

export const RADAR_CATEGORY_LABELS: Record<RadarCategory, string> = {
  enforcement: 'Enforcement Watch',
  'export-controls': 'Export Controls',
  'launch-licensing': 'Launch Licensing',
  spectrum: 'Spectrum',
  'remote-sensing': 'Remote Sensing',
  'procurement-policy': 'Procurement & Policy',
  'space-traffic': 'Space Traffic & Debris',
  other: 'Other',
};

// ─── Enforcement detection (Enforcement Watch) ──────────────────────────────
//
// "Who got fined, for what, how much" — BIS denial orders and settlement
// orders, DDTC statutory debarments and consent agreements, FCC forfeitures
// and NALs, FAA civil penalties. Detection runs on the TITLE + ACTION line
// only (never the abstract body): federal enforcement documents are
// formulaically titled ("Order Relating to X", "...; Order Renewing Temporary
// Denial of Export Privileges"), while abstracts of unrelated rules routinely
// quote enforcement vocabulary in passing.

const ENFORCEMENT_PATTERNS: RegExp[] = [
  /civil (monetary )?penalt/i,
  /denial of export privileges/i,
  /denying (the )?export privileges/i,
  /suspension of export privileges/i,
  /temporary denial order/i,
  /order relating to/i,
  /settlement agreement/i,
  /statutory debarment/i,
  /administrative debarment/i,
  /charging letter/i,
  /consent agreement/i,
  /consent decree/i,
  /forfeiture order/i,
  /notice of apparent liability/i,
  /order of debarment/i,
];

// Rules ABOUT penalties are not enforcement actions: annual inflation
// adjustments of civil-penalty maxima are the dominant false positive.
const ENFORCEMENT_EXCLUDE_PATTERNS: RegExp[] = [
  /inflation adjustment/i,
  /adjustments? (of|to|for) civil (monetary )?penalt/i,
  /civil (monetary )?penalt(y|ies) (amounts? )?(annual )?adjustment/i,
];

export interface EnforcementDetectInput {
  title: string;
  /** FR action line ("Order; civil penalty", "Notice") when available. */
  actionText?: string | null;
}

/**
 * True when a regulatory document is an enforcement action (penalty, denial
 * order, debarment, settlement, forfeiture). Pure, exported for tests.
 */
export function isEnforcementAction(input: EnforcementDetectInput): boolean {
  const haystack = `${input.title} ${input.actionText || ''}`;
  if (ENFORCEMENT_EXCLUDE_PATTERNS.some((p) => p.test(haystack))) return false;
  return ENFORCEMENT_PATTERNS.some((p) => p.test(haystack));
}

/**
 * Extract a penalty/settlement dollar amount from enforcement text. Returns
 * the literal matched string (e.g. "$1,500,000" or "$2.7 million") — never a
 * computed or reformatted number — or null when no amount is parseable.
 * When several amounts appear, the largest is returned (documents typically
 * mention the statutory maximum alongside the assessed penalty; the assessed
 * amount is usually the largest concrete figure — imperfect, but the source
 * link is always one click away).
 */
export function extractPenaltyAmount(text: string): string | null {
  const re = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s?(?:million|billion))?/gi;
  let best: { raw: string; value: number } | null = null;
  for (const match of text.match(re) || []) {
    const numeric = parseFloat(match.replace(/[$,\s]/g, '').replace(/million|billion/i, ''));
    if (Number.isNaN(numeric)) continue;
    const mult = /billion/i.test(match) ? 1e9 : /million/i.test(match) ? 1e6 : 1;
    const value = numeric * mult;
    if (!best || value > best.value) best = { raw: match.replace(/\$\s/, '$').trim(), value };
  }
  return best ? best.raw : null;
}

/**
 * Export-control keyword set. Used both for categorization and for the
 * Federal Register relevance filter (BIS/DDTC documents are relevant to the
 * space industry even when they contain zero space-hardware words —
 * ITAR/EAR rule changes routinely affect satellite and launch companies
 * without ever saying "satellite").
 */
export const EXPORT_CONTROL_KEYWORDS = [
  'itar',
  'international traffic in arms',
  'export administration', // Export Administration Regulations / Act / reform bills
  ' ear ', // padded — avoid matching "year", "clear", etc.
  'export control',
  'export controls',
  'export license',
  'export licensing',
  'munitions list',
  'usml',
  'commerce control list',
  'ccl',
  'eccn',
  'deemed export',
  'license exception',
  'dual-use',
  'dual use',
  '9x515',
  '600 series',
  'ddtc',
  'directorate of defense trade controls',
  'defense trade',
  'defense article',
  'defense services',
  'entity list',
  'denied persons',
  'end-user',
  'end user certificate',
  'reexport',
  're-export',
  'export privileges', // BIS denial orders name only the denied party — no other EAR vocabulary in the title

  'bureau of industry and security',
  'arms export control act',
  'wassenaar',
];

// Category keyword sets, checked in priority order (first match wins after
// the agency hint). Keywords are matched case-insensitively against
// title + summary/abstract text.
const CATEGORY_KEYWORDS: Array<{ category: RadarCategory; keywords: string[] }> = [
  {
    category: 'export-controls',
    keywords: EXPORT_CONTROL_KEYWORDS,
  },
  {
    category: 'launch-licensing',
    keywords: [
      'launch license',
      'launch licensing',
      'reentry license',
      'launch vehicle',
      'launch site',
      'launch operator',
      'reentry vehicle',
      'part 450',
      'part 440',
      'commercial space transportation',
      'launch and reentry',
      'spaceport',
      'launch window',
      'flight safety analysis',
      'launch or reentry',
    ],
  },
  {
    category: 'spectrum',
    keywords: [
      'spectrum',
      'frequency band',
      'frequency allocation',
      'frequency assignment',
      'orbital slot',
      'orbital location',
      'earth station',
      'space station application',
      'part 25',
      'ngso',
      'non-geostationary',
      'geostationary orbit',
      'satellite communications',
      'radiocommunication',
      'ghz band',
      'mhz band',
      'v-band',
      'ka-band',
      'ku-band',
      'c-band',
    ],
  },
  {
    category: 'remote-sensing',
    keywords: [
      'remote sensing',
      'earth observation',
      'commercial imaging',
      'imaging satellite',
      'part 960',
      'private remote sensing',
      'earth imaging',
      'geospatial intelligence',
    ],
  },
  {
    category: 'space-traffic',
    keywords: [
      'orbital debris',
      'space debris',
      'debris mitigation',
      'space traffic',
      'conjunction',
      'collision avoidance',
      'deorbit',
      'de-orbit',
      'space situational awareness',
      'space sustainability',
      'traffic coordination',
      'post-mission disposal',
    ],
  },
  {
    category: 'procurement-policy',
    keywords: [
      'procurement',
      'acquisition regulation',
      'federal acquisition',
      'far part',
      'dfars',
      'contract award',
      'contracting',
      'small business innovation research',
      'sbir',
      'sttr',
      'solicitation',
      'other transaction authority',
      'national space policy',
      'space policy directive',
      'authorization act',
      'appropriations',
      'budget request',
    ],
  },
];

// Agency hints — when the keyword scan is inconclusive (or ties), the
// issuing agency is a strong signal for what a document is about.
const AGENCY_CATEGORY_HINTS: Array<{ pattern: RegExp; category: RadarCategory }> = [
  { pattern: /industry and security|ddtc|defense trade/i, category: 'export-controls' },
  { pattern: /federal aviation/i, category: 'launch-licensing' },
  { pattern: /communications commission/i, category: 'spectrum' },
  { pattern: /oceanic and atmospheric/i, category: 'remote-sensing' },
];

export interface CategorizeInput {
  title: string;
  summary?: string | null;
  /** Agency display names and/or slugs, e.g. ["Bureau of Industry and Security"]. */
  agencies?: string[];
  /** FR action line — strengthens enforcement detection ("Order; civil penalty"). */
  actionText?: string | null;
}

/** True when the text contains at least one export-control term. */
export function isExportControlRelevant(text: string): boolean {
  const haystack = ` ${text.toLowerCase()} `;
  return EXPORT_CONTROL_KEYWORDS.some((kw) => haystack.includes(kw));
}

function countMatches(text: string, keywords: string[]): number {
  const haystack = ` ${text.toLowerCase()} `;
  return keywords.reduce((n, kw) => (haystack.includes(kw) ? n + 1 : n), 0);
}

/**
 * Classify a regulatory action into a radar category.
 *
 * Strategy: score each category by keyword hits on title + summary; the
 * highest score wins. Title-only re-scoring breaks ties (titles are the
 * strongest signal in FR documents). If nothing matches, fall back to the
 * issuing agency's home turf; otherwise 'other'.
 */
export function categorizeRegulatoryAction(input: CategorizeInput): RadarCategory {
  // Enforcement first — an ITAR consent agreement is about export controls,
  // but its radar identity is "someone got penalized". Both fetch paths
  // (main FR fetcher and the enforcement fetcher) call this same function,
  // so the shared dedupKey always resolves to the same category.
  if (isEnforcementAction({ title: input.title, actionText: input.actionText })) {
    return 'enforcement';
  }

  const fullText = `${input.title} ${input.summary || ''}`;
  const agencyText = (input.agencies || []).join(' ');

  let best: RadarCategory | null = null;
  let bestScore = 0;
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    const score = countMatches(fullText, keywords);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    } else if (score === bestScore && score > 0 && best) {
      // Tie — prefer the category the title (not just the abstract) points at
      const titleA = countMatches(input.title, CATEGORY_KEYWORDS.find((c) => c.category === best)!.keywords);
      const titleB = countMatches(input.title, keywords);
      if (titleB > titleA) best = category;
    }
  }

  if (best) return best;

  for (const hint of AGENCY_CATEGORY_HINTS) {
    if (hint.pattern.test(agencyText)) return hint.category;
  }

  return 'other';
}

// ─── Article cross-link matcher ─────────────────────────────────────────────

/**
 * Which radar categories does a piece of article text touch? Used by the
 * "Related regulatory actions" strip on article pages. Deliberately stricter
 * than categorizeRegulatoryAction (which must always pick something): a
 * category needs >= 2 distinct keyword hits — except export-controls, whose
 * vocabulary (ITAR, USML, ECCN...) is distinctive enough that one hit
 * suffices. Returns [] for articles with no regulatory hook, so the strip
 * renders nothing for the overwhelming majority of articles.
 */
export function matchRegulatoryCategories(text: string): RadarCategory[] {
  const matched: RadarCategory[] = [];
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    const hits = countMatches(text, keywords);
    if (hits >= 2 || (hits >= 1 && category === 'export-controls')) {
      matched.push(category);
    }
  }
  return matched;
}
