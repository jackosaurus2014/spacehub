import { NextResponse } from 'next/server';
import {
  MARKETPLACE_CATEGORIES,
  PRICING_TYPES,
  CERTIFICATION_OPTIONS,
  VERIFICATION_LEVELS,
  TEAMING_ROLES,
  SET_ASIDE_OPTIONS,
} from '@/lib/marketplace-types';

export async function GET() {
  return NextResponse.json({
    categories: MARKETPLACE_CATEGORIES,
    pricingTypes: PRICING_TYPES,
    certifications: CERTIFICATION_OPTIONS,
    verificationLevels: VERIFICATION_LEVELS,
    teamingRoles: TEAMING_ROLES,
    setAsideOptions: SET_ASIDE_OPTIONS,
  });
}
