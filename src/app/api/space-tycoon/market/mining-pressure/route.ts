import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculatePriceAfterMining } from '@/lib/game/market-engine';

/**
 * POST /api/space-tycoon/market/mining-pressure
 * Called when a player's mining operations produce resources.
 * Applies gentle downward pressure on prices (supply increases).
 *
 * Body: { resources: Record<string, number> } — e.g. { iron: 200, titanium: 30 }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resources } = body;

    if (!resources || typeof resources !== 'object') {
      return NextResponse.json({ error: 'Missing resources object' }, { status: 400 });
    }

    const updates: { slug: string; oldPrice: number; newPrice: number }[] = [];

    for (const [slug, qty] of Object.entries(resources)) {
      if (typeof qty !== 'number' || qty <= 0) continue;

      const resource = await prisma.marketResource.findUnique({
        where: { slug },
      });
      if (!resource) continue;

      const newPrice = calculatePriceAfterMining(
        resource.currentPrice,
        resource.basePrice,
        qty,
        resource.volatility,
        resource.minPrice,
        resource.maxPrice,
      );

      if (newPrice !== resource.currentPrice) {
        await prisma.marketResource.update({
          where: { id: resource.id },
          data: {
            currentPrice: newPrice,
            totalSupply: resource.totalSupply + qty,
          },
        });

        updates.push({ slug, oldPrice: resource.currentPrice, newPrice });
      }
    }

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    return NextResponse.json({ error: 'Mining pressure update failed' }, { status: 500 });
  }
}
