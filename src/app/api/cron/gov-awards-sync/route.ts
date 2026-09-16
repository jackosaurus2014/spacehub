import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { syncFederalAwards, DEFAULT_SINCE } from '@/lib/fetchers/usaspending-awards-fetcher';

/**
 * The nightly slice of the USAspending federal-award sweep.
 *
 * The sync is resumable by CompanyProfile.slug (the cursor lives in
 * DataSourceRun), so this route deliberately walks only a slice per night and
 * lets the roster come round on a rolling basis. That keeps each run inside
 * the function timeout and keeps our request rate to a free public service
 * unhurried — roughly one request a second, a few hundred a night.
 *
 * A company whose sweep found nothing gets a FederalAwardCoverage row, which
 * is honoured for 30 days, so the roughly half of the roster that is non-US
 * costs three requests a month rather than three a night.
 *
 * It also exists so `funding-feeds-alive` and `federal-awards-usable` in
 * src/lib/content-accuracy.ts have something real to watch. A silent fetcher
 * is the failure this whole design is built against: two FCC fetchers sat dead
 * for weeks behind a swallowed 403 and the only symptom was an empty tab.
 *
 * Manual slice:
 *   curl -XPOST -H "Authorization: Bearer $CRON_SECRET" \
 *     "$BASE/api/cron/gov-awards-sync?companies=40"
 * One company, forced:
 *   ...?slugs=rocket-lab&force=true
 * Full backfill (resumable, for a first run or a widened window):
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-federal-awards.ts --apply --all
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Companies per nightly slice. Each company costs up to three searches plus
 * paging; 25 keeps a run comfortably inside maxDuration at a one-second pace,
 * and laps a 331-company roster in under a fortnight.
 */
const DEFAULT_SLICE = 25;

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const slice = Math.min(
    150,
    Math.max(1, Number(params.get('companies') ?? DEFAULT_SLICE) || DEFAULT_SLICE)
  );
  const slugs = (params.get('slugs') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const since = params.get('since') ?? undefined;
  const started = Date.now();

  const result = await syncFederalAwards({
    limit: slice,
    slugs: slugs.length ? slugs : undefined,
    since,
    force: params.get('force') === 'true',
    restart: params.get('restart') === 'true',
  });

  const payload = {
    success: true,
    slice,
    since: since ?? DEFAULT_SINCE,
    considered: result.companiesConsidered,
    searched: result.companiesSearched,
    skippedFresh: result.companiesSkippedFresh,
    skippedGenericName: result.companiesSkippedGenericName,
    companiesWithAwards: result.companiesWithAwards,
    recipientsSeen: result.recipientsSeen,
    recipientsRejected: result.recipientsRejected,
    awardsWritten: result.awardsWritten,
    dollarsWritten: Math.round(result.dollarsWritten),
    truncatedCompanies: result.truncatedCompanies,
    httpErrors: result.httpErrors,
    cursor: result.cursor,
    complete: result.complete,
    ms: Date.now() - started,
  };

  logger.info('gov-awards-sync: done', payload as unknown as Record<string, unknown>);
  return NextResponse.json(payload);
}
