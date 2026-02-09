import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  internalError,
  notFoundError,
  forbiddenError,
  validationError,
} from '@/lib/errors';
import { personnelSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verify company exists
    const company = await prisma.companyProfile.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!company) {
      return notFoundError('Company profile');
    }

    const personnel = await prisma.keyPersonnel.findMany({
      where: { companyId: id },
      orderBy: [{ isCurrent: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: {
        companyId: id,
        companyName: company.name,
        personnel,
        total: personnel.length,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch key personnel', {
      error: error instanceof Error ? error.message : String(error),
      companyId: params.id,
    });
    return internalError('Failed to fetch key personnel');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin only
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return forbiddenError();
    }

    const { id } = params;

    // Verify company exists
    const company = await prisma.companyProfile.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!company) {
      return notFoundError('Company profile');
    }

    const body = await req.json();
    const validation = validateBody(personnelSchema, body);

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    const person = await prisma.keyPersonnel.create({
      data: {
        companyId: id,
        name: data.name,
        title: data.title,
        role: data.role,
        linkedinUrl: data.linkedinUrl,
        bio: data.bio,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isCurrent: data.isCurrent,
        previousCompanies: data.previousCompanies,
      },
    });

    logger.info('Key personnel created', {
      id: person.id,
      companyId: id,
      name: person.name,
      title: person.title,
      adminUserId: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: person,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to create key personnel', {
      error: error instanceof Error ? error.message : String(error),
      companyId: params.id,
    });
    return internalError('Failed to create key personnel');
  }
}
