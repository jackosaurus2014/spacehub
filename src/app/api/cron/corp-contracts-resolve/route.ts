import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { resolveOverdueCorpContracts } from '@/lib/game/corp-contracts-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/corp-contracts-resolve — hourly at :40 (cron-scheduler.ts).
 *
 * Settles corp-to-corp supply contracts past their deadline (default:
 * collateral → issuer pro-rata on the undelivered share, delivered units
 * paid, remainder refunded, −2 reputation to the defaulter, public
 * `contract_defaulted` row), withdraws never-accepted contracts past their
 * deadline (escrow refunded), and expires pacts past `endsAt`. Idempotent —
 * every transition is a status-guarded updateMany, so the lazy sweep the
 * GET routes also run can never double-settle.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` — same as every /api/cron/*.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();
  try {
    const result = await resolveOverdueCorpContracts();
    const durationMs = Date.now() - startedAt;
    logger.info('corp-contracts-resolve cron completed', { ...result, durationMs });
    return NextResponse.json({ success: true, ...result, durationMs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('corp-contracts-resolve cron failed', { error: msg });
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
