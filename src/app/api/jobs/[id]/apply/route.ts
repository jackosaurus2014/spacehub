import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { notFoundError, validationError, internalError, rateLimitedError } from '@/lib/errors';
import { sendNewApplicationEmail } from '@/lib/employer-email';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  linkedinUrl: z.string().trim().url().max(300).optional().or(z.literal('')),
  resumeUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  message: z.string().trim().max(4000).optional().or(z.literal('')),
  /** Honeypot — bots fill it, people never see it. */
  website: z.string().max(200).optional(),
});

const MAX_PER_JOB_PER_EMAIL_DAYS = 30;
const MAX_PER_IP_PER_DAY = 20;

/**
 * POST /api/jobs/[id]/apply (2026-09-10) — a candidate applies on SpaceNexus
 * to a direct posting whose employer chose applyMode 'spacenexus'. No account
 * needed. Stores a JobApplication, bumps applyClicks, and emails the
 * employer's contact address. Duplicate (same email, same job, 30 days) and
 * per-IP floods are refused; the honeypot returns a silent 200.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message || 'Check the form', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  const b = parsed.data;
  if (b.website) return NextResponse.json({ success: true, data: { received: true } });
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const ipHash = createHash('sha256').update(`${ip}:${process.env.NEXTAUTH_SECRET || 'spacenexus'}`).digest('hex').slice(0, 32);
  try {
    const job = await prisma.spaceJobPosting.findUnique({
      where: { id },
      select: { id: true, title: true, company: true, source: true, isActive: true, expiresAt: true, applyMode: true, contactEmail: true },
    });
    if (!job || job.source !== 'direct' || job.applyMode !== 'spacenexus') return notFoundError('Job posting');
    if (!job.isActive || (job.expiresAt && job.expiresAt.getTime() < Date.now())) return validationError('This listing is no longer accepting applications');
    const since = new Date(Date.now() - MAX_PER_JOB_PER_EMAIL_DAYS * 86_400_000);
    const dayAgo = new Date(Date.now() - 86_400_000);
    const [dup, fromIp] = await Promise.all([
      prisma.jobApplication.findFirst({ where: { jobId: id, email: { equals: b.email, mode: 'insensitive' }, createdAt: { gt: since } }, select: { id: true } }),
      prisma.jobApplication.count({ where: { ipHash, createdAt: { gt: dayAgo } } }),
    ]);
    if (dup) return validationError('You have already applied to this role. The employer has your application.');
    if (fromIp >= MAX_PER_IP_PER_DAY) return rateLimitedError(3600);
    const app = await prisma.jobApplication.create({
      data: {
        jobId: id, name: b.name, email: b.email, phone: b.phone || null, linkedinUrl: b.linkedinUrl || null,
        resumeUrl: b.resumeUrl || null, message: b.message || null, ipHash,
      },
      select: { id: true },
    });
    await prisma.spaceJobPosting.update({ where: { id }, data: { applyClicks: { increment: 1 } } }).catch(() => null);
    if (job.contactEmail) {
      void sendNewApplicationEmail({ to: job.contactEmail, jobId: id, jobTitle: job.title, applicant: b });
    }
    logger.info('Job application received', { jobId: id, applicationId: app.id });
    return NextResponse.json({ success: true, data: { received: true, company: job.company } });
  } catch (error) {
    logger.error('Job application failed', { jobId: id, error: error instanceof Error ? error.message : String(error) });
    return internalError('Could not send your application');
  }
}
