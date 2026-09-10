import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, notFoundError, validationError, internalError } from '@/lib/errors';
import { ownedJobPosting } from '@/lib/job-posting-server';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing'] as const;
const LEVELS = ['entry', 'mid', 'senior', 'lead', 'director', 'vp', 'c_suite'] as const;

const patchSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  location: z.string().trim().min(2).max(120).optional(),
  remoteOk: z.boolean().optional(),
  category: z.enum(CATEGORIES).optional(),
  seniorityLevel: z.enum(LEVELS).optional(),
  employmentType: z.string().trim().max(40).optional(),
  description: z.string().trim().min(80).max(12000).optional(),
  applyUrl: z.string().trim().url().max(500).nullable().optional(),
  /** 'link' sends candidates to applyUrl; 'spacenexus' collects applications in the portal. */
  applyMode: z.enum(['link', 'spacenexus']).optional(),
  contactEmail: z.string().trim().email().max(200).optional(),
  salaryMin: z.number().int().min(10000).max(2000000).nullable().optional(),
  salaryMax: z.number().int().min(10000).max(2000000).nullable().optional(),
  clearanceRequired: z.boolean().optional(),
  /** Pause (false) or resume (true) a paid, unexpired listing. */
  isActive: z.boolean().optional(),
}).strict();

/**
 * PATCH /api/jobs/[id] (2026-09-10) — an employer edits their own posting.
 * Content fields any time; isActive only toggles a paid, unexpired listing
 * (pause/resume). Plan and featured window are not editable here — renew
 * through /api/jobs/[id]/checkout.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorizedError();
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message || 'Invalid update', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  const b = parsed.data;
  try {
    const row = await ownedJobPosting(id, session.user.id);
    if (!row) return notFoundError('Job posting');
    const min = b.salaryMin === undefined ? row.salaryMin : b.salaryMin;
    const max = b.salaryMax === undefined ? row.salaryMax : b.salaryMax;
    if (min != null && max != null && max < min) return validationError('Salary max must be at least salary min');
    const mode = b.applyMode ?? row.applyMode;
    if (mode === 'link' && b.applyUrl === null) return validationError('Add an application link, or collect applications on SpaceNexus');
    if (b.isActive !== undefined) {
      if (!row.paidAt) return validationError('Pay for the listing before switching it on');
      if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return validationError('This listing has expired — renew it instead');
    }
    const { applyUrl, ...rest } = b;
    const updated = await prisma.spaceJobPosting.update({
      where: { id },
      data: {
        ...rest,
        ...(applyUrl !== undefined ? { sourceUrl: applyUrl } : {}),
        ...(b.salaryMin !== undefined || b.salaryMax !== undefined
          ? { salaryMedian: min != null && max != null ? Math.round((min + max) / 2) : null }
          : {}),
      },
      select: { id: true, isActive: true, title: true },
    });
    logger.info('Job posting edited', { jobId: id, userId: session.user.id, fields: Object.keys(b) });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Job posting edit failed', { jobId: id, error: error instanceof Error ? error.message : String(error) });
    return internalError('Could not save the listing');
  }
}

/**
 * DELETE /api/jobs/[id] — remove a posting. Unpaid drafts are deleted;
 * paid listings are taken off the board (inactive, expired now) and kept
 * for the employer's records and receipts.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorizedError();
  const { id } = await params;
  try {
    const row = await ownedJobPosting(id, session.user.id);
    if (!row) return notFoundError('Job posting');
    if (!row.paidAt) {
      await prisma.spaceJobPosting.delete({ where: { id } });
      return NextResponse.json({ success: true, data: { id, deleted: true } });
    }
    await prisma.spaceJobPosting.update({ where: { id }, data: { isActive: false, expiresAt: new Date(), featured: false, featuredUntil: null } });
    logger.info('Job posting removed', { jobId: id, userId: session.user.id });
    return NextResponse.json({ success: true, data: { id, deleted: false, removed: true } });
  } catch (error) {
    logger.error('Job posting removal failed', { jobId: id, error: error instanceof Error ? error.message : String(error) });
    return internalError('Could not remove the listing');
  }
}
