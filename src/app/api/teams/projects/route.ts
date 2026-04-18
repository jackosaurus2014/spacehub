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
import { createProjectSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/teams/projects — list TeamProjects across the user's channels
 *
 * The user can see projects from companies whose channels they belong to,
 * or projects they own / are listed as members of.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // companies of channels user belongs to
    const memberships = await prisma.channelMembership.findMany({
      where: { userId: session.user.id },
      include: { channel: { select: { companyId: true } } },
    });
    const companyIds = Array.from(
      new Set(memberships.map((m) => m.channel.companyId))
    );

    const projects = await prisma.teamProject.findMany({
      where: {
        OR: [
          { companyId: { in: companyIds } },
          { ownerId: session.user.id },
          { memberUserIds: { has: session.user.id } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    const projectCompanyIds = Array.from(
      new Set(projects.map((p) => p.companyId))
    );
    const companies = await prisma.companyProfile.findMany({
      where: { id: { in: projectCompanyIds } },
      select: { id: true, slug: true, name: true, logoUrl: true },
    });
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    const result = projects.map((p) => ({
      ...p,
      company: companyMap.get(p.companyId) || null,
    }));

    return NextResponse.json({ success: true, data: { projects: result } });
  } catch (error) {
    logger.error('List projects error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list projects');
  }
}

/** POST /api/teams/projects — create */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const validation = validateBody(createProjectSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { companyId, name, description, status, dueDate, memberUserIds } =
      validation.data;

    const company = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: { id: true, claimedByUserId: true },
    });
    if (!company) {
      return notFoundError('Company');
    }

    // Project creator must either be the claimed-company owner OR a member
    // of one of the company's channels.
    const isClaimOwner = company.claimedByUserId === session.user.id;
    let allowed = isClaimOwner;
    if (!allowed) {
      const channelMembership = await prisma.channelMembership.findFirst({
        where: {
          userId: session.user.id,
          channel: { companyId },
        },
        select: { id: true },
      });
      allowed = !!channelMembership;
    }
    if (!allowed) {
      return forbiddenError('You do not have access to create projects for this company');
    }

    const dedupedMembers = Array.from(
      new Set([session.user.id, ...(memberUserIds || [])])
    );

    const project = await prisma.teamProject.create({
      data: {
        companyId,
        name,
        description,
        status,
        ownerId: session.user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        memberUserIds: dedupedMembers,
      },
    });

    logger.info('Team project created', {
      projectId: project.id,
      companyId,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: { project } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create project error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create project');
  }
}
