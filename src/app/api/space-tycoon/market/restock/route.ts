import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireCronSecret } from '@/lib/errors';
import { RESOURCE_MAP, effectiveNpcRestockPerHour } from '@/lib/game/resources';
import { calculateNPCRestock } from '@/lib/game/market-engine';
import { populationScale } from '@/lib/game/npc-industry';

/**
 * POST /api/space-tycoon/market/restock
 * NPC market restocking — gradually replenishes supply toward baseline.
 * Called by cron every hour.
 * Auth: Bearer CRON_SECRET via requireCronSecret (fail-closed). Note the
 * middleware cronPaths list only exempts these routes from the CSRF check —
 * it does NOT authenticate them; this handler does.
 */
export async function POST(request: Request) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  try {
    const resources = await prisma.marketResource.findMany();
    let restocked = 0;
    let totalUnitsAdded = 0;

    // Balance Pass 14 — NPC arrival ramp. The authored npcRestockPerHour is
    // the MATURE rate; a fresh world runs a fraction of it that grows as the
    // NPC backdrop could plausibly have built the infrastructure for that
    // origin (resources.ts RESOURCE_ORIGINS). Earth industry is already
    // there (factor 1 on day 0); nobody is mining the Kuiper belt in week
    // one. populationScale recedes the whole NPC floor as the player base
    // grows (NPC_BACKDROP.md: "a floor, not a ceiling").
    const nowMs = Date.now();
    const activeProfiles = await prisma.gameProfile
      .count({ where: { lastSyncAt: { gte: new Date(nowMs - 14 * 86400000) } } })
      .catch(() => 0);
    const popScale = populationScale(activeProfiles);
    const ramped: Record<string, number> = {};

    for (const resource of resources) {
      const def = RESOURCE_MAP.get(resource.slug as any);
      if (!def) continue;

      const baselineSupply = def.baselineSupply;
      const restockPerHour = effectiveNpcRestockPerHour(def, nowMs, { populationScale: popScale });
      if (restockPerHour <= 0) continue;
      ramped[resource.slug] = Math.round(restockPerHour * 1000) / 1000;

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
      // Telemetry: the ramped per-hour rates actually applied this call.
      activeProfiles,
      populationScale: popScale,
      effectiveRestockPerHour: ramped,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Restock failed', details: String(error) },
      { status: 500 },
    );
  }
}
