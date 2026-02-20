import { NextRequest, NextResponse } from 'next/server';
import { validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  assessRisk,
  SECTORS,
  RISK_FACTORS,
  ACTIVITY_FLAGS,
  type CompanyRiskProfile,
} from '@/lib/regulatory/risk-scoring';

export const dynamic = 'force-dynamic';

const VALID_SECTORS = SECTORS.map(s => s.id);
const VALID_ACTIVITY_IDS = ACTIVITY_FLAGS.map(a => a.id);
const VALID_RISK_FACTOR_IDS = RISK_FACTORS.map(f => f.id);

/**
 * GET /api/regulatory-risk?sector=launch&activities=launches_from_us,exports_technology
 *
 * Quick risk assessment via query parameters.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sector = searchParams.get('sector');
    const activitiesParam = searchParams.get('activities');

    if (!sector) {
      return validationError('sector query parameter is required');
    }

    if (!VALID_SECTORS.includes(sector)) {
      return validationError(`Invalid sector. Valid sectors: ${VALID_SECTORS.join(', ')}`);
    }

    const activitiesFlags: string[] = activitiesParam
      ? activitiesParam.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Validate activity flags — accept both activity IDs and direct risk factor IDs
    const validFlags = new Set([...VALID_ACTIVITY_IDS, ...VALID_RISK_FACTOR_IDS]);
    const invalidFlags = activitiesFlags.filter(f => !validFlags.has(f));
    if (invalidFlags.length > 0) {
      return validationError(`Invalid activity flags: ${invalidFlags.join(', ')}`);
    }

    const profile: CompanyRiskProfile = {
      sector,
      activitiesFlags,
    };

    const assessment = assessRisk(profile);

    logger.info('Regulatory risk assessment (GET)', {
      sector,
      activitiesCount: activitiesFlags.length,
      overallScore: assessment.overallScore,
      riskLevel: assessment.riskLevel,
    });

    return NextResponse.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    logger.error('Error in regulatory risk GET', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to compute regulatory risk assessment');
  }
}

/**
 * POST /api/regulatory-risk
 *
 * Detailed risk assessment from full CompanyRiskProfile JSON body.
 *
 * Body: { sector: string, subsector?: string, activitiesFlags: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate sector
    if (!body.sector || typeof body.sector !== 'string') {
      return validationError('sector is required and must be a string');
    }

    if (!VALID_SECTORS.includes(body.sector)) {
      return validationError(`Invalid sector. Valid sectors: ${VALID_SECTORS.join(', ')}`);
    }

    // Validate activitiesFlags
    if (!Array.isArray(body.activitiesFlags)) {
      return validationError('activitiesFlags must be an array of strings');
    }

    const activitiesFlags: string[] = body.activitiesFlags
      .filter((f: unknown) => typeof f === 'string')
      .map((f: string) => f.trim())
      .filter(Boolean);

    // Validate flags
    const validFlags = new Set([...VALID_ACTIVITY_IDS, ...VALID_RISK_FACTOR_IDS]);
    const invalidFlags = activitiesFlags.filter(f => !validFlags.has(f));
    if (invalidFlags.length > 0) {
      return validationError(`Invalid activity flags: ${invalidFlags.join(', ')}`);
    }

    const profile: CompanyRiskProfile = {
      sector: body.sector,
      subsector: typeof body.subsector === 'string' ? body.subsector : undefined,
      activitiesFlags,
    };

    const assessment = assessRisk(profile);

    logger.info('Regulatory risk assessment (POST)', {
      sector: profile.sector,
      subsector: profile.subsector,
      activitiesCount: activitiesFlags.length,
      overallScore: assessment.overallScore,
      riskLevel: assessment.riskLevel,
    });

    return NextResponse.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    logger.error('Error in regulatory risk POST', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to compute regulatory risk assessment');
  }
}
