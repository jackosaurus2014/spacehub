import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  internalError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// DELETE /api/cap-tables/[companyId]/share/[shareId] — revoke. Owner/admin only.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string; shareId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { companyId, shareId } = await params;

    const company = await prisma.companyProfile.findFirst({
      where: { OR: [{ id: companyId }, { slug: companyId }] },
      select: { id: true, claimedByUserId: true },
    });
    if (!company) return notFoundError('Company');

    const isOwner = company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can revoke cap table access');
    }

    const share = await prisma.capTableShare.findUnique({
      where: { id: shareId },
      include: { capTable: { select: { companyId: true } } },
    });
    if (!share) return notFoundError('Share');
    if (share.capTable.companyId !== company.id) {
      return notFoundError('Share');
    }

    await prisma.capTableShare.delete({ where: { id: shareId } });

    logger.info('Cap table share revoked', {
      shareId,
      capTableId: share.capTableId,
      companyId: company.id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Revoke cap table share error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to revoke cap table access');
  }
}
