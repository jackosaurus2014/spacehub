/**
 * UK Companies House - the official, free, machine-readable record of every
 * UK-registered company, wired into CompanyProfile.
 *
 * WHY THIS EXISTS
 * The SEC Form D pipeline closed the funding gap for US companies. It cannot
 * close it for anyone else: roughly 40% of the roster is non-US and files
 * nothing with the SEC, so its funding, officers and corporate status rested
 * entirely on press mentions. The UK register is the closest non-US equivalent
 * to EDGAR that is free and complete - every UK company must file, the filings
 * are dated, and the persons-with-significant-control register is the nearest
 * thing to free beneficial-ownership data that exists for this sector.
 *
 * WHAT IT ADDS THAT PRESS COVERAGE DOES NOT
 * Corporate status, dated. A company enters administration on the register
 * weeks before the trade press notices, and stays "in administration" (not
 * "dissolved", not "dead") for months afterwards while the administrators try
 * to sell it - a distinction press coverage routinely flattens and an investor
 * very much cares about. Overdue accounts and overdue confirmation statements
 * are a distress signal nobody reports at all.
 *
 * WHAT WE REFUSE TO DO
 * - No company is matched on its name alone. See resolver.ts for why: an exact
 *   name match on this register is nearly worthless, and the top hit for
 *   "Orbex" is an unrelated mail-order company.
 * - An unresolvable company stays unresolved. The miss is recorded so the next
 *   lap does not re-ask, and the reason is recorded so a human can read it.
 * - Officer and PSC dates of birth and addresses are never stored. See
 *   PERSONAL_DATA_POLICY in uk-registry/attribution.ts.
 * - CompanyProfile.status is never overwritten from the register. A register
 *   status and an editorial status are different claims; where they disagree
 *   the disagreement is surfaced, not silently resolved.
 * - Nothing here calls a model. Every field is a parse of a cited document.
 *
 * LICENCE
 * Register data is Crown copyright, reused under the Open Government Licence
 * v3.0, which permits reuse WITH attribution. Every row carries its
 * find-and-update.company-information.service.gov.uk URL, and
 * COMPANIES_HOUSE_ATTRIBUTION must be displayed wherever the data is shown or
 * exported. See uk-registry/attribution.ts.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { satelliteAssetSignalAvailable } from '@/lib/satellite-signal';
import {
  calculateCompleteness,
  COMPLETENESS_COUNT_SELECT,
  COMPLETENESS_SCALAR_SELECT,
} from '@/lib/company-completeness';
import {
  recordProvenance,
  startRun,
  finishRun,
  resumeCursor,
} from '@/lib/funding/provenance';
import {
  UK_REGISTRY_SOURCE_KEY,
  UK_REGISTRY_SOURCE_LABEL,
  companiesHouseCompanyUrl,
} from '@/lib/uk-registry/attribution';
import {
  chFetch,
  hasCompaniesHouseKey,
  newFetchStats,
  withCompaniesHouseBreaker,
  type FetchStats,
} from '@/lib/uk-registry/client';
import {
  isStatusFiling,
  parseCompanyProfile,
  parseCompanySearch,
  parseFilingHistory,
  parseOfficers,
  parsePsc,
  type CompanyProfilePayload,
  type FilingRecord,
} from '@/lib/uk-registry/parse';
import {
  chooseCandidate,
  prefilterSearchHits,
  type KnownCompany,
  type ResolutionOutcome,
} from '@/lib/uk-registry/resolver';
import {
  manualRegistrationFor,
  MANUAL_REGISTRATIONS,
} from '@/lib/uk-registry/manual-registrations';

export { UK_REGISTRY_SOURCE_KEY };

const DAY_MS = 86_400_000;

/** Provenance source string used for both hits and misses on number lookup. */
const NUMBER_SEARCH_SOURCE = 'Companies House company search';

/**
 * How long a "no match on the register" answer is trusted before we look
 * again. A recorded miss is a real observation ("we searched on this date and
 * nothing on the register cleared the bar"), so it lives in DataProvenance
 * with the rest of the audit trail rather than in a cache. Without it, every
 * unresolvable company costs several requests on every lap, forever.
 */
const MISS_TTL_DAYS = 45;

/**
 * Countries, as our own roster spells them, that mean "this company is
 * registered in the UK".
 *
 * Deliberately a country test and NOT a headquarters keyword test. A keyword
 * sweep for UK place names pulls in exactEarth (Cambridge, ONTARIO) and Draper
 * Laboratory (Cambridge, MASSACHUSETTS) - two companies with no UK
 * registration at all. Searching the UK register for them would produce
 * candidates, and candidates are how false matches happen.
 */
export const UK_COUNTRY_VALUES = [
  'GB', 'UK', 'United Kingdom', 'England', 'Scotland', 'Wales',
  'Northern Ireland', 'Great Britain',
] as const;

const UK_COUNTRY_LOOKUP = new Set(UK_COUNTRY_VALUES.map((v) => v.toLowerCase()));

/** Is this roster row UK-domiciled by our own record of its country? */
export function isUkDomiciled(country: string | null | undefined): boolean {
  if (!country) return false;
  return UK_COUNTRY_LOOKUP.has(country.trim().toLowerCase());
}

/**
 * When the cheap name filter rejects every search hit, probe this many of the
 * top hits in full anyway.
 *
 * A renamed company is invisible to the filter: the search index carries only
 * the CURRENT name, and only the full profile carries the former ones. Pulsar
 * Fusion is exactly this - it is on the register as PULSAR AEROSPACE LIMITED,
 * renamed from PULSAR FUSION LTD on 2025-08-20, and the filter correctly finds
 * no resemblance between "Pulsar Fusion" and "Pulsar Aerospace". Fetching the
 * top few profiles lets the scorer see the former name and match on it.
 *
 * This costs requests, so it runs ONLY when the filter found nothing, and the
 * profiles it fetches still face the full scoring bar. It widens what we LOOK
 * at, never what we accept.
 */
const FORMER_NAME_PROBE_LIMIT = 4;

/** Officer roles that belong in KeyPersonnel. Secretaries are not leadership. */
const LEADERSHIP_ROLES = /^(director|llp-member|llp-designated-member|corporate-director)$/i;

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value + (value.length === 10 ? 'T00:00:00.000Z' : ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export interface ResolvedRegistration {
  profile: CompanyProfilePayload;
  matchQuality: string;
  matchMethod: 'search' | 'manual';
  matchScore: number | null;
  matchEvidence: Record<string, unknown>;
}

/** Fetch and parse one company profile by number. */
export async function fetchCompanyProfile(
  companyNumber: string,
  stats: FetchStats,
): Promise<CompanyProfilePayload | null> {
  const res = await chFetch('/company/' + encodeURIComponent(companyNumber), stats);
  if (!res.data) return null;
  return parseCompanyProfile(res.data);
}

/**
 * Search the register for a company and decide, or refuse.
 *
 * Both our display name and our legal name are searched when they differ, and
 * candidates are scored against their CURRENT and FORMER registered names.
 * Everything that matters here is in resolver.ts; this function only pays for
 * the requests.
 */
export async function resolveUkCompany(
  known: KnownCompany,
  stats: FetchStats,
): Promise<ResolutionOutcome> {
  const queries = [known.name];
  if (known.legalName && known.legalName !== known.name) queries.push(known.legalName);

  const seen = new Set<string>();
  const candidates: CompanyProfilePayload[] = [];

  for (const query of queries) {
    const res = await chFetch(
      '/search/companies?items_per_page=20&q=' + encodeURIComponent(query),
      stats,
    );
    if (!res.data) continue;
    const allHits = parseCompanySearch(res.data);
    let hits = prefilterSearchHits(known, allHits);
    if (hits.length === 0) {
      // Nothing resembles us by current name. The company may have been
      // renamed, so look at the top few in full and let the scorer decide.
      hits = allHits.slice(0, FORMER_NAME_PROBE_LIMIT);
    }
    for (const hit of hits) {
      if (seen.has(hit.companyNumber)) continue;
      seen.add(hit.companyNumber);
      const profile = await fetchCompanyProfile(hit.companyNumber, stats);
      if (profile) candidates.push(profile);
    }
  }

  return chooseCandidate(known, candidates);
}

// ---------------------------------------------------------------------------
// Status-change detection
// ---------------------------------------------------------------------------

export interface StatusEventDraft {
  field: string;
  previousValue: string | null;
  newValue: string | null;
  isBaseline: boolean;
  effectiveOn: Date | null;
  filingTransactionId: string | null;
  filingDescription: string | null;
}

/**
 * Compare the register entry we stored last time with the one we just read,
 * and emit a dated row for anything that moved.
 *
 * The first sight of a company produces BASELINE rows, not change rows: we
 * did not watch it change, we simply started watching. Presenting a baseline
 * as a change would date every company's status to the day we first looked,
 * which is exactly the kind of quiet fiction this table exists to prevent.
 *
 * Where the register publishes a filing that evidences the change, that
 * filing's date is used as `effectiveOn` and its id is recorded. Where it does
 * not, `effectiveOn` stays null and only `detectedAt` is claimed.
 */
/**
 * Within how long a stretch consecutive filings of the same category count as
 * one episode. Orbex's administration ran AM01 (2026-03-06) to AM02
 * (2026-07-02); a company that was wound up once in 2011 and again in 2024 has
 * two separate episodes and the old one must not date the new status.
 */
const EPISODE_WINDOW_DAYS = 730;

/**
 * The filing that STARTED the episode producing the current status.
 *
 * The obvious choice - the most recent status filing - is wrong, and wrong in
 * the direction that matters. Orbex's newest insolvency filing is the
 * statement of affairs on 2026-07-02, but the company entered administration
 * on 2026-03-06 when the administrator was appointed (AM01). Dating the status
 * change to July would be four months late on precisely the fact a Research
 * buyer is paying for.
 *
 * So: take the newest status filing, then walk back through filings of the
 * same category while they stay within EPISODE_WINDOW_DAYS of each other, and
 * return the earliest one reached.
 *
 * WITH ONE EXCEPTION, because the two kinds of episode run opposite ways.
 * An insolvency STARTS at the event that changes the status - the company is
 * in administration from the day the administrator is appointed, and
 * everything filed afterwards documents a status it already has. A strike-off
 * ENDS at it: the gazette notice of intent opens a process the company is
 * still alive during, and it is dissolved only when the final notice runs.
 * Walking back to the first gazette notice would have dated Rebellion Defence
 * as dissolved eleven weeks before it was. So gazette-category episodes are
 * dated by their newest filing, not their earliest.
 *
 * The full chain is kept in UkCompanyFiling either way - this only decides
 * which date the status event itself carries.
 *
 * `filings` must be sorted newest first.
 */
const PROCESS_ENDS_IN_STATUS = new Set(['gazette', 'dissolution']);

export function episodeStartFiling(filings: FilingRecord[]): FilingRecord | undefined {
  const newest = filings[0];
  if (!newest) return undefined;
  if (PROCESS_ENDS_IN_STATUS.has((newest.category ?? '').toLowerCase())) return newest;
  let start = newest;
  for (const filing of filings.slice(1)) {
    if (filing.category !== newest.category) continue;
    const gapMs = toDate(start.date)!.getTime() - toDate(filing.date)!.getTime();
    if (gapMs > EPISODE_WINDOW_DAYS * DAY_MS) break;
    start = filing;
  }
  return start;
}

export function diffRegistration(
  previous: {
    companyStatus: string;
    registeredName: string;
    registeredOffice: string | null;
    accountsOverdue: boolean;
  } | null,
  next: CompanyProfilePayload,
  statusFilings: FilingRecord[],
): StatusEventDraft[] {
  const drafts: StatusEventDraft[] = [];

  const datedStatusFilings = statusFilings
    .filter((f) => f.date)
    .sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1));
  const newestStatusFiling = episodeStartFiling(datedStatusFilings);

  const push = (
    field: string,
    previousValue: string | null,
    newValue: string | null,
    withFiling: boolean,
  ) => {
    drafts.push({
      field,
      previousValue,
      newValue,
      isBaseline: previous === null,
      effectiveOn: withFiling ? toDate(newestStatusFiling?.date ?? null) : null,
      filingTransactionId: withFiling ? newestStatusFiling?.transactionId ?? null : null,
      filingDescription: withFiling ? newestStatusFiling?.description ?? null : null,
    });
  };

  if (!previous) {
    push('company_status', null, next.companyStatus, next.companyStatus !== 'active');
    return drafts;
  }

  if (previous.companyStatus !== next.companyStatus) {
    push('company_status', previous.companyStatus, next.companyStatus, true);
  }
  if (previous.registeredName !== next.companyName) {
    push('company_name', previous.registeredName, next.companyName, false);
  }
  if ((previous.registeredOffice ?? null) !== (next.registeredOfficeLine ?? null)) {
    push('registered_office', previous.registeredOffice, next.registeredOfficeLine, false);
  }
  if (previous.accountsOverdue !== next.accountsOverdue) {
    push(
      'accounts_overdue',
      String(previous.accountsOverdue),
      String(next.accountsOverdue),
      false,
    );
  }

  return drafts;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export interface UkRegistrySyncOptions {
  /** Process at most this many companies in one run. */
  limit?: number;
  /** Ignore the stored cursor and start from the beginning. */
  restart?: boolean;
  /** Read and report, write nothing. */
  dryRun?: boolean;
  /** Restrict to these CompanyProfile slugs (debugging a single company). */
  slugs?: string[];
  /** Re-ask the register about companies that previously did not resolve. */
  retryMisses?: boolean;
}

export interface UkRegistrySyncResult {
  companiesConsidered: number;
  resolved: number;
  alreadyLinked: number;
  refused: number;
  officersWritten: number;
  pscWritten: number;
  filingsWritten: number;
  statusEvents: number;
  personnelCreated: number;
  profileFieldsFilled: number;
  completenessRecomputed: number;
  /** Register status that contradicts our own editorial status. */
  statusContradictions: string[];
  /** Slugs that could not be resolved this run, with the reason. */
  unresolved: string[];
  httpErrors: number;
  requests: number;
  minRateLimitRemaining: number | null;
  cursor: string | null;
  complete: boolean;
}

function emptyResult(): UkRegistrySyncResult {
  return {
    companiesConsidered: 0,
    resolved: 0,
    alreadyLinked: 0,
    refused: 0,
    officersWritten: 0,
    pscWritten: 0,
    filingsWritten: 0,
    statusEvents: 0,
    personnelCreated: 0,
    profileFieldsFilled: 0,
    completenessRecomputed: 0,
    statusContradictions: [],
    unresolved: [],
    httpErrors: 0,
    requests: 0,
    minRateLimitRemaining: null,
    cursor: null,
    complete: false,
  };
}

/**
 * The full sweep: resolve each UK-domiciled company to a company number, read
 * its register entry, and write the enrichment with provenance.
 *
 * Resumable by CompanyProfile.slug (the cursor lives in DataSourceRun), so a
 * run killed halfway restarts where it stopped rather than re-spending the
 * rate-limit window on companies it already did.
 */
export async function syncUkRegistry(
  opts: UkRegistrySyncOptions = {},
): Promise<UkRegistrySyncResult> {
  const stats = newFetchStats();
  const result = emptyResult();

  const cursor = opts.restart ? null : await resumeCursor(UK_REGISTRY_SOURCE_KEY);
  const runId = await startRun(UK_REGISTRY_SOURCE_KEY, cursor);
  let fatal: unknown = null;

  try {
    if (!hasCompaniesHouseKey()) {
      // Not an exception: a missing key is a configuration fact, and the run
      // ledger must say so plainly rather than logging a stack trace. The
      // freshness check turns this into a page.
      throw new Error(
        'COMPANIES_HOUSE_API_KEY is not set in this environment - the UK register sweep cannot run.',
      );
    }

    const satelliteSignalAvailable = await satelliteAssetSignalAvailable();

    await withCompaniesHouseBreaker(async () => {
      // The UK gate is applied in SQL, not after the fact: a `take` over the
      // whole 331-row roster would spend a slice on companies that are not in
      // scope and the cursor would crawl.
      const roster = await prisma.companyProfile.findMany({
        where: {
          AND: [
            ...(opts.slugs?.length ? [{ slug: { in: opts.slugs } }] : []),
            ...(cursor ? [{ slug: { gt: cursor } }] : []),
            {
              OR: [
                ...UK_COUNTRY_VALUES.map((value) => ({
                  country: { equals: value, mode: 'insensitive' as const },
                })),
                // A human-verified pin is always in scope, even if our own
                // country field is wrong or missing.
                { slug: { in: MANUAL_REGISTRATIONS.map((m) => m.slug) } },
              ],
            },
          ],
        },
        orderBy: { slug: 'asc' },
        ...(opts.limit ? { take: opts.limit } : {}),
        select: {
          id: true,
          slug: true,
          name: true,
          legalName: true,
          country: true,
          headquarters: true,
          foundedYear: true,
          status: true,
        },
      });

      if (roster.length === 0) {
        result.complete = true;
        return;
      }

      for (const company of roster) {
        result.cursor = company.slug;

        const manual = manualRegistrationFor(company.slug);
        result.companiesConsidered++;

        const existing = await prisma.ukCompanyRegistration.findUnique({
          where: { companyId: company.id },
          select: {
            id: true,
            companyNumber: true,
            companyStatus: true,
            registeredName: true,
            registeredOffice: true,
            accountsOverdue: true,
          },
        });

        let resolved: ResolvedRegistration | null = null;

        if (existing) {
          // Already linked: refresh the register entry, never re-resolve. The
          // link is a claim a human may have made; a later sweep must not
          // quietly replace it.
          const profile = await fetchCompanyProfile(existing.companyNumber, stats);
          if (!profile) {
            // The register did not answer for a number we already hold. That
            // is a feed problem, not a resolution decision, and it must not
            // disappear into a silent `continue`.
            result.unresolved.push(
              company.slug + ': register did not return company ' + existing.companyNumber +
                ' on refresh',
            );
            continue;
          }
          resolved = {
            profile,
            matchQuality: 'existing',
            matchMethod: 'search',
            matchScore: null,
            matchEvidence: {},
          };
          result.alreadyLinked++;
        } else if (manual) {
          const profile = await fetchCompanyProfile(manual.companyNumber, stats);
          if (!profile) {
            result.unresolved.push(
              company.slug + ': register did not return pinned company ' + manual.companyNumber,
            );
            continue;
          }
          resolved = {
            profile,
            matchQuality: 'manual',
            matchMethod: 'manual',
            matchScore: null,
            matchEvidence: {
              evidence: manual.evidence,
              sources: manual.sources,
              verifiedOn: manual.verifiedOn,
              registeredNameWhenPinned: manual.registeredName,
            },
          };
          result.resolved++;
        } else {
          // Did we already search and come up empty recently?
          if (!opts.retryMisses) {
            const miss = await prisma.dataProvenance.findUnique({
              where: {
                entity_entityId_field_source: {
                  entity: 'CompanyProfile',
                  entityId: company.id,
                  field: 'ukCompanyNumber',
                  source: NUMBER_SEARCH_SOURCE,
                },
              },
              select: { value: true, verifiedAt: true },
            });
            if (
              miss &&
              miss.value === null &&
              miss.verifiedAt &&
              Date.now() - miss.verifiedAt.getTime() < MISS_TTL_DAYS * DAY_MS
            ) {
              result.unresolved.push(company.slug + ': cached miss');
              continue;
            }
          }

          const known: KnownCompany = {
            name: company.name,
            legalName: company.legalName,
            headquarters: company.headquarters,
            foundedYear: company.foundedYear,
            status: company.status,
          };
          const outcome = await resolveUkCompany(known, stats);

          if (!outcome.accepted) {
            result.refused++;
            result.unresolved.push(company.slug + ': ' + (outcome.refusedBecause ?? 'refused'));
            if (!opts.dryRun) {
              // NULL value = searched, nothing cleared the bar, as of
              // verifiedAt. The reason is stored so a human can read why.
              await recordProvenance({
                entity: 'CompanyProfile',
                entityId: company.id,
                field: 'ukCompanyNumber',
                value: null,
                source: NUMBER_SEARCH_SOURCE,
                sourceRef: (outcome.refusedBecause ?? '').slice(0, 400),
                method: 'official-filing',
                observedAt: new Date(),
              });
            }
            continue;
          }

          const full = await fetchCompanyProfile(outcome.accepted.companyNumber, stats);
          if (!full) {
            result.unresolved.push(
              company.slug + ': register did not return accepted company ' +
                outcome.accepted.companyNumber,
            );
            continue;
          }
          resolved = {
            profile: full,
            matchQuality: outcome.accepted.nameQuality,
            matchMethod: 'search',
            matchScore: outcome.accepted.score,
            matchEvidence: {
              matchedName: outcome.accepted.matchedName,
              sicVerdict: outcome.accepted.sicVerdict,
              evidence: outcome.accepted.evidence,
              rejected: outcome.considered
                .filter((c) => c.companyNumber !== outcome.accepted!.companyNumber)
                .map((c) => ({
                  companyNumber: c.companyNumber,
                  registeredName: c.registeredName,
                  score: c.score,
                  disqualifiedBecause: c.disqualifiedBecause,
                })),
              consideredCount: outcome.considered.length,
            },
          };
          result.resolved++;
        }

        // A dry run stops here having reported what it WOULD do.
        if (!resolved || opts.dryRun) continue;

        await persistRegistration(company, resolved, existing, stats, result);

        // ── Recompute completeness from the live row ──────────────────────
        const scored = await prisma.companyProfile.findUnique({
          where: { id: company.id },
          select: { ...COMPLETENESS_SCALAR_SELECT, _count: { select: COMPLETENESS_COUNT_SELECT } },
        });
        if (scored) {
          const score = calculateCompleteness(scored, { satelliteSignalAvailable });
          if (score !== scored.dataCompleteness) {
            await prisma.companyProfile.update({
              where: { id: company.id },
              data: { dataCompleteness: score },
            });
          }
          result.completenessRecomputed++;
        }
      }

      if (!opts.limit || roster.length < opts.limit) result.complete = true;
    });
  } catch (err) {
    fatal = err;
    logger.error('UK registry sync failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    result.httpErrors = stats.httpErrors;
    result.requests = stats.requests;
    result.minRateLimitRemaining = stats.minRemaining;
    await finishRun(
      runId,
      {
        itemsSeen: result.companiesConsidered,
        itemsWritten:
          result.resolved + result.alreadyLinked + result.officersWritten + result.pscWritten,
        httpErrors: stats.httpErrors,
        cursor: result.cursor,
        complete: result.complete,
        detail: {
          resolved: result.resolved,
          alreadyLinked: result.alreadyLinked,
          refused: result.refused,
          officersWritten: result.officersWritten,
          pscWritten: result.pscWritten,
          filingsWritten: result.filingsWritten,
          statusEvents: result.statusEvents,
          personnelCreated: result.personnelCreated,
          profileFieldsFilled: result.profileFieldsFilled,
          statusContradictions: result.statusContradictions.slice(0, 50),
          unresolved: result.unresolved.slice(0, 50),
          requests: stats.requests,
          rateLimitWaits: stats.rateLimitWaits,
          minRateLimitRemaining: stats.minRemaining,
          lastError: stats.lastError,
          dryRun: Boolean(opts.dryRun),
        },
      },
      fatal,
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

interface RosterRow {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  foundedYear: number | null;
  status: string;
}

async function persistRegistration(
  company: RosterRow,
  resolved: ResolvedRegistration,
  existing: {
    companyStatus: string;
    registeredName: string;
    registeredOffice: string | null;
    accountsOverdue: boolean;
  } | null,
  stats: FetchStats,
  result: UkRegistrySyncResult,
): Promise<void> {
  const p = resolved.profile;
  const now = new Date();
  const observedAt = toDate(p.dateOfCreation) ?? now;

  // ── Filing history first: it dates any status change we are about to see ──
  const filingsRes = await chFetch(
    '/company/' + encodeURIComponent(p.companyNumber) + '/filing-history?items_per_page=100',
    stats,
  );
  const filings = filingsRes.data ? parseFilingHistory(filingsRes.data, p.companyNumber) : [];
  const statusFilings = filings.filter(isStatusFiling);

  const drafts = diffRegistration(existing, p, statusFilings);

  await prisma.ukCompanyRegistration.upsert({
    where: { companyNumber: p.companyNumber },
    update: {
      companyId: company.id,
      companySlug: company.slug,
      companyName: company.name,
      registeredName: p.companyName,
      companyStatus: p.companyStatus,
      companyStatusDetail: p.companyStatusDetail,
      companyType: p.companyType,
      jurisdiction: p.jurisdiction,
      dateOfCreation: toDate(p.dateOfCreation),
      dateOfCessation: toDate(p.dateOfCessation),
      sicCodes: p.sicCodes,
      registeredOffice: p.registeredOfficeLine,
      previousNames: p.previousNames as unknown as object,
      hasInsolvencyHistory: p.hasInsolvencyHistory,
      hasCharges: p.hasCharges,
      canFile: p.canFile,
      accountsNextDue: toDate(p.accountsNextDue),
      accountsLastMadeUpTo: toDate(p.accountsLastMadeUpTo),
      accountsOverdue: p.accountsOverdue,
      confirmationStatementNextDue: toDate(p.confirmationStatementNextDue),
      confirmationStatementOverdue: p.confirmationStatementOverdue,
      sourceUrl: p.sourceUrl,
      lastCheckedAt: now,
      ...(drafts.length > 0 ? { observedAt: now } : {}),
    },
    create: {
      companyId: company.id,
      companySlug: company.slug,
      companyName: company.name,
      companyNumber: p.companyNumber,
      registeredName: p.companyName,
      matchQuality: resolved.matchQuality,
      matchMethod: resolved.matchMethod,
      matchScore: resolved.matchScore,
      matchEvidence: resolved.matchEvidence as unknown as object,
      companyStatus: p.companyStatus,
      companyStatusDetail: p.companyStatusDetail,
      companyType: p.companyType,
      jurisdiction: p.jurisdiction,
      dateOfCreation: toDate(p.dateOfCreation),
      dateOfCessation: toDate(p.dateOfCessation),
      sicCodes: p.sicCodes,
      registeredOffice: p.registeredOfficeLine,
      previousNames: p.previousNames as unknown as object,
      hasInsolvencyHistory: p.hasInsolvencyHistory,
      hasCharges: p.hasCharges,
      canFile: p.canFile,
      accountsNextDue: toDate(p.accountsNextDue),
      accountsLastMadeUpTo: toDate(p.accountsLastMadeUpTo),
      accountsOverdue: p.accountsOverdue,
      confirmationStatementNextDue: toDate(p.confirmationStatementNextDue),
      confirmationStatementOverdue: p.confirmationStatementOverdue,
      sourceUrl: p.sourceUrl,
      observedAt,
      lastCheckedAt: now,
    },
  });

  await recordProvenance({
    entity: 'CompanyProfile',
    entityId: company.id,
    field: 'ukCompanyNumber',
    // The registered name and how it was matched are recorded alongside the
    // number: a wrong number is the one mistake that would staple another
    // company's officers and insolvency onto ours, so an auditor must be able
    // to re-check the match without re-running the resolver.
    value: {
      companyNumber: p.companyNumber,
      registeredName: p.companyName,
      matchQuality: resolved.matchQuality,
      matchMethod: resolved.matchMethod,
      matchScore: resolved.matchScore,
    },
    source: NUMBER_SEARCH_SOURCE,
    sourceUrl: companiesHouseCompanyUrl(p.companyNumber),
    sourceRef: p.companyNumber,
    method: resolved.matchMethod === 'manual' ? 'manual' : 'official-filing',
    observedAt: now,
  });

  // ── Status events ────────────────────────────────────────────────────────
  for (const draft of drafts) {
    const effectiveOnKey = draft.effectiveOn
      ? draft.effectiveOn.toISOString().slice(0, 10)
      : 'undated';
    await prisma.ukCompanyStatusEvent.upsert({
      where: {
        companyNumber_field_newValue_effectiveOnKey: {
          companyNumber: p.companyNumber,
          field: draft.field,
          newValue: draft.newValue ?? '',
          effectiveOnKey,
        },
      },
      // Only the observation time moves on a re-sight; the change itself
      // keeps the date the register gave it.
      update: { detectedAt: now },
      create: {
        companyNumber: p.companyNumber,
        companyId: company.id,
        companySlug: company.slug,
        field: draft.field,
        previousValue: draft.previousValue,
        newValue: draft.newValue ?? '',
        isBaseline: draft.isBaseline,
        effectiveOn: draft.effectiveOn,
        effectiveOnKey,
        detectedAt: now,
        filingTransactionId: draft.filingTransactionId,
        filingDescription: draft.filingDescription,
        sourceUrl: p.sourceUrl,
      },
    });
    result.statusEvents++;
  }

  // ── Does the register contradict our editorial status? ───────────────────
  // Never resolved automatically. CompanyProfile.status is an editorial claim
  // about whether a business trades; the register's status is a legal fact
  // about an entity. They can legitimately differ (a company in
  // administration is still trading while it is sold), so the disagreement is
  // surfaced for a human rather than silently overwritten either way.
  const registerDead = ['dissolved', 'liquidation', 'administration', 'receivership'].includes(
    p.companyStatus,
  );
  if (registerDead && company.status === 'active') {
    result.statusContradictions.push(
      company.slug + ': we record "active", the register records "' + p.companyStatus + '" (' +
        p.sourceUrl + ')',
    );
  } else if (!registerDead && p.companyStatus === 'active' && company.status === 'defunct') {
    result.statusContradictions.push(
      company.slug + ': we record "defunct", the register records the company as active (' +
        p.sourceUrl + ')',
    );
  }

  // ── Filings ──────────────────────────────────────────────────────────────
  for (const filing of filings) {
    await prisma.ukCompanyFiling.upsert({
      where: {
        companyNumber_transactionId: {
          companyNumber: p.companyNumber,
          transactionId: filing.transactionId,
        },
      },
      update: { observedAt: now },
      create: {
        companyNumber: p.companyNumber,
        companyId: company.id,
        companySlug: company.slug,
        transactionId: filing.transactionId,
        category: filing.category,
        subcategory: filing.subcategory,
        type: filing.type,
        description: filing.description,
        filingDate: toDate(filing.date),
        paperFiled: filing.paperFiled,
        isStatusFiling: isStatusFiling(filing),
        sourceUrl: filing.sourceUrl,
        observedAt: now,
      },
    });
    result.filingsWritten++;
  }

  // ── Officers ─────────────────────────────────────────────────────────────
  const officersRes = await chFetch(
    '/company/' + encodeURIComponent(p.companyNumber) + '/officers?items_per_page=100',
    stats,
  );
  const officers = officersRes.data ? parseOfficers(officersRes.data, p.companyNumber) : [];
  for (const officer of officers) {
    await prisma.ukCompanyOfficer.upsert({
      where: {
        companyNumber_appointmentId: {
          companyNumber: p.companyNumber,
          appointmentId: officer.appointmentId,
        },
      },
      update: {
        name: officer.name,
        officerRole: officer.officerRole,
        appointedOn: toDate(officer.appointedOn),
        resignedOn: toDate(officer.resignedOn),
        isCurrent: !officer.resignedOn,
        nationality: officer.nationality,
        countryOfResidence: officer.countryOfResidence,
        occupation: officer.occupation,
        isCorporate: officer.isCorporate,
        observedAt: now,
      },
      create: {
        companyNumber: p.companyNumber,
        companyId: company.id,
        companySlug: company.slug,
        appointmentId: officer.appointmentId,
        name: officer.name,
        officerRole: officer.officerRole,
        appointedOn: toDate(officer.appointedOn),
        resignedOn: toDate(officer.resignedOn),
        isCurrent: !officer.resignedOn,
        nationality: officer.nationality,
        countryOfResidence: officer.countryOfResidence,
        occupation: officer.occupation,
        isCorporate: officer.isCorporate,
        sourceUrl: officer.sourceUrl,
        observedAt: now,
      },
    });
    result.officersWritten++;
  }

  // Serving directors become KeyPersonnel, the same way Form D's related
  // persons do. Officially sourced, so this is real profile depth rather than
  // a completeness trick. Resigned officers and secretaries are not leadership
  // and are kept only in UkCompanyOfficer.
  for (const officer of officers) {
    if (officer.resignedOn) continue;
    if (!officer.officerRole || !LEADERSHIP_ROLES.test(officer.officerRole)) continue;
    const already = await prisma.keyPersonnel.findFirst({
      where: { companyId: company.id, name: officer.name },
      select: { id: true },
    });
    if (already) continue;
    const row = await prisma.keyPersonnel.create({
      data: {
        companyId: company.id,
        name: officer.name,
        title: officer.officerRole,
        role: 'board',
        previousCompanies: [],
        isCurrent: true,
      },
      select: { id: true },
    });
    result.personnelCreated++;
    await recordProvenance({
      entity: 'KeyPersonnel',
      entityId: row.id,
      field: 'name',
      value: officer.name,
      source: UK_REGISTRY_SOURCE_LABEL,
      sourceUrl: officer.sourceUrl,
      sourceRef: p.companyNumber + '/' + officer.appointmentId,
      method: 'official-filing',
      observedAt: toDate(officer.appointedOn) ?? now,
    });
  }

  // ── Persons with significant control ─────────────────────────────────────
  const pscRes = await chFetch(
    '/company/' + encodeURIComponent(p.companyNumber) +
      '/persons-with-significant-control?items_per_page=100',
    stats,
  );
  // A 404 here is normal and meaningful: plenty of companies have no PSC
  // register entry at all. It must not read as a failure.
  const pscs = pscRes.data ? parsePsc(pscRes.data, p.companyNumber) : [];
  for (const psc of pscs) {
    await prisma.ukCompanyPsc.upsert({
      where: {
        companyNumber_pscId: { companyNumber: p.companyNumber, pscId: psc.pscId },
      },
      update: {
        name: psc.name,
        kind: psc.kind,
        naturesOfControl: psc.naturesOfControl,
        notifiedOn: toDate(psc.notifiedOn),
        ceasedOn: toDate(psc.ceasedOn),
        ceased: psc.ceased,
        nationality: psc.nationality,
        countryOfResidence: psc.countryOfResidence,
        isCorporate: psc.isCorporate,
        observedAt: now,
      },
      create: {
        companyNumber: p.companyNumber,
        companyId: company.id,
        companySlug: company.slug,
        pscId: psc.pscId,
        name: psc.name,
        kind: psc.kind,
        naturesOfControl: psc.naturesOfControl,
        notifiedOn: toDate(psc.notifiedOn),
        ceasedOn: toDate(psc.ceasedOn),
        ceased: psc.ceased,
        nationality: psc.nationality,
        countryOfResidence: psc.countryOfResidence,
        isCorporate: psc.isCorporate,
        sourceUrl: psc.sourceUrl,
        observedAt: now,
      },
    });
    result.pscWritten++;
  }

  // ── Fill gaps on the profile itself, never overwrite ─────────────────────
  const fill: Record<string, unknown> = {};
  const incorporationYear = p.dateOfCreation ? Number(p.dateOfCreation.slice(0, 4)) : null;
  if (!company.foundedYear && incorporationYear) fill.foundedYear = incorporationYear;
  if (!company.legalName) fill.legalName = p.companyName;

  if (Object.keys(fill).length > 0) {
    await prisma.companyProfile.update({ where: { id: company.id }, data: fill });
    for (const [field, value] of Object.entries(fill)) {
      await recordProvenance({
        entity: 'CompanyProfile',
        entityId: company.id,
        field,
        value,
        source: UK_REGISTRY_SOURCE_LABEL,
        sourceUrl: p.sourceUrl,
        sourceRef: p.companyNumber,
        method: 'official-filing',
        observedAt: toDate(p.dateOfCreation) ?? now,
      });
      result.profileFieldsFilled++;
    }
  }
}
