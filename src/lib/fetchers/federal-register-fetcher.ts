/**
 * Federal Register fetcher for space-related regulatory documents
 *
 * Uses the free Federal Register API to fetch rules, proposed rules, and notices
 * from agencies relevant to the space industry.
 *
 * API documentation: https://www.federalregister.gov/developers/documentation/api/v1
 */

import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { bulkUpsertContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';
import {
  categorizeRegulatoryAction,
  extractPenaltyAmount,
  isEnforcementAction,
  isExportControlRelevant,
} from '@/lib/regulatory-categorizer';
import { upsertRadarEntries, type RadarEntryInput } from '@/lib/regulatory-radar';

const circuitBreaker = createCircuitBreaker('federal-register-space', {
  failureThreshold: 3,
  resetTimeout: 300000, // 5 min
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FederalRegisterApiDocument {
  document_number: string;
  title: string;
  type: string;
  abstract: string | null;
  publication_date: string;
  effective_on: string | null;
  agencies: Array<{
    raw_name: string;
    name: string;
    id: number;
    slug: string;
  }>;
  html_url: string;
  pdf_url: string;
  citation: string | null;
  docket_ids: string[];
  regulation_id_numbers: string[];
  significant: boolean;
  action: string | null;
  comment_url: string | null;
  comments_close_on: string | null;
}

export interface FederalRegisterEntry {
  documentNumber: string;
  title: string;
  type: string;
  abstract: string | null;
  publicationDate: string;
  effectiveDate: string | null;
  agencies: string[];
  agencySlugs: string[];
  htmlUrl: string;
  pdfUrl: string;
  citation: string | null;
  docketIds: string[];
  action: string | null;
  significant: boolean;
  commentUrl: string | null;
  /** ISO date the public comment window closes, when the document has one. */
  commentsCloseOn: string | null;
}

// ---------------------------------------------------------------------------
// Agency slugs covering space-related regulatory bodies
// ---------------------------------------------------------------------------

const SPACE_AGENCY_SLUGS = [
  'federal-aviation-administration',
  'federal-communications-commission',
  'national-aeronautics-and-space-administration',
  'national-oceanic-and-atmospheric-administration',
  'defense-department',
  // NOTE: BIS's Federal Register slug is 'industry-and-security-bureau' —
  // NOT 'bureau-of-industry-and-security'. One invalid slug 400s the ENTIRE
  // multi-agency query, and the circuit breaker masks that as "0 documents";
  // this fetcher had been silently dead until the 8/17 Radar verification
  // caught it. Verify new slugs against /api/v1/agencies before adding.
  'industry-and-security-bureau',
  'state-department', // DDTC falls under State
  'air-force-department', // Space Force resides under Air Force/DoD
];

/**
 * Agencies whose export-control output is space-relevant even with zero
 * space-hardware words in the text (an EAR/ITAR rule change hits satellite
 * and launch companies without ever saying "satellite").
 */
export const EXPORT_CONTROL_AGENCY_SLUGS = [
  'industry-and-security-bureau',
  'state-department',
];

// ---------------------------------------------------------------------------
// Space-relevant keyword filter (applied to title + abstract)
// ---------------------------------------------------------------------------

const SPACE_KEYWORDS = [
  'satellite',
  'space',
  'orbit',
  'launch',
  'spectrum',
  'itar',
  'munitions',
  'export control',
  'rocket',
  'reentry',
  'spacecraft',
  'debris',
  'constellation',
  'geostationary',
  'non-geostationary',
  'ngso',
  'remote sensing',
  'earth observation',
  'spaceport',
  'space vehicle',
  'deorbit',
  'cislunar',
  'lunar',
  'mars',
  'asteroid',
];

/**
 * Routine-FAA-noise exclusion (Radar quality pass, 8/17). The bare 'space'
 * keyword substring-matches "airspace"/"aerospace", so the FAA's daily
 * drumbeat of Class D/E airspace amendments and airworthiness directives
 * (aviation, not space) flooded the Radar's Launch Licensing lane on day
 * one. These titles are formulaic — match the title prefix, not the body.
 */
const ROUTINE_FAA_TITLE_PATTERNS = [
  /^(establishment|amendment|revocation|modification) of (class [a-g]|multiple) airspace/i,
  /^airworthiness directives[;:]/i,
  /^airworthiness criteria[;:]/i,
  /^standard instrument approach procedures/i,
  /^ifr altitudes[;:]?/i,
];

function isRoutineAviationAction(title: string): boolean {
  return ROUTINE_FAA_TITLE_PATTERNS.some((p) => p.test(title.trim()));
}

function isSpaceRelevant(title: string, abstract: string | null): boolean {
  if (isRoutineAviationAction(title)) return false;
  const text = `${title} ${abstract || ''}`.toLowerCase();
  return SPACE_KEYWORDS.some((kw) => text.includes(kw));
}

/**
 * Relevance filter (pure, exported for tests).
 *
 * - BIS / State (DDTC) documents pass on export-control terms (ITAR, EAR,
 *   USML, CCL, license exceptions, 9x515, 600 series, ...) OR space terms —
 *   export-control rulemaking affects space companies even with zero
 *   space-hardware words. The export-control keyword gate applies ONLY to
 *   these two agencies, so generic State Department notices (visas, passport
 *   fees, ...) still need a space or export-control hook to get in and other
 *   agencies' EAR-adjacent chatter doesn't flood the feed.
 * - Every other agency keeps the original space-keyword filter.
 */
export function isRelevantFederalRegisterDoc(doc: FederalRegisterApiDocument): boolean {
  const slugs = doc.agencies?.map((a) => a.slug) || [];
  const spaceHit = isSpaceRelevant(doc.title, doc.abstract);
  const fromExportControlAgency = slugs.some((slug) => EXPORT_CONTROL_AGENCY_SLUGS.includes(slug));
  if (fromExportControlAgency) {
    return (
      spaceHit ||
      isExportControlRelevant(`${doc.title} ${doc.abstract || ''}`) ||
      // BIS/DDTC enforcement (denial orders, settlements, debarments) names
      // only the penalized party — often zero space OR export-control words
      // in the title and a null abstract. Export-control enforcement is per
      // se relevant to space companies; FCC/FAA enforcement still needs a
      // space hook (a broadcast-station forfeiture is not radar material).
      isEnforcementAction({ title: doc.title, actionText: doc.action })
    );
  }
  return spaceHit;
}

/** Map an API document to our entry shape (pure, exported for tests). */
export function mapFederalRegisterDoc(doc: FederalRegisterApiDocument): FederalRegisterEntry {
  return {
    documentNumber: doc.document_number,
    title: doc.title,
    type: doc.type,
    abstract: doc.abstract,
    publicationDate: doc.publication_date,
    effectiveDate: doc.effective_on,
    agencies: doc.agencies?.map((a) => a.name) || [],
    agencySlugs: doc.agencies?.map((a) => a.slug) || [],
    htmlUrl: doc.html_url,
    pdfUrl: doc.pdf_url,
    citation: doc.citation,
    docketIds: doc.docket_ids || [],
    action: doc.action,
    significant: doc.significant ?? false,
    commentUrl: doc.comment_url || null,
    commentsCloseOn: doc.comments_close_on || null,
  };
}

/** Build the RegulatoryAction dual-write row for a FR entry (pure, exported for tests). */
export function federalRegisterEntryToRadarInput(entry: FederalRegisterEntry): RadarEntryInput {
  const commentClose = entry.commentsCloseOn ? new Date(`${entry.commentsCloseOn}T23:59:59Z`) : null;
  const effective = entry.effectiveDate ? new Date(`${entry.effectiveDate}T12:00:00Z`) : null;
  const category = categorizeRegulatoryAction({
    title: entry.title,
    summary: entry.abstract,
    agencies: entry.agencies,
    actionText: entry.action,
  });

  // Enforcement entries surface the penalty amount in the summary when (and
  // only when) one is parseable from the document's own title/abstract —
  // never invented, never reformatted.
  let summary = entry.abstract;
  if (category === 'enforcement') {
    const penalty = extractPenaltyAmount(`${entry.title} ${entry.abstract || ''}`);
    if (penalty && !(summary || '').startsWith('Penalty:')) {
      summary = `Penalty: ${penalty}.${summary ? ` ${summary}` : ''}`;
    }
  }

  return {
    dedupKey: `federal-register:${entry.documentNumber}`,
    source: 'federal-register',
    category,
    title: entry.title,
    summary,
    actionDate: new Date(`${entry.publicationDate}T12:00:00Z`),
    url: entry.htmlUrl,
    agency: entry.agencies[0] || null,
    documentType: entry.type,
    actionText: entry.action,
    commentUrl: entry.commentUrl,
    commentCloseDate: commentClose && !Number.isNaN(commentClose.getTime()) ? commentClose : null,
    effectiveDate: effective && !Number.isNaN(effective.getTime()) ? effective : null,
    significant: entry.significant,
    raw: entry,
  };
}

// ---------------------------------------------------------------------------
// Fetch from Federal Register API
// ---------------------------------------------------------------------------

/**
 * Fetch space-related documents from the Federal Register API.
 * Results are filtered to only include documents mentioning space-related keywords.
 */
export async function fetchFederalRegisterEntries(): Promise<FederalRegisterEntry[]> {
  return circuitBreaker.execute(async () => {
    // Build agency filter params (array notation)
    const agencyParams = SPACE_AGENCY_SLUGS.map(
      (slug) => `conditions[agencies][]=${encodeURIComponent(slug)}`
    ).join('&');

    // Document types: rules, proposed rules, and notices
    const typeParams = [
      'conditions[type][]=RULE',
      'conditions[type][]=PRORULE',
      'conditions[type][]=NOTICE',
    ].join('&');

    // Request fields explicitly — comment_url / comments_close_on /
    // significant / effective_on are NOT in the API's default field set.
    const fieldParams = [
      'document_number', 'title', 'type', 'abstract', 'publication_date',
      'effective_on', 'agencies', 'html_url', 'pdf_url', 'citation',
      'docket_ids', 'regulation_id_numbers', 'significant', 'action',
      'comment_url', 'comments_close_on',
    ]
      .map((f) => `fields[]=${encodeURIComponent(f)}`)
      .join('&');

    const baseParams = new URLSearchParams({
      per_page: '50',
      order: 'newest',
    });

    const url = `https://www.federalregister.gov/api/v1/documents.json?${baseParams.toString()}&${agencyParams}&${typeParams}&${fieldParams}`;

    logger.info('[FederalRegister] Fetching documents', { url: url.substring(0, 120) + '...' });

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`Federal Register API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawDocuments: FederalRegisterApiDocument[] = data.results || [];

    // Filter for relevance (space keywords generally; export-control
    // keywords also count for BIS/State documents)
    const relevantDocuments = rawDocuments.filter(isRelevantFederalRegisterDoc);

    const entries: FederalRegisterEntry[] = relevantDocuments.map(mapFederalRegisterDoc);

    logger.info('[FederalRegister] Fetched documents', {
      rawCount: rawDocuments.length,
      relevant: entries.length,
    });

    return entries;
  }, []);
}

// ---------------------------------------------------------------------------
// Store in DynamicContent
// ---------------------------------------------------------------------------

/**
 * Fetch Federal Register entries and store them twice:
 *  1. DynamicContent KV (module='compliance', section='federal-register-entries')
 *     — back-compat for the existing /compliance Filings tab.
 *  2. RegulatoryAction rows via upsertRadarEntries — the Regulatory Radar
 *     timeline (fail-soft: skipped until `prisma db push` creates the table).
 */
export async function fetchAndStoreFederalRegister(): Promise<{
  stored: number;
  radarStored: number;
  errors: number;
}> {
  let stored = 0;
  let radarStored = 0;
  let errors = 0;

  try {
    const entries = await fetchFederalRegisterEntries();

    if (entries.length === 0) {
      logger.info('[FederalRegister] No relevant entries found');
      return { stored: 0, radarStored: 0, errors: 0 };
    }

    const items = entries.map((entry) => ({
      contentKey: `compliance:federal-register:${entry.documentNumber}`,
      section: 'federal-register-entries',
      data: {
        ...entry,
        fetchedAt: new Date().toISOString(),
      },
    }));

    stored = await bulkUpsertContent('compliance', items, {
      sourceType: 'api' as const,
      sourceUrl: 'https://www.federalregister.gov/api/v1/documents',
    });

    // Dual-write into the Regulatory Radar model (never throws)
    radarStored = await upsertRadarEntries(entries.map(federalRegisterEntryToRadarInput));

    logger.info('[FederalRegister] Stored entries', { stored, radarStored });
  } catch (error) {
    errors++;
    logger.error('[FederalRegister] Failed to fetch and store entries', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { stored, radarStored, errors };
}
