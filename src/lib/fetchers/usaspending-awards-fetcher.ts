/**
 * USAspending.gov prime federal awards, wired into FederalAward.
 *
 * WHY THIS EXISTS
 * ---------------
 * For a space company, who wins federal money, from which agency, and how that
 * is trending is the core of its business. Nobody packages it
 * space-specifically. USAspending publishes every prime award the US
 * government makes - contract, delivery order, grant - with the obligated
 * dollars on it, machine-readable, free, no key, no quota. That is the single
 * largest data gap the Research tier had.
 *
 * TERMS
 * -----
 * USAspending.gov is a US Treasury system. Its data are US government work in
 * the public domain and its API is published for programmatic access with no
 * registration. There is no published hard rate limit; we declare a real
 * User-Agent with a contact address and pace at roughly one request a second,
 * the same courtesy sec-form-d-fetcher.ts extends to SEC.
 *
 * WHAT WE REFUSE TO DO
 * --------------------
 * - No fuzzy matching. See src/lib/gov-awards/match.ts: three accept outcomes,
 *   an ambiguity guard, and a refusal to search on a name too generic to carry
 *   a prefix match. A wrong award attributed to a company is a number an
 *   investor acts on; a missing one is a coverage limit we print.
 * - No estimates. "Award Amount" is what the government reports as obligated
 *   on the award. We never scale it, annualize it, or fill a null with a
 *   guess.
 * - No double counting. An IDV's reported amount is the sum of the orders
 *   placed under it, and those orders are stored as their own rows, so IDV
 *   rows are written with countsTowardTotals=false and every dollar figure the
 *   product publishes excludes them.
 * - Nothing here calls a model. Every field is a parse of a cited record.
 *
 * FAILURE IS LOUD
 * ---------------
 * Every non-OK response bumps httpErrors and is recorded. finishRun marks a
 * run that wrote nothing while collecting HTTP errors as NOT ok, which is what
 * the funding-feeds-alive check in src/lib/content-accuracy.ts reads. Two FCC
 * fetchers sat dead for weeks in September 2026 behind a swallowed 403; the
 * only symptom was an empty tab. That cannot happen here silently.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import {
  recordProvenance,
  startRun,
  finishRun,
  resumeCursor,
} from '@/lib/funding/provenance';
import {
  isSearchableCompanyName,
  normalizeUei,
  resolveRecipient,
  type AwardMatch,
  type CompanyForMatching,
} from '@/lib/gov-awards/match';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stable key in DataSourceRun.source and in the freshness check. */
export const USASPENDING_SOURCE_KEY = 'usaspending-awards';

/** Human-readable publisher, recorded on every row and provenance record. */
export const USASPENDING_SOURCE_LABEL = 'USAspending.gov';

const SEARCH_ENDPOINT = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';

/** Public award page. The URL a buyer opens to check one of our rows. */
export function awardUrl(generatedInternalId: string): string {
  return `https://www.usaspending.gov/award/${encodeURIComponent(generatedInternalId)}`;
}

/**
 * A real contact address, overridable so a fork does not impersonate us.
 * USAspending asks for nothing, but an anonymous scraper is how a free public
 * API stops being free and public.
 */
const USER_AGENT =
  process.env.USASPENDING_USER_AGENT || 'SpaceNexus (research data pipeline; info@spacenexus.us)';

/** ~1 request/second. Deliberately unhurried against a free public service. */
const MIN_REQUEST_GAP_MS = 900;

/**
 * The earliest date the award-search endpoint accepts. Stated by the API
 * itself in every response's `messages` array. Older awards exist but only
 * through the bulk-download endpoints, so this is the honest floor of what
 * this pipeline can see and the product must not imply more.
 */
export const USASPENDING_SEARCH_FLOOR = '2007-10-01';

/**
 * Default earliest award date we ask for: the start of federal FY2019.
 *
 * Not the API floor, on purpose. The releases compute over recent quarters and
 * a trailing-twelve-month window, and pulling eighteen years of every megaprime
 * on the roster would spend thousands of requests on awards no edition reads.
 * Widen it with `since` for a deliberate backfill.
 */
export const DEFAULT_SINCE = '2018-10-01';

/**
 * Pages of 100 per company per award group. A megaprime (Boeing, L3Harris)
 * has far more federal awards than this; results are sorted by obligated
 * amount descending, so what we keep is the LARGEST awards, and the company's
 * coverage row is flagged `truncated` so every total computed for it is
 * published as a floor rather than a number.
 */
const MAX_PAGES_PER_QUERY = 15;
const PAGE_SIZE = 100;

/**
 * How long a "searched, nothing attributable" answer is trusted before we ask
 * again. Roughly half the roster is non-US and holds no US prime award at all.
 */
export const COVERAGE_TTL_DAYS = 30;

/** How many refused recipient names we keep per company, for the audit trail. */
const MAX_REJECTED_SAMPLES = 25;

const DAY_MS = 86_400_000;

const circuitBreaker = createCircuitBreaker(USASPENDING_SOURCE_KEY, {
  failureThreshold: 5,
  resetTimeout: 300_000,
});

// ---------------------------------------------------------------------------
// The three award shapes USAspending exposes, and the fields each accepts
// ---------------------------------------------------------------------------

export type AwardGroup = 'contract' | 'idv' | 'assistance';

interface AwardGroupSpec {
  group: AwardGroup;
  /** USAspending award_type_codes. */
  typeCodes: string[];
  /** Field names valid for this group's mapping. Wrong ones are a 400. */
  fields: string[];
  /** Which returned field carries the human award type. */
  typeField: string;
  /**
   * Whether rows from this group contribute to published dollar totals. False
   * for IDVs: their amount is the sum of orders we also store individually.
   */
  countsTowardTotals: boolean;
}

const COMMON_FIELDS = [
  'Award ID',
  'Recipient Name',
  'Recipient UEI',
  'recipient_id',
  'Award Amount',
  'Total Outlays',
  'Description',
  'Awarding Agency',
  'Awarding Sub Agency',
  'Base Obligation Date',
  'Start Date',
  'naics_code',
  'naics_description',
  'psc_code',
  'psc_description',
  'cfda_number',
  'cfda_program_title',
  'generated_internal_id',
];

export const AWARD_GROUPS: readonly AwardGroupSpec[] = [
  {
    group: 'contract',
    typeCodes: ['A', 'B', 'C', 'D'],
    fields: [...COMMON_FIELDS, 'End Date', 'Contract Award Type'],
    typeField: 'Contract Award Type',
    countsTowardTotals: true,
  },
  {
    group: 'idv',
    // Indefinite-delivery vehicles. Stored for the vehicle intelligence they
    // carry, never counted toward dollars. Note: the IDV mapping exposes no
    // "End Date" - it has "Last Date to Order" instead - so it is omitted.
    typeCodes: ['IDV_A', 'IDV_B', 'IDV_B_A', 'IDV_B_B', 'IDV_B_C', 'IDV_C', 'IDV_D', 'IDV_E'],
    fields: [...COMMON_FIELDS, 'Last Date to Order', 'Contract Award Type'],
    typeField: 'Contract Award Type',
    countsTowardTotals: false,
  },
  {
    group: 'assistance',
    // Grants and cooperative agreements. NASA research awards land here, and
    // for an early-stage space company they are often the whole federal story.
    typeCodes: ['02', '03', '04', '05'],
    fields: [...COMMON_FIELDS, 'End Date', 'Award Type'],
    typeField: 'Award Type',
    countsTowardTotals: true,
  },
];

// ---------------------------------------------------------------------------
// Rate-limited fetch with honest error accounting
// ---------------------------------------------------------------------------

let lastRequestAt = 0;

export interface FetchStats {
  requests: number;
  httpErrors: number;
  lastError: string | null;
}

export function newFetchStats(): FetchStats {
  return { requests: 0, httpErrors: 0, lastError: null };
}

async function pace(): Promise<void> {
  const wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

/** One raw USAspending search POST. Returns parsed JSON or null. */
async function searchPost(body: unknown, stats: FetchStats): Promise<unknown | null> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await pace();
    stats.requests++;
    try {
      const res = await fetch(SEARCH_ENDPOINT, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      });
      if (res.ok) return (await res.json()) as unknown;
      lastStatus = res.status;
      if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1200 * attempt));
        continue;
      }
      // A 400 usually means a field name this group's mapping does not accept.
      // It is our bug, not a data answer, so it counts as an error.
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      stats.httpErrors++;
      stats.lastError = `HTTP ${res.status} ${detail}`;
      logger.warn('USAspending search failed', { status: res.status, detail, attempt });
      return null;
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1200 * attempt));
        continue;
      }
      stats.httpErrors++;
      stats.lastError = err instanceof Error ? err.message : String(err);
      logger.warn('USAspending search threw', { error: stats.lastError });
      return null;
    }
  }
  stats.httpErrors++;
  stats.lastError = `HTTP ${lastStatus} after ${MAX_ATTEMPTS} attempts`;
  return null;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** One award record, normalized out of USAspending's display-name field set. */
export interface AwardRecord {
  generatedInternalId: string;
  awardIdPiid: string;
  awardGroup: AwardGroup;
  awardType: string | null;
  countsTowardTotals: boolean;
  recipientName: string;
  recipientUei: string | null;
  recipientInternalId: string | null;
  amount: number | null;
  totalOutlays: number | null;
  awardingAgency: string;
  awardingSubAgency: string | null;
  agencySlug: string | null;
  actionDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  naicsCode: string | null;
  naicsDescription: string | null;
  pscCode: string | null;
  pscDescription: string | null;
  cfdaNumber: string | null;
  cfdaProgramTitle: string | null;
  description: string | null;
  sourceUrl: string;
}

function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** YYYY-MM-DD -> UTC midnight Date. Anything else is null, never "today". */
function day(value: unknown): Date | null {
  const s = str(value);
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The government's own assistance-listing title for a grant.
 *
 * Grants and cooperative agreements carry NO product/service code, so the
 * space classification for them rests entirely on this title
 * ("SPACE TECHNOLOGY", "SPACE OPERATIONS"). USAspending returns it two ways
 * depending on the field set - a flat `cfda_program_title`, or an
 * `Assistance Listings` array of {cfda_number, cfda_program_title} - so both
 * are read and the first title found wins.
 */
export function cfdaTitleOf(raw: Record<string, unknown>): string | null {
  const flat = str(raw['cfda_program_title']);
  if (flat) return flat;
  const listings = raw['Assistance Listings'];
  if (Array.isArray(listings)) {
    for (const entry of listings) {
      if (entry && typeof entry === 'object') {
        const title = str((entry as Record<string, unknown>)['cfda_program_title']);
        if (title) return title;
      }
    }
  }
  return null;
}

/**
 * Turn one raw search result into an AwardRecord. Returns null when the record
 * lacks the two things every stored row must have: a stable id (which is also
 * its source URL) and a named recipient.
 */
export function parseAwardResult(
  raw: Record<string, unknown>,
  spec: AwardGroupSpec
): AwardRecord | null {
  const generatedInternalId = str(raw['generated_internal_id']);
  const recipientName = str(raw['Recipient Name']);
  if (!generatedInternalId || !recipientName) return null;

  return {
    generatedInternalId,
    awardIdPiid: str(raw['Award ID']) ?? generatedInternalId,
    awardGroup: spec.group,
    awardType: str(raw[spec.typeField]),
    countsTowardTotals: spec.countsTowardTotals,
    recipientName,
    recipientUei: str(raw['Recipient UEI']),
    recipientInternalId: str(raw['recipient_id']),
    amount: num(raw['Award Amount']),
    totalOutlays: num(raw['Total Outlays']),
    awardingAgency: str(raw['Awarding Agency']) ?? 'Unattributed agency',
    awardingSubAgency: str(raw['Awarding Sub Agency']),
    agencySlug: str(raw['agency_slug']),
    actionDate: day(raw['Base Obligation Date']) ?? day(raw['Start Date']),
    startDate: day(raw['Start Date']),
    endDate: day(raw['End Date']) ?? day(raw['Last Date to Order']),
    naicsCode: str(raw['naics_code']),
    naicsDescription: str(raw['naics_description']),
    pscCode: str(raw['psc_code']),
    pscDescription: str(raw['psc_description']),
    cfdaNumber: str(raw['cfda_number']),
    cfdaProgramTitle: cfdaTitleOf(raw),
    description: str(raw['Description']),
    sourceUrl: awardUrl(generatedInternalId),
  };
}

interface SearchPage {
  results: Record<string, unknown>[];
  hasNext: boolean;
}

function readSearchPage(payload: unknown): SearchPage {
  const obj = (payload ?? {}) as { results?: unknown; page_metadata?: { hasNext?: unknown } };
  const results = Array.isArray(obj.results)
    ? (obj.results.filter((r) => r && typeof r === 'object') as Record<string, unknown>[])
    : [];
  return { results, hasNext: obj.page_metadata?.hasNext === true };
}

/**
 * Every award USAspending returns for one search term inside one group.
 *
 * `truncated` is true when the page cap stopped us while the API still had
 * more. The caller propagates it onto the company's coverage row.
 */
export async function searchAwardsForTerm(
  term: string,
  spec: AwardGroupSpec,
  since: string,
  until: string,
  stats: FetchStats
): Promise<{ awards: AwardRecord[]; truncated: boolean }> {
  const awards: AwardRecord[] = [];
  let truncated = false;

  for (let page = 1; page <= MAX_PAGES_PER_QUERY; page++) {
    const payload = await searchPost(
      {
        filters: {
          recipient_search_text: [term],
          award_type_codes: spec.typeCodes,
          time_period: [{ start_date: since, end_date: until }],
        },
        fields: spec.fields,
        page,
        limit: PAGE_SIZE,
        sort: 'Award Amount',
        order: 'desc',
        subawards: false,
      },
      stats
    );
    if (payload === null) break;

    const { results, hasNext } = readSearchPage(payload);
    for (const row of results) {
      const parsed = parseAwardResult(row, spec);
      if (parsed) awards.push(parsed);
    }
    if (!hasNext) break;
    if (page === MAX_PAGES_PER_QUERY) truncated = true;
  }

  return { awards, truncated };
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

export interface AwardSyncOptions {
  /** Companies per run. The cursor makes the roster come round over laps. */
  limit?: number;
  /** Ignore the stored cursor and start from the top of the roster. */
  restart?: boolean;
  /** Parse and report, write nothing. */
  dryRun?: boolean;
  /** Earliest award date to ask for. Defaults to DEFAULT_SINCE. */
  since?: string;
  /** Restrict to these CompanyProfile slugs (debugging a single company). */
  slugs?: string[];
  /** Re-search companies whose coverage row is still inside the TTL. */
  force?: boolean;
}

export interface AwardSyncResult {
  companiesConsidered: number;
  companiesSearched: number;
  companiesSkippedFresh: number;
  companiesSkippedGenericName: number;
  companiesWithAwards: number;
  recipientsSeen: number;
  recipientsRejected: number;
  awardsWritten: number;
  dollarsWritten: number;
  truncatedCompanies: string[];
  httpErrors: number;
  cursor: string | null;
  complete: boolean;
}

/** The roster, loaded once per run so ambiguity across companies is visible. */
async function loadRoster(): Promise<CompanyForMatching[]> {
  return prisma.companyProfile.findMany({
    select: { id: true, slug: true, name: true, legalName: true, samUei: true },
    orderBy: { slug: 'asc' },
  });
}

/** The search terms worth spending a request on for one company. */
export function searchTermsFor(company: CompanyForMatching): string[] {
  const terms: string[] = [];
  const uei = normalizeUei(company.samUei);
  // A UEI is an identity: it finds the company's awards under every spelling
  // the government has ever used for it, including arms our name rule refuses.
  if (uei) terms.push(uei);
  for (const name of [company.name, company.legalName ?? '']) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    if (!isSearchableCompanyName(trimmed)) continue;
    if (terms.some((t) => t.toLowerCase() === trimmed.toLowerCase())) continue;
    terms.push(trimmed);
  }
  return terms;
}

/**
 * The full sweep: for each company on the roster, search USAspending, match
 * every recipient the search returns against the WHOLE roster, and write the
 * awards we can attribute.
 *
 * Resumable by CompanyProfile.slug (the cursor lives in DataSourceRun), so a
 * run killed at company 140 of 331 restarts at 141 rather than re-asking the
 * API about the first 140.
 */
export async function syncFederalAwards(opts: AwardSyncOptions = {}): Promise<AwardSyncResult> {
  const stats = newFetchStats();
  const result: AwardSyncResult = {
    companiesConsidered: 0,
    companiesSearched: 0,
    companiesSkippedFresh: 0,
    companiesSkippedGenericName: 0,
    companiesWithAwards: 0,
    recipientsSeen: 0,
    recipientsRejected: 0,
    awardsWritten: 0,
    dollarsWritten: 0,
    truncatedCompanies: [],
    httpErrors: 0,
    cursor: null,
    complete: false,
  };

  const since = opts.since ?? DEFAULT_SINCE;
  const until = new Date().toISOString().slice(0, 10);
  const windowStart = new Date(`${since}T00:00:00.000Z`);
  const cursor = opts.restart ? null : await resumeCursor(USASPENDING_SOURCE_KEY);
  const runId = await startRun(USASPENDING_SOURCE_KEY, cursor);
  let fatal: unknown = null;

  try {
    await circuitBreaker.execute(async () => {
      const roster = await loadRoster();
      const slice = roster.filter(
        (c) =>
          (!opts.slugs?.length || opts.slugs.includes(c.slug)) &&
          (!cursor || c.slug > cursor)
      );
      const take = opts.limit ?? 25;
      const batch = slice.slice(0, take);

      if (batch.length === 0) {
        result.complete = true;
        return;
      }

      for (const company of batch) {
        result.companiesConsidered++;
        result.cursor = company.slug;

        // Already answered recently?
        if (!opts.force) {
          const coverage = await prisma.federalAwardCoverage.findUnique({
            where: { companyId: company.id },
            select: { searchedAt: true, windowStart: true },
          });
          if (
            coverage &&
            coverage.windowStart.getTime() <= windowStart.getTime() &&
            Date.now() - coverage.searchedAt.getTime() < COVERAGE_TTL_DAYS * DAY_MS
          ) {
            result.companiesSkippedFresh++;
            continue;
          }
        }

        const terms = searchTermsFor(company);
        if (terms.length === 0) {
          result.companiesSkippedGenericName++;
          if (!opts.dryRun) {
            await upsertCoverage(company, {
              status: 'skipped-generic',
              windowStart,
              recipientsSeen: 0,
              recipientsMatched: 0,
              recipientsRejected: 0,
              awardsStored: 0,
              truncated: false,
              rejectedRecipients: [],
              lastError: null,
            });
          }
          continue;
        }

        const seen = new Map<string, AwardRecord>();
        let truncated = false;
        const errorsBefore = stats.httpErrors;

        for (const spec of AWARD_GROUPS) {
          for (const term of terms) {
            const page = await searchAwardsForTerm(term, spec, since, until, stats);
            if (page.truncated) truncated = true;
            for (const award of page.awards) {
              // The same award can come back under the UEI term and the name
              // term. Keyed on the stable id, so it is stored once.
              if (!seen.has(award.generatedInternalId)) seen.set(award.generatedInternalId, award);
            }
          }
        }

        result.companiesSearched++;
        if (truncated) result.truncatedCompanies.push(company.slug);

        // Match every recipient the search returned against the WHOLE roster:
        // a search for "Planet Labs" also returns near-namesakes, and the
        // ambiguity guard can only fire when it can see every company.
        const matchCache = new Map<string, AwardMatch | null>();
        const rejected: string[] = [];
        let matchedCount = 0;
        let rejectedCount = 0;
        let written = 0;
        let dollars = 0;
        const observedAt = new Date();

        for (const award of seen.values()) {
          const key = `${normalizeUei(award.recipientUei)}|${award.recipientName.toLowerCase()}`;
          let match = matchCache.get(key);
          if (match === undefined) {
            match = resolveRecipient(
              { recipientName: award.recipientName, recipientUei: award.recipientUei },
              roster
            );
            matchCache.set(key, match);
            if (match) matchedCount++;
            else {
              rejectedCount++;
              if (rejected.length < MAX_REJECTED_SAMPLES) rejected.push(award.recipientName);
            }
          }
          // An award that matched a DIFFERENT roster company (a near-namesake
          // the search dragged in) is left for that company's own sweep, so
          // the coverage row for this company counts only its own awards.
          if (!match || match.companyId !== company.id) continue;

          if (!opts.dryRun) {
            await writeAward(award, match, observedAt);
          }
          written++;
          if (award.countsTowardTotals && typeof award.amount === 'number') {
            dollars += award.amount;
          }
        }

        result.recipientsSeen += matchCache.size;
        result.recipientsRejected += rejectedCount;
        result.awardsWritten += written;
        result.dollarsWritten += dollars;
        if (written > 0) result.companiesWithAwards++;

        if (!opts.dryRun) {
          await upsertCoverage(company, {
            status: 'searched',
            windowStart,
            recipientsSeen: matchCache.size,
            recipientsMatched: matchedCount,
            recipientsRejected: rejectedCount,
            awardsStored: written,
            truncated,
            rejectedRecipients: rejected,
            lastError: stats.httpErrors > errorsBefore ? stats.lastError : null,
          });
        }
      }

      if (batch.length < take) result.complete = true;
    }, undefined);
  } catch (err) {
    fatal = err;
    logger.error('USAspending award sync failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    result.httpErrors = stats.httpErrors;
    await finishRun(
      runId,
      {
        itemsSeen: result.recipientsSeen,
        itemsWritten: result.awardsWritten,
        httpErrors: stats.httpErrors,
        cursor: result.cursor,
        complete: result.complete,
        detail: {
          companiesConsidered: result.companiesConsidered,
          companiesSearched: result.companiesSearched,
          companiesSkippedFresh: result.companiesSkippedFresh,
          companiesSkippedGenericName: result.companiesSkippedGenericName,
          companiesWithAwards: result.companiesWithAwards,
          recipientsRejected: result.recipientsRejected,
          dollarsWritten: Math.round(result.dollarsWritten),
          truncatedCompanies: result.truncatedCompanies.slice(0, 50),
          requests: stats.requests,
          since,
          lastError: stats.lastError,
          dryRun: Boolean(opts.dryRun),
        },
      },
      fatal
    );
  }

  return result;
}

interface CoverageWrite {
  status: string;
  windowStart: Date;
  recipientsSeen: number;
  recipientsMatched: number;
  recipientsRejected: number;
  awardsStored: number;
  truncated: boolean;
  rejectedRecipients: string[];
  lastError: string | null;
}

async function upsertCoverage(company: CompanyForMatching, w: CoverageWrite): Promise<void> {
  const data = {
    companySlug: company.slug,
    companyName: company.name,
    status: w.status,
    searchedAt: new Date(),
    windowStart: w.windowStart,
    recipientsSeen: w.recipientsSeen,
    recipientsMatched: w.recipientsMatched,
    recipientsRejected: w.recipientsRejected,
    awardsStored: w.awardsStored,
    truncated: w.truncated,
    rejectedRecipients: w.rejectedRecipients as unknown as object,
    lastError: w.lastError,
  };
  await prisma.federalAwardCoverage.upsert({
    where: { companyId: company.id },
    update: data,
    create: { companyId: company.id, ...data },
  });
}

/**
 * Write one award, and record where its two load-bearing fields came from.
 *
 * Provenance carries the MATCH as well as the money: entity FederalAward,
 * field 'companyId', value {companyId, matchedName, quality, recipientName}.
 * A wrong attribution is the one mistake that would put another company's
 * federal revenue on our page, so an auditor must be able to re-check it
 * without re-running the resolver against the live API.
 */
async function writeAward(
  award: AwardRecord,
  match: AwardMatch,
  observedAt: Date
): Promise<void> {
  const row = {
    awardIdPiid: award.awardIdPiid,
    awardGroup: award.awardGroup,
    awardType: award.awardType,
    countsTowardTotals: award.countsTowardTotals,
    recipientName: award.recipientName,
    recipientUei: award.recipientUei,
    recipientInternalId: award.recipientInternalId,
    companyId: match.companyId,
    companySlug: match.companySlug,
    matchQuality: match.quality,
    matchedName: match.matchedName,
    amount: award.amount,
    totalOutlays: award.totalOutlays,
    awardingAgency: award.awardingAgency,
    awardingSubAgency: award.awardingSubAgency,
    agencySlug: award.agencySlug,
    actionDate: award.actionDate,
    startDate: award.startDate,
    endDate: award.endDate,
    naicsCode: award.naicsCode,
    naicsDescription: award.naicsDescription,
    pscCode: award.pscCode,
    pscDescription: award.pscDescription,
    cfdaNumber: award.cfdaNumber,
    cfdaProgramTitle: award.cfdaProgramTitle,
    description: award.description,
    sourceUrl: award.sourceUrl,
    source: USASPENDING_SOURCE_LABEL,
    observedAt,
  };

  const saved = await prisma.federalAward.upsert({
    where: { generatedInternalId: award.generatedInternalId },
    update: row,
    create: { generatedInternalId: award.generatedInternalId, ...row },
    select: { id: true },
  });

  const base = {
    source: USASPENDING_SOURCE_LABEL,
    sourceUrl: award.sourceUrl,
    sourceRef: award.awardIdPiid,
    method: 'official-filing' as const,
    observedAt: award.actionDate ?? observedAt,
  };

  await recordProvenance({
    entity: 'FederalAward',
    entityId: saved.id,
    field: 'amount',
    value: award.amount,
    ...base,
  });
  await recordProvenance({
    entity: 'FederalAward',
    entityId: saved.id,
    field: 'companyId',
    value: {
      companyId: match.companyId,
      companySlug: match.companySlug,
      matchedName: match.matchedName,
      quality: match.quality,
      recipientName: award.recipientName,
      recipientUei: award.recipientUei,
    },
    ...base,
  });
}
