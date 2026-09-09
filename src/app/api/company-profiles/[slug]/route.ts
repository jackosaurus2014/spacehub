import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { notFoundError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { getCompanyProfileData } from '@/lib/company-profile-data';

export const dynamic = 'force-dynamic';

// Core scalar fields that have existed since the initial company profiles schema.
// These are safe to query even if recent prisma db push deployments failed.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await getCompanyProfileData(slug);
    if (!data) {
      return notFoundError('Company profile');
    }
    return NextResponse.json(data);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.constructor.name : 'Unknown';
    logger.error('Failed to fetch company profile (outer)', {
      error: errMsg,
      errorType: errName,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to fetch company profile: [${errName}] ${errMsg.slice(0, 300)}`,
        },
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH – Owner edits their claimed company profile
// ---------------------------------------------------------------------------

const editProfileSchema = z.object({
  description: z.string().max(2000).optional(),
  longDescription: z.string().max(10000).optional(),
  website: z.string().url().max(500).optional().nullable(),
  linkedinUrl: z.string().url().max(500).optional().nullable(),
  twitterUrl: z.string().url().max(500).optional().nullable(),
  contactEmail: z.string().email().max(200).optional(),
  headquarters: z.string().max(200).optional(),
  ceo: z.string().max(200).optional().nullable(),
  cto: z.string().max(200).optional().nullable(),
  sector: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  logoUrl: z.string().url().max(1000).optional().nullable(),
  employeeRange: z.string().max(50).optional(),
}).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { slug } = await params;

    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true, claimedByUserId: true, name: true, slug: true },
    });

    if (!company) {
      return notFoundError('Company profile');
    }

    if (company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Only the profile owner can edit this company' }, { status: 403 });
    }

    const body = await request.json();
    const validation = editProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Only include fields that were actually provided
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await prisma.companyProfile.update({
      where: { id: company.id },
      data: updateData,
      select: {
        id: true, slug: true, name: true, description: true, longDescription: true,
        website: true, linkedinUrl: true, twitterUrl: true, contactEmail: true,
        headquarters: true, ceo: true, cto: true, sector: true, tags: true,
        logoUrl: true, employeeRange: true,
      },
    });

    logger.info('Company profile updated by owner', {
      companyId: company.id,
      slug: company.slug,
      userId: session.user.id,
      fieldsUpdated: Object.keys(updateData),
    });

    return NextResponse.json({ success: true, company: updated });
  } catch (error) {
    logger.error('Edit company profile error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update company profile');
  }
}
