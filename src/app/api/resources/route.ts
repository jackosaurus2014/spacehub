import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getResources } from '@/lib/resources-data';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const availability = searchParams.get('availability') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getResources({ category, availability, limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to fetch resources', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}
