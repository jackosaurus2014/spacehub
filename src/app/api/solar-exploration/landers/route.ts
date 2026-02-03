import { NextRequest, NextResponse } from 'next/server';
import { getSurfaceLanders } from '@/lib/solar-exploration-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planetaryBodyId = searchParams.get('bodyId') || undefined;
    const status = searchParams.get('status') || undefined;
    const missionType = searchParams.get('type') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const landers = await getSurfaceLanders({
      planetaryBodyId,
      status,
      missionType,
      limit,
    });

    return NextResponse.json({ landers, total: landers.length });
  } catch (error) {
    console.error('Failed to fetch landers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch landers' },
      { status: 500 }
    );
  }
}
