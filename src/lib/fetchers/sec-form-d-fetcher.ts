/**
 * SEC EDGAR Form D - the canonical, free, official record of US private
 * placements, wired into FundingRound.
 *
 * WHY THIS EXISTS
 * On 2026-09-14 the funding table held 362 rows, only 125 of them inside the
 * last 18 months and only 136 of them carrying a source URL at all. A
 * research product whose flagship promise is full-history export cannot ship
 * on press-release scrapings. Form D is the one source that is free, official,
 * machine-readable, and complete: every US issuer selling securities under
 * Reg D must file one within 15 days of first sale, and the filing states the
 * total amount actually sold. Nothing is estimated and nothing is inferred.
 *
 * TERMS
 * EDGAR data is US government work in the public domain and is published for
 * bulk programmatic access. SEC's "Accessing EDGAR Data" fair-access policy
 * asks for (a) a declared User-Agent naming the requester with a contact
 * address and (b) no more than 10 requests/second. Both are enforced here:
 * see SEC_USER_AGENT and MIN_REQUEST_GAP_MS. No credential, key or paid plan
 * is required or used.
 *
 * WHAT WE REFUSE TO DO
 * - Form D does not name the round ("Series B"). We leave `seriesLabel` NULL
 *   rather than guess one from the amount or the sequence.
 * - Form D does not name investors. We leave `leadInvestor` NULL. The
 *   related-persons list names officers and directors, not investors, and is
 *   used only for KeyPersonnel.
 * - When a filing reports nothing sold, no row is written. When an amount is
 *   genuinely indefinite, `amountUndisclosed` is set and `amount` stays NULL.
 * - Nothing here calls a model. Every field is a parse of a cited document.
 *
 * DOUBLE-COUNTING
 * A company usually has BOTH a press-reported round and its Form D for the
 * same money. Importing both would inflate the count dishonestly, so a Form D
 * that lands near an existing row (see FORM_D_MATCH_WINDOW_DAYS) ENRICHES that
 * row - stamping the official source URL, the accession number and
 * verifiedAt - instead of creating a second one.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import {
  recordProvenance,
  startRun,
  finishRun,
  resumeCursor,
  type ProvenanceRecord,
} from '@/lib/funding/provenance';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stable key used in DataSourceRun.source and the freshness check. */
export const FORM_D_SOURCE_KEY = 'sec-form-d';

/** Human-readable publisher recorded on every row and provenance record. */
export const FORM_D_SOURCE_LABEL = 'SEC EDGAR Form D';

/**
 * SEC fair access requires a User-Agent identifying the requester with a real
 * contact address. Overridable so a fork does not impersonate us.
 */
const SEC_USER_AGENT = process.env.SEC_EDGAR_USER_AGENT || 'SpaceNexus info@spacenexus.us';

/**
 * SEC allows 10 req/s. We pace at ~7/s, which leaves headroom for the rest of
 * the platform's EDGAR traffic (sec-edgar-fetcher.ts shares the quota).
 */
const MIN_REQUEST_GAP_MS = 140;

/**
 * Form D became a mandatory electronic filing in March 2009; paper filings
 * before then are not in the structured corpus. This is the honest floor of
 * how far back the backfill can reach, and the product must not imply more.
 */
export const FORM_D_ELECTRONIC_SINCE = '2009-03-16';

/**
 * A Form D within this many days of an existing FundingRound for the same
 * company is treated as the SAME raise (the press announcement and the filing
 * rarely land on the same day; 2-3 months is normal). Widening this merges
 * distinct rounds; narrowing it double-counts. See also the amount-ratio gate.
 */
const FORM_D_MATCH_WINDOW_DAYS = 120;

/**
 * Two rows only merge when their amounts are within this ratio of each other,
 * so a $5M seed and a $50M Series A eleven weeks apart stay separate even
 * though their dates are inside the window.
 */
const FORM_D_MATCH_AMOUNT_RATIO = 1.67;

const DAY_MS = 86_400_000;

/** Provenance source string used for both hits and misses on CIK lookup. */
const CIK_SEARCH_SOURCE = 'SEC EDGAR company search';

/**
 * How long a "no such filer" answer is trusted before we ask EDGAR again.
 * Roughly 40% of the roster is non-US and will never file a Form D; without
 * remembering the miss, each of them costs three EDGAR requests on every lap
 * of the nightly sweep, forever. A recorded miss is a real observation ("we
 * searched on this date and EDGAR had no matching filer"), so it lives in
 * DataProvenance with the rest of the audit trail rather than in a cache.
 */
const CIK_MISS_TTL_DAYS = 45;

const circuitBreaker = createCircuitBreaker(FORM_D_SOURCE_KEY, {
  failureThreshold: 5,
  resetTimeout: 300_000,
});

// ---------------------------------------------------------------------------
// Rate-limited fetch with honest error accounting
// ---------------------------------------------------------------------------

let lastRequestAt = 0;

/** Counters a caller threads through a run so nothing fails silently. */
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

/**
 * Statuses SEC returns when it is throttling rather than refusing. Worth one
 * backoff-and-retry; anything else is a real failure and is recorded as one.
 */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

/**
 * One EDGAR request. Returns null on any non-OK response, but ALWAYS bumps
 * `stats.httpErrors` and records the status first - the failure mode that hid
 * two dead FCC fetchers for weeks was a 403 that left no trace anywhere.
 *
 * Throttle responses are retried with a widening pause (SEC answers 503 under
 * load far more often than it answers 403), and only counted as an error once
 * every attempt has been spent.
 */
async function secFetch(url: string, stats: FetchStats): Promise<string | null> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await pace();
    stats.requests++;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': SEC_USER_AGENT,
          // No explicit Accept-Encoding: node's fetch negotiates compression
          // on its own, and sending "gzip, deflate" by hand makes
          // efts.sec.gov answer 500 for a good fraction of queries.
          Accept: 'application/json, text/xml, */*',
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) return await res.text();
      lastStatus = res.status;
      // A 404 on a submissions file means "this CIK has no such document",
      // which is data, not breakage. It never counts against the feed.
      if (res.status === 404) return null;
      if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 750 * attempt));
        continue;
      }
      stats.httpErrors++;
      stats.lastError = `HTTP ${res.status} ${url}`;
      logger.warn('SEC EDGAR request failed', { status: res.status, url, attempt });
      return null;
    } catch (err) {
      lastStatus = 0;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 750 * attempt));
        continue;
      }
      stats.httpErrors++;
      stats.lastError = `${err instanceof Error ? err.message : String(err)} ${url}`;
      logger.warn('SEC EDGAR request threw', { url, error: stats.lastError });
      return null;
    }
  }
  stats.httpErrors++;
  stats.lastError = `HTTP ${lastStatus} after ${MAX_ATTEMPTS} attempts ${url}`;
  return null;
}

// ---------------------------------------------------------------------------
// Company-name normalization and CIK resolution
// ---------------------------------------------------------------------------

/**
 * Corporate-form suffixes that carry no identity. Deliberately excludes words
 * like "Space", "Aerospace", "Technologies", "Systems", "Labs" - those DO
 * distinguish issuers and stripping them would cause false matches.
 */
const LEGAL_SUFFIXES = new Set([
  'inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'llc', 'lc',
  'ltd', 'limited', 'plc', 'lp', 'llp', 'pbc', 'gmbh', 'ag', 'ab', 'as', 'oy',
  'bv', 'nv', 'sa', 'sas', 'srl', 'spa', 'pty', 'kk', 'pte', 'holdings',
  'holding', 'group', 'the', 'usa', 'us',
]);

/** Industry words that may legitimately follow a company's distinctive name. */
const INDUSTRY_TAIL_WORDS = new Set([
  'space', 'aerospace', 'aeronautics', 'astronautics', 'technologies',
  'technology', 'tech', 'systems', 'system', 'labs', 'laboratories', 'lab',
  'industries', 'industrial', 'orbital', 'orbit', 'satellite', 'satellites',
  'rocket', 'rockets', 'launch', 'dynamics', 'sciences', 'science',
  'engineering', 'robotics', 'propulsion', 'defense', 'defence', 'ventures',
  'international', 'global', 'communications', 'networks', 'operations',
]);

/** Lowercase, drop punctuation and legal suffixes, squeeze whitespace. */
export function normalizeCompanyName(raw: string): string {
  const tokens = raw
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length > 1 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop();
  while (tokens.length > 1 && LEGAL_SUFFIXES.has(tokens[0])) tokens.shift();
  return tokens.join(' ');
}

export type NameMatchQuality = 'exact' | 'industry-tail' | 'none';

/**
 * Decide whether an EDGAR filer name refers to the same company as ours.
 *
 * Precision beats recall here: a wrong CIK attributes another company's
 * fundraising to ours, which is worse than missing the round entirely. So
 * only two outcomes are accepted - an exact normalized match, or our name
 * being a token-boundary prefix of theirs where every extra token is a
 * generic industry word and our own name is long enough to be distinctive.
 *
 * "Astranis" vs "Astranis Space Technologies Corp." -> industry-tail (accept).
 * "Astra" vs "Astra Space Inc" -> none (5 chars, single token: too generic).
 */
export function matchCompanyName(ours: string, theirs: string): NameMatchQuality {
  const a = normalizeCompanyName(ours);
  const b = normalizeCompanyName(theirs);
  if (!a || !b) return 'none';
  if (a === b) return 'exact';
  if (!b.startsWith(a + ' ')) return 'none';
  const aTokens = a.split(' ');
  const distinctive = aTokens.length >= 2 || a.length >= 7;
  if (!distinctive) return 'none';
  const tail = b.slice(a.length + 1).split(' ');
  if (tail.every((t) => INDUSTRY_TAIL_WORDS.has(t))) return 'industry-tail';
  return 'none';
}

/** Pad a CIK to the 10-digit form EDGAR's JSON endpoints expect. */
export function padCik(cik: string | number): string {
  return String(cik).replace(/\D/g, '').padStart(10, '0');
}

interface TickerMapEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

let tickerMapCache: Map<string, { cik: string; title: string }> | null = null;

/**
 * EDGAR's official ticker->CIK map. For any company with a ticker this is an
 * unambiguous identity match, so it is tried before name search.
 */
export async function loadTickerCikMap(stats: FetchStats): Promise<Map<string, { cik: string; title: string }>> {
  if (tickerMapCache) return tickerMapCache;
  const body = await secFetch('https://www.sec.gov/files/company_tickers.json', stats);
  const map = new Map<string, { cik: string; title: string }>();
  if (body) {
    try {
      const parsed = JSON.parse(body) as Record<string, TickerMapEntry>;
      for (const entry of Object.values(parsed)) {
        if (!entry?.ticker) continue;
        map.set(entry.ticker.toUpperCase(), { cik: padCik(entry.cik_str), title: entry.title });
      }
    } catch (err) {
      logger.warn('company_tickers.json parse failed', { error: String(err) });
    }
  }
  tickerMapCache = map;
  return map;
}

/** Reset the in-process ticker cache (tests, long-lived workers). */
export function resetTickerCikCache(): void {
  tickerMapCache = null;
}

export interface CikResolution {
  cik: string;
  edgarName: string;
  via: 'ticker' | 'full-text-search' | 'company-search';
  quality: NameMatchQuality;
}

/** Pull "Name  (CIK 0001234567)" display names out of an EDGAR FTS response. */
export function candidatesFromFullTextSearch(body: string): Array<{ cik: string; edgarName: string }> {
  const out: Array<{ cik: string; edgarName: string }> = [];
  let parsed: { hits?: { hits?: Array<{ _source?: { display_names?: string[] } }> } };
  try {
    parsed = JSON.parse(body);
  } catch {
    return out;
  }
  for (const hit of parsed.hits?.hits ?? []) {
    for (const display of hit._source?.display_names ?? []) {
      const m = /^(.*?)\s*\(CIK\s*(\d{4,10})\)\s*$/i.exec(display.trim());
      if (!m) continue;
      out.push({ cik: padCik(m[2]), edgarName: m[1].trim() });
    }
  }
  return out;
}

/**
 * Resolve a company to its EDGAR CIK.
 *
 * Three paths, most trustworthy first:
 *   1. the official ticker->CIK map (an identity, not a guess);
 *   2. EDGAR full-text search over Form D documents, which returns real filer
 *      names alongside their CIKs;
 *   3. the legacy company-name browse endpoint, usable ONLY when it returns a
 *      single company - its multi-result Atom feed emits
 *      `title="ARRAY(0x...)"` instead of filer names (a long-standing SEC bug),
 *      so names cannot be checked and a CIK from it cannot be trusted.
 *
 * Returns null rather than a doubtful match. This is the step where a mistake
 * would attribute another company's fundraising to ours, and the SPV clutter
 * around every hot startup ("Gaingels Stoke Space LLC", "PWV Astranis SPV I
 * LLC") makes loose matching actively dangerous.
 */
export async function resolveCik(
  name: string,
  ticker: string | null,
  stats: FetchStats,
): Promise<CikResolution | null> {
  if (ticker) {
    const map = await loadTickerCikMap(stats);
    const hit = map.get(ticker.toUpperCase());
    if (hit) return { cik: hit.cik, edgarName: hit.title, via: 'ticker', quality: 'exact' };
  }

  let best: CikResolution | null = null;
  const consider = (c: { cik: string; edgarName: string }, via: CikResolution['via']): CikResolution | null => {
    const quality = matchCompanyName(name, c.edgarName);
    if (quality === 'none') return null;
    const resolution: CikResolution = { ...c, via, quality };
    if (quality === 'exact') return resolution;
    if (!best) best = resolution;
    return null;
  };

  // EDGAR full-text search, two pages deep: a well-known startup can have
  // more than ten SPVs named after it ranking above its own filings.
  for (const from of [0, 10]) {
    const body = await secFetch(
      'https://efts.sec.gov/LATEST/search-index?q=' +
        encodeURIComponent('"' + name + '"') +
        '&forms=D&from=' +
        from,
      stats,
    );
    if (!body) break;
    const candidates = candidatesFromFullTextSearch(body);
    for (const c of candidates) {
      const exact = consider(c, 'full-text-search');
      if (exact) return exact;
    }
    if (candidates.length === 0) break;
  }
  if (best) return best;

  // Single-company fallback. The company-info block only appears when EDGAR
  // resolved the query to exactly one filer, so the name IS checkable here.
  const xml = await secFetch(
    'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=' +
      encodeURIComponent(name) +
      '&type=D&dateb=&owner=include&count=40&output=atom',
    stats,
  );
  if (!xml) return null;
  const conformed = /<conformed-name>([^<]*)<\/conformed-name>/i.exec(xml);
  const cikTag = /<cik>(\d+)<\/cik>/i.exec(xml);
  if (conformed && cikTag && (xml.match(/<cik>/gi) ?? []).length === 1) {
    const exact = consider({ cik: padCik(cikTag[1]), edgarName: conformed[1] }, 'company-search');
    if (exact) return exact;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Filing index
// ---------------------------------------------------------------------------

export interface FilingRef {
  form: string;
  filingDate: string;
  accessionNumber: string;
  fileNumber: string | null;
  primaryDocument: string | null;
}

export interface SubmissionsSummary {
  cik: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: string | null;
  sicDescription: string | null;
  stateOfIncorporation: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessCountry: string | null;
  filings: FilingRef[];
}

interface SubmissionsPayload {
  cik?: string;
  name?: string;
  tickers?: string[];
  exchanges?: string[];
  sic?: string;
  sicDescription?: string;
  stateOfIncorporation?: string;
  addresses?: {
    business?: {
      city?: string | null;
      stateOrCountry?: string | null;
      stateOrCountryDescription?: string | null;
      isForeignLocation?: number | null;
      countryCode?: string | null;
    };
  };
  filings?: {
    recent?: Record<string, unknown[]>;
    files?: Array<{ name: string }>;
  };
}

function rowsFromRecent(recent: Record<string, unknown[]> | undefined): FilingRef[] {
  if (!recent || !Array.isArray(recent.form)) return [];
  const out: FilingRef[] = [];
  const form = recent.form as string[];
  const filingDate = (recent.filingDate as string[]) ?? [];
  const accession = (recent.accessionNumber as string[]) ?? [];
  const fileNumber = (recent.fileNumber as string[]) ?? [];
  const primaryDocument = (recent.primaryDocument as string[]) ?? [];
  for (let i = 0; i < form.length; i++) {
    out.push({
      form: form[i],
      filingDate: filingDate[i] ?? '',
      accessionNumber: accession[i] ?? '',
      fileNumber: fileNumber[i] || null,
      primaryDocument: primaryDocument[i] || null,
    });
  }
  return out;
}

/**
 * Every filing EDGAR holds for a CIK, including the older shards referenced
 * by `filings.files` (issuers with more than ~1,000 filings page out of the
 * `recent` block, and a 10-K-heavy public company will).
 */
export async function fetchSubmissions(cik: string, stats: FetchStats): Promise<SubmissionsSummary | null> {
  const body = await secFetch(`https://data.sec.gov/submissions/CIK${padCik(cik)}.json`, stats);
  if (!body) return null;
  let parsed: SubmissionsPayload;
  try {
    parsed = JSON.parse(body) as SubmissionsPayload;
  } catch {
    stats.httpErrors++;
    stats.lastError = `submissions JSON parse failed for CIK ${cik}`;
    return null;
  }

  const filings = rowsFromRecent(parsed.filings?.recent);
  for (const shard of parsed.filings?.files ?? []) {
    if (!shard?.name) continue;
    const shardBody = await secFetch(`https://data.sec.gov/submissions/${shard.name}`, stats);
    if (!shardBody) continue;
    try {
      filings.push(...rowsFromRecent(JSON.parse(shardBody) as Record<string, unknown[]>));
    } catch {
      /* a bad shard must not lose the shards that parsed */
    }
  }

  const biz = parsed.addresses?.business;
  return {
    cik: padCik(parsed.cik ?? cik),
    name: parsed.name ?? '',
    tickers: parsed.tickers ?? [],
    exchanges: parsed.exchanges ?? [],
    sic: parsed.sic || null,
    sicDescription: parsed.sicDescription || null,
    stateOfIncorporation: parsed.stateOfIncorporation || null,
    businessCity: biz?.city || null,
    businessState: biz?.stateOrCountry || null,
    businessCountry: biz?.isForeignLocation ? biz?.countryCode || null : 'US',
    filings,
  };
}

/** The archive directory for a filing, e.g. .../data/1715660/000171566021000003 */
export function filingDirUrl(cik: string, accessionNumber: string): string {
  const bare = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${String(Number(padCik(cik)))}/${bare}`;
}

/** The human-readable filing index page - what we cite as sourceUrl. */
export function filingIndexUrl(cik: string, accessionNumber: string): string {
  return `${filingDirUrl(cik, accessionNumber)}/${accessionNumber}-index.htm`;
}

// ---------------------------------------------------------------------------
// Form D parsing
// ---------------------------------------------------------------------------

export interface FormDRelatedPerson {
  name: string;
  relationships: string[];
}

export interface ParsedFormD {
  issuerName: string | null;
  /** Explicit incorporation year, only when the filing states one. */
  yearOfIncorporation: number | null;
  entityType: string | null;
  industryGroup: string | null;
  revenueRange: string | null;
  city: string | null;
  stateOrCountry: string | null;
  isAmendment: boolean;
  /** YYYY-MM-DD, the date of first sale as stated by the issuer. */
  dateOfFirstSale: string | null;
  /** TRUE when the issuer ticked "first sale yet to occur". */
  saleYetToOccur: boolean;
  totalOfferingAmount: number | null;
  totalAmountSold: number | null;
  /** TRUE when the issuer declared the offering size indefinite. */
  indefiniteOffering: boolean;
  securityTypes: string[];
  relatedPersons: FormDRelatedPerson[];
}

function tag(xml: string, name: string): string | null {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(xml);
  return m ? m[1].trim() : null;
}

function tagAll(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

function boolTag(xml: string, name: string): boolean {
  return (tag(xml, name) ?? '').toLowerCase() === 'true';
}

/**
 * Parse the structured XML of a Form D. Every returned field is a literal
 * reading of the document - there is no inference step anywhere in here.
 */
export function parseFormD(xml: string): ParsedFormD {
  const issuerBlock = /<primaryIssuer>[\s\S]*?<\/primaryIssuer>/i.exec(xml)?.[0] ?? '';
  const offeringBlock = /<offeringData>[\s\S]*?<\/offeringData>/i.exec(xml)?.[0] ?? xml;

  const yearValue = /<yearOfInc>[\s\S]*?<value>(\d{4})<\/value>[\s\S]*?<\/yearOfInc>/i.exec(issuerBlock);

  const salesBlock = /<offeringSalesAmounts>[\s\S]*?<\/offeringSalesAmounts>/i.exec(offeringBlock)?.[0] ?? '';
  const rawOffering = tag(salesBlock, 'totalOfferingAmount');
  const rawSold = tag(salesBlock, 'totalAmountSold');
  const indefinite = (rawOffering ?? '').toLowerCase() === 'indefinite';

  const securityTypes: string[] = [];
  const typesBlock = /<typesOfSecuritiesOffered>[\s\S]*?<\/typesOfSecuritiesOffered>/i.exec(offeringBlock)?.[0] ?? '';
  if (boolTag(typesBlock, 'isEquityType')) securityTypes.push('equity');
  if (boolTag(typesBlock, 'isDebtType')) securityTypes.push('debt');
  if (boolTag(typesBlock, 'isOptionToAcquireType')) securityTypes.push('option');
  if (boolTag(typesBlock, 'isSecurityToBeAcquiredType')) securityTypes.push('security-to-be-acquired');
  if (boolTag(typesBlock, 'isPooledInvestmentFundType')) securityTypes.push('pooled-fund');
  if (boolTag(typesBlock, 'isOtherType')) {
    const desc = (tag(typesBlock, 'descriptionOfOtherType') ?? '').toLowerCase();
    if (desc.includes('safe') || desc.includes('convertible')) securityTypes.push('convertible');
    else securityTypes.push('other');
  }

  const relatedPersons: FormDRelatedPerson[] = [];
  for (const block of tagAll(xml, 'relatedPersonInfo')) {
    const first = tag(block, 'firstName') ?? '';
    const middle = tag(block, 'middleName') ?? '';
    const last = tag(block, 'lastName') ?? '';
    const name = [first, middle, last].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (!name) continue;
    relatedPersons.push({ name, relationships: tagAll(block, 'relationship').filter(Boolean) });
  }

  const saleBlock = /<dateOfFirstSale>[\s\S]*?<\/dateOfFirstSale>/i.exec(offeringBlock)?.[0] ?? '';
  const firstSale = /<value>(\d{4}-\d{2}-\d{2})<\/value>/i.exec(saleBlock)?.[1] ?? null;

  return {
    issuerName: tag(issuerBlock, 'entityName'),
    yearOfIncorporation: yearValue ? Number(yearValue[1]) : null,
    entityType: tag(issuerBlock, 'entityType'),
    industryGroup: tag(offeringBlock, 'industryGroupType'),
    revenueRange: tag(offeringBlock, 'revenueRange'),
    city: tag(issuerBlock, 'city'),
    stateOrCountry: tag(issuerBlock, 'stateOrCountry'),
    isAmendment: boolTag(xml, 'isAmendment'),
    dateOfFirstSale: firstSale,
    saleYetToOccur: /<yetToOccur>true<\/yetToOccur>/i.test(saleBlock),
    totalOfferingAmount: rawOffering && /^\d+$/.test(rawOffering) ? Number(rawOffering) : null,
    totalAmountSold: rawSold && /^\d+$/.test(rawSold) ? Number(rawSold) : null,
    indefiniteOffering: indefinite,
    securityTypes,
    relatedPersons,
  };
}

/** Download and parse one Form D filing. */
export async function fetchFormD(
  cik: string,
  accessionNumber: string,
  stats: FetchStats,
): Promise<ParsedFormD | null> {
  const xml = await secFetch(`${filingDirUrl(cik, accessionNumber)}/primary_doc.xml`, stats);
  if (!xml) return null;
  try {
    return parseFormD(xml);
  } catch (err) {
    logger.warn('Form D parse failed', { cik, accessionNumber, error: String(err) });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mapping a Form D onto a FundingRound
// ---------------------------------------------------------------------------

export interface FormDRoundDraft {
  externalId: string;
  date: Date;
  amount: number | null;
  amountUndisclosed: boolean;
  roundType: string | null;
  sourceUrl: string;
  sourceRef: string;
  notes: string;
}

/** Map Form D security types onto FundingRound.roundType, or null if unclear. */
export function roundTypeFor(securityTypes: string[]): string | null {
  if (securityTypes.includes('convertible')) return 'convertible_note';
  if (securityTypes.includes('equity')) return 'equity';
  if (securityTypes.includes('debt')) return 'debt';
  if (securityTypes.includes('option')) return 'equity';
  return null;
}

/**
 * Turn a parsed filing into a candidate row, or null when the filing does not
 * represent money actually raised.
 *
 * Refusals, all deliberate:
 * - nothing sold yet -> not a round;
 * - a pooled investment fund -> a fund's own raise, not an operating company's;
 * - no usable date -> we will not date a round by guesswork.
 */
export function formDToRoundDraft(
  parsed: ParsedFormD,
  cik: string,
  filing: FilingRef,
): FormDRoundDraft | null {
  if (parsed.securityTypes.includes('pooled-fund')) return null;

  const sold = parsed.totalAmountSold;
  if (!parsed.indefiniteOffering && (sold === null || sold <= 0)) return null;
  if (parsed.saleYetToOccur && !sold) return null;

  const dateStr = parsed.dateOfFirstSale || filing.filingDate;
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;

  const offering = parsed.totalOfferingAmount;
  const noteParts = [
    `SEC Form D${parsed.isAmendment ? '/A' : ''} filed ${filing.filingDate}.`,
    sold !== null ? `Total amount sold as filed: $${sold.toLocaleString('en-US')}.` : 'Offering size filed as indefinite.',
  ];
  if (offering !== null && sold !== null && offering !== sold) {
    noteParts.push(`Total offering: $${offering.toLocaleString('en-US')}.`);
  }
  if (parsed.industryGroup) noteParts.push(`Industry group as filed: ${parsed.industryGroup}.`);
  noteParts.push('Round label and investors are not disclosed on Form D and are not inferred here.');

  return {
    externalId: `${FORM_D_SOURCE_KEY}:${filing.accessionNumber}`,
    date,
    amount: sold !== null && sold > 0 ? sold : null,
    amountUndisclosed: sold === null || sold <= 0,
    roundType: roundTypeFor(parsed.securityTypes),
    sourceUrl: filingIndexUrl(cik, filing.accessionNumber),
    sourceRef: filing.accessionNumber,
    notes: noteParts.join(' '),
  };
}

/**
 * Pick one filing per offering. Form D and its later D/A amendments share a
 * file number and describe the SAME money; the newest filing in a group is the
 * most complete statement of it.
 */
export function latestPerOffering(filings: FilingRef[]): FilingRef[] {
  const byGroup = new Map<string, FilingRef>();
  for (const f of filings) {
    if (!f.form || !(f.form === 'D' || f.form === 'D/A')) continue;
    if (!f.accessionNumber) continue;
    const key = f.fileNumber || f.accessionNumber;
    const existing = byGroup.get(key);
    if (!existing || (f.filingDate || '') > (existing.filingDate || '')) byGroup.set(key, f);
  }
  return Array.from(byGroup.values()).sort((a, b) => (a.filingDate < b.filingDate ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

interface ExistingRound {
  id: string;
  date: Date;
  amount: number | null;
  sourceUrl: string | null;
  source: string | null;
  externalId: string | null;
}

/**
 * Does this Form D describe money an existing row already accounts for?
 * Same company, dates inside the window, and amounts of the same order.
 *
 * `consumed` holds the rows already claimed by an earlier filing in this
 * sweep. Without it, a company that filed two tranches eleven weeks apart
 * would see BOTH collapse onto the single press-reported round and the
 * second raise would silently vanish - under-counting, which is the safer
 * failure but still a loss of real history.
 */
export function findOverlappingRound(
  draft: FormDRoundDraft,
  existing: ExistingRound[],
  consumed?: Set<string>,
): ExistingRound | null {
  let best: ExistingRound | null = null;
  let bestGap = Infinity;
  for (const row of existing) {
    if (consumed?.has(row.id)) continue;
    const gapDays = Math.abs(row.date.getTime() - draft.date.getTime()) / DAY_MS;
    if (gapDays > FORM_D_MATCH_WINDOW_DAYS) continue;
    if (row.amount !== null && draft.amount !== null && row.amount > 0 && draft.amount > 0) {
      const ratio = Math.max(row.amount, draft.amount) / Math.min(row.amount, draft.amount);
      if (ratio > FORM_D_MATCH_AMOUNT_RATIO) continue;
    }
    if (gapDays < bestGap) {
      best = row;
      bestGap = gapDays;
    }
  }
  return best;
}

export interface FormDSyncOptions {
  /** Process at most this many companies in one run. */
  limit?: number;
  /** Ignore the stored cursor and start from the beginning. */
  restart?: boolean;
  /** Parse and report, write nothing. */
  dryRun?: boolean;
  /** Skip filings whose first sale predates this ISO date. */
  since?: string;
  /** Restrict to these CompanyProfile slugs (debugging a single company). */
  slugs?: string[];
}

export interface FormDSyncResult {
  companiesConsidered: number;
  companiesMatched: number;
  filingsSeen: number;
  roundsCreated: number;
  roundsEnriched: number;
  personnelCreated: number;
  profilesTouched: number;
  httpErrors: number;
  cursor: string | null;
  complete: boolean;
  unmatched: string[];
}

/**
 * The full sweep: resolve each company to a CIK, read its Form D history, and
 * write or enrich FundingRound rows with provenance. Resumable by company
 * slug, so a run killed at company 140 of 331 restarts at 141 rather than
 * re-hammering EDGAR for the first 140.
 */
export async function syncFormDFunding(opts: FormDSyncOptions = {}): Promise<FormDSyncResult> {
  const stats = newFetchStats();
  const result: FormDSyncResult = {
    companiesConsidered: 0,
    companiesMatched: 0,
    filingsSeen: 0,
    roundsCreated: 0,
    roundsEnriched: 0,
    personnelCreated: 0,
    profilesTouched: 0,
    httpErrors: 0,
    cursor: null,
    complete: false,
    unmatched: [],
  };

  const cursor = opts.restart ? null : await resumeCursor(FORM_D_SOURCE_KEY);
  const runId = await startRun(FORM_D_SOURCE_KEY, cursor);
  let fatal: unknown = null;

  try {
    await circuitBreaker.execute(async () => {
      const companies = await prisma.companyProfile.findMany({
        where: {
          ...(opts.slugs?.length ? { slug: { in: opts.slugs } } : {}),
          ...(cursor ? { slug: { gt: cursor } } : {}),
        },
        orderBy: { slug: 'asc' },
        take: opts.limit ?? 50,
        select: {
          id: true,
          slug: true,
          name: true,
          legalName: true,
          ticker: true,
          cik: true,
          foundedYear: true,
          headquarters: true,
          country: true,
        },
      });

      if (companies.length === 0) {
        result.complete = true;
        return;
      }

      const sinceMs = opts.since ? new Date(opts.since).getTime() : new Date(FORM_D_ELECTRONIC_SINCE).getTime();

      for (const company of companies) {
        result.companiesConsidered++;
        result.cursor = company.slug;

        let cik = company.cik;
        if (!cik) {
          // Did we already search and come up empty recently?
          const miss = await prisma.dataProvenance.findUnique({
            where: {
              entity_entityId_field_source: {
                entity: 'CompanyProfile',
                entityId: company.id,
                field: 'cik',
                source: CIK_SEARCH_SOURCE,
              },
            },
            select: { value: true, verifiedAt: true },
          });
          if (
            miss &&
            miss.value === null &&
            miss.verifiedAt &&
            Date.now() - miss.verifiedAt.getTime() < CIK_MISS_TTL_DAYS * DAY_MS
          ) {
            result.unmatched.push(company.slug);
            continue;
          }
          const resolved =
            (await resolveCik(company.name, company.ticker, stats)) ??
            (company.legalName && company.legalName !== company.name
              ? await resolveCik(company.legalName, company.ticker, stats)
              : null);
          if (!resolved) {
            result.unmatched.push(company.slug);
            if (!opts.dryRun) {
              // Record the miss so the next lap does not re-ask EDGAR about
              // a company that has no US filer. NULL value = searched, none
              // found, as of verifiedAt.
              await recordProvenance({
                entity: 'CompanyProfile',
                entityId: company.id,
                field: 'cik',
                value: null,
                source: CIK_SEARCH_SOURCE,
                method: 'official-filing',
                observedAt: new Date(),
              });
            }
            continue;
          }
          cik = resolved.cik;
          if (!opts.dryRun) {
            await prisma.companyProfile.update({ where: { id: company.id }, data: { cik } });
            await recordProvenance({
              entity: 'CompanyProfile',
              entityId: company.id,
              field: 'cik',
              // The EDGAR filer name and how it was matched are recorded
              // alongside the id: a wrong CIK is the one mistake that would
              // attribute another company's fundraising to ours, so an
              // auditor must be able to re-check the match without re-running
              // the resolver.
              value: { cik, edgarName: resolved.edgarName, via: resolved.via, quality: resolved.quality },
              source: CIK_SEARCH_SOURCE,
              sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=D`,
              method: 'official-filing',
              observedAt: new Date(),
            });
          }
        }

        const submissions = await fetchSubmissions(cik, stats);
        if (!submissions) continue;
        result.companiesMatched++;

        const offerings = latestPerOffering(submissions.filings);
        const existing: ExistingRound[] = await prisma.fundingRound.findMany({
          where: { companyId: company.id },
          select: { id: true, date: true, amount: true, sourceUrl: true, source: true, externalId: true },
        });

        let touchedProfile = false;
        // Rows already claimed by an earlier filing in this company sweep.
        const consumed = new Set<string>();

        for (const filing of offerings) {
          if (filing.filingDate && new Date(filing.filingDate).getTime() < sinceMs) continue;
          result.filingsSeen++;

          const parsed = await fetchFormD(cik, filing.accessionNumber, stats);
          if (!parsed) continue;

          const draft = formDToRoundDraft(parsed, cik, filing);
          if (!draft) continue;
          if (draft.date.getTime() < sinceMs) continue;

          const provenanceBase = {
            source: FORM_D_SOURCE_LABEL,
            sourceUrl: draft.sourceUrl,
            sourceRef: draft.sourceRef,
            method: 'official-filing' as const,
            observedAt: new Date(`${filing.filingDate}T00:00:00.000Z`),
          };

          const overlap = findOverlappingRound(draft, existing, consumed);
          if (overlap) {
            consumed.add(overlap.id);
            if (!opts.dryRun) {
              await prisma.fundingRound.update({
                where: { id: overlap.id },
                data: {
                  // Never overwrite a press-reported amount or label: the
                  // filing verifies the round, it does not replace the
                  // reporting. Only fill in what is missing.
                  sourceUrl: overlap.sourceUrl ?? draft.sourceUrl,
                  externalId: overlap.externalId ?? draft.externalId,
                  sourceRef: draft.sourceRef,
                  sourceType: overlap.sourceUrl ? undefined : 'official-filing',
                  verifiedAt: new Date(),
                  amount: overlap.amount ?? draft.amount,
                  amountUndisclosed: overlap.amount === null && draft.amount === null,
                  roundType: draft.roundType ?? undefined,
                },
              });
              const recs: ProvenanceRecord[] = [
                { entity: 'FundingRound', entityId: overlap.id, field: 'verifiedAgainstFormD', value: draft.sourceRef, ...provenanceBase },
              ];
              if (overlap.amount === null && draft.amount !== null) {
                recs.push({ entity: 'FundingRound', entityId: overlap.id, field: 'amount', value: draft.amount, ...provenanceBase });
              }
              for (const rec of recs) await recordProvenance(rec);
            }
            result.roundsEnriched++;
            continue;
          }

          if (!opts.dryRun) {
            const created = await prisma.fundingRound.upsert({
              where: { externalId: draft.externalId },
              update: {
                date: draft.date,
                amount: draft.amount,
                amountUndisclosed: draft.amountUndisclosed,
                roundType: draft.roundType,
                sourceUrl: draft.sourceUrl,
                sourceRef: draft.sourceRef,
                sourceType: 'official-filing',
                notes: draft.notes,
                verifiedAt: new Date(),
              },
              create: {
                companyId: company.id,
                date: draft.date,
                amount: draft.amount,
                amountUndisclosed: draft.amountUndisclosed,
                // Form D states neither the round label nor the investors.
                seriesLabel: null,
                leadInvestor: null,
                investors: [],
                roundType: draft.roundType,
                source: FORM_D_SOURCE_LABEL,
                sourceUrl: draft.sourceUrl,
                sourceRef: draft.sourceRef,
                sourceType: 'official-filing',
                externalId: draft.externalId,
                notes: draft.notes,
                verifiedAt: new Date(),
              },
              select: { id: true, date: true, amount: true, sourceUrl: true, source: true, externalId: true },
            });
            existing.push(created);
            for (const field of ['amount', 'date', 'roundType'] as const) {
              await recordProvenance({
                entity: 'FundingRound',
                entityId: created.id,
                field,
                value: field === 'amount' ? draft.amount : field === 'date' ? draft.date : draft.roundType,
                ...provenanceBase,
              });
            }
          }
          result.roundsCreated++;

          // Officers and directors named on the filing. Officially sourced,
          // so it is real profile depth rather than a completeness trick.
          if (!opts.dryRun && parsed.relatedPersons.length > 0) {
            for (const person of parsed.relatedPersons.slice(0, 12)) {
              const title = person.relationships.join(', ') || 'Related Person';
              const already = await prisma.keyPersonnel.findFirst({
                where: { companyId: company.id, name: person.name },
                select: { id: true },
              });
              if (already) continue;
              const row = await prisma.keyPersonnel.create({
                data: {
                  companyId: company.id,
                  name: person.name,
                  title,
                  role: person.relationships.some((r) => /director/i.test(r)) ? 'board' : 'executive',
                  previousCompanies: [],
                  // Named as of the filing date; currency is not asserted.
                  isCurrent: false,
                },
                select: { id: true },
              });
              result.personnelCreated++;
              await recordProvenance({
                entity: 'KeyPersonnel',
                entityId: row.id,
                field: 'name',
                value: person.name,
                ...provenanceBase,
              });
            }
          }

          // Incorporation year, stated by the issuer on its own filing.
          if (!opts.dryRun && !company.foundedYear && parsed.yearOfIncorporation) {
            await prisma.companyProfile.update({
              where: { id: company.id },
              data: { foundedYear: parsed.yearOfIncorporation },
            });
            await recordProvenance({
              entity: 'CompanyProfile',
              entityId: company.id,
              field: 'foundedYear',
              value: parsed.yearOfIncorporation,
              ...provenanceBase,
            });
            touchedProfile = true;
          }
        }

        if (touchedProfile) result.profilesTouched++;
      }

      if (companies.length < (opts.limit ?? 50)) result.complete = true;
    }, undefined);
  } catch (err) {
    fatal = err;
    logger.error('Form D sync failed', { error: err instanceof Error ? err.message : String(err) });
  } finally {
    result.httpErrors = stats.httpErrors;
    await finishRun(
      runId,
      {
        itemsSeen: result.filingsSeen,
        itemsWritten: result.roundsCreated + result.roundsEnriched,
        httpErrors: stats.httpErrors,
        cursor: result.cursor,
        complete: result.complete,
        detail: {
          companiesConsidered: result.companiesConsidered,
          companiesMatched: result.companiesMatched,
          roundsCreated: result.roundsCreated,
          roundsEnriched: result.roundsEnriched,
          personnelCreated: result.personnelCreated,
          unmatched: result.unmatched.slice(0, 50),
          requests: stats.requests,
          lastError: stats.lastError,
          dryRun: Boolean(opts.dryRun),
        },
      },
      fatal,
    );
  }

  return result;
}
