import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getNpcForecast, filterNpcForecast, NPC_FORECAST_DEFAULT_HORIZON_HOURS } from '@/lib/game/npc-forecast';
import { RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';
import { SERVICE_CATEGORIES } from '@/lib/game/demand-pools';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/npc-forecast
 *
 * The published NPC demand forecast (CLAUDE.md: "NPC demand is visible and
 * forecastable"). Free intel tier — same gate as /api/space-tycoon/demand-pools:
 * the schedule is public market intelligence, so no session is required and
 * nothing here is personalised. Cached 10 minutes server-side.
 *
 * Query:
 *   resource=<slug>   — only items for that resource (or service category)
 *   horizon=<hours>   — 24..168, default 72
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const horizonRaw = Number(params.get('horizon'));
    const horizon = Number.isFinite(horizonRaw) && horizonRaw > 0 ? horizonRaw : NPC_FORECAST_DEFAULT_HORIZON_HOURS;
    const resource = params.get('resource');
    const forecast = await getNpcForecast(horizon);
    if (resource) {
      const known = RESOURCE_MAP.has(resource as ResourceId) || (SERVICE_CATEGORIES as string[]).includes(resource);
      if (!known) return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
      return NextResponse.json(filterNpcForecast(forecast, resource));
    }
    return NextResponse.json(forecast);
  } catch (error) {
    logger.error('NPC forecast read failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
