import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { syncUkRegistry } from '@/lib/fetchers/companies-house-fetcher';

/**
 * The nightly UK Companies House sweep.
 *
 * The sync is resumable by CompanyProfile.slug (the cursor lives in
 * DataSourceRun), so this route walks a slice per night and lets the
 * UK-domiciled roster come round on a rolling basis. Companies House allows
 * 600 requests per five-minute window and suspends keys that push at it; a
 * slice keeps every run inside one window with room to spare, and a new
 * insolvency filing is still picked up within a lap.
 *
 * It also exists so `uk-registry-alive` in src/lib/content-accuracy.ts has
 * something real to watch. A silent fetcher is the failure this whole design
 * is built against - and this one has a specific way to go silent, because
 * COMPANIES_HOUSE_API_KEY lives only in Railway: an environment that has not
 * been redeployed since the key was added will run this route and resolve
 * nothing at all. syncUkRegistry treats a missing key as a fatal run rather
 * than an empty one, precisely so that case pages someone.
 *
 * Manual slice:
 *   curl -XPOST -H "Authorization: Bearer $CRON_SECRET" \
 *     "$BASE/api/cron/uk-registry-sync?companies=10"
 * Full pass (resumable, for a first run or after a long outage):
 *   railway ssh -s spacehub -- npx tsx scripts/backfill-companies-house.ts --apply
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Companies per nightly slice. Each company costs roughly five requests
 * (search, candidate profiles, filing history, officers, PSC), so 12 is about
 * 60 requests - a tenth of one rate-limit window.
 */
const DEFAULT_SLICE = 12;

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const slice = Math.min(
    100,
    Math.max(1, Number(params.get('companies') ?? DEFAULT_SLICE)),
  );
  const started = Date.now();

  const sync = await syncUkRegistry({
    limit: slice,
    restart: params.get('restart') === '1',
    retryMisses: params.get('retryMisses') === '1',
  });

  const result = {
    success: true,
    slice,
    uk: {
      considered: sync.companiesConsidered,
      resolved: sync.resolved,
      alreadyLinked: sync.alreadyLinked,
      refused: sync.refused,
      officers: sync.officersWritten,
      psc: sync.pscWritten,
      filings: sync.filingsWritten,
      statusEvents: sync.statusEvents,
      personnel: sync.personnelCreated,
      profileFieldsFilled: sync.profileFieldsFilled,
      completenessRecomputed: sync.completenessRecomputed,
      statusContradictions: sync.statusContradictions,
      unresolved: sync.unresolved,
      requests: sync.requests,
      minRateLimitRemaining: sync.minRateLimitRemaining,
      httpErrors: sync.httpErrors,
      cursor: sync.cursor,
      complete: sync.complete,
    },
    ms: Date.now() - started,
  };

  logger.info('uk-registry-sync: done', result as unknown as Record<string, unknown>);
  return NextResponse.json(result);
}
