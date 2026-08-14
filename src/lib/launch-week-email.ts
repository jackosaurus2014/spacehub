// "This Week in Launches" — the weekly retention email for space-launch content,
// SpaceNexus's #1 traffic theme. Backs the `/api/cron/launch-week-email` cron
// (Mondays 12:30 UTC — see src/lib/cron-scheduler.ts).
//
// Model choices (no Prisma schema changes were made — see CLAUDE.md):
//  - Source data: SpaceEvent (type='launch'), the same model
//    /api/newsletter/send-weekly-digest already reads for its "week ahead"
//    section. Nothing new to seed.
//  - Subscriber targeting: NewsletterSubscriber has no per-topic
//    opt-in/opt-out column (verified against prisma/schema.prisma — only
//    email/verified/unsubscribedAt/source/userId exist, and schema changes
//    are out of scope for this batch — another agent owns schema). Rather
//    than the bare "everyone gets it" fallback, this reuses the *existing*
//    per-user NotificationPreference machinery via
//    filterSubscribersByPreferences(subscribers, 'news') — the same bucket
//    /api/newsletter/send-digest and /api/newsletter/send-weekly-digest use
//    for launch-inclusive content. Concretely: subscribers who have opted
//    out of `emailDigest` or `newsDigest` in their notification settings are
//    excluded; everyone else (including anonymous, no-account subscribers,
//    who are always kept) receives it. LIMITATION: there is no way for a
//    subscriber to opt into launch alerts specifically while staying out of
//    the general news digest, or vice versa, without a schema change
//    (a dedicated `launchDigest` NotificationPreference column, or a
//    topics/tags column on NewsletterSubscriber). Flagged for the schema
//    owner as a follow-up.
//  - Idempotency: DynamicContent used as a plain KV marker (the same
//    established pattern as src/lib/alerts/alert-digest.ts's digest queue
//    and src/lib/freshness-alerts.ts), keyed
//    `launch-week-email:<mondayISODate>`. The DailyDigest model was
//    deliberately NOT reused for this, even though it looks like a natural
//    fit — /api/newsletter/send-digest picks the "period since last send"
//    by querying the most recently `sent` DailyDigest row, so inserting an
//    unrelated weekly-launch row into that table would corrupt that
//    lookback window for the real daily/twice-weekly digest.

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';
import { escapeHtml, wrapInEmailTemplate, getHeader, getFooter, styles } from '@/lib/newsletter/email-templates';
import { filterSubscribersByPreferences, sendDailyDigest } from '@/lib/newsletter/email-service';

export interface LaunchWeekEvent {
  id: string;
  name: string;
  mission: string | null;
  rocket: string | null;
  agency: string | null;
  location: string | null;
  launchDate: Date | null;
}

export interface LaunchWeekEmailResult {
  html: string;
  text: string;
  subject: string;
}

export interface ProcessLaunchWeekEmailResult {
  skipped: boolean;
  skipReason?: string;
  launchCount: number;
  subscribersConsidered: number;
  sent: number;
  failed: number;
  weekKey: string;
}

const MAX_LAUNCHES_IN_EMAIL = 15;

/** Truncate a date to UTC midnight. */
function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * The Monday (UTC) that starts the calendar week containing `now`. Used both
 * as the "week ahead" window start and as the idempotency key, so a manual
 * re-trigger later in the same week is still recognized as the same run.
 */
export function getWeekStart(now: Date = new Date()): Date {
  const midnight = toUtcMidnight(now);
  const day = midnight.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(midnight);
  monday.setUTCDate(monday.getUTCDate() + diffToMonday);
  return monday;
}

/** Idempotency / DynamicContent key for a given week, e.g. "launch-week-email:2026-08-10". */
export function getLaunchWeekKey(now: Date = new Date()): string {
  return `launch-week-email:${getWeekStart(now).toISOString().slice(0, 10)}`;
}

/** Human label like "August 10–16, 2026" for the 7-day window starting at weekStart. */
export function formatLaunchWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const startMonth = monthNames[weekStart.getUTCMonth()];
  const endMonth = monthNames[weekEnd.getUTCMonth()];
  const startDay = weekStart.getUTCDate();
  const endDay = weekEnd.getUTCDate();
  const year = weekEnd.getUTCFullYear();
  if (weekStart.getUTCMonth() === weekEnd.getUTCMonth()) {
    return `${startMonth} ${startDay}–${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

/**
 * Fetch launches (SpaceEvent type='launch') scheduled in the 7 days starting
 * at `now`. Only forward-looking, non-final statuses are included — a
 * scrubbed or already-completed launch has no "watch this" value in a
 * forward-looking weekly alert.
 */
export async function getUpcomingWeekLaunches(now: Date = new Date()): Promise<LaunchWeekEvent[]> {
  const weekStart = now;
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const events = await prisma.spaceEvent.findMany({
    where: {
      type: 'launch',
      launchDate: { gte: weekStart, lte: weekEnd },
      status: { in: ['upcoming', 'tbd', 'in_progress'] },
    },
    orderBy: { launchDate: 'asc' },
    take: MAX_LAUNCHES_IN_EMAIL + 10, // small buffer above the email cap for an honest "+N more" count
    select: {
      id: true,
      name: true,
      mission: true,
      rocket: true,
      agency: true,
      location: true,
      launchDate: true,
    },
  });

  return events;
}

function formatLaunchDate(d: Date | null): string {
  if (!d) return 'Date TBD';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }) + ' UTC';
}

/**
 * Render the "This Week in Launches" email. Pure function — no DB access —
 * so it is directly unit-testable with hand-built launch lists, including
 * the empty-week case (handled honestly: no launches currently scheduled,
 * rather than hiding the section or inventing content).
 */
export function composeLaunchWeekEmail(
  launches: LaunchWeekEvent[],
  weekStart: Date = getWeekStart()
): LaunchWeekEmailResult {
  const weekLabel = formatLaunchWeekLabel(weekStart);
  const shown = launches.slice(0, MAX_LAUNCHES_IN_EMAIL);
  const overflowCount = launches.length - shown.length;
  const missionControlUrl = `${APP_URL}/mission-control`;

  const subject = shown.length > 0
    ? `This Week in Launches — ${shown.length} launch${shown.length === 1 ? '' : 'es'} (${weekLabel})`
    : `This Week in Launches — a quiet week on the pad (${weekLabel})`;

  let rowsHtml = '';
  let rowsText = '';

  shown.forEach((launch, i) => {
    const missionName = launch.mission || launch.name;
    const vehicle = launch.rocket || 'Vehicle TBD';
    const provider = launch.agency || 'Provider TBD';
    const site = launch.location || '';
    const dateStr = formatLaunchDate(launch.launchDate);
    const watchUrl = `${missionControlUrl}?search=${encodeURIComponent(launch.name)}`;

    rowsHtml += `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid ${styles.borderColor};">
          <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: ${styles.accentNebulaLight};">
            ${escapeHtml(dateStr)}
          </p>
          <p style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: ${styles.textWhite}; line-height: 1.35;">
            <a href="${escapeHtml(watchUrl)}" style="color: ${styles.textWhite}; text-decoration: none;">${escapeHtml(missionName)}</a>
          </p>
          <p style="margin: 0; font-size: 13px; color: ${styles.textLight};">
            ${escapeHtml(vehicle)} &middot; ${escapeHtml(provider)}${site ? ` &middot; ${escapeHtml(site)}` : ''}
          </p>
        </td>
      </tr>`;

    rowsText += `${i + 1}. ${missionName} — ${dateStr}\n   ${vehicle} · ${provider}${site ? ` · ${site}` : ''}\n   ${watchUrl}\n\n`;
  });

  const emptyStateHtml = `
    <tr>
      <td style="padding: 30px; text-align: center;">
        <p style="margin: 0; font-size: 15px; color: ${styles.textLight}; line-height: 1.6;">
          No launches are currently scheduled in our tracker for this window. Launch manifests shift
          often — check <a href="${missionControlUrl}" style="color: ${styles.accentNebulaLight};">Mission Control</a>
          for the latest as new dates are confirmed.
        </p>
      </td>
    </tr>`;

  const html = wrapInEmailTemplate(`
    ${getHeader('This Week in Launches')}
    <tr>
      <td style="padding: 20px 30px 4px 30px; background-color: ${styles.bgCard}; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: ${styles.textMuted}; text-transform: uppercase; letter-spacing: 1px;">
          ${escapeHtml(weekLabel)}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 10px 30px 20px 30px; background-color: ${styles.bgCard};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${shown.length > 0 ? rowsHtml : emptyStateHtml}
        </table>
        ${overflowCount > 0 ? `<p style="margin: 12px 0 0 0; font-size: 13px; color: ${styles.textMuted};">+ ${overflowCount} more this week</p>` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding: 10px 30px 30px 30px; background-color: ${styles.bgCard}; text-align: center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
          <tr>
            <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, ${styles.accentNebula} 0%, #5b21b6 100%);">
              <a href="${missionControlUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: ${styles.textWhite}; text-decoration: none;">
                Open Mission Control
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${getFooter('{{UNSUBSCRIBE_URL}}')}
  `, `${shown.length} launch${shown.length === 1 ? '' : 'es'} on the pad this week — ${weekLabel}`);

  const text = `THIS WEEK IN LAUNCHES
${weekLabel}

${shown.length > 0
    ? rowsText + (overflowCount > 0 ? `+ ${overflowCount} more this week — see all: ${missionControlUrl}\n` : '')
    : `No launches are currently scheduled in our tracker for this window. Manifests shift often — check ${missionControlUrl} for updates.\n`}
---
Open Mission Control: ${missionControlUrl}
Unsubscribe: {{UNSUBSCRIBE_URL}}
SpaceNexus — ${APP_URL}`;

  return { html, text, subject };
}

/**
 * Orchestrates one weekly run: idempotency check, data fetch, compose,
 * subscriber targeting, and send. Called by
 * POST /api/cron/launch-week-email. Exported (rather than inlined in the
 * route) so it can be unit-tested the same way processJobAlerts() is
 * (see src/lib/__tests__/job-alerts.test.ts for the established pattern).
 */
export async function processLaunchWeekEmail(now: Date = new Date()): Promise<ProcessLaunchWeekEmailResult> {
  const weekStart = getWeekStart(now);
  const weekKey = getLaunchWeekKey(now);

  const existing = await prisma.dynamicContent.findUnique({ where: { contentKey: weekKey } });
  if (existing) {
    logger.info('launch-week-email: already sent for this week, skipping', { weekKey });
    return {
      skipped: true,
      skipReason: 'already sent this week',
      launchCount: 0,
      subscribersConsidered: 0,
      sent: 0,
      failed: 0,
      weekKey,
    };
  }

  const launches = await getUpcomingWeekLaunches(weekStart);
  const { html, text, subject } = composeLaunchWeekEmail(launches, weekStart);

  const allSubscribers = await prisma.newsletterSubscriber.findMany({
    where: { verified: true, unsubscribedAt: null },
    select: { email: true, unsubscribeToken: true, userId: true },
  });

  // Reuses the existing 'news' NotificationPreference bucket — see the
  // module-level comment for why there is no dedicated launch-alert topic.
  const subscribers = await filterSubscribersByPreferences(allSubscribers, 'news');

  let sendResult = { success: true, sentCount: 0, failedCount: 0, errors: [] as string[] };

  if (subscribers.length > 0 && process.env.RESEND_API_KEY) {
    sendResult = await sendDailyDigest(subscribers, html, text, subject);
  } else if (subscribers.length > 0) {
    logger.warn('launch-week-email: RESEND_API_KEY not configured, skipping send', { weekKey, subscribers: subscribers.length });
  }

  // Mark the week as processed regardless of outcome, mirroring
  // processJobAlerts()'s cursor-always-advances idempotency — a run that
  // found zero launches or had no configured mail provider still "happened"
  // and must not be repeated by a scheduler retry later the same week.
  const expiresAt = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  await prisma.dynamicContent.upsert({
    where: { contentKey: weekKey },
    create: {
      contentKey: weekKey,
      module: 'launch-week-email',
      section: null,
      data: JSON.stringify({
        weekKey,
        launchCount: launches.length,
        subscribersConsidered: subscribers.length,
        sent: sendResult.sentCount,
        failed: sendResult.failedCount,
        sentAt: now.toISOString(),
      }),
      sourceType: 'system',
      lastVerified: now,
      refreshedAt: now,
      expiresAt,
    },
    update: {
      data: JSON.stringify({
        weekKey,
        launchCount: launches.length,
        subscribersConsidered: subscribers.length,
        sent: sendResult.sentCount,
        failed: sendResult.failedCount,
        sentAt: now.toISOString(),
      }),
      refreshedAt: now,
    },
  });

  logger.info('launch-week-email: run complete', {
    weekKey,
    launchCount: launches.length,
    subscribersConsidered: subscribers.length,
    sent: sendResult.sentCount,
    failed: sendResult.failedCount,
  });

  return {
    skipped: false,
    launchCount: launches.length,
    subscribersConsidered: subscribers.length,
    sent: sendResult.sentCount,
    failed: sendResult.failedCount,
    weekKey,
  };
}
