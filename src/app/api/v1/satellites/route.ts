import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, addRateLimitHeaders } from '@/lib/api-auth-middleware';
import { getModuleContent } from '@/lib/dynamic-content';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface Satellite {
  id: string;
  name: string;
  noradId: string;
  orbitType: string;
  altitude: number;
  velocity: number;
  operator: string;
  country: string;
  launchDate: string;
  status: string;
  purpose: string;
  mass: number | null;
  period: number | null;
  inclination: number | null;
  apogee: number | null;
  perigee: number | null;
  description: string | null;
}

/**
 * GET /api/v1/satellites
 * Public API: Fetch satellite data.
 *
 * Params: limit, offset, orbitType, operator, status
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));
    const orbitType = searchParams.get('orbitType') || undefined;
    const operator = searchParams.get('operator') || undefined;
    const status = searchParams.get('status') || undefined;

    // Get satellite data from DynamicContent
    let satellites: Satellite[] = [];
    try {
      const dynamicData = await getModuleContent<Satellite>('satellites', 'satellites');
      if (dynamicData.length > 0) {
        satellites = dynamicData.map((item) => item.data);
      }
    } catch {
      // DynamicContent unavailable
    }

    // Apply filters
    let filtered = [...satellites];
    if (orbitType) {
      filtered = filtered.filter((s) => s.orbitType === orbitType);
    }
    if (operator) {
      filtered = filtered.filter((s) =>
        s.operator.toLowerCase().includes(operator.toLowerCase())
      );
    }
    if (status) {
      filtered = filtered.filter((s) => s.status === status);
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    const response = NextResponse.json({
      success: true,
      data: paged,
      pagination: { limit, offset, total },
    });

    return addRateLimitHeaders(response, auth.requestId, auth.apiKey.tier);
  } catch (error) {
    logger.error('v1/satellites error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch satellite data');
  }
}
