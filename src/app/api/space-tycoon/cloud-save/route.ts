import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/cloud-save (2026-09-09)
 *
 * The signed-in player's full-state cloud save, pushed by the periodic sync.
 * Lets a player continue on another device or after clearing storage. The
 * client runs the same migrations as a local load before offering it.
 * Degrades to { save: null } when the columns are not there yet.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorizedError();
  try {
    const row = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { cloudSave: true, cloudSaveVersion: true, cloudSavedAt: true, companyName: true },
    });
    if (!row?.cloudSave || !row.cloudSavedAt) {
      return NextResponse.json({ save: null }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json(
      { save: row.cloudSave, version: row.cloudSaveVersion, savedAt: row.cloudSavedAt.toISOString(), companyName: row.companyName },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    logger.warn('Cloud save unavailable', { userId: session.user.id, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ save: null }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
}
