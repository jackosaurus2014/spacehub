import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const JOB_CATEGORIES = ['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing'] as const;
const SENIORITY_LEVELS = ['entry', 'mid', 'senior', 'lead', 'director', 'vp', 'c_suite'] as const;
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship'] as const;

const createJobSchema = z.object({
  title: z.string().min(3).max(200).transform(v => v.trim()),
  location: z.string().min(2).max(200).transform(v => v.trim()),
  remoteOk: z.boolean().default(false),
  category: z.enum(JOB_CATEGORIES),
  specialization: z.string().max(100).optional().nullable(),
  seniorityLevel: z.enum(SENIORITY_LEVELS),
  employmentType: z.enum(EMPLOYMENT_TYPES).default('full_time'),
  description: z.string().min(20).max(10000).optional().transform(v => v?.trim()),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  yearsExperience: z.number().int().min(0).max(50).optional().nullable(),
  clearanceRequired: z.boolean().default(false),
  degreeRequired: z.string().max(50).optional().nullable(),
  sourceUrl: z.string().url().max(1000).optional().nullable(),
});

// GET: List job postings for a company (public)
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

    const jobs = await prisma.spaceJobPosting.findMany({
      where: { companyProfileId: company.id, isActive: true },
      orderBy: { postedDate: 'desc' },
      take: 50,
    });

    return NextResponse.json({ jobs, companyName: company.name });
  } catch (error) {
    logger.error('List company jobs error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch company jobs');
  }
}

// POST: Owner creates a job posting
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
      return NextResponse.json({ error: 'Only the profile owner can post jobs' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createJobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const data = validation.data;

    const job = await prisma.spaceJobPosting.create({
      data: {
        companyProfileId: company.id,
        company: company.name,
        title: data.title,
        location: data.location,
        remoteOk: data.remoteOk,
        category: data.category,
        specialization: data.specialization || null,
        seniorityLevel: data.seniorityLevel,
        employmentType: data.employmentType,
        description: data.description || null,
        salaryMin: data.salaryMin || null,
        salaryMax: data.salaryMax || null,
        yearsExperience: data.yearsExperience || null,
        clearanceRequired: data.clearanceRequired,
        degreeRequired: data.degreeRequired || null,
        sourceUrl: data.sourceUrl || null,
        postedDate: new Date(),
        isActive: true,
      },
    });

    logger.info('Company job posting created', { jobId: job.id, companyId: company.id, title: data.title });
    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error) {
    logger.error('Create company job error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create job posting');
  }
}

// DELETE: Owner archives a job posting
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'jobId query parameter required' }, { status: 400 });
    }

    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true, claimedByUserId: true },
    });

    if (!company || company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const job = await prisma.spaceJobPosting.findFirst({
      where: { id: jobId, companyProfileId: company.id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    await prisma.spaceJobPosting.update({
      where: { id: jobId },
      data: { isActive: false },
    });

    logger.info('Company job posting archived', { jobId, companyId: company.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Archive company job error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to archive job posting');
  }
}
