export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getBlueprints,
  getBlueprintStats,
  getManufacturers,
  BlueprintCategory,
  BlueprintStatus,
} from '@/lib/blueprint-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filter parameters
    const category = searchParams.get('category') as BlueprintCategory | null;
    const manufacturer = searchParams.get('manufacturer');
    const status = searchParams.get('status') as BlueprintStatus | null;
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') as 'name' | 'manufacturer' | 'firstFlight' | 'missionsFlown' | null;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offsetParam = searchParams.get('offset');
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Fetch data
    const [{ blueprints, total }, stats, manufacturers] = await Promise.all([
      getBlueprints({
        category: category || undefined,
        manufacturer: manufacturer || undefined,
        status: status || undefined,
        search: search || undefined,
        limit,
        offset,
        sortBy: sortBy || 'name',
        sortOrder: sortOrder || 'asc',
      }),
      getBlueprintStats(),
      getManufacturers(),
    ]);

    return NextResponse.json({
      blueprints,
      total,
      stats,
      manufacturers,
      pagination: {
        limit,
        offset,
        hasMore: offset + blueprints.length < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch blueprints:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blueprints' },
      { status: 500 }
    );
  }
}
