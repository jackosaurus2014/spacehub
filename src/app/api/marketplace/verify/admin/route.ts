import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PUT: Admin-only override to set verification level
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { companyId, level, notes } = body;

    if (!companyId || !level) {
      return NextResponse.json({ error: 'companyId and level are required' }, { status: 400 });
    }

    const validLevels = ['none', 'identity', 'capability', 'performance'];
    if (!validLevels.includes(level)) {
      return NextResponse.json({ error: `level must be one of: ${validLevels.join(', ')}` }, { status: 400 });
    }

    const company = await prisma.companyProfile.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
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
