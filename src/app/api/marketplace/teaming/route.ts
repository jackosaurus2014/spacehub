import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, teamingCreateSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractRef = searchParams.get('contractReference');
    const status = searchParams.get('status') || 'open';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);

    const where: Record<string, unknown> = {};
    if (contractRef) where.contractReference = contractRef;
    if (status) where.status = status;

    const opportunities = await prisma.teamingOpportunity.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        company: {
          select: {
            id: true, slug: true, name: true, logoUrl: true,
            verificationLevel: true, sector: true, cageCode: true,
          },
        },
      },
    });

    return NextResponse.json({ opportunities, total: opportunities.length });
  } catch (error) {
    logger.error('List teaming opportunities error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch teaming opportunities');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { claimedCompanyId: true },
    });

    if (!user?.claimedCompanyId) {
      return NextResponse.json(
        { error: 'You must claim a company profile to post teaming opportunities' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(teamingCreateSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;

    const teaming = await prisma.teamingOpportunity.create({
      data: {
        companyId: user.claimedCompanyId,
        contractReference: data.contractReference || null,
        contractTitle: data.contractTitle,
        contractAgency: data.contractAgency || null,
        seekingRole: data.seekingRole,
        capabilitiesNeeded: data.capabilitiesNeeded,
        capabilitiesOffered: data.capabilitiesOffered,
        setAsideQualifications: data.setAsideQualifications,
        description: data.description || null,
        contactEmail: data.contactEmail,
        status: 'open',
      },
      include: {
        company: { select: { id: true, slug: true, name: true } },
      },
    });

    logger.info('Teaming opportunity created', { id: teaming.id, contract: data.contractTitle });
    return NextResponse.json({ teaming }, { status: 201 });
  } catch (error) {
    logger.error('Create teaming error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create teaming opportunity');
  }
}
