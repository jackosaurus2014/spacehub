/**
 * SEC-derived investor signals: insider transactions, 5%-holder positions, and
 * the issuer filing index that filing cadence is computed from.
 *
 * WHY THIS EXISTS
 * ---------------
 * SpaceNexus Research is sold to investors, corporate strategy and BD teams.
 * We hold company profiles, funding rounds and a supply-chain map; what we did
 * not hold was anything about how insiders and institutions are POSITIONED in
 * the listed space names. That is the first thing an investor buyer looks for,
 * it is free and official, and nobody aggregates it for this sector.
 *
 * Three datasets, one sweep, because all three come from the same per-company
 * submissions index and the same rate budget:
 *
 *   1. FORM 4 / FORM 5 — every transaction line in the ownership XML, parsed
 *      from the filing document itself rather than inferred from the index.
 *   2. SCHEDULE 13D / 13G — who crossed 5% of a space company, and the voting
 *      and dispositive power they reported. Structured XML only (see
 *      SCHEDULE_13_STRUCTURED_SINCE).
 *   3. THE FILING INDEX ITSELF — form, date, period covered and 8-K item
 *      codes, which is all filing cadence needs and costs one request.
 *
 * TERMS
 * -----
 * EDGAR data is US government work in the public domain, published for bulk
 * programmatic access. SEC's fair-access policy asks for a declared
 * User-Agent naming the requester with a contact address, and no more than 10
 * requests a second. Both are enforced below. No credential or paid plan is
 * required or used. The discipline here is deliberately the same as
 * src/lib/fetchers/sec-form-d-fetcher.ts — that file is the reference
 * implementation and is not modified by this one.
 *
 * WHAT WE REFUSE TO DO
 * --------------------
 * - No model is called anywhere in this file. Every field is a literal read of
 *   a cited document, and every row carries its accession number and a URL.
 * - Form 3 (initial statement of holdings) is not imported: it reports a
 *   standing position, not a transaction, and counting it as one would invent
 *   trades on the day every director joined a board.
 * - Schedule 13D/G filings made before the SEC's structured-XML mandate are
 *   NOT parsed out of their HTML. They are recorded in the filing index and
 *   nowhere else, because scraping a free-text cover page for share counts is
 *   exactly the kind of "close enough" number this product cannot carry.
 * - Nothing infers intent. A transaction code is stored as filed and
 *   classified through src/lib/market-signals/form4-codes.ts, which maps codes
 *   to descriptions and never to a direction or a recommendation.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import {
  assertNotGenerated,
  recordProvenance,
  startRun,
  finishRun,
  resumeCursor,
} from '@/lib/funding/provenance';
import { classifyForm4Code } from '@/lib/market-signals/form4-codes';
import {
  indexedFilingsFrom,
  isAmendmentForm,
  isSchedule13,
  isSchedule13D,
  parseForm4,
  parseSchedule13,
  rawDocumentName,
  transactionValue,
  usDate,
  utcDate,
  type IndexedFiling,
  type ParsedForm4,
  type ParsedSchedule13,
  type SubmissionsPayload,
} from '@/lib/market-signals/sec-filing-parsers';
import { loadTickerCikMap, padCik, filingDirUrl, filingIndexUrl } from '@/lib/fetchers/sec-form-d-fetcher';

// The parsing contract is re-exported so a caller that has this fetcher does
// not need to know the split exists.
export {
  indexedFilingsFrom,
  isAmendmentForm,
  isSchedule13,
  isSchedule13D,
  isSchedule13G,
  parseForm4,
  parseSchedule13,
  rawDocumentName,
  transactionValue,
  usDate,
  utcDate,
} from '@/lib/market-signals/sec-filing-parsers';
export type {
  Form4Owner,
  Form4Transaction,
  IndexedFiling,
  ParsedForm4,
  ParsedSchedule13,
  Schedule13Holder,
} from '@/lib/market-signals/sec-filing-parsers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stable key in DataSourceRun.source and in the content-accuracy check. */
export const INSIDER_SOURCE_KEY = 'sec-insider';

/** Human-readable publisher recorded on every row and provenance record. */
export const INSIDER_SOURCE_LABEL = 'SEC EDGAR ownership filings';

/** Publisher label for the 5%-holder dataset. */
export const SCHEDULE13_SOURCE_LABEL = 'SEC EDGAR Schedule 13D/G';

/** Publisher label for the filing index. */
export const FILING_INDEX_SOURCE_LABEL = 'SEC EDGAR filing index';

/**
 * SEC fair access requires a User-Agent identifying the requester with a real
 * contact address. Same env var as the Form D fetcher on purpose: one declared
 * identity for all of our EDGAR traffic.
 */
const SEC_USER_AGENT = process.env.SEC_EDGAR_USER_AGENT || 'SpaceNexus info@spacenexus.us';

/**
 * SEC allows 10 req/s per requester. We pace at ~5/s here rather than the ~7/s
 * the Form D fetcher uses, because this sweep is the heavier of the two and
 * the ceiling is shared across every EDGAR caller on the platform. The cron
 * schedule keeps the two sweeps in different hours as well.
 */
const MIN_REQUEST_GAP_MS = 200;

/**
 * Ownership forms have been filed electronically in this XML since
 * 2003-06-30. Paper filings before then are not in the structured corpus, and
 * the product must never imply history it cannot have.
 */
export const OWNERSHIP_ELECTRONIC_SINCE = '2003-06-30';

/**
 * Schedule 13D and 13G became structured XML submissions on 2024-12-18.
 * Filings before that date are free-text documents; we index them and do not
 * parse them. This is the honest floor for every 5%-holder figure.
 */
export const SCHEDULE_13_STRUCTURED_SINCE = '2024-12-18';

/**
 * Default backfill floor. Chosen so that every Schedule 13D/G inside our
 * window is already structured — no partial-coverage caveat is needed for the
 * institutional dataset — and so the archive starts at a clean year boundary.
 * It is a BACKFILL BOUNDARY, not a claim that nothing happened earlier, and
 * the release says so in its coverage block.
 */
export const INSIDER_DEFAULT_SINCE = '2025-01-01';

/** Ownership forms carrying transactions. Form 3 is deliberately absent. */
const OWNERSHIP_FORMS = new Set(['4', '4/A', '5', '5/A']);

const circuitBreaker = createCircuitBreaker(INSIDER_SOURCE_KEY, {
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

/** Statuses SEC returns when throttling rather than refusing. */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

/**
 * One EDGAR request. Returns null on any non-OK response, but ALWAYS bumps
 * `stats.httpErrors` and records the status first. Two FCC fetchers sat dead
 * for weeks behind a swallowed 403 whose only symptom was an empty tab; that
 * failure mode is designed out here and watched in content-accuracy.ts.
 *
 * A 404 is data ("this CIK has no such document"), not breakage, and never
 * counts against the feed.
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
          Accept: 'application/json, text/xml, */*',
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) return await res.text();
      lastStatus = res.status;
      if (res.status === 404) return null;
      if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 750 * attempt));
        continue;
      }
      stats.httpErrors++;
      stats.lastError = `HTTP ${res.status} ${url}`;
      logger.warn('SEC EDGAR insider request failed', { status: res.status, url, attempt });
      return null;
    } catch (err) {
      lastStatus = 0;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 750 * attempt));
        continue;
      }
      stats.httpErrors++;
      stats.lastError = `${err instanceof Error ? err.message : String(err)} ${url}`;
      logger.warn('SEC EDGAR insider request threw', { url, error: stats.lastError });
      return null;
    }
  }
  stats.httpErrors++;
  stats.lastError = `HTTP ${lastStatus} after ${MAX_ATTEMPTS} attempts ${url}`;
  return null;
}

// ---------------------------------------------------------------------------
// Fetching the documents the parsers read
//
// The parsing itself lives in src/lib/market-signals/sec-filing-parsers.ts,
// which is pure: no Prisma, no network, no clock. That split is what lets the
// Form 4 and Schedule 13 readers be tested against real filings without a
// database, and it keeps this file about rate discipline and persistence.
// ---------------------------------------------------------------------------

export interface IssuerSubmissions {
  cik: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  filings: IndexedFiling[];
}

/**
 * Every filing EDGAR holds for a CIK, including the older shards referenced by
 * `filings.files`. A filer with more than ~1,000 filings pages out of the
 * `recent` block, and a Form 4-heavy issuer reaches that quickly.
 */
export async function fetchIssuerSubmissions(
  cik: string,
  stats: FetchStats,
  opts: { includeShards?: boolean } = {},
): Promise<IssuerSubmissions | null> {
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

  const filings = indexedFilingsFrom(parsed.filings?.recent);
  if (opts.includeShards !== false) {
    for (const shard of parsed.filings?.files ?? []) {
      if (!shard?.name) continue;
      const shardBody = await secFetch(`https://data.sec.gov/submissions/${shard.name}`, stats);
      if (!shardBody) continue;
      try {
        filings.push(...indexedFilingsFrom(JSON.parse(shardBody) as Record<string, unknown[]>));
      } catch {
        /* a bad shard must not lose the shards that parsed */
      }
    }
  }

  return {
    cik: padCik(parsed.cik ?? cik),
    name: parsed.name ?? '',
    tickers: parsed.tickers ?? [],
    exchanges: parsed.exchanges ?? [],
    filings,
  };
}

/** Absolute URL of the raw document, or null when the filing has no primary doc. */
export function rawDocumentUrl(
  cik: string,
  accessionNumber: string,
  primaryDocument: string | null | undefined,
): string | null {
  const name = rawDocumentName(primaryDocument);
  if (!name) return null;
  return `${filingDirUrl(cik, accessionNumber)}/${name}`;
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

export interface InsiderSyncOptions {
  /** Process at most this many companies in one run. */
  limit?: number;
  /** Ignore the stored cursor and start from the beginning. */
  restart?: boolean;
  /** Parse and report, write nothing. */
  dryRun?: boolean;
  /** Skip filings before this ISO date. Defaults to INSIDER_DEFAULT_SINCE. */
  since?: string;
  /** Restrict to these CompanyProfile slugs (debugging one company). */
  slugs?: string[];
  /**
   * Cap on ownership documents fetched per company in one run, so a single
   * heavy filer cannot consume the whole time budget. The cursor parks and the
   * next run continues.
   */
  maxDocsPerCompany?: number;
}

export interface InsiderSyncResult {
  companiesConsidered: number;
  companiesWithCik: number;
  filingsIndexed: number;
  ownershipDocsParsed: number;
  transactionsWritten: number;
  schedule13DocsParsed: number;
  positionsWritten: number;
  schedule13Unstructured: number;
  httpErrors: number;
  cursor: string | null;
  complete: boolean;
  /** Companies with a ticker that EDGAR's ticker map does not know. */
  unmatched: string[];
}

interface RosterCompany {
  id: string;
  slug: string;
  name: string;
  ticker: string | null;
  cik: string | null;
}

/**
 * Resolve a roster company to its CIK.
 *
 * ONLY the official ticker->CIK map, never a name search. A wrong CIK here
 * would attribute another company's insider trades to ours, which is a far
 * worse failure than missing a company; and every issuer that files Form 4 is
 * by definition a listed one with a ticker, so name search buys nothing.
 */
async function resolveIssuerCik(
  company: RosterCompany,
  stats: FetchStats,
): Promise<{ cik: string; edgarName: string } | null> {
  if (company.cik) return { cik: padCik(company.cik), edgarName: company.name };
  if (!company.ticker) return null;
  const map = await loadTickerCikMap(stats);
  const hit = map.get(company.ticker.trim().toUpperCase());
  return hit ? { cik: hit.cik, edgarName: hit.title } : null;
}

/**
 * The full sweep, resumable by CompanyProfile.slug.
 *
 * Per company: one submissions request builds the filing index, then only the
 * ownership and Schedule 13 documents we have not already stored are fetched.
 * Re-running is cheap by design — a company whose filings are all on file
 * costs exactly one request.
 */
export async function syncSecInsiderSignals(opts: InsiderSyncOptions = {}): Promise<InsiderSyncResult> {
  // Explicit refusal at the top of the pipeline: nothing in this path may
  // record a value a model produced. recordProvenance re-checks every row.
  assertNotGenerated('official-filing', INSIDER_SOURCE_LABEL);

  const stats = newFetchStats();
  const result: InsiderSyncResult = {
    companiesConsidered: 0,
    companiesWithCik: 0,
    filingsIndexed: 0,
    ownershipDocsParsed: 0,
    transactionsWritten: 0,
    schedule13DocsParsed: 0,
    positionsWritten: 0,
    schedule13Unstructured: 0,
    httpErrors: 0,
    cursor: null,
    complete: false,
    unmatched: [],
  };

  const sinceIso = opts.since ?? INSIDER_DEFAULT_SINCE;
  const sinceMs = new Date(`${sinceIso}T00:00:00.000Z`).getTime();
  const maxDocs = opts.maxDocsPerCompany ?? 400;
  const limit = opts.limit ?? 12;

  const cursor = opts.restart ? null : await resumeCursor(INSIDER_SOURCE_KEY);
  const runId = await startRun(INSIDER_SOURCE_KEY, cursor);
  let fatal: unknown = null;

  try {
    await circuitBreaker.execute(async () => {
      const companies: RosterCompany[] = await prisma.companyProfile.findMany({
        where: {
          // Insider and beneficial-ownership filings exist only for listed US
          // issuers. A private company has no Form 4 to miss.
          ticker: { not: null },
          ...(opts.slugs?.length ? { slug: { in: opts.slugs } } : {}),
          ...(cursor ? { slug: { gt: cursor } } : {}),
        },
        orderBy: { slug: 'asc' },
        take: limit,
        select: { id: true, slug: true, name: true, ticker: true, cik: true },
      });

      if (companies.length === 0) {
        result.complete = true;
        return;
      }

      for (const company of companies) {
        result.companiesConsidered++;
        result.cursor = company.slug;

        const resolved = await resolveIssuerCik(company, stats);
        if (!resolved) {
          // Foreign-listed and non-US issuers are simply not SEC filers. That
          // is a coverage fact the release prints, not an error.
          result.unmatched.push(company.slug);
          continue;
        }
        const cik = resolved.cik;
        result.companiesWithCik++;

        if (!opts.dryRun && !company.cik) {
          await prisma.companyProfile.update({ where: { id: company.id }, data: { cik } });
          await recordProvenance({
            entity: 'CompanyProfile',
            entityId: company.id,
            field: 'cik',
            value: { cik, edgarName: resolved.edgarName, via: 'ticker' },
            source: 'SEC EDGAR ticker map',
            sourceUrl: 'https://www.sec.gov/files/company_tickers.json',
            method: 'official-filing',
            observedAt: new Date(),
          });
        }

        const submissions = await fetchIssuerSubmissions(cik, stats);
        if (!submissions) continue;

        const inWindow = submissions.filings.filter((f) => {
          const t = utcDate(f.filingDate)?.getTime();
          return t !== undefined && t !== null && t >= sinceMs;
        });

        const base = {
          companyId: company.id,
          companySlug: company.slug,
          companyName: company.name,
          ticker: company.ticker,
          issuerCik: cik,
        };

        // --- 1. The filing index ------------------------------------------
        for (const filing of inWindow) {
          const filedAt = utcDate(filing.filingDate);
          if (!filedAt) continue;
          result.filingsIndexed++;
          if (opts.dryRun) continue;
          const url = filingIndexUrl(cik, filing.accessionNumber);
          const data = {
            ...base,
            form: filing.form,
            filingDate: filedAt,
            reportDate: utcDate(filing.reportDate),
            acceptedAt: filing.acceptanceDateTime ? new Date(filing.acceptanceDateTime) : null,
            items: filing.items,
            fileNumber: filing.fileNumber,
            primaryDocument: filing.primaryDocument,
            sizeBytes: filing.sizeBytes,
            isXBRL: filing.isXBRL,
            sourceUrl: url,
          };
          await prisma.issuerFiling.upsert({
            where: { issuerCik_accessionNumber: { issuerCik: cik, accessionNumber: filing.accessionNumber } },
            update: data,
            create: { ...data, accessionNumber: filing.accessionNumber },
          });
        }

        if (!opts.dryRun && inWindow.length > 0) {
          await recordProvenance({
            entity: 'CompanyProfile',
            entityId: company.id,
            field: 'secFilingIndex',
            value: { filings: inWindow.length, since: sinceIso },
            source: FILING_INDEX_SOURCE_LABEL,
            sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=40`,
            sourceRef: cik,
            method: 'official-filing',
            observedAt: new Date(),
          });
        }

        // --- 2. Ownership documents we do not already hold -----------------
        const haveOwnership = new Set(
          (
            await prisma.insiderTransaction.findMany({
              where: { issuerCik: cik },
              select: { accessionNumber: true },
              distinct: ['accessionNumber'],
            })
          ).map((r) => r.accessionNumber),
        );

        let docsThisCompany = 0;
        for (const filing of inWindow) {
          if (!OWNERSHIP_FORMS.has(filing.form.trim())) continue;
          if (haveOwnership.has(filing.accessionNumber)) continue;
          if (docsThisCompany >= maxDocs) break;
          const url = rawDocumentUrl(cik, filing.accessionNumber, filing.primaryDocument);
          if (!url) continue;
          const xml = await secFetch(url, stats);
          docsThisCompany++;
          if (!xml) continue;

          let parsed: ParsedForm4;
          try {
            parsed = parseForm4(xml);
          } catch (err) {
            logger.warn('Form 4 parse failed', {
              cik,
              accession: filing.accessionNumber,
              error: String(err),
            });
            continue;
          }
          if (parsed.transactions.length === 0) continue;
          result.ownershipDocsParsed++;

          const filedAt = utcDate(filing.filingDate)!;
          // A joint filing reports ONE set of shares owned by several related
          // persons. Attributing a row to each would multiply the block by the
          // number of filers, so the first reporting person carries the row and
          // the rest are named beside it.
          const primary = parsed.owners[0] ?? null;
          const additional = parsed.owners.slice(1).map((o) => o.name);

          for (const tx of parsed.transactions) {
            const txDate = utcDate(tx.transactionDate) ?? filedAt;
            if (opts.dryRun) {
              result.transactionsWritten++;
              continue;
            }
            const data = {
              ...base,
              formType: parsed.documentType ? `${parsed.documentType}` : filing.form,
              filingDate: filedAt,
              periodOfReport: utcDate(parsed.periodOfReport),
              transactionDate: txDate,
              ownerCik: primary?.cik ?? null,
              ownerName: primary?.name ?? 'Reporting person not named on filing',
              ownerTitle: primary?.officerTitle ?? null,
              isDirector: primary?.isDirector ?? false,
              isOfficer: primary?.isOfficer ?? false,
              isTenPercentOwner: primary?.isTenPercentOwner ?? false,
              isOtherRelationship: primary?.isOther ?? false,
              additionalOwners: additional,
              derivative: tx.derivative,
              securityTitle: tx.securityTitle,
              transactionCode: tx.transactionCode,
              transactionClass: classifyForm4Code(tx.transactionCode),
              acquiredDisposed: tx.acquiredDisposed,
              shares: tx.shares,
              pricePerShare: tx.pricePerShare,
              valueUsd: transactionValue(tx.shares, tx.pricePerShare),
              sharesOwnedAfter: tx.sharesOwnedAfter,
              directOrIndirect: tx.directOrIndirect,
              footnoted: tx.footnoted,
              source: INSIDER_SOURCE_LABEL,
              sourceUrl: filingIndexUrl(cik, filing.accessionNumber),
              documentUrl: url,
            };
            await prisma.insiderTransaction.upsert({
              where: {
                accessionNumber_lineKey: {
                  accessionNumber: filing.accessionNumber,
                  lineKey: tx.lineKey,
                },
              },
              update: data,
              create: { ...data, accessionNumber: filing.accessionNumber, lineKey: tx.lineKey },
            });
            result.transactionsWritten++;
          }

          if (!opts.dryRun) {
            // Provenance is recorded per DOCUMENT, not per line: one filing is
            // the unit a reader re-checks, and entityId is therefore the
            // accession number rather than a row id. Deliberate, and the only
            // place in the codebase that does it.
            await recordProvenance({
              entity: 'InsiderTransaction',
              entityId: filing.accessionNumber,
              field: 'transactions',
              value: { lines: parsed.transactions.length, owners: parsed.owners.map((o) => o.name) },
              source: INSIDER_SOURCE_LABEL,
              sourceUrl: filingIndexUrl(cik, filing.accessionNumber),
              sourceRef: filing.accessionNumber,
              method: 'official-filing',
              observedAt: filedAt,
            });
          }
        }

        // --- 3. Schedule 13D / 13G ----------------------------------------
        const havePositions = new Set(
          (
            await prisma.institutionalPosition.findMany({
              where: { issuerCik: cik },
              select: { accessionNumber: true },
              distinct: ['accessionNumber'],
            })
          ).map((r) => r.accessionNumber),
        );

        for (const filing of inWindow) {
          if (!isSchedule13(filing.form)) continue;
          if (havePositions.has(filing.accessionNumber)) continue;
          if (docsThisCompany >= maxDocs) break;
          const name = rawDocumentName(filing.primaryDocument);
          // Structured submissions are always primary_doc.xml. A .htm or .txt
          // primary document is a pre-mandate free-text filing: counted, never
          // scraped.
          if (!name || !/\.xml$/i.test(name)) {
            result.schedule13Unstructured++;
            continue;
          }
          const url = rawDocumentUrl(cik, filing.accessionNumber, filing.primaryDocument)!;
          const xml = await secFetch(url, stats);
          docsThisCompany++;
          if (!xml) continue;

          let parsed: ParsedSchedule13;
          try {
            parsed = parseSchedule13(xml);
          } catch (err) {
            logger.warn('Schedule 13 parse failed', {
              cik,
              accession: filing.accessionNumber,
              error: String(err),
            });
            continue;
          }
          if (parsed.holders.length === 0) {
            result.schedule13Unstructured++;
            continue;
          }
          result.schedule13DocsParsed++;

          const filedAt = utcDate(filing.filingDate)!;
          for (const holder of parsed.holders) {
            if (opts.dryRun) {
              result.positionsWritten++;
              continue;
            }
            const data = {
              ...base,
              formType: filing.form,
              isAmendment: isAmendmentForm(filing.form),
              isActivistForm: isSchedule13D(filing.form),
              filingDate: filedAt,
              eventDate: usDate(parsed.eventDate),
              holderName: holder.name,
              holderCik: holder.cik,
              holderType: holder.personType,
              holderCitizenship: holder.citizenship,
              securitiesClass: parsed.securitiesClassTitle,
              cusip: parsed.cusip,
              sharesBeneficiallyOwned: holder.sharesBeneficiallyOwned,
              percentOfClass: holder.percentOfClass,
              soleVoting: holder.soleVoting,
              sharedVoting: holder.sharedVoting,
              soleDispositive: holder.soleDispositive,
              sharedDispositive: holder.sharedDispositive,
              source: SCHEDULE13_SOURCE_LABEL,
              sourceUrl: filingIndexUrl(cik, filing.accessionNumber),
              documentUrl: url,
            };
            await prisma.institutionalPosition.upsert({
              where: {
                accessionNumber_holderKey: {
                  accessionNumber: filing.accessionNumber,
                  holderKey: holder.holderKey,
                },
              },
              update: data,
              create: { ...data, accessionNumber: filing.accessionNumber, holderKey: holder.holderKey },
            });
            result.positionsWritten++;
          }

          if (!opts.dryRun) {
            await recordProvenance({
              entity: 'InstitutionalPosition',
              entityId: filing.accessionNumber,
              field: 'holders',
              value: { holders: parsed.holders.map((h) => h.name) },
              source: SCHEDULE13_SOURCE_LABEL,
              sourceUrl: filingIndexUrl(cik, filing.accessionNumber),
              sourceRef: filing.accessionNumber,
              method: 'official-filing',
              observedAt: filedAt,
            });
          }
        }
      }

      if (companies.length < limit) result.complete = true;
    }, undefined);
  } catch (err) {
    fatal = err;
    logger.error('SEC insider sync failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    result.httpErrors = stats.httpErrors;
    await finishRun(
      runId,
      {
        itemsSeen: result.filingsIndexed,
        itemsWritten: result.transactionsWritten + result.positionsWritten + result.filingsIndexed,
        httpErrors: stats.httpErrors,
        cursor: result.cursor,
        complete: result.complete,
        detail: {
          companiesConsidered: result.companiesConsidered,
          companiesWithCik: result.companiesWithCik,
          ownershipDocsParsed: result.ownershipDocsParsed,
          transactionsWritten: result.transactionsWritten,
          schedule13DocsParsed: result.schedule13DocsParsed,
          positionsWritten: result.positionsWritten,
          schedule13Unstructured: result.schedule13Unstructured,
          unmatched: result.unmatched.slice(0, 50),
          requests: stats.requests,
          lastError: stats.lastError,
          since: sinceIso,
          dryRun: Boolean(opts.dryRun),
        },
      },
      fatal,
    );
  }

  return result;
}
