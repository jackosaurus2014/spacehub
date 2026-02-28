import { NextRequest, NextResponse } from 'next/server';
import { BUSINESS_MODELS } from '@/lib/business-model-data';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sector = searchParams.get('sector');

    let models = BUSINESS_MODELS;

    if (sector) {
      models = models.filter((m) => m.sector === sector);
    }

    return NextResponse.json({
      success: true,
      data: models,
      total: models.length,
    });
  } catch (error) {
    logger.error('Failed to fetch business models', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch business models');
  }
}
