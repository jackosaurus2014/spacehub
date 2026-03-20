// ─── Push Notification Triggers ──────────────────────────────────────────────
// Detects high-priority events from data refreshes and fires push notifications.
// Called after each data refresh cron job.

import { sendPushToAll } from './web-push-sender';
import prisma from './db';
import { logger } from './logger';

// Anti-spam: 2-hour minimum between pushes + max 3 per day
let lastPushSentAt = 0;
let pushesSentToday = 0;
let pushDayStart = 0;
const MIN_PUSH_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours between notifications
const MAX_PUSHES_PER_DAY = 3;

function canSendPush(): boolean {
  const now = Date.now();
  // Reset daily counter at midnight
  const todayStart = new Date().setHours(0, 0, 0, 0);
  if (todayStart !== pushDayStart) {
    pushDayStart = todayStart;
    pushesSentToday = 0;
  }
  if (pushesSentToday >= MAX_PUSHES_PER_DAY) return false;
  if (now - lastPushSentAt < MIN_PUSH_INTERVAL_MS) return false;
  return true;
}

function recordPushSent(): void {
  lastPushSentAt = Date.now();
  pushesSentToday++;
}

/**
 * Check for launch scrubs/delays and send push if found.
 * Called after launch data refresh.
 */
export async function checkLaunchAlerts(): Promise<void> {
  try {
    if (!(await canSendPush())) return;

    // Check for upcoming launches in next 2 hours
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const upcomingLaunches = await prisma.spaceEvent.findMany({
      where: {
        launchDate: { gte: now, lte: twoHoursFromNow },
        status: { in: ['upcoming', 'Go', 'TBC'] },
        type: 'launch',
      },
      orderBy: { launchDate: 'asc' },
      take: 1,
    });

    if (upcomingLaunches.length > 0) {
      const launch = upcomingLaunches[0];
      const launchTime = launch.launchDate || launch.windowStart;
      if (!launchTime) return;
      const minutesUntil = Math.round((launchTime.getTime() - now.getTime()) / 60000);

      if (minutesUntil <= 30 && minutesUntil > 0) {
        await sendPushToAll({
          title: `Launch in ${minutesUntil} minutes!`,
          body: launch.name || 'A rocket launch is imminent.',
          url: '/mission-control',
          tag: 'launch-imminent',
          priority: 'high',
        });
        await recordPushSent();
        logger.info('Push: Launch imminent notification sent', { title: launch.name, minutesUntil });
      }
    }

    // Check for scrubbed launches
    const recentScrubs = await prisma.spaceEvent.findMany({
      where: {
        status: { in: ['scrubbed', 'Hold', 'Scrub'] },
        updatedAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) }, // Updated in last 15 min
      },
      take: 1,
    });

    if (recentScrubs.length > 0) {
      const scrub = recentScrubs[0];
      await sendPushToAll({
        title: `Launch Scrubbed: ${scrub.name || 'Mission delayed'}`,
        body: `Status changed to ${scrub.status}. Check Mission Control for updates.`,
        url: '/mission-control',
        tag: 'launch-scrub',
        priority: 'critical',
      });
      await recordPushSent();
      logger.info('Push: Launch scrub notification sent', { title: scrub.name });
    }
  } catch (err) {
    logger.error('Launch alert check failed', { error: String(err) });
  }
}

/**
 * Check for severe space weather and send push if found.
 * Called after space weather data refresh.
 */
/**
 * Check for severe space weather via NOAA SWPC API and send push if Kp >= 7.
 * Called after space weather data refresh.
 */
export async function checkSpaceWeatherAlerts(): Promise<void> {
  try {
    if (!canSendPush()) return;

    // Fetch current Kp index from NOAA
    const res = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;

    const data = await res.json();
    if (!Array.isArray(data) || data.length < 2) return;

    // Latest entry is the last row (skip header)
    const latest = data[data.length - 1];
    const kpValue = parseFloat(latest[1]);

    if (kpValue >= 7) {
      await sendPushToAll({
        title: `Severe Solar Storm: Kp ${kpValue}`,
        body: 'Severe geomagnetic storm detected. GPS degradation and satellite drag increases expected.',
        url: '/space-weather',
        tag: 'solar-storm',
        priority: 'critical',
      });
      recordPushSent();
      logger.info('Push: Space weather alert sent', { kp: kpValue });
    }
  } catch (err) {
    logger.debug('Space weather alert check skipped', { error: String(err) });
  }
}
