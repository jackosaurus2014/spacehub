import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, capTableShareSchema } from '@/lib/validations';
import {
  validationError,
  internalError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
} from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createNotification } from '@/lib/notifications-server';

export const dynamic = 'force-dynamic';

async function resolveCompany(idOrSlug: string) {
  return prisma.companyProfile.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, slug: true, name: true, claimedByUserId: true },
  });
}

// GET /api/cap-tables/[companyId]/share — list current grants. Owner/admin only.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { companyId } = await params;
    const company = await resolveCompany(companyId);
    if (!company) return notFoundError('Company');

    const isOwner = company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can view cap table grants');
    }

    const capTable = await prisma.capTable.findUnique({
      where: { companyId: company.id },
      select: { id: true },
    });
    if (!capTable) {
      return NextResponse.json({ shares: [] });
    }

    const shares = await prisma.capTableShare.findMany({
      where: { capTableId: capTable.id },
      orderBy: { createdAt: 'desc' },
    });

    // Hydrate with grantee email/name for the dashboard list.
    const userIds = Array.from(new Set(shares.map((s) => s.grantedToUserId)));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      shares: shares.map((s) => {
        const u = userMap.get(s.grantedToUserId);
        return {
          id: s.id,
          grantedToUserId: s.grantedToUserId,
          grantedToEmail: u?.email ?? null,
          grantedToName: u?.name ?? null,
          grantedByUserId: s.grantedByUserId,
          createdAt: s.createdAt.toISOString(),
          expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
        };
      }),
    });
  } catch (error) {
    logger.error('List cap table shares error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list cap table grants');
  }
}

// POST /api/cap-tables/[companyId]/share — grant access by email. Owner/admin only.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { companyId } = await params;
    const company = await resolveCompany(companyId);
    if (!company) return notFoundError('Company');

    const isOwner = company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can grant cap table access');
    }

    const capTable = await prisma.capTable.findUnique({
      where: { companyId: company.id },
      select: { id: true },
    });
    if (!capTable) {
      return notFoundError('Cap table — create one before sharing');
    }

    const body = await request.json();
    const validation = validateBody(capTableShareSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const grantee = await prisma.user.findUnique({
      where: { email: data.grantedToEmail },
      select: { id: true, email: true, name: true },
    });
    if (!grantee) {
      return notFoundError('No SpaceNexus account found for that email');
    }

    if (grantee.id === session.user.id) {
      return conflictError('You already own this cap table');
    }

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    const share = await prisma.capTableShare.upsert({
      where: {
        capTableId_grantedToUserId: {
          capTableId: capTable.id,
          grantedToUserId: grantee.id,
        },
      },
      create: {
        capTableId: capTable.id,
        grantedToUserId: grantee.id,
        grantedByUserId: session.user.id,
        expiresAt,
      },
      update: {
        grantedByUserId: session.user.id,
        expiresAt,
      },
    });

    logger.info('Cap table share granted', {
      shareId: share.id,
      capTableId: capTable.id,
      companyId: company.id,
      grantedToUserId: grantee.id,
      grantedByUserId: session.user.id,
    });

    // Best-effort notification — don't fail the grant if it errors.
    try {
      await createNotification({
        userId: grantee.id,
        type: 'system',
        title: 'Cap table access granted',
        message: `${company.name} has shared their cap table with you.`,
        relatedUserId: session.user.id,
        relatedContentType: 'cap_table',
        relatedContentId: capTable.id,
        linkUrl: `/cap-tables/${company.slug}`,
      });
    } catch (notifyErr) {
      logger.warn('Failed to notify cap table grantee', {
        error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
        granteeUserId: grantee.id,
      });
    }

    return NextResponse.json(
      {
        success: true,
        share: {
          id: share.id,
          grantedToUserId: share.grantedToUserId,
          grantedToEmail: grantee.email,
          grantedToName: grantee.name,
          grantedByUserId: share.grantedByUserId,
          createdAt: share.createdAt.toISOString(),
          expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Grant cap table share error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to grant cap table access');
  }
}
