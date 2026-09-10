import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, notFoundError, validationError, internalError } from '@/lib/errors';
import { ownedJobPosting } from '@/lib/job-posting-server';

export const dynamic = 'force-dynamic';

const STATUSES = ['new', 'reviewed', 'contacted', 'rejected'] as const;
const patchSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(STATUSES).optional(),
  employerNote: z.string().trim().max(2000).nullable().optional(),
}).strict();

const csvCell = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/**
 * GET /api/jobs/[id]/applicants (2026-09-10) — the employer's applicants for
 * one owned posting, newest first; `?format=csv` downloads them. PATCH sets
 * a status (new / reviewed / contacted / rejected) and a private note.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorizedError();
  const { id } = await params;
  try {
    const job = await ownedJobPosting(id, session.user.id);
    if (!job) return notFoundError('Job posting');
    const rows = await prisma.jobApplication.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, phone: true, linkedinUrl: true, resumeUrl: true, message: true, status: true, employerNote: true, createdAt: true },
    });
    if (request.nextUrl.searchParams.get('format') === 'csv') {
      const header = ['Applied', 'Name', 'Email', 'Phone', 'LinkedIn/portfolio', 'Resume', 'Status', 'Note', 'Message'];
      const lines = rows.map((r) => [r.createdAt.toISOString(), r.name, r.email, r.phone, r.linkedinUrl, r.resumeUrl, r.status, r.employerNote, r.message].map(csvCell).join(','));
      const slug = job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'job';
      return new NextResponse([header.join(','), ...lines].join('\r\n') + '\r\n', {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="applicants-${slug}.csv"`, 'Cache-Control': 'private, no-store' },
      });
    }
    return NextResponse.json({ applicants: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    logger.error('Applicants read failed', { jobId: id, error: error instanceof Error ? error.message : String(error) });
    return internalError('Could not load applicants');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorizedError();
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message || 'Invalid update');
  const { applicationId, ...data } = parsed.data;
  try {
    const job = await ownedJobPosting(id, session.user.id);
    if (!job) return notFoundError('Job posting');
    const existing = await prisma.jobApplication.findFirst({ where: { id: applicationId, jobId: id }, select: { id: true } });
    if (!existing) return notFoundError('Application');
    const updated = await prisma.jobApplication.update({ where: { id: applicationId }, data, select: { id: true, status: true, employerNote: true } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Applicant update failed', { jobId: id, error: error instanceof Error ? error.message : String(error) });
    return internalError('Could not update the applicant');
  }
}
