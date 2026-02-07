import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getLaunchProviders } from '@/lib/resources-data';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const country = searchParams.get('country') || undefined;

    const providers = await getLaunchProviders({ status, country });

    return NextResponse.json({ providers });
  } catch (error) {
    logger.error('Failed to fetch launch providers', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch launch providers' },
      { status: 500 }
    );
  }
}
