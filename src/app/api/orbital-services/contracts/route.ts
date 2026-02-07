import { NextResponse } from 'next/server';
import { getOrbitalContracts } from '@/lib/orbital-services-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const customerType = searchParams.get('customerType') || undefined;
    const serviceCategory = searchParams.get('serviceCategory') || undefined;
    const status = searchParams.get('status') || undefined;

    const contracts = await getOrbitalContracts({ customerType, serviceCategory, status });

    return NextResponse.json({ contracts });
  } catch (error) {
    logger.error('Error fetching orbital service contracts', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    );
  }
}
