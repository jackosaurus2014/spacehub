import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { RESOURCE_MAP } from '@/lib/game/resources';
import { calculateNPCRestock } from '@/lib/game/market-engine';

/**
 * POST /api/space-tycoon/market/restock
 * NPC market restocking — gradually replenishes supply toward baseline.
 * Called by cron every hour. Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const resources = await prisma.marketResource.findMany();
    let restocked = 0;
    let totalUnitsAdded = 0;

    for (const resource of resources) {
      const def = RESOURCE_MAP.get(resource.slug as any);
      if (!def) continue;

      const baselineSupply = def.startingSupply;
      const restockPerHour = def.npcRestockPerHour;
      if (restockPerHour <= 0) continue;

      // Calculate hours since last update (use updatedAt)
      const hoursSinceUpdate = (Date.now() - resource.updatedAt.getTime()) / (1000 * 60 * 60);
      const hoursToRestock = Math.min(hoursSinceUpdate, 2); // Cap at 2 hours of restock per call

      const restockAmount = calculateNPCRestock(
        resource.totalSupply,
        baselineSupply,
        restockPerHour,
        hoursToRestock,
      );

      if (restockAmount > 0) {
        await prisma.marketResource.update({
          where: { id: resource.id },
          data: {
            totalSupply: resource.totalSupply + restockAmount,
          },
        });
        restocked++;
        totalUnitsAdded += restockAmount;
      }
    }

    return NextResponse.json({
      success: true,
      restocked,
      totalUnitsAdded,
      resourceCount: resources.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Restock failed', details: String(error) },
      { status: 500 },
    );
  }
}
