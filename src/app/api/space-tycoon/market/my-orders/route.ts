import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/space-tycoon/market/my-orders
 * Returns the player's open/recent orders with fill status.
 * Query: ?status=open,partial (default: open,partial)
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

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'open,partial';
    const statuses = statusParam.split(',').map(s => s.trim()).filter(Boolean);

    const orders = await prisma.marketLimitOrder.findMany({
      where: {
        profileId: profile.id,
        status: { in: statuses },
      },
      include: {
        fills: {
          select: {
            quantity: true,
            pricePerUnit: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        counterFills: {
          select: {
            quantity: true,
            pricePerUnit: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Also get recently filled/cancelled orders (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOrders = statuses.includes('open') || statuses.includes('partial')
      ? await prisma.marketLimitOrder.findMany({
          where: {
            profileId: profile.id,
            status: { in: ['filled', 'cancelled'] },
            updatedAt: { gte: oneDayAgo },
          },
          include: {
            fills: {
              select: { quantity: true, pricePerUnit: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
            counterFills: {
              select: { quantity: true, pricePerUnit: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        })
      : [];

    const allOrders = [...orders, ...recentOrders];

    // Summary
    const openOrders = orders.filter(o => ['open', 'partial'].includes(o.status));
    const totalEscrowed = openOrders.reduce((sum, o) => {
      if (o.side === 'buy') {
        const remaining = o.quantity - o.filledQty;
        return sum + Math.round(o.pricePerUnit * remaining * 1.02);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      orders: allOrders.map(o => {
        // Merge fills from both relations — fills is when this order is the buy side
        // counterFills is when this order is the sell side
        const allFills = o.side === 'buy'
          ? o.fills.map(f => ({ quantity: f.quantity, price: f.pricePerUnit, executedAt: f.createdAt }))
          : o.counterFills.map(f => ({ quantity: f.quantity, price: f.pricePerUnit, executedAt: f.createdAt }));

        return {
          id: o.id,
          resourceSlug: o.resourceSlug,
          side: o.side,
          price: o.pricePerUnit,
          quantity: o.quantity,
          filledQty: o.filledQty,
          remainingQty: o.quantity - o.filledQty,
          status: o.status,
          escrowAmount: o.escrowAmount,
          expiresAt: o.expiresAt,
          createdAt: o.createdAt,
          fills: allFills,
        };
      }),
      summary: {
        totalOpenOrders: openOrders.length,
        maxOrders: 20,
        totalEscrowed,
      },
    });
  } catch (error) {
    logger.error('My orders GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
