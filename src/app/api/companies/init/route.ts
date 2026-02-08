import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { initializeCompanies } from '@/lib/companies-data';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const result = await initializeCompanies();
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to initialize companies', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize companies' },
      { status: 500 }
    );
  }
}
