import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const GIG_CATEGORIES = ['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing'] as const;
const WORK_TYPES = ['freelance', 'contract', 'part_time', 'consulting', 'side_project'] as const;
const BUDGET_TYPES = ['hourly', 'fixed', 'monthly'] as const;

const createGigSchema = z.object({
  title: z.string().min(3).max(200).transform(v => v.trim()),
  description: z.string().min(20).max(10000).transform(v => v.trim()),
  category: z.enum(GIG_CATEGORIES),
  skills: z.array(z.string().max(100)).min(1).max(20),
  workType: z.enum(WORK_TYPES),
  duration: z.string().max(100).optional().nullable(),
  hoursPerWeek: z.number().int().min(1).max(80).optional().nullable(),
  budgetMin: z.number().int().min(0).optional().nullable(),
  budgetMax: z.number().int().min(0).optional().nullable(),
  budgetType: z.enum(BUDGET_TYPES).default('hourly'),
  location: z.string().max(200).optional().nullable(),
  remoteOk: z.boolean().default(true),
  clearanceRequired: z.boolean().default(false),
});

// GET: List gig opportunities for a company (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const gigs = await prisma.gigOpportunity.findMany({
      where: { companyProfileId: company.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ gigs, companyName: company.name });
  } catch (error) {
    logger.error('List company gigs error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch company gigs');
  }
}

// POST: Owner creates a gig opportunity
export async function POST(
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
      select: { id: true, claimedByUserId: true, name: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Only the profile owner can post gigs' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createGigSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Ensure user has an EmployerProfile (auto-create if needed)
    let employerProfile = await prisma.employerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!employerProfile) {
      employerProfile = await prisma.employerProfile.create({
        data: {
          userId: session.user.id,
          companyName: company.name,
          companySlug: slug,
          industry: 'Space & Aerospace',
          size: 'unknown',
        },
      });
    }

    const gig = await prisma.gigOpportunity.create({
      data: {
        employerId: employerProfile.id,
        companyProfileId: company.id,
        title: data.title,
        description: data.description,
        category: data.category,
        skills: data.skills,
        workType: data.workType,
        duration: data.duration || null,
        hoursPerWeek: data.hoursPerWeek || null,
        budgetMin: data.budgetMin || null,
        budgetMax: data.budgetMax || null,
        budgetType: data.budgetType,
        location: data.location || null,
        remoteOk: data.remoteOk,
        clearanceRequired: data.clearanceRequired,
        isActive: true,
      },
    });

    logger.info('Company gig created', { gigId: gig.id, companyId: company.id, title: data.title });
    return NextResponse.json({ success: true, gig }, { status: 201 });
  } catch (error) {
    logger.error('Create company gig error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create gig opportunity');
  }
}
