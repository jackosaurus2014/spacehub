import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { fetchTLE, predictPasses } from '@/lib/satellite-pass-predictor';
import { sendPushToTokens } from '@/lib/apns-sender';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/cron/satellite-pass-alerts
 *
 * Runs every 10 minutes. For each enabled SatellitePassAlert we:
 *   1. Predict passes in the next 2 hours (simplified SGP4-lite).
 *   2. If a pass is upcoming (starts within ~15 min) AND we haven't already
 *      notified for a pass in this forward window (lastNotifiedAt within
 *      the last 45 min), create a Notification row and send a push to any
 *      registered PushTokens for that user.
 *   3. Update lastNotifiedAt to dedupe.
 *
 * Auth: Bearer ${CRON_SECRET}.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const startedAt = Date.now();
  const now = new Date();

  // Window for "upcoming" notifications: satellite will be visible within
  // the next 15 minutes (gives users time to head outside).
  const UPCOMING_WINDOW_MS = 15 * 60 * 1000;
  // Dedup window: if we've notified for this alert in the last 45 minutes,
  // skip it. Prevents firing again for the same pass on subsequent cron runs.
  const DEDUP_WINDOW_MS = 45 * 60 * 1000;

  try {
    const alerts = await prisma.satellitePassAlert.findMany({
      where: { enabled: true },
      select: {
        id: true,
        userId: true,
        satellite: true,
        latitude: true,
        longitude: true,
        locationLabel: true,
        minElevation: true,
        lastNotifiedAt: true,
      },
    });

    if (alerts.length === 0) {
      return NextResponse.json({
        scanned: 0,
        notified: 0,
        skipped: 0,
        durationMs: Date.now() - startedAt,
      });
    }

    // Group by satellite identifier so we fetch each TLE at most once per run.
    const bySatellite = new Map<string, typeof alerts>();
    for (const a of alerts) {
      const key = a.satellite;
      const list = bySatellite.get(key) ?? [];
      list.push(a);
      bySatellite.set(key, list);
    }

    let notified = 0;
    let skipped = 0;
    let noTle = 0;

    for (const [satellite, satAlerts] of Array.from(bySatellite.entries())) {
      const tle = await fetchTLE(satellite);
      if (!tle) {
        noTle += satAlerts.length;
        logger.warn('satellite-pass-alerts: no TLE available', { satellite });
        continue;
      }

      for (const alert of satAlerts) {
        try {
          // Dedup check: skip if recently notified
          if (
            alert.lastNotifiedAt &&
            now.getTime() - alert.lastNotifiedAt.getTime() < DEDUP_WINDOW_MS
          ) {
            skipped++;
            continue;
          }

          const passes = predictPasses(
            tle,
            alert.latitude,
            alert.longitude,
            now,
            2, // 2-hour forward window
            30,
            alert.minElevation
          );

          // Find the first pass that starts within UPCOMING_WINDOW_MS
          const upcoming = passes.find((p) => {
            const startMs = new Date(p.startTime).getTime();
            const deltaMs = startMs - now.getTime();
            return deltaMs >= 0 && deltaMs <= UPCOMING_WINDOW_MS;
          });

          if (!upcoming) {
            skipped++;
            continue;
          }

          const locationStr = alert.locationLabel || 'your location';
          const minutesAway = Math.max(
            1,
            Math.round(
              (new Date(upcoming.startTime).getTime() - now.getTime()) / 60000
            )
          );
          const title = `${tle.name || satellite} visible in ${minutesAway} min`;
          const message = `${tle.name || satellite} passes over ${locationStr} in ${minutesAway} minutes. Peak elevation ${upcoming.maxElevation}°.`;

          // Create in-app notification
          await prisma.notification.create({
            data: {
              userId: alert.userId,
              type: 'satellite_pass',
              title,
              message,
              relatedContentType: 'satellite_pass_alert',
              relatedContentId: alert.id,
              linkUrl: '/satellite-alerts',
            },
          });

          // Send push to any registered tokens (best-effort)
          try {
            const tokens = await prisma.pushToken.findMany({
              where: { userId: alert.userId },
              select: { token: true, platform: true },
            });
            if (tokens.length > 0) {
              await sendPushToTokens(tokens, {
                title,
                body: message,
                data: {
                  type: 'satellite_pass',
                  alertId: alert.id,
                  passStart: upcoming.startTime,
                },
              });
            }
          } catch (pushErr) {
            logger.warn('satellite-pass-alerts: push send failed', {
              alertId: alert.id,
              error: pushErr instanceof Error ? pushErr.message : String(pushErr),
            });
          }

          await prisma.satellitePassAlert.update({
            where: { id: alert.id },
            data: { lastNotifiedAt: now },
          });

          notified++;
        } catch (alertErr) {
          logger.warn('satellite-pass-alerts: alert processing failed', {
            alertId: alert.id,
            error: alertErr instanceof Error ? alertErr.message : String(alertErr),
          });
        }
      }
    }

    logger.info('satellite-pass-alerts cron completed', {
      scanned: alerts.length,
      notified,
      skipped,
      noTle,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      scanned: alerts.length,
      notified,
      skipped,
      noTle,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('satellite-pass-alerts cron failed', { error: msg });
    return NextResponse.json(
      { error: 'Internal server error', detail: msg },
      { status: 500 }
    );
  }
}
