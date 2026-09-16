import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { syncSecInsiderSignals } from '@/lib/fetchers/sec-insider-fetcher';

/**
 * The nightly slice of the SEC insider / 5%-holder / filing-index sweep.
 *
 * Resumable by CompanyProfile.slug — the cursor lives in DataSourceRun — so
 * this route deliberately walks a slice per night and lets the tickered roster
 * come round on a rolling basis. That keeps every run inside the function
 * timeout and far under SEC's 10 req/s fair-access ceiling, which this sweep
 * shares with the Form D fetcher (scheduled in a different hour on purpose).
 *
 * Re-running is cheap by design: a company whose ownership documents are
 * already stored costs exactly one submissions request, so the roster is
 * re-checked every few nights and a new Form 4 lands within a lap.
 *
 * It also exists so `insider-feeds-alive` in src/lib/content-accuracy.ts has
 * something real to watch. A silent fetcher is the failure this whole design
 * is built against: two FCC fetchers sat dead for weeks behind a swallowed
 * 403, and the only symptom anyone saw was an empty tab.
 *
 * FIRST DEPLOY: run the backfill before the release is read, or the earliest
 * editions compute honestly but empty —
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-sec-insider.ts --apply --all
 *
 * Manual slice:
 *   curl -XPOST -H "Authorization: Bearer $CRON_SECRET" \
 *     "$BASE/api/cron/insider-sync?companies=15"
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Companies per nightly slice. Tickered profiles are a short roster. */
const DEFAULT_SLICE = 15;

/**
 * Cap on ownership documents fetched per company in one run, so one heavy
 * filer cannot consume the whole time budget. The cursor parks and the next
 * run continues where this one stopped.
 */
const MAX_DOCS_PER_COMPANY = 120;

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const slice = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('companies') ?? DEFAULT_SLICE)),
  );
  const started = Date.now();

  const res = await syncSecInsiderSignals({
    limit: slice,
    maxDocsPerCompany: MAX_DOCS_PER_COMPANY,
  });

  const result = {
    success: true,
    slice,
    insider: {
      considered: res.companiesConsidered,
      withCik: res.companiesWithCik,
      filingsIndexed: res.filingsIndexed,
      ownershipDocsParsed: res.ownershipDocsParsed,
      transactions: res.transactionsWritten,
      schedule13DocsParsed: res.schedule13DocsParsed,
      positions: res.positionsWritten,
      schedule13Unstructured: res.schedule13Unstructured,
      httpErrors: res.httpErrors,
      cursor: res.cursor,
      complete: res.complete,
      unmatched: res.unmatched,
    },
    ms: Date.now() - started,
  };

  logger.info('insider-sync: done', result as unknown as Record<string, unknown>);
  return NextResponse.json(result);
}
