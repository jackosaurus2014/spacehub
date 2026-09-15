/**
 * Company-profile depth from EDGAR's own filer record, plus the derived
 * roll-ups that only real FundingRound rows can justify.
 *
 * WHY
 * Average profile completeness on 2026-09-14 was 58/100. The cheapest honest
 * points are the ones a regulator already publishes about the filer: legal
 * name, business address, state of incorporation, exchange listing, and the
 * filing history itself. EDGAR states all of it, for free, about every filer -
 * public issuers AND the private companies that file Form D.
 *
 * TERMS
 * Same as sec-form-d-fetcher.ts: US government work in the public domain,
 * declared User-Agent, <=10 req/s. No key, no paid plan.
 *
 * RULES OF ENGAGEMENT
 * - Never overwrite a non-null field. Editors and claimed-profile owners beat
 *   a bulk fetcher, always. We only fill holes.
 * - `method: 'derived'` on the roll-ups means "computed from other provenanced
 *   rows", never "estimated". totalFunding is a sum of filed and reported
 *   amounts; if there are no rows, it stays NULL rather than becoming 0.
 * - Nothing in this file calls a model.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import {
  calculateCompleteness,
  COMPLETENESS_SCALAR_SELECT,
  COMPLETENESS_COUNT_SELECT,
} from '@/lib/company-completeness';
import { satelliteAssetSignalAvailable } from '@/lib/satellite-signal';
import { recordProvenance, startRun, finishRun, resumeCursor } from '@/lib/funding/provenance';
import {
  fetchSubmissions,
  resolveCik,
  newFetchStats,
  filingIndexUrl,
  padCik,
  type FetchStats,
  type SubmissionsSummary,
} from '@/lib/fetchers/sec-form-d-fetcher';

export const EDGAR_FACTS_SOURCE_KEY = 'edgar-company-facts';
const EDGAR_FACTS_SOURCE_LABEL = 'SEC EDGAR filer record';

const circuitBreaker = createCircuitBreaker(EDGAR_FACTS_SOURCE_KEY, {
  failureThreshold: 5,
  resetTimeout: 300_000,
});

/** Periodic and current reports worth surfacing on a profile. */
const TRACKED_FORMS = new Set(['10-K', '10-Q', '8-K', '20-F', '40-F', '6-K', 'S-1', 'S-1/A', 'DEF 14A', '424B4']);

/** How many filings per company to materialise as SECFiling rows. */
const MAX_FILINGS_PER_COMPANY = 25;

/** ISO-3166 alpha-2 for the handful of non-US codes EDGAR emits inline. */
function countryFromSubmissions(sub: SubmissionsSummary): string | null {
  if (sub.businessCountry === 'US') return 'US';
  if (sub.businessCountry && /^[A-Z]{2}$/.test(sub.businessCountry)) return sub.businessCountry;
  return null;
}

function headquartersFromSubmissions(sub: SubmissionsSummary): string | null {
  if (!sub.businessCity) return null;
  const city = sub.businessCity.replace(/\s+/g, ' ').trim();
  const pretty = city.replace(/\b([A-Z])([A-Z]+)\b/g, (_m, a: string, b: string) => a + b.toLowerCase());
  return sub.businessState ? `${pretty}, ${sub.businessState}` : pretty;
}

export interface EdgarFactsOptions {
  limit?: number;
  restart?: boolean;
  dryRun?: boolean;
  slugs?: string[];
  /** Skip the EDGAR round-trip and only recompute derived + completeness. */
  derivedOnly?: boolean;
}

export interface EdgarFactsResult {
  companiesConsidered: number;
  companiesWithCik: number;
  fieldsFilled: number;
  filingsWritten: number;
  derivedUpdated: number;
  completenessRecomputed: number;
  httpErrors: number;
  cursor: string | null;
  complete: boolean;
}

/**
 * Fill profile holes from EDGAR, materialise the filing history, then
 * recompute the funding roll-ups and the completeness score.
 */
export async function syncEdgarCompanyFacts(opts: EdgarFactsOptions = {}): Promise<EdgarFactsResult> {
  const stats: FetchStats = newFetchStats();
  const result: EdgarFactsResult = {
    companiesConsidered: 0,
    companiesWithCik: 0,
    fieldsFilled: 0,
    filingsWritten: 0,
    derivedUpdated: 0,
    completenessRecomputed: 0,
    httpErrors: 0,
    cursor: null,
    complete: false,
  };

  const cursor = opts.restart ? null : await resumeCursor(EDGAR_FACTS_SOURCE_KEY);
  const runId = await startRun(EDGAR_FACTS_SOURCE_KEY, cursor);
  let fatal: unknown = null;
  const satelliteSignalAvailable = await satelliteAssetSignalAvailable();

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
          exchange: true,
          cik: true,
          headquarters: true,
          country: true,
          isPublic: true,
          totalFunding: true,
          lastFundingRound: true,
          lastFundingDate: true,
        },
      });

      if (companies.length === 0) {
        result.complete = true;
        return;
      }

      for (const company of companies) {
        result.companiesConsidered++;
        result.cursor = company.slug;

        if (!opts.derivedOnly) {
          let cik = company.cik;
          if (!cik) {
            const resolved = await resolveCik(company.name, company.ticker, stats);
            if (resolved) cik = resolved.cik;
          }

          if (cik) {
            const sub = await fetchSubmissions(cik, stats);
            if (sub) {
              result.companiesWithCik++;
              const observedAt = new Date();
              const edgarUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${padCik(cik)}&type=&dateb=&owner=include&count=40`;
              const patch: Record<string, unknown> = {};

              if (!company.cik) patch.cik = padCik(cik);
              if (!company.legalName && sub.name) patch.legalName = sub.name;
              if (!company.headquarters) {
                const hq = headquartersFromSubmissions(sub);
                if (hq) patch.headquarters = hq;
              }
              if (!company.country) {
                const country = countryFromSubmissions(sub);
                if (country) patch.country = country;
              }
              if (!company.ticker && sub.tickers.length > 0) patch.ticker = sub.tickers[0];
              if (!company.exchange && sub.exchanges.length > 0 && sub.exchanges[0]) patch.exchange = sub.exchanges[0];
              // EDGAR listing an exchange is the regulator's own statement
              // that the issuer is listed, which is what isPublic means.
              if (!company.isPublic && sub.exchanges.filter(Boolean).length > 0 && sub.tickers.length > 0) {
                patch.isPublic = true;
              }

              if (Object.keys(patch).length > 0) {
                if (!opts.dryRun) {
                  await prisma.companyProfile.update({ where: { id: company.id }, data: patch });
                  for (const [field, value] of Object.entries(patch)) {
                    await recordProvenance({
                      entity: 'CompanyProfile',
                      entityId: company.id,
                      field,
                      value,
                      source: EDGAR_FACTS_SOURCE_LABEL,
                      sourceUrl: edgarUrl,
                      sourceRef: padCik(cik),
                      method: 'official-filing',
                      observedAt,
                    });
                  }
                }
                result.fieldsFilled += Object.keys(patch).length;
              }

              // Filing history. company-brief.ts and the profile's Live
              // Signals strip both read the SECFiling MODEL, which stayed
              // near-empty because sec-edgar-fetcher.ts only knew nine CIKs.
              const tracked = sub.filings
                .filter((f) => TRACKED_FORMS.has(f.form) && f.accessionNumber && f.filingDate)
                .sort((a, b) => (a.filingDate < b.filingDate ? 1 : -1))
                .slice(0, MAX_FILINGS_PER_COMPANY);

              for (const filing of tracked) {
                const filingDate = new Date(`${filing.filingDate}T00:00:00.000Z`);
                if (Number.isNaN(filingDate.getTime())) continue;
                if (opts.dryRun) {
                  result.filingsWritten++;
                  continue;
                }
                await prisma.sECFiling.upsert({
                  where: { accessionNumber: filing.accessionNumber },
                  update: {
                    filingType: filing.form,
                    filingDate,
                    edgarUrl: filingIndexUrl(cik, filing.accessionNumber),
                  },
                  create: {
                    companyId: company.id,
                    filingType: filing.form,
                    filingDate,
                    edgarUrl: filingIndexUrl(cik, filing.accessionNumber),
                    accessionNumber: filing.accessionNumber,
                  },
                });
                result.filingsWritten++;
              }
            }
          }
        }

        // ── Derived roll-ups from real rounds only ────────────────────────
        const rounds = await prisma.fundingRound.findMany({
          where: { companyId: company.id },
          orderBy: { date: 'desc' },
          select: { id: true, date: true, amount: true, seriesLabel: true, sourceUrl: true },
        });
        if (rounds.length > 0) {
          const withAmount = rounds.filter((r) => typeof r.amount === 'number' && r.amount! > 0);
          const total = withAmount.reduce((sum, r) => sum + (r.amount ?? 0), 0);
          const derived: Record<string, unknown> = {};
          // Only claim a total when at least one round states an amount. A
          // company whose every round is undisclosed keeps totalFunding NULL
          // rather than being reported as having raised $0.
          if (withAmount.length > 0 && !company.totalFunding) derived.totalFunding = total;
          if (!company.lastFundingDate) derived.lastFundingDate = rounds[0].date;
          if (!company.lastFundingRound && rounds[0].seriesLabel) derived.lastFundingRound = rounds[0].seriesLabel;

          if (Object.keys(derived).length > 0) {
            if (!opts.dryRun) {
              await prisma.companyProfile.update({ where: { id: company.id }, data: derived });
              for (const [field, value] of Object.entries(derived)) {
                await recordProvenance({
                  entity: 'CompanyProfile',
                  entityId: company.id,
                  field,
                  value,
                  source: 'SpaceNexus FundingRound roll-up',
                  sourceUrl: `https://spacenexus.us/company-profiles/${company.slug}`,
                  sourceRef: rounds.map((r) => r.id).slice(0, 20).join(','),
                  method: 'derived',
                  observedAt: rounds[0].date,
                });
              }
            }
            result.derivedUpdated++;
          }
        }

        // ── Recompute completeness from the live row ──────────────────────
        const scored = await prisma.companyProfile.findUnique({
          where: { id: company.id },
          select: { ...COMPLETENESS_SCALAR_SELECT, _count: { select: COMPLETENESS_COUNT_SELECT } },
        });
        if (scored) {
          const score = calculateCompleteness(scored, { satelliteSignalAvailable });
          if (score !== scored.dataCompleteness && !opts.dryRun) {
            await prisma.companyProfile.update({ where: { id: company.id }, data: { dataCompleteness: score } });
          }
          result.completenessRecomputed++;
        }
      }

      if (companies.length < (opts.limit ?? 50)) result.complete = true;
    }, undefined);
  } catch (err) {
    fatal = err;
    logger.error('EDGAR company-facts sync failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    result.httpErrors = stats.httpErrors;
    await finishRun(
      runId,
      {
        itemsSeen: result.companiesConsidered,
        itemsWritten: result.fieldsFilled + result.filingsWritten + result.derivedUpdated,
        httpErrors: stats.httpErrors,
        cursor: result.cursor,
        complete: result.complete,
        detail: {
          companiesWithCik: result.companiesWithCik,
          fieldsFilled: result.fieldsFilled,
          filingsWritten: result.filingsWritten,
          derivedUpdated: result.derivedUpdated,
          completenessRecomputed: result.completenessRecomputed,
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
