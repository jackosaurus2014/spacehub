import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { syncFormDFunding } from '@/lib/fetchers/sec-form-d-fetcher';
import { syncEdgarCompanyFacts } from '@/lib/fetchers/edgar-company-facts-fetcher';

/**
 * The nightly slice of the SEC EDGAR funding and filer-record sweeps.
 *
 * Both syncs are resumable by CompanyProfile.slug (the cursor lives in
 * DataSourceRun), so this route deliberately walks only a slice per night and
 * lets the roster come round on a rolling basis. That keeps every run well
 * inside the function timeout, keeps us far under SEC's 10 req/s fair-access
 * ceiling, and means a new Form D is picked up within one lap of the roster
 * rather than needing a special backfill.
 *
 * It also exists so `funding-feeds-alive` in src/lib/content-accuracy.ts has
 * something real to watch: a silent fetcher is the failure this whole design
 * is built against.
 *
 * Manual slice:
 *   curl -XPOST -H "Authorization: Bearer $CRON_SECRET" \
 *     "$BASE/api/cron/funding-sync?companies=40"
 * Full backfill (resumable, for a first run or after a long outage):
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-form-d-funding.ts --apply --all
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Companies per nightly slice. 331 profiles / 40 = a lap every ~8 nights. */
const DEFAULT_SLICE = 40;

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const slice = Math.min(
    200,
    Math.max(1, Number(new URL(request.url).searchParams.get('companies') ?? DEFAULT_SLICE)),
  );
  const started = Date.now();

  // Sequential, never parallel: both syncs share SEC's per-requester rate
  // budget, and the pacing in sec-form-d-fetcher.ts is per-process.
  const formD = await syncFormDFunding({ limit: slice });
  const facts = await syncEdgarCompanyFacts({ limit: slice });

  const result = {
    success: true,
    slice,
    formD: {
      considered: formD.companiesConsidered,
      matched: formD.companiesMatched,
      filings: formD.filingsSeen,
      created: formD.roundsCreated,
      enriched: formD.roundsEnriched,
      personnel: formD.personnelCreated,
      httpErrors: formD.httpErrors,
      cursor: formD.cursor,
      complete: formD.complete,
    },
    companyFacts: {
      considered: facts.companiesConsidered,
      withCik: facts.companiesWithCik,
      fieldsFilled: facts.fieldsFilled,
      filingsWritten: facts.filingsWritten,
      derivedUpdated: facts.derivedUpdated,
      scored: facts.completenessRecomputed,
      httpErrors: facts.httpErrors,
      cursor: facts.cursor,
      complete: facts.complete,
    },
    ms: Date.now() - started,
  };

  logger.info('funding-sync: done', result as unknown as Record<string, unknown>);
  return NextResponse.json(result);
}
