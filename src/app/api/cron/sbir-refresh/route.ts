import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { fetchSBIRSolicitations } from '@/lib/procurement/sbir-fetcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/cron/sbir-refresh
 *
 * Daily SBIR/STTR solicitation sync (2026-08-31 freshness audit, item 4).
 * src/lib/procurement/sbir-fetcher.ts existed for months but nothing ever
 * scheduled it — the SBIRSolicitation table held only the 12 seed rows from
 * /api/procurement/init.
 *
 * KNOWN UPSTREAM OUTAGE: sbir.gov's public API has returned 403 for all
 * clients since ~August 2026. The fetcher fails gracefully (circuit breaker
 * with a [] fallback — see createCircuitBreaker in src/lib/circuit-breaker.ts),
 * so this route reports success with fetched=0 and upstreamDown=true while the
 * API is dark. The cron is registered anyway so topics flow again with ZERO
 * code changes the moment sbir.gov recovers. The scheduler entry's generous
 * maxStaleMinutes (3 days) keeps the freshness watchdog quiet in the meantime.
 *
 * Idempotency: upsert keyed on topicNumber when present, else on
 * (agency, topicTitle) — the same dedupe rule /api/procurement/init uses.
 * Also flips isActive=false on any stored solicitation whose closeDate has
 * passed, so the /procurement SBIR tab never shows dead topics as open.
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  const startedAt = Date.now();

  try {
    // Fetcher returns [] on any upstream failure (403, timeout, open breaker).
    const solicitations = await fetchSBIRSolicitations({ open: true });

    let created = 0;
    let updated = 0;

    for (const s of solicitations) {
      try {
        const existing = await prisma.sBIRSolicitation.findFirst({
          where: s.topicNumber
            ? { topicNumber: s.topicNumber }
            : { agency: s.agency, topicTitle: s.topicTitle },
          select: { id: true },
        });

        const data = {
          program: s.program,
          agency: s.agency,
          topicNumber: s.topicNumber,
          topicTitle: s.topicTitle,
          description: s.description,
          phase: s.phase,
          awardAmount: s.awardAmount,
          openDate: s.openDate,
          closeDate: s.closeDate,
          url: s.url,
          keywords: s.keywords,
          isActive: s.isActive,
        };

        if (existing) {
          await prisma.sBIRSolicitation.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await prisma.sBIRSolicitation.create({ data });
          created++;
        }
      } catch (rowError) {
        logger.error('[cron/sbir-refresh] Failed to upsert solicitation', {
          topic: s.topicNumber || s.topicTitle,
          error: rowError instanceof Error ? rowError.message : String(rowError),
        });
      }
    }

    // Housekeeping runs even when upstream is down: close out expired topics.
    const { count: deactivated } = await prisma.sBIRSolicitation.updateMany({
      where: { isActive: true, closeDate: { lt: new Date() } },
      data: { isActive: false },
    });

    const upstreamDown = solicitations.length === 0;
    logger.info('[cron/sbir-refresh] Sync complete', {
      fetched: solicitations.length,
      created,
      updated,
      deactivated,
      upstreamDown,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      fetched: solicitations.length,
      created,
      updated,
      deactivated,
      // Honest signal for the admin freshness dashboard: 0 fetched almost
      // certainly means sbir.gov is still 403ing (it never legitimately has
      // zero open space-related topics across NASA + DoD).
      upstreamDown,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error('[cron/sbir-refresh] Sync failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'SBIR refresh failed' },
      { status: 500 }
    );
  }
}
