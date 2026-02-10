import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluateVerificationLevel, batchEvaluateVerification } from '@/lib/marketplace/verification-engine';

export const dynamic = 'force-dynamic';

// GET: Return current verification status for authenticated user's company
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { claimedCompanyId: true },
    });

    if (!user?.claimedCompanyId) {
      return NextResponse.json({
        hasCompany: false,
        message: 'No company profile claimed',
      });
    }

    const result = await evaluateVerificationLevel(user.claimedCompanyId);

    return NextResponse.json({
      hasCompany: true,
      companyId: user.claimedCompanyId,
      currentLevel: result.currentLevel,
      qualifiedLevel: result.qualifiedLevel,
      canUpgrade: result.upgraded,
      criteria: result.criteria,
    });
  } catch (error) {
    logger.error('Get verification status error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch verification status');
  }
}

// POST: Batch evaluate all claimed companies (cron/admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Allow cron or admin access
    const cronSecret = request.headers.get('x-cron-secret');
    const isAdmin = session?.user && (session.user as any).isAdmin === true;
    const isCron = cronSecret === process.env.CRON_SECRET;

    if (!isAdmin && !isCron) {
      return NextResponse.json({ error: 'Admin or cron access required' }, { status: 403 });
    }

    const result = await batchEvaluateVerification();

    logger.info('Batch verification evaluation complete', result);
    return NextResponse.json({
      success: true,
      evaluated: result.evaluated,
      upgraded: result.upgraded,
    });
  } catch (error) {
    logger.error('Batch verification error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to run verification batch');
  }
}
