import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { unauthorizedError, internalError, requireCronSecret } from '@/lib/errors';
import { generateCompanyDigests } from '@/lib/company-digest-generator';

export const dynamic = 'force-dynamic';

async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Timing-safe Bearer token check for cron/automated calls
  if (requireCronSecret(request) === null) return true;

  // Fall back to admin session (only when no Bearer token was attempted)
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    const session = await getServerSession(authOptions);
    if (session?.user?.isAdmin) return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return unauthorizedError('Valid CRON_SECRET token or admin session required');
    }

    const result = await generateCompanyDigests();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Company digest generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to generate company digests');
  }
}
