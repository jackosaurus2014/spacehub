import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  validationError,
  notFoundError,
  internalError,
} from '@/lib/errors';
import { readingListItemSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-groups/[slug]/reading-list
 * Append a reading list item to the group (host or member).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { slug } = params;
    const group = await prisma.studyGroup.findUnique({
      where: { slug },
      select: { id: true, hostUserId: true, readingList: true },
    });
    if (!group) return notFoundError('Study group');

    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: { groupId: group.id, userId: session.user.id },
      },
      select: { id: true },
    });
    if (!membership) {
      return forbiddenError('Only members can add to the reading list');
    }

    const body = await req.json().catch(() => ({}));
    const validation = validateBody(readingListItemSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const current = Array.isArray(group.readingList) ? group.readingList : [];
    if (current.length >= 100) {
      return validationError('Reading list is full (max 100 items)');
    }

    const newItem = {
      ...validation.data,
      addedByUserId: session.user.id,
      addedAt: new Date().toISOString(),
    };

    const updated = await prisma.studyGroup.update({
      where: { id: group.id },
      data: {
        readingList: [...current, newItem] as object,
      },
      select: { readingList: true },
    });

    logger.info('Reading list item added', {
      groupId: group.id,
      userId: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          readingList: Array.isArray(updated.readingList)
            ? updated.readingList
            : [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error adding reading list item', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to add reading list item');
  }
}
