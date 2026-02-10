import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, claimProfileSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(claimProfileSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;

    // Find the company profile
    const company = await prisma.companyProfile.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true, claimedByUserId: true, slug: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId) {
      if (company.claimedByUserId === session.user.id) {
        return NextResponse.json({ error: 'You have already claimed this profile' }, { status: 409 });
      }
      return NextResponse.json({ error: 'This profile has already been claimed' }, { status: 409 });
    }

    // Check if user has already claimed another company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { claimedCompanyId: true },
    });

    if (user?.claimedCompanyId) {
      return NextResponse.json(
        { error: 'You have already claimed a company profile. Each user may only claim one company.' },
        { status: 409 }
      );
    }

    // Update company profile and user in a transaction
    const [updatedCompany] = await prisma.$transaction([
      prisma.companyProfile.update({
        where: { id: company.id },
        data: {
          claimedByUserId: session.user.id,
          claimedAt: new Date(),
          verificationLevel: 'identity',
          contactEmail: data.contactEmail,
          marketplaceActive: true,
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { claimedCompanyId: company.id },
      }),
    ]);

    logger.info('Company profile claimed', {
      companyId: company.id,
      companySlug: company.slug,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      company: {
        id: updatedCompany.id,
        slug: updatedCompany.slug,
        name: updatedCompany.name,
        verificationLevel: updatedCompany.verificationLevel,
      },
      message: `You have successfully claimed ${company.name}. Your verification level is set to "identity".`,
    }, { status: 200 });
  } catch (error) {
    logger.error('Claim profile error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to claim company profile');
  }
}
