import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, upsertCapTableSchema } from '@/lib/validations';
import {
  validationError,
  internalError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  checkCapTableAccess,
  serializeCapTable,
} from '@/lib/cap-table-utils';

export const dynamic = 'force-dynamic';

/**
 * Resolve `companyId` param — accepts either the CompanyProfile.id (cuid)
 * or its slug, so URLs work in both forms.
 */
async function resolveCompany(idOrSlug: string) {
  return prisma.companyProfile.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, slug: true, name: true, claimedByUserId: true },
  });
}

// GET /api/cap-tables/[companyId] — read cap table + entries (visibility-gated).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = await resolveCompany(companyId);
    if (!company) return notFoundError('Company');

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const isAdmin = Boolean(session?.user?.isAdmin);
    const isOwner = Boolean(userId && company.claimedByUserId === userId);

    const capTable = await prisma.capTable.findUnique({
      where: { companyId: company.id },
      include: { entries: { orderBy: { createdAt: 'asc' } } },
    });

    if (!capTable) {
      return NextResponse.json({
        capTable: null,
        company: { id: company.id, slug: company.slug, name: company.name },
        isOwner,
        isAdmin,
      });
    }

    let hasShare = false;
    if (userId && capTable.visibility === 'invite_only' && !isOwner && !isAdmin) {
      const share = await prisma.capTableShare.findUnique({
        where: {
          capTableId_grantedToUserId: {
            capTableId: capTable.id,
            grantedToUserId: userId,
          },
        },
        select: { id: true, expiresAt: true },
      });
      if (share) {
        if (!share.expiresAt || share.expiresAt > new Date()) {
          hasShare = true;
        }
      }
    }

    const access = checkCapTableAccess({
      visibility: capTable.visibility,
      isOwner,
      isAdmin,
      isAuthenticated: Boolean(userId),
      hasShare,
    });

    if (!access.allowed) {
      const status = userId ? 403 : 401;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
            message: access.reason ?? 'Access denied',
          },
          visibility: capTable.visibility,
        },
        { status }
      );
    }

    return NextResponse.json({
      capTable: serializeCapTable(capTable, capTable.entries),
      company: { id: company.id, slug: company.slug, name: company.name },
      isOwner,
      isAdmin,
    });
  } catch (error) {
    logger.error('Get cap table error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch cap table');
  }
}

// PUT /api/cap-tables/[companyId] — upsert cap table (owner/admin only).
export async function PUT(
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
      return forbiddenError('Only the profile owner can manage this cap table');
    }

    const body = await request.json();
    const validation = validateBody(upsertCapTableSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const writeData = {
      currentValuation: data.currentValuation ?? null,
      currency: data.currency ?? 'USD',
      sharesAuthorized: data.sharesAuthorized ? BigInt(data.sharesAuthorized) : null,
      sharesOutstanding: data.sharesOutstanding ? BigInt(data.sharesOutstanding) : null,
      asOfDate: data.asOfDate ? new Date(data.asOfDate) : null,
      visibility: data.visibility,
      documentUrl: data.documentUrl ?? null,
      notes: data.notes ?? null,
    };

    const capTable = await prisma.capTable.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
        uploadedByUserId: session.user.id,
        ...writeData,
      },
      update: writeData,
      include: { entries: { orderBy: { createdAt: 'asc' } } },
    });

    logger.info('Cap table upserted', {
      capTableId: capTable.id,
      companyId: company.id,
      companySlug: company.slug,
      userId: session.user.id,
      visibility: capTable.visibility,
    });

    return NextResponse.json({
      success: true,
      capTable: serializeCapTable(capTable, capTable.entries),
    });
  } catch (error) {
    logger.error('Upsert cap table error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to save cap table');
  }
}
