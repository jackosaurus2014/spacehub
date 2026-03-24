import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';

const MAX_ALERTS = 5; // Base limit

/**
 * GET /api/space-tycoon/market/alerts
 * Returns the player's price alerts.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    const alerts = await prisma.marketAlert.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });

    const activeCount = alerts.filter(a => !a.triggered).length;

    return NextResponse.json({
      alerts: alerts.map(a => ({
        id: a.id,
        resourceSlug: a.resourceSlug,
        condition: a.direction,
        targetPrice: a.targetPrice,
        triggered: a.triggered,
        triggeredAt: a.triggeredAt,
        createdAt: a.createdAt,
      })),
      activeCount,
      maxAlerts: MAX_ALERTS,
    });
  } catch (error) {
    logger.error('Alerts GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

/**
 * POST /api/space-tycoon/market/alerts
 * Create a new price alert.
 * Body: { resourceSlug, condition: 'above' | 'below', targetPrice: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    const body = await request.json();
    const { resourceSlug, condition, targetPrice } = body;

    // Validate
    if (!resourceSlug || !condition || !targetPrice) {
      return NextResponse.json(
        { error: 'Missing required fields: resourceSlug, condition, targetPrice' },
        { status: 400 },
      );
    }

    if (condition !== 'above' && condition !== 'below') {
      return NextResponse.json({ error: 'condition must be "above" or "below"' }, { status: 400 });
    }

    if (!Number.isInteger(targetPrice) || targetPrice < 1) {
      return NextResponse.json({ error: 'targetPrice must be a positive integer' }, { status: 400 });
    }

    const resourceDef = RESOURCE_MAP.get(resourceSlug as ResourceId);
    if (!resourceDef) {
      return NextResponse.json({ error: `Resource "${resourceSlug}" not found` }, { status: 404 });
    }

    // Check alert limit
    const activeCount = await prisma.marketAlert.count({
      where: { profileId: profile.id, triggered: false },
    });

    if (activeCount >= MAX_ALERTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ALERTS} active alerts allowed. Delete an existing alert first.` },
        { status: 400 },
      );
    }

    const alert = await prisma.marketAlert.create({
      data: {
        profileId: profile.id,
        resourceSlug,
        direction: condition,
        targetPrice,
      },
    });

    logger.info('Price alert created', {
      profileId: profile.id,
      resourceSlug,
      condition,
      targetPrice,
    });

    return NextResponse.json({
      success: true,
      alert: {
        id: alert.id,
        resourceSlug: alert.resourceSlug,
        condition: alert.direction,
        targetPrice: alert.targetPrice,
      },
    });
  } catch (error) {
    logger.error('Alert creation error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

/**
 * DELETE /api/space-tycoon/market/alerts
 * Remove an alert.
 * Body: { alertId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    const body = await request.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json({ error: 'alertId is required' }, { status: 400 });
    }

    // Verify ownership
    const alert = await prisma.marketAlert.findUnique({ where: { id: alertId } });
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    if (alert.profileId !== profile.id) {
      return NextResponse.json({ error: 'Not your alert' }, { status: 403 });
    }

    await prisma.marketAlert.delete({ where: { id: alertId } });

    logger.info('Price alert deleted', { profileId: profile.id, alertId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Alert deletion error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
