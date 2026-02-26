import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, validationError, forbiddenError, notFoundError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateBody, marketplaceVerifyAdminSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// PUT: Admin-only override to set verification level
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).isAdmin) {
      return forbiddenError('Admin access required');
    }

    const body = await request.json();
    const validation = validateBody(marketplaceVerifyAdminSchema, body);
    if (!validation.success) {
      return validationError('Invalid verification request', validation.errors);
    }
    const { companyId, level, notes } = validation.data;

    const company = await prisma.companyProfile.findUnique({ where: { id: companyId } });
    if (!company) {
      return notFoundError('Company');
    }

    const updated = await prisma.companyProfile.update({
      where: { id: companyId },
      data: {
        verificationLevel: level,
        verifiedAt: level !== 'none' ? new Date() : null,
        verificationNotes: notes || null,
      },
    });

    logger.info('Admin verification override', {
      companyId,
      level,
      adminUserId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      company: {
        id: updated.id,
        name: updated.name,
        verificationLevel: updated.verificationLevel,
        verifiedAt: updated.verifiedAt,
      },
    });
  } catch (error) {
    logger.error('Admin verification error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update verification');
  }
}
