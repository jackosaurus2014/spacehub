'use server';

import { NextResponse } from 'next/server';
import { getResources } from '@/lib/resources-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const availability = searchParams.get('availability') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getResources({ category, availability, limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}
