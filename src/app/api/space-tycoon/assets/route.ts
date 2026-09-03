import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { ASSET_KINDS, completeDueAssets, getAssetLedgerMode } from '@/lib/game/server-assets';
import { loadAssetProfile } from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/assets — the session profile's ServerAsset rows
 * (every kind: building / research / ship / location), newest first, after
 * a lazy pending → complete pass.
 */
export async function GET() {
  try {
    const loaded = await loadAssetProfile('assets-read');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const completed = await completeDueAssets(prisma, profile.id);
    const rows = await prisma.serverAsset.findMany({
      where: { profileId: profile.id, kind: { in: [...ASSET_KINDS] } },
      orderBy: { createdAt: 'desc' },
      take: 2000,
      select: {
        kind: true, instanceId: true, definitionId: true, locationId: true, status: true, markLevel: true,
        startedAt: true, completesAt: true, paidMoney: true, paidResources: true, ledgerSeq: true, createdAt: true,
      },
    });
    return NextResponse.json({
      mode: getAssetLedgerMode(),
      completedThisRead: completed,
      assets: rows.map(r => ({
        ...r,
        startedAt: r.startedAt.toISOString(),
        completesAt: r.completesAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Asset list error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
