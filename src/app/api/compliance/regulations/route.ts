import { NextResponse } from 'next/server';
import { getProposedRegulations } from '@/lib/compliance-data';
import { RegulationCategory, RegulationStatus } from '@/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agency = searchParams.get('agency') || undefined;
    const category = searchParams.get('category') as RegulationCategory | null;
    const status = searchParams.get('status') as RegulationStatus | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const regulations = await getProposedRegulations({
      agency,
      category: category || undefined,
      status: status || undefined,
      limit,
    });

    return NextResponse.json({ regulations });
  } catch (error) {
    logger.error('Failed to fetch proposed regulations', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch proposed regulations' },
      { status: 500 }
    );
  }
}
