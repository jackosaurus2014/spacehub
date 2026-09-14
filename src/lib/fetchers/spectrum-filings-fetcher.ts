/**
 * Spectrum filings fetcher
 *
 * Pulls recent satellite/spectrum-relevant filings from the FCC's public ECFS
 * (Electronic Comment Filing System) API — the same auth-free public endpoint
 * used by src/lib/fetchers/fcc-space-filings-fetcher.ts for the compliance
 * module, reused here with a spectrum-coordination-focused search rotation.
 *
 * API docs: https://publicapi.fcc.gov/ecfs/filings. An api_key IS required
 * as of 2026 (see ecfs-api-key.ts); a keyless request answers 403
 * API_KEY_MISSING, which this fetcher used to absorb silently.
 *
 * Design notes:
 * - The existing SpectrumFiling Prisma model (src/lib/spectrum-data.ts) is
 *   shaped for structured satellite-system authorizations: bandName,
 *   frequencyMin/Max, orbitType, and numberOfSatellites are all NOT NULL.
 *   Raw ECFS docket filings (comment letters, petitions, oppositions) do not
 *   carry that structured technical data — fabricating it to fit the schema
 *   would misrepresent the filing. Instead, live filings are stored as
 *   flexible records in DynamicContent (module='spectrum',
 *   section='recent-filings'), the same additive pattern the compliance
 *   module already uses for federal-register-entries / fcc-filings. The
 *   curated SpectrumFiling table remains the "Active Filings" reference tab.
 * - Exactly one HTTP request per invocation (single search term, single page,
 *   capped limit) to stay rate-respectful. The search term rotates daily
 *   across a fixed list of spectrum-coordination keywords so repeated daily
 *   runs surface different proceedings without ever issuing more than one
 *   request per run.
 * - Wrapped in a circuit breaker; all failures are logged and fail silently
 *   (empty result / 0 stored) rather than throwing, so a bad run never breaks
 *   the page or the wider daily refresh job.
 */

import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { bulkUpsertContent } from '@/lib/dynamic-content';
import { ecfsApiKey } from './ecfs-api-key';

const circuitBreaker = createCircuitBreaker('spectrum-ecfs-filings', {
  failureThreshold: 3,
  resetTimeout: 300000, // 5 min
});

const ECFS_FILINGS_URL = 'https://publicapi.fcc.gov/ecfs/filings';
// Pagination cap: a single page, single request per invocation.
const PAGE_LIMIT = 20;

/**
 * Search terms rotated daily. All are relevant to satellite spectrum
 * coordination / earth & space station licensing proceedings at the FCC.
 */
export const SPECTRUM_SEARCH_TERMS = [
  'satellite spectrum',
  'NGSO',
  'earth station',
  'space station license',
  'spectrum sharing',
  'orbital debris',
  'satellite constellation',
] as const;

/**
 * Deterministically pick a search term for a given date (day-of-year modulo
 * the term list length). Pure function — no I/O — so it's directly testable
 * and guarantees at most one term (and therefore one HTTP request) per call.
 */
export function pickSearchTerm(date: Date = new Date()): string {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayOfYear = Math.floor((today - yearStart) / 86400000);
  return SPECTRUM_SEARCH_TERMS[dayOfYear % SPECTRUM_SEARCH_TERMS.length];
}

/**
 * The subset of an ECFS filing we consume, as the endpoint actually returns
 * it (re-derived from a live response 2026-09-14). The previous shape was
 * written against an older ECFS and named four fields that no longer exist
 * — `short_comment`, `text_data`, `type_of_filing` and a singular
 * `bureau` — so every mapped record fell through to its placeholder even
 * on the rare occasion a request succeeded. Note that a proceeding's
 * `name` is the DOCKET NUMBER ("13-115") and its `description` is the
 * proceeding's title; the old mapping had those two the other way round.
 */
export interface RawECFSFiling {
  id_submission?: string;
  confirmation_number?: string;
  submissiontype?: { description?: string; short?: string };
  proceedings?: Array<{ name?: string; description_display?: string; description?: string; bureau_name?: string }>;
  date_disseminated?: string;
  date_submission?: string;
  filers?: Array<{ name?: string }>;
  documents?: Array<{ filename?: string; src?: string }>;
}

export interface SpectrumFilingRecord {
  filingId: string;
  title: string;
  docket: string;
  proceedingName: string;
  filer: string;
  filingType: string;
  bureau: string;
  filedDate: string | null;
  url: string;
}

const SPECTRUM_KEYWORDS = [
  'satellite',
  'spectrum',
  'ngso',
  'geostationary',
  'earth station',
  'space station',
  'orbital',
  'constellation',
  'frequency',
  'radio',
];

/** Filter: does this filing's title/proceeding text look spectrum-relevant? */
export function isSpectrumRelevant(
  record: Pick<SpectrumFilingRecord, 'title' | 'proceedingName'>
): boolean {
  const text = `${record.title} ${record.proceedingName}`.toLowerCase();
  return SPECTRUM_KEYWORDS.some((kw) => text.includes(kw));
}

/** Map a raw ECFS API filing into our normalized record shape. */
export function mapECFSFiling(raw: RawECFSFiling, searchTerm: string): SpectrumFilingRecord {
  const filingId = raw.id_submission || raw.confirmation_number || '';
  const proc = raw.proceedings?.[0];
  const docket = proc?.name || '';
  const proceedingName = proc?.description_display || proc?.description || '';
  const filingType = raw.submissiontype?.description || raw.submissiontype?.short || 'filing';
  const filer = raw.filers?.[0]?.name || 'Unknown filer';
  // ECFS carries no comment text on the filing row — the substance is the
  // proceeding it was filed into, plus the document that was attached. Build
  // the title from those rather than from a field that does not exist. The
  // filing TYPE is deliberately not prefixed here: the spectrum card renders
  // it as its own badge, and a title reading "COMMENT — …" beside a
  // "COMMENT" badge is the same word twice.
  const title = proceedingName
    || raw.documents?.[0]?.filename?.trim()
    || `FCC ECFS filing: ${searchTerm}`;

  return {
    filingId,
    title,
    docket,
    proceedingName,
    filer,
    filingType,
    // The bureau lives on the proceeding; the row's own `bureaus` array is
    // empty on every sample.
    bureau: proc?.bureau_name || 'Space Bureau',
    filedDate: raw.date_disseminated || raw.date_submission || null,
    // The API hands us the document URL; prefer it over a constructed one.
    url: raw.documents?.[0]?.src
      || (filingId
        ? `https://www.fcc.gov/ecfs/filing/${filingId}`
        : `https://www.fcc.gov/ecfs/search/filings?q=${encodeURIComponent(searchTerm)}`),
  };
}

/** Deduplicate by filingId, dropping records with no id. */
export function dedupeByFilingId(records: SpectrumFilingRecord[]): SpectrumFilingRecord[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    if (!r.filingId || seen.has(r.filingId)) return false;
    seen.add(r.filingId);
    return true;
  });
}

/**
 * Fetch recent spectrum-relevant FCC ECFS filings.
 * Exactly one HTTP request; capped page size; circuit-breaker protected.
 * Returns [] (rather than throwing) on any failure.
 */
export async function fetchSpectrumFilings(date: Date = new Date()): Promise<SpectrumFilingRecord[]> {
  return circuitBreaker.execute(async () => {
    const apiKey = ecfsApiKey();
    if (!apiKey) {
      logger.info('[SpectrumFilings] No FCC_API_KEY / CONGRESS_GOV_API_KEY — ECFS feed skipped (one free key from https://api.congress.gov/sign-up/ serves both)');
      return [];
    }
    const term = pickSearchTerm(date);
    const params = new URLSearchParams({
      q: term,
      sort: 'date_disseminated,DESC',
      limit: String(PAGE_LIMIT),
      api_key: apiKey,
    });

    const response = await fetch(`${ECFS_FILINGS_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`FCC ECFS API returned ${response.status} for term "${term}"`);
    }

    const data = await response.json();
    // ECFS returns the array under `filing` (singular). Reading `filings`
    // meant this fetcher stored nothing even when the request succeeded;
    // the plural is kept as a fallback in case the endpoint ever changes back.
    const rawFilings: RawECFSFiling[] = data.filing || data.filings || [];

    const mapped = rawFilings.map((f) => mapECFSFiling(f, term));
    const relevant = mapped.filter(isSpectrumRelevant);
    const unique = dedupeByFilingId(relevant);

    logger.info('[SpectrumFilings] Fetched ECFS filings', {
      term,
      rawCount: rawFilings.length,
      relevantCount: unique.length,
    });

    return unique;
  }, []);
}

/**
 * Fetch and persist recent spectrum filings into DynamicContent
 * (module='spectrum', section='recent-filings'). Fail-silent: logs and
 * returns 0 on any error rather than throwing, so callers (cron / refresh
 * route) never fail the wider batch because of this feed.
 */
export async function fetchAndStoreSpectrumFilings(): Promise<number> {
  try {
    const filings = await fetchSpectrumFilings();
    if (filings.length === 0) {
      logger.info('[SpectrumFilings] No new filings to store');
      return 0;
    }

    const items = filings.map((f) => ({
      contentKey: `spectrum:recent-filing:${f.filingId}`,
      section: 'recent-filings',
      data: { ...f, fetchedAt: new Date().toISOString() },
    }));

    const stored = await bulkUpsertContent('spectrum', items, {
      sourceType: 'api',
      sourceUrl: ECFS_FILINGS_URL,
    });

    logger.info('[SpectrumFilings] Stored recent filings', { stored });
    return stored;
  } catch (error) {
    logger.error('[SpectrumFilings] Failed to fetch/store filings', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
