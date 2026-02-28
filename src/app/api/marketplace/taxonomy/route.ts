import { NextResponse } from 'next/server';
import {
  MARKETPLACE_CATEGORIES,
  PRICING_TYPES,
  CERTIFICATION_OPTIONS,
  VERIFICATION_LEVELS,
  TEAMING_ROLES,
  SET_ASIDE_OPTIONS,
} from '@/lib/marketplace-types';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export async function GET() {
  try {
    return NextResponse.json({
      categories: MARKETPLACE_CATEGORIES,
      pricingTypes: PRICING_TYPES,
      certifications: CERTIFICATION_OPTIONS,
      verificationLevels: VERIFICATION_LEVELS,
      teamingRoles: TEAMING_ROLES,
      setAsideOptions: SET_ASIDE_OPTIONS,
    }, {
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600' },
    });
  } catch (error) {
    logger.error('Failed to fetch marketplace taxonomy', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch marketplace taxonomy');
  }
}
