import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { createSuccessResponse, internalError, requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { resolveResearchAccess } from '@/lib/research';
import { sendResearchScreenAlert } from '@/lib/research-email';
import {
  describeScreenCriteria,
  newResultIds,
  runResearchScreen,
  type ResearchScreenCriteria,
} from '@/lib/research-screens';

export const dynamic = 'force-dynamic';

/** Weekly cadence, enforced here rather than trusted from the cron schedule. */
const MIN_HOURS_BETWEEN_ALERTS = 6 * 24;
/** Safety valve so one bad run cannot mail the whole table. */
const MAX_SCREENS_PER_RUN = 500;

/**
 * Weekly screen alerts.
 *
 * Two rules the whole feature rests on:
 *
 *   1. AUTHORIZATION IS RE-CHECKED PER SCREEN. A cron job is exactly where a
 *      lapsed subscription keeps receiving paid intelligence for months.
 *      resolveResearchAccess runs for every screen owner on every pass, so a
 *      cancelled subscriber or a revoked seat stops receiving alerts on the
 *      very next run.
 *
 *   2. NOTHING IS SENT WHEN NOTHING CHANGED. The email fires only on ids that
 *      were not in the previous result set.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const cutoff = new Date(Date.now() - MIN_HOURS_BETWEEN_ALERTS * 3_600_000);

  try {
    const screens = await prisma.researchScreen.findMany({
      where: {
        alertCadence: 'weekly',
        OR: [{ lastAlertAt: null }, { lastAlertAt: { lt: cutoff } }],
      },
      orderBy: { lastAlertAt: 'asc' },
      take: MAX_SCREENS_PER_RUN,
    });

    let evaluated = 0;
    let sent = 0;
    let skippedUnauthorized = 0;
    let unchanged = 0;

    // Owners repeat across screens; resolve each one once per pass.
    const accessCache = new Map<string, boolean>();

    for (const screen of screens) {
      let authorized = accessCache.get(screen.userId);
      if (authorized === undefined) {
        const result = await resolveResearchAccess(screen.userId);
        authorized = result.ok;
        accessCache.set(screen.userId, authorized);
      }
      if (!authorized) {
        skippedUnauthorized += 1;
        continue;
      }

      const user = await prisma.user.findUnique({
        where: { id: screen.userId },
        select: { email: true, emailVerified: true },
      });
      if (!user?.email || !user.emailVerified) {
        skippedUnauthorized += 1;
        continue;
      }

      const criteria = (screen.criteria ?? {}) as ResearchScreenCriteria;
      const result = await runResearchScreen(criteria);
      evaluated += 1;

      const added = newResultIds(screen.lastResultIds, result.resultIds);
      const isFirstRun = screen.lastRunAt === null;

      // A first run is a BASELINE, not an alert. Mailing every historical match
      // the first time a screen is saved is the fastest way to teach someone to
      // filter your alerts into the archive.
      if (added.length === 0 || isFirstRun) {
        unchanged += 1;
        await prisma.researchScreen.update({
          where: { id: screen.id },
          data: {
            lastRunAt: new Date(),
            lastResultCount: result.count,
            lastResultIds: result.resultIds,
          },
        });
        continue;
      }

      const addedSet = new Set(added);
      const ok = await sendResearchScreenAlert({
        to: user.email,
        screenName: screen.name,
        criteriaSummary: describeScreenCriteria(criteria),
        newRows: result.matches
          .filter((m) => addedSet.has(m.roundId))
          .map((m) => ({
            companyName: m.companyName,
            seriesLabel: m.seriesLabel,
            amountUsd: m.amountUsd,
            date: m.date,
            leadInvestor: m.leadInvestor,
          })),
        totalCount: result.count,
      });
      if (ok) sent += 1;

      await prisma.researchScreen.update({
        where: { id: screen.id },
        data: {
          lastRunAt: new Date(),
          lastResultCount: result.count,
          lastResultIds: result.resultIds,
          // Only a SENT alert advances lastAlertAt, so a Resend outage retries
          // on the next pass instead of silently swallowing a week.
          ...(ok ? { lastAlertAt: new Date() } : {}),
        },
      });
    }

    const summary = {
      considered: screens.length,
      evaluated,
      sent,
      unchanged,
      skippedUnauthorized,
    };
    logger.info('Research screen alerts run', summary);
    return createSuccessResponse(summary);
  } catch (error) {
    logger.error('Research screen alerts failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Research screen alert run failed.');
  }
}
