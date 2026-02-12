export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getMiningBodies,
  getSpaceMiningStats,
} from '@/lib/space-mining-data';
import { logger } from '@/lib/logger';
import {
  MiningBodyType,
  SpectralType,
  TrajectoryStatus,
} from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filter parameters
    const bodyType = (searchParams.get('bodyType') || searchParams.get('type')) as MiningBodyType | null;
    const spectralType = (searchParams.get('spectralType') || searchParams.get('spectral')) as SpectralType | null;
    const trajectoryStatus = (searchParams.get('trajectoryStatus') || searchParams.get('trajectory')) as TrajectoryStatus | null;
    const minValueParam = searchParams.get('minValue');
    const minValue = minValueParam ? parseFloat(minValueParam) : undefined;
    const sortBy = searchParams.get('sortBy') as 'value' | 'deltaV' | 'diameter' | 'name' | null;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offsetParam = searchParams.get('offset');
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    const [{ bodies, total }, stats] = await Promise.all([
      getMiningBodies({
        bodyType: bodyType || undefined,
        spectralType: spectralType || undefined,
        trajectoryStatus: trajectoryStatus || undefined,
        minValue,
        limit,
        offset,
        sortBy: sortBy || 'value',
        sortOrder: sortOrder || 'desc',
      }),
      getSpaceMiningStats(),
    ]);

    return NextResponse.json({
      bodies,
      total,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: offset + bodies.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch space mining data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch space mining data' },
      { status: 500 }
    );
  }
}
