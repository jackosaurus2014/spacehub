import { NextRequest, NextResponse } from 'next/server';
import { sendPushToAll } from '@/lib/web-push-sender';
import { logger } from '@/lib/logger';

/**
 * POST /api/push-notify
 * Trigger a high-priority push notification to all subscribers.
 * Protected by CRON_SECRET — only called by internal cron jobs.
 *
 * Notification types:
 * - launch_scrub: A scheduled launch has been scrubbed/delayed
 * - launch_imminent: A launch is happening in the next 30 minutes
 * - solar_storm: Kp index >= 7 (severe geomagnetic storm)
 * - space_weather: Major solar flare (X-class or higher)
 * - breaking_news: Major industry event (acquisition, accident, milestone)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, body: notifBody, url } = body;

    if (!type || !title) {
      return NextResponse.json({ error: 'Missing type or title' }, { status: 400 });
    }

    // Define notification parameters based on type
    const notifications: Record<string, { icon: string; tag: string; defaultUrl: string }> = {
      launch_scrub: { icon: '🚫', tag: 'launch-scrub', defaultUrl: '/mission-control' },
      launch_imminent: { icon: '🚀', tag: 'launch-soon', defaultUrl: '/mission-control' },
      solar_storm: { icon: '🌊', tag: 'solar-storm', defaultUrl: '/space-weather' },
      space_weather: { icon: '☀️', tag: 'space-weather', defaultUrl: '/space-weather' },
      breaking_news: { icon: '📰', tag: 'breaking', defaultUrl: '/news' },
      funding_major: { icon: '💰', tag: 'funding', defaultUrl: '/funding-rounds' },
      launch_success: { icon: '✅', tag: 'launch-success', defaultUrl: '/mission-control' },
      launch_failure: { icon: '💥', tag: 'launch-failure', defaultUrl: '/mission-control' },
    };

    const config = notifications[type] || { icon: '🔔', tag: 'general', defaultUrl: '/' };

    const result = await sendPushToAll({
      title: `${config.icon} ${title}`,
      body: notifBody || '',
      url: url || config.defaultUrl,
      tag: config.tag,
      priority: type === 'solar_storm' || type === 'launch_scrub' ? 'critical' : 'high',
    });

    logger.info(`Push notification sent: type=${type}`, result);

    return NextResponse.json({
      success: true,
      type,
      ...result,
    });
  } catch (error) {
    logger.error('Push notify error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
