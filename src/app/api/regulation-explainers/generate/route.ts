import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { unauthorizedError, internalError } from '@/lib/errors';
import { generateRegulationExplainers } from '@/lib/regulation-explainer-generator';

export const dynamic = 'force-dynamic';

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  if (!authHeader) {
    const session = await getServerSession(authOptions);
    if (session?.user?.isAdmin) {
      return true;
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return unauthorizedError('Valid CRON_SECRET token or admin session required');
    }

    const result = await generateRegulationExplainers();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Regulation explainer generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to generate regulation explainers');
  }
}
