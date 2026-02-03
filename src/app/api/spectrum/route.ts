import { NextResponse } from 'next/server';
import {
  getSpectrumAllocations,
  getSpectrumFilings,
  getSpectrumStats,
} from '@/lib/spectrum-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bandName = searchParams.get('bandName') || undefined;
    const status = searchParams.get('status') || undefined;
    const operator = searchParams.get('operator') || undefined;

    const [allocations, filings, stats] = await Promise.all([
      getSpectrumAllocations(),
      getSpectrumFilings({ bandName, status, operator }),
      getSpectrumStats(),
    ]);

    return NextResponse.json({
      allocations,
      filings,
      stats,
    });
  } catch (error) {
    console.error('Failed to fetch spectrum data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spectrum data' },
      { status: 500 }
    );
  }
}
