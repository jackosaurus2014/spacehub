import { NextRequest } from 'next/server';
import { createSuccessResponse, internalError, requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { alertEmail } from '@/lib/notify-routing';
import { sendReleaseOverdueAlert } from '@/lib/research-email';
import {
  RESEARCH_RELEASES,
  releaseDueState,
  type ResearchRelease,
} from '@/lib/research-releases';
import { readReleaseLog, recordReleaseEdition } from '@/lib/research-release-log';
import { buildReleaseEdition } from '@/lib/research-report-build';
import { previousPeriod } from '@/lib/research-releases';
import { editionRowCount } from '@/lib/research-report-types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Publish whatever the release calendar says is due, and make a miss LOUD.
 *
 * Runs daily rather than on each franchise's own cadence, on purpose: a job
 * that fires once a quarter is a job nobody notices has stopped working. This
 * one wakes every morning, asks each franchise whether its current edition
 * exists, computes the ones that do not, and emails the alert inbox listing
 * anything still overdue afterwards. A missed release therefore surfaces three
 * ways — the email, the OVERDUE badge on /releases, and the scheduler's own
 * staleness watchdog if this route itself stops running.
 *
 * Publishing is idempotent: an edition already in the ledger keeps its original
 * publishedAt, so a recompute can refresh the figures but can never make a late
 * edition look punctual.
 *
 * Runs regardless of RESEARCH_TIER_ENABLED. The release pages are public data
 * journalism; the flag gates the paid tier, not the calendar.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const now = new Date();
  const force = new URL(req.url).searchParams.get('force') === 'true';
  const onlyId = new URL(req.url).searchParams.get('release');

  const published: { releaseId: string; period: string; rows: number; unchanged: boolean }[] = [];
  const skipped: { releaseId: string; period: string; reason: string }[] = [];
  const overdue: {
    title: string;
    periodLabel: string;
    dueAt: string;
    daysLate: number;
    href: string;
    reason?: string;
  }[] = [];

  const targets: ResearchRelease[] = onlyId
    ? RESEARCH_RELEASES.filter((r) => r.id === onlyId)
    : [...RESEARCH_RELEASES];

  for (const release of targets) {
    const pending = releaseDueState(release, null, now);
    const period = pending.period;

    let existing = await readReleaseLog(release.id, period);
    if (existing && !force) {
      skipped.push({ releaseId: release.id, period, reason: 'already published' });
      continue;
    }

    // Not due yet is not a miss. Wait for the period to close.
    if (pending.status === 'awaiting-period-end' && !force) {
      skipped.push({ releaseId: release.id, period, reason: 'not due yet' });
      continue;
    }

    try {
      const edition = await buildReleaseEdition(release.id, period, now);
      const priorKey = previousPeriod(release.cadence, period);
      const prior = priorKey ? await readReleaseLog(release.id, priorKey) : null;
      await recordReleaseEdition(edition, prior?.inputHash ?? null);
      existing = await readReleaseLog(release.id, period);
      published.push({
        releaseId: release.id,
        period,
        rows: editionRowCount(edition),
        unchanged: prior ? prior.inputHash === edition.inputHash : false,
      });
      logger.info('Recurring release published', {
        releaseId: release.id,
        period,
        rows: editionRowCount(edition),
        empty: edition.empty,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.error('Recurring release failed to compute', {
        releaseId: release.id,
        period,
        error: reason,
      });
      skipped.push({ releaseId: release.id, period, reason });
    }

    // Re-read the ledger so the overdue check reflects what actually landed.
    const state = releaseDueState(release, existing?.publishedAt ?? null, now);
    if (state.status === 'overdue') {
      overdue.push({
        title: release.title,
        periodLabel: state.periodLabel,
        dueAt: state.dueAt.toISOString().slice(0, 10),
        daysLate: state.daysLate,
        href: release.href(state.period),
        reason: skipped.find((s) => s.releaseId === release.id && s.period === period)?.reason,
      });
    }
  }

  let alerted = false;
  if (overdue.length > 0) {
    try {
      alerted = await sendReleaseOverdueAlert({ to: alertEmail(), overdue });
    } catch (error) {
      logger.error('Release overdue alert failed to send', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    return createSuccessResponse({
      ranAt: now.toISOString(),
      published,
      skipped,
      overdue,
      alerted,
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Release run failed.');
  }
}

/** Same work, POST-shaped, because the scheduler issues internal POSTs. */
export async function POST(req: NextRequest) {
  return GET(req);
}
