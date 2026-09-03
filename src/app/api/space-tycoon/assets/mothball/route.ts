import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { badRequest, findLiveBuildingRow, loadAssetProfile, parseInstanceId } from '@/lib/game/asset-route-shared';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/assets/mothball — pause a completed building.
 * Body: { instanceId }. Status-guarded flip complete → mothballed; no
 * money moves (mothball.ts: zero revenue, 25 % maintenance is client math).
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile();
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const instanceId = parseInstanceId(body?.instanceId);
    if (!instanceId) return badRequest('instanceId is required', 'invalid_instance_id');

    const row = await findLiveBuildingRow(profile.id, instanceId);
    if (!row) return NextResponse.json({ error: 'No such building in the registry', code: 'not_found' }, { status: 404 });
    if (row.status === 'mothballed') return NextResponse.json({ success: true, instanceId, idempotent: true });
    if (row.status !== 'complete') return badRequest('Construction must finish before mothballing', 'not_complete');

    const flipped = await prisma.serverAsset.updateMany({
      where: { id: row.id, status: 'complete' },
      data: { status: 'mothballed' },
    });
    if (flipped.count !== 1) return NextResponse.json({ error: 'Building changed — try again', code: 'state_conflict' }, { status: 409 });

    logger.info('Asset mothballed', { profileId: profile.id, instanceId });
    return NextResponse.json({ success: true, instanceId });
  } catch (error) {
    logger.error('Asset mothball error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
