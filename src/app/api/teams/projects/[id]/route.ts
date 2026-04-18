import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';
import { updateProjectSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** PATCH /api/teams/projects/[id] — owner or member */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const project = await prisma.teamProject.findUnique({
      where: { id: params.id },
    });
    if (!project) {
      return notFoundError('Project');
    }

    const isOwner = project.ownerId === session.user.id;
    const isMember = project.memberUserIds.includes(session.user.id);
    if (!isOwner && !isMember) {
      return forbiddenError('Only the owner or a member can update this project');
    }

    const body = await req.json();
    const validation = validateBody(updateProjectSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { name, description, status, dueDate, memberUserIds } =
      validation.data;

    // Only owner can change membership
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (memberUserIds !== undefined) {
      if (!isOwner) {
        return forbiddenError('Only the project owner can change members');
      }
      data.memberUserIds = Array.from(
        new Set([project.ownerId, ...memberUserIds])
      );
    }

    const updated = await prisma.teamProject.update({
      where: { id: params.id },
      data,
    });

    logger.info('Team project updated', {
      projectId: params.id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: { project: updated } });
  } catch (error) {
    logger.error('Update project error', {
      error: error instanceof Error ? error.message : String(error),
      projectId: params.id,
    });
    return internalError('Failed to update project');
  }
}
