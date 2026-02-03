import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getOpportunities } from '@/lib/opportunities-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const category = searchParams.get('category') || undefined;
    const sector = searchParams.get('sector') || undefined;
    const targetAudience = searchParams.get('targetAudience') || undefined;
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getOpportunities({
      type,
      category,
      sector,
      targetAudience,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}
