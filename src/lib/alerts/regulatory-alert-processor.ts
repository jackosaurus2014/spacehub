import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { isRegulatoryRadarAvailable, type RadarEntry } from '@/lib/regulatory-radar';
import {
  REGULATORY_ALERT_MAX_ITEMS,
  buildAlertItem,
  buildAlertSubject,
  isEffectivelyPro,
  isRegulatoryAlertPrefsAvailable,
  parseWatchedCategories,
  qualifiesForRegulatoryAlert,
  type RegulatoryAlertFrequency,
} from '@/lib/regulatory-alerts';
import {
  generateRegulatoryAlertEmail,
  regulatoryAlertUnsubscribeUrl,
} from '@/lib/alerts/regulatory-alert-templates';

/**
 * Regulatory alert send pipeline (Regulatory Wave C). Mirrors the
 * watchlist-alert-processor architecture (per-user prefs, per-user batching
 * into ONE email, Resend REST send, unsubscribe link) with one deliberate
 * difference: dedupe is a per-user lastSentAt WATERMARK on the prefs row
 * (advanced only on a confirmed send) instead of a per-item log table —
 * a failed send retries the identical window on the next run, and a
 * confirmed send can never re-deliver the same rows.
 *
 * Cadence (src/lib/cron-scheduler.ts):
 *   - 'immediate' users: hourly cron /api/cron/regulatory-alerts (:20).
 *   - 'daily' users: the 08:00 UTC watchlist-alerts refresh branch
 *     (/api/refresh?type=watchlist-alerts).
 *
 * Fail-soft: missing RegulatoryAlertPreference or RegulatoryAction tables
 * (pre-`prisma db push` deploys) return zero stats without throwing.
 */

/** How far back a never-sent (or long-idle) watcher's window may reach. */
const MAX_LOOKBACK_DAYS = 30;

export interface RegulatoryAlertStats {
  usersProcessed: number;
  emailsSent: number;
  itemsSent: number;
  skipped: number;
  errors: number;
}

export async function processRegulatoryAlerts(
  frequency: RegulatoryAlertFrequency,
  now = new Date()
): Promise<RegulatoryAlertStats> {
  const stats: RegulatoryAlertStats = {
    usersProcessed: 0,
    emailsSent: 0,
    itemsSent: 0,
    skipped: 0,
    errors: 0,
  };

  if (!(await isRegulatoryAlertPrefsAvailable())) return stats;
  if (!(await isRegulatoryRadarAvailable())) return stats;

  try {
    const prefs = await prisma.regulatoryAlertPreference.findMany({
      where: { enabled: true, frequency },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            subscriptionTier: true,
            trialTier: true,
            trialEndDate: true,
          },
        },
      },
    });

    if (prefs.length === 0) return stats;

    const floor = new Date(now.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    for (const pref of prefs) {
      stats.usersProcessed++;
      try {
        // Server-side Pro enforcement at send time — lapsed subscriptions
        // stop receiving without any extra bookkeeping.
        if (!pref.user || !isEffectivelyPro(pref.user, now)) {
          stats.skipped++;
          continue;
        }

        const watched = parseWatchedCategories(pref.watchedCategories);
        if (watched.length === 0) {
          stats.skipped++;
          continue;
        }

        // Watermark window on row INGEST time (createdAt), not actionDate —
        // publication dates can lag ingestion, and createdAt > watermark
        // guarantees late-ingested documents still alert exactly once.
        const since = pref.lastSentAt && pref.lastSentAt > floor ? pref.lastSentAt : floor;
        // Brand-new prefs start at their own creation time — enabling alerts
        // must not dump a month of history into the first email.
        const baseline = !pref.lastSentAt && pref.createdAt > since ? pref.createdAt : since;

        const candidates = await prisma.regulatoryAction.findMany({
          where: {
            category: { in: watched },
            createdAt: { gt: baseline, lte: now },
          },
          orderBy: [{ significant: 'desc' }, { actionDate: 'desc' }],
          take: 200,
        });

        const qualifying = (candidates as unknown as RadarEntry[]).filter((c) =>
          qualifiesForRegulatoryAlert(c)
        );
        if (qualifying.length === 0) continue; // nothing to send — watermark untouched

        const selected = qualifying.slice(0, REGULATORY_ALERT_MAX_ITEMS);
        const overflowCount = qualifying.length - selected.length;
        const items = selected.map((c) => buildAlertItem(c));

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          logger.warn('RESEND_API_KEY not configured, skipping regulatory alerts');
          return stats;
        }

        const { html, text } = generateRegulatoryAlertEmail(items, {
          userName: pref.user.name,
          overflowCount,
          unsubscribeToken: pref.unsubscribeToken,
        });

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'SpaceNexus Alerts <alerts@spacenexus.us>',
            to: pref.user.email,
            subject: buildAlertSubject(items),
            html,
            text,
            headers: {
              // RFC 8058 one-click unsubscribe, mirroring the newsletter sender
              'List-Unsubscribe': `<${regulatoryAlertUnsubscribeUrl(pref.unsubscribeToken)}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        });

        if (response.ok) {
          // Advance the watermark ONLY on a confirmed send. `now` is the
          // query's upper bound, so no row can fall between windows.
          await prisma.regulatoryAlertPreference.update({
            where: { id: pref.id },
            data: { lastSentAt: now },
          });
          stats.emailsSent++;
          stats.itemsSent += items.length;
        } else {
          const errorBody = await response.text().catch(() => '');
          logger.error('Failed to send regulatory alert email', {
            userId: pref.userId,
            status: response.status,
            body: errorBody.slice(0, 200),
          });
          stats.errors++;
        }
      } catch (error) {
        logger.error('Error processing regulatory alerts for user', {
          userId: pref.userId,
          error: error instanceof Error ? error.message : String(error),
        });
        stats.errors++;
      }
    }

    logger.info(`Regulatory alert processing complete (${frequency})`, { ...stats });
  } catch (error) {
    logger.error('Error in processRegulatoryAlerts', {
      frequency,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return stats;
}
