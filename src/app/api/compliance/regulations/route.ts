import { NextResponse } from 'next/server';
import { getProposedRegulations } from '@/lib/compliance-data';
import { RegulationCategory, RegulationStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agency = searchParams.get('agency') || undefined;
    const category = searchParams.get('category') as RegulationCategory | null;
    const status = searchParams.get('status') as RegulationStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50');

    const regulations = await getProposedRegulations({
      agency,
      category: category || undefined,
      status: status || undefined,
      limit,
    });

    return NextResponse.json({ regulations });
  } catch (error) {
    console.error('Failed to fetch proposed regulations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposed regulations' },
      { status: 500 }
    );
  }
}
