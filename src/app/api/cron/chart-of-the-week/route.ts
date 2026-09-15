import { NextRequest } from 'next/server';
import { createSuccessResponse, requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { alertEmail } from '@/lib/notify-routing';
import { sendReleaseOverdueAlert } from '@/lib/research-email';
import {
  chartWeekKey,
  chartWeekLabel,
  listChartWeekEditions,
  missingChartWeeks,
  publishChartOfTheWeek,
  PUBLICATION_WEEKDAY_LABEL,
  PUBLICATION_TIME_UTC,
} from '@/lib/chart-week';

export const dynamic = 'force-dynamic';

/**
 * Pin this week's Chart of the Week.
 *
 * Fires every Wednesday. Freezing the series is the whole point: /chart/[slug]
 * redraws live data on every load, so without this the "chart of the week"
 * silently becomes the chart of whenever you happened to look. A pinned
 * edition keeps a permanent URL whose contents never move.
 *
 * Idempotent and immutable — a week already on the shelf is left exactly as it
 * is, so a catch-up run after a missed Wednesday cannot redraw last week with
 * this week's numbers. That also means a genuinely missed week stays missing,
 * which is why the run reports the gaps and alerts on them rather than
 * backfilling something that was never published.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const now = new Date();
  const result = await publishChartOfTheWeek(now);

  // Gaps: weeks with no edition, most recent first. The current week is
  // excluded from the alert when we just published it.
  const editions = await listChartWeekEditions(60);
  const gaps = missingChartWeeks(
    editions.map((e) => e.weekKey),
    now
  ).filter((week) => week !== chartWeekKey(now) || (!result.published && !result.alreadyPublished));

  let alerted = false;
  if (gaps.length > 0) {
    try {
      alerted = await sendReleaseOverdueAlert({
        to: alertEmail(),
        overdue: gaps.slice(0, 8).map((week) => ({
          title: 'Chart of the Week',
          periodLabel: `${week} (${chartWeekLabel(week)})`,
          dueAt: week,
          daysLate: 0,
          href: `/chart/week/${week}`,
          reason:
            week === chartWeekKey(now)
              ? result.reason ?? 'Not published'
              : 'No edition was published for this week',
        })),
      });
    } catch (error) {
      logger.error('Chart-of-the-week gap alert failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Chart of the Week run complete', {
    weekKey: result.weekKey,
    published: result.published,
    alreadyPublished: result.alreadyPublished,
    slug: result.slug,
    gaps: gaps.length,
  });

  return createSuccessResponse({
    ...result,
    weekLabel: chartWeekLabel(result.weekKey),
    schedule: `${PUBLICATION_WEEKDAY_LABEL} ${PUBLICATION_TIME_UTC}`,
    missingWeeks: gaps,
    alerted,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
