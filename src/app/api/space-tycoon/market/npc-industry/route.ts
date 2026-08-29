import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { runNpcIndustryTick, NPC_INDUSTRY_SEEDS } from '@/lib/game/npc-industry';
import prisma from '@/lib/db';

// Hourly (cron-scheduler.ts 'tycoon-npc-industry'): NPC industrial corps
// fabricate hardware, list it, and buy what they consume. See
// src/lib/game/npc-industry.ts for the rules.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;
  try {
    const result = await runNpcIndustryTick();
    const built = result.corps.reduce((a, c) => a + Object.values(c.built).reduce((x, y) => x + y, 0), 0);
    const listed = result.corps.reduce((a, c) => a + Object.values(c.listed).reduce((x, y) => x + y, 0), 0);
    logger.info('npc-industry tick', { scale: result.scale, activeProfiles: result.activeProfiles, built, listed });
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('npc-industry tick failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'npc-industry tick failed' }, { status: 500 });
  }
}

/** Public read: who the NPC industrial corps are and what they hold/list — the
 *  "NPC demand is visible and forecastable" commitment (CLAUDE.md). */
export async function GET() {
  const rows = await prisma.npcIndustrialCorp.findMany({ select: { id: true, name: true, factionId: true, capacityTier: true, unitsBuilt: true, unitsSold: true, lastTickAt: true, inventory: true } });
  const openOrders = await prisma.marketLimitOrder.findMany({
    where: { profileId: { startsWith: '__NPC_CORP_' }, status: { in: ['open', 'partial'] } },
    select: { profileId: true, resourceSlug: true, side: true, quantity: true, filledQty: true, pricePerUnit: true },
  });
  const corps = NPC_INDUSTRY_SEEDS.map((seed) => {
    const row = rows.find((r) => r.id === seed.id);
    const inv = ((row?.inventory as Record<string, unknown>) || {});
    const stock = Object.fromEntries(Object.entries(inv).filter(([k, v]) => k !== '__meta' && typeof v === 'number' && (v as number) > 0));
    const orders = openOrders.filter((o) => o.profileId === seed.id).map((o) => ({ resourceSlug: o.resourceSlug, side: o.side, remaining: o.quantity - o.filledQty, pricePerUnit: o.pricePerUnit }));
    return { id: seed.id, name: seed.name, factionId: seed.factionId, blurb: seed.blurb, makes: seed.focus, consumesPerWeek: seed.consumes, capacityTier: seed.capacityTier, unitsBuilt: row?.unitsBuilt ?? 0, unitsSold: row?.unitsSold ?? 0, lastTickAt: row?.lastTickAt ?? null, stock, orders };
  });
  return NextResponse.json({ corps }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}
