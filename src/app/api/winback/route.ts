import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Win-back notification system.
 * Called by cron job to identify inactive users and trigger re-engagement.
 *
 * POST /api/winback
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find users who haven't been active recently
    // Uses updatedAt as a proxy for last activity since lastLoginAt may not exist
    const inactiveUsers = await prisma.user.findMany({
      where: {
        updatedAt: {
          lt: sevenDaysAgo,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true,
      },
      take: 50,
    });

    // Filter to users with valid emails
    const usersWithEmail = inactiveUsers.filter(u => u.email && u.email.includes('@'));

    logger.info(`Win-back: Found ${usersWithEmail.length} inactive users with emails`);

    return NextResponse.json({
      success: true,
      identified: usersWithEmail.length,
      message: `Found ${usersWithEmail.length} users for win-back outreach`,
    });
  } catch (error) {
    logger.error('Win-back API error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
