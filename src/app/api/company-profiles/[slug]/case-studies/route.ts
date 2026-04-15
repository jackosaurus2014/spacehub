import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const SECTOR_OPTIONS = [
  'launch', 'satellite', 'ground-segment', 'in-space-services', 'manufacturing',
  'earth-observation', 'communications', 'defense', 'propulsion', 'software',
  'consulting', 'human-spaceflight', 'space-tourism', 'research',
] as const;

const createCaseStudySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(300).transform(v => v.trim()),
  summary: z.string().min(20, 'Summary must be at least 20 characters').max(2000).transform(v => v.trim()),
  content: z.string().min(50, 'Content must be at least 50 characters').max(50000).transform(v => v.trim()),
  clientName: z.string().max(200).optional().nullable().transform(v => v?.trim() || null),
  sector: z.string().max(100).optional().nullable(),
  metrics: z.record(z.string(), z.unknown()).optional().nullable(),
  imageUrl: z.string().url().max(1000).optional().nullable(),
  isPublished: z.boolean().optional().default(false),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

// GET: List published case studies for a company (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true, claimedByUserId: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if requester is the owner — if so, show all (including unpublished)
    const session = await getServerSession(authOptions);
    const isOwner = session?.user?.id && company.claimedByUserId === session.user.id;

    const caseStudies = await prisma.caseStudy.findMany({
      where: {
        companyId: company.id,
        ...(isOwner ? {} : { isPublished: true }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ caseStudies });
  } catch (error) {
    logger.error('List case studies error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch case studies');
  }
}

// POST: Owner creates a case study
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
      return NextResponse.json({ error: 'Only the profile owner can create case studies' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createCaseStudySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Generate unique slug from title
    let caseStudySlug = slugify(data.title);
    const existing = await prisma.caseStudy.findUnique({ where: { slug: caseStudySlug } });
    if (existing) {
      caseStudySlug = `${caseStudySlug}-${Date.now().toString(36)}`;
    }

    const caseStudy = await prisma.caseStudy.create({
      data: {
        companyId: company.id,
        title: data.title,
        slug: caseStudySlug,
        summary: data.summary,
        content: data.content,
        clientName: data.clientName,
        sector: data.sector || null,
        metrics: data.metrics ? (data.metrics as Record<string, string>) : undefined,
        imageUrl: data.imageUrl || null,
        isPublished: data.isPublished,
      },
    });

    logger.info('Case study created', {
      caseStudyId: caseStudy.id,
      companyId: company.id,
      slug: caseStudySlug,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, caseStudy }, { status: 201 });
  } catch (error) {
    logger.error('Create case study error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create case study');
  }
}

// PATCH: Owner updates a case study (publish/unpublish, edit)
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
      select: { id: true, claimedByUserId: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Only the profile owner can update case studies' }, { status: 403 });
    }

    const body = await request.json();
    const { caseStudyId, ...updates } = body;

    if (!caseStudyId) {
      return NextResponse.json({ error: 'caseStudyId is required' }, { status: 400 });
    }

    const existing = await prisma.caseStudy.findFirst({
      where: { id: caseStudyId, companyId: company.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Case study not found' }, { status: 404 });
    }

    const allowedFields: Record<string, unknown> = {};
    if (typeof updates.isPublished === 'boolean') allowedFields.isPublished = updates.isPublished;
    if (typeof updates.title === 'string') allowedFields.title = updates.title.trim();
    if (typeof updates.summary === 'string') allowedFields.summary = updates.summary.trim();
    if (typeof updates.content === 'string') allowedFields.content = updates.content.trim();
    if (updates.clientName !== undefined) allowedFields.clientName = updates.clientName?.trim() || null;
    if (updates.sector !== undefined) allowedFields.sector = updates.sector || null;
    if (updates.metrics !== undefined) allowedFields.metrics = updates.metrics;
    if (updates.imageUrl !== undefined) allowedFields.imageUrl = updates.imageUrl || null;

    const updated = await prisma.caseStudy.update({
      where: { id: caseStudyId },
      data: allowedFields,
    });

    logger.info('Case study updated', {
      caseStudyId,
      companyId: company.id,
      userId: session.user.id,
      fields: Object.keys(allowedFields),
    });

    return NextResponse.json({ success: true, caseStudy: updated });
  } catch (error) {
    logger.error('Update case study error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update case study');
  }
}
