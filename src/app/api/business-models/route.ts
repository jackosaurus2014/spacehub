import { NextRequest, NextResponse } from 'next/server';
import { BUSINESS_MODELS } from '@/lib/business-model-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
}
