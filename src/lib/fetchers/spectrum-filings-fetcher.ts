/**
 * Spectrum filings fetcher
 *
 * Pulls recent satellite/spectrum-relevant filings from the FCC's public ECFS
 * (Electronic Comment Filing System) API — the same auth-free public endpoint
 * used by src/lib/fetchers/fcc-space-filings-fetcher.ts for the compliance
 * module, reused here with a spectrum-coordination-focused search rotation.
 *
 * API docs: https://publicapi.fcc.gov/ecfs/filings (no API key required)
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

export interface RawECFSFiling {
  id_submission?: string;
  confirmation_number?: string;
  short_comment?: string;
  text_data?: string;
  proceedings?: Array<{ name?: string; id?: string }>;
  date_disseminated?: string;
  date_submission?: string;
  filers?: Array<{ name?: string }>;
  type_of_filing?: string;
  bureau?: { name?: string };
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
  const proceedingName = raw.proceedings?.[0]?.name || '';
  const docket = raw.proceedings?.[0]?.id || '';

  return {
    filingId,
    title:
      raw.short_comment?.trim() ||
      (raw.text_data ? raw.text_data.substring(0, 200).trim() : `FCC ECFS filing: ${searchTerm}`),
    docket,
    proceedingName,
    filer: raw.filers?.[0]?.name || 'Unknown filer',
    filingType: raw.type_of_filing || 'filing',
    bureau: raw.bureau?.name || 'Space Bureau',
    filedDate: raw.date_disseminated || raw.date_submission || null,
    url: filingId
      ? `https://www.fcc.gov/ecfs/document/${filingId}`
      : `https://www.fcc.gov/ecfs/search/filings?q=${encodeURIComponent(searchTerm)}`,
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
    const term = pickSearchTerm(date);
    const params = new URLSearchParams({
      q: term,
      sort: 'date_disseminated,DESC',
      limit: String(PAGE_LIMIT),
    });

    const response = await fetch(`${ECFS_FILINGS_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`FCC ECFS API returned ${response.status} for term "${term}"`);
    }

    const data = await response.json();
    const rawFilings: RawECFSFiling[] = data.filings || [];

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
