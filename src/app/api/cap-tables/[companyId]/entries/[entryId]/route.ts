import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, capTableEntryUpdateSchema } from '@/lib/validations';
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

async function loadEntryWithOwner(entryId: string, companyId: string) {
  const entry = await prisma.capTableEntry.findUnique({
    where: { id: entryId },
    include: {
      capTable: {
        include: {
          // Pull the company so we can verify ownership.
          // Note: there's no direct relation, so we fetch separately below.
        },
      },
    },
  });
  if (!entry) return null;

  const company = await prisma.companyProfile.findFirst({
    where: { OR: [{ id: companyId }, { slug: companyId }] },
    select: { id: true, slug: true, claimedByUserId: true },
  });
  if (!company) return null;
  if (entry.capTable.companyId !== company.id) return null;

  return { entry, company };
}

// PATCH /api/cap-tables/[companyId]/entries/[entryId] — owner/admin only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; entryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { companyId, entryId } = await params;
    const loaded = await loadEntryWithOwner(entryId, companyId);
    if (!loaded) return notFoundError('Cap table entry');

    const isOwner = loaded.company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can manage cap table entries');
    }

    const body = await request.json();
    const validation = validateBody(capTableEntryUpdateSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.holderName !== undefined) updateData.holderName = data.holderName;
    if (data.holderType !== undefined) updateData.holderType = data.holderType;
    if (data.shareClass !== undefined) updateData.shareClass = data.shareClass;
    if (data.shareCount !== undefined) {
      updateData.shareCount = data.shareCount ? BigInt(data.shareCount) : null;
    }
    if (data.investmentAmount !== undefined) updateData.investmentAmount = data.investmentAmount;
    if (data.roundLabel !== undefined) updateData.roundLabel = data.roundLabel;
    if (data.acquiredAt !== undefined) {
      updateData.acquiredAt = data.acquiredAt ? new Date(data.acquiredAt) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Percentage handling: prefer caller-supplied; otherwise re-derive if either
    // shareCount changed or sharesOutstanding differs from current entry.percentage.
    if (data.percentage !== undefined) {
      updateData.percentage = data.percentage;
    } else if (data.shareCount !== undefined) {
      const newShareCount =
        updateData.shareCount === undefined
          ? loaded.entry.shareCount
          : (updateData.shareCount as bigint | null);
      updateData.percentage = computePercentage(
        newShareCount,
        loaded.entry.capTable.sharesOutstanding
      );
    }

    const updated = await prisma.capTableEntry.update({
      where: { id: entryId },
      data: updateData,
    });

    logger.info('Cap table entry updated', {
      entryId,
      capTableId: loaded.entry.capTableId,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, entry: serializeCapTableEntry(updated) });
  } catch (error) {
    logger.error('Update cap table entry error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update cap table entry');
  }
}

// DELETE /api/cap-tables/[companyId]/entries/[entryId] — owner/admin only.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string; entryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { companyId, entryId } = await params;
    const loaded = await loadEntryWithOwner(entryId, companyId);
    if (!loaded) return notFoundError('Cap table entry');

    const isOwner = loaded.company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can manage cap table entries');
    }

    await prisma.capTableEntry.delete({ where: { id: entryId } });

    logger.info('Cap table entry deleted', {
      entryId,
      capTableId: loaded.entry.capTableId,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete cap table entry error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete cap table entry');
  }
}
