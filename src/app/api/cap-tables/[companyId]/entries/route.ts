import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, capTableEntrySchema } from '@/lib/validations';
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
  computePercentage,
  serializeCapTableEntry,
} from '@/lib/cap-table-utils';

export const dynamic = 'force-dynamic';

async function resolveCompany(idOrSlug: string) {
  return prisma.companyProfile.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, slug: true, claimedByUserId: true },
  });
}

// POST /api/cap-tables/[companyId]/entries — add an entry. Owner/admin only.
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
      return forbiddenError('Only the profile owner can manage cap table entries');
    }

    const capTable = await prisma.capTable.findUnique({
      where: { companyId: company.id },
      select: { id: true, sharesOutstanding: true },
    });
    if (!capTable) {
      return notFoundError('Cap table — create one before adding entries');
    }

    const body = await request.json();
    const validation = validateBody(capTableEntrySchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const shareCountBig = data.shareCount ? BigInt(data.shareCount) : null;

    // Auto-calc percentage if caller didn't supply one and we have both numbers.
    let percentage = data.percentage ?? null;
    if (percentage === null || percentage === undefined) {
      percentage = computePercentage(shareCountBig, capTable.sharesOutstanding);
    }

    const entry = await prisma.capTableEntry.create({
      data: {
        capTableId: capTable.id,
        holderName: data.holderName,
        holderType: data.holderType,
        shareClass: data.shareClass,
        shareCount: shareCountBig,
        percentage,
        investmentAmount: data.investmentAmount ?? null,
        roundLabel: data.roundLabel ?? null,
        acquiredAt: data.acquiredAt ? new Date(data.acquiredAt) : null,
        notes: data.notes ?? null,
      },
    });

    logger.info('Cap table entry created', {
      entryId: entry.id,
      capTableId: capTable.id,
      companyId: company.id,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, entry: serializeCapTableEntry(entry) },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create cap table entry error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create cap table entry');
  }
}
