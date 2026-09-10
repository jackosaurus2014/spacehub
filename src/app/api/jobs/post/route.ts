import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { unauthorizedError, validationError, internalError } from '@/lib/errors';
import { APP_URL } from '@/lib/constants';
import { getJobPostingPlan, JOB_POSTING_PAYMENT_KIND } from '@/lib/job-posting-plans';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing'] as const;
const LEVELS = ['entry', 'mid', 'senior', 'lead', 'director', 'vp', 'c_suite'] as const;

const bodySchema = z.object({
  planId: z.enum(['standard', 'featured']),
  title: z.string().trim().min(3).max(120),
  company: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  remoteOk: z.boolean().default(false),
  category: z.enum(CATEGORIES),
  seniorityLevel: z.enum(LEVELS),
  employmentType: z.string().trim().max(40).optional(),
  description: z.string().trim().min(80).max(12000),
  applyUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  /** 'link' sends candidates to applyUrl; 'spacenexus' collects applications in the portal. */
  applyMode: z.enum(['link', 'spacenexus']).default('link'),
  contactEmail: z.string().trim().email().max(200),
  /** Save as an unpaid draft in the portal instead of opening checkout now. */
  draft: z.boolean().default(false),
  salaryMin: z.number().int().min(10000).max(2000000).optional(),
  salaryMax: z.number().int().min(10000).max(2000000).optional(),
  clearanceRequired: z.boolean().default(false),
  companyProfileSlug: z.string().trim().max(120).optional(),
});

/**
 * POST /api/jobs/post (2026-09-10) — an employer posts a job.
 *
 * Creates the posting inactive, then a one-time Stripe Checkout session
 * carrying { kind: 'job_posting', jobId, planId }. The webhook activates the
 * row on payment (isActive, expiresAt, featured/featuredUntil, paidAt).
 * Requires a signed-in account so the employer dashboard can find it.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return unauthorizedError();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message || 'Invalid posting', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  const b = parsed.data;
  if (b.salaryMin && b.salaryMax && b.salaryMax < b.salaryMin) return validationError('Salary max must be at least salary min');
  const plan = getJobPostingPlan(b.planId);
  if (!plan) return validationError('Unknown plan');
  if (b.applyMode === 'link' && !b.applyUrl) return validationError('Add an application link, or collect applications on SpaceNexus');

  try {
    const profile = b.companyProfileSlug
      ? await prisma.companyProfile.findUnique({ where: { slug: b.companyProfileSlug }, select: { id: true, name: true } })
      : await prisma.companyProfile.findFirst({ where: { name: { equals: b.company, mode: 'insensitive' } }, select: { id: true, name: true } });

    const posting = await prisma.spaceJobPosting.create({
      data: {
        title: b.title,
        company: profile?.name ?? b.company,
        location: b.location,
        remoteOk: b.remoteOk,
        category: b.category,
        seniorityLevel: b.seniorityLevel,
        employmentType: b.employmentType || 'full-time',
        description: b.description,
        sourceUrl: b.applyUrl || null,
        applyMode: b.applyMode,
        contactEmail: b.contactEmail,
        salaryMin: b.salaryMin ?? null,
        salaryMax: b.salaryMax ?? null,
        salaryMedian: b.salaryMin && b.salaryMax ? Math.round((b.salaryMin + b.salaryMax) / 2) : null,
        clearanceRequired: b.clearanceRequired,
        isActive: false, // activated by the payment webhook
        postedDate: new Date(),
        source: 'direct',
        externalId: `direct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        companyProfileId: profile?.id ?? null,
        postedByUserId: session.user.id,
        planId: plan.id,
        featured: false,
      },
      select: { id: true },
    });
    if (b.draft) {
      logger.info('Job posting saved as draft', { jobId: posting.id, userId: session.user.id });
      return NextResponse.json({ success: true, data: { jobId: posting.id, draft: true, url: `${APP_URL}/hire/dashboard?draft=${posting.id}` } });
    }

    const checkout = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: session.user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: plan.priceUsd * 100,
            product_data: {
              name: `SpaceNexus ${plan.name} — ${b.title}`,
              description: `${plan.days}-day listing on the SpaceNexus space jobs board${plan.featured ? ', featured' : ''}.`,
            },
          },
        },
      ],
      metadata: { kind: JOB_POSTING_PAYMENT_KIND, jobId: posting.id, planId: plan.id, userId: session.user.id },
      success_url: `${APP_URL}/hire/dashboard?posted=${posting.id}`,
      cancel_url: `${APP_URL}/hire?canceled=${posting.id}`,
    });

    await prisma.spaceJobPosting.update({ where: { id: posting.id }, data: { stripeSessionId: checkout.id } });
    logger.info('Job posting checkout created', { jobId: posting.id, planId: plan.id, userId: session.user.id });
    return NextResponse.json({ success: true, data: { jobId: posting.id, url: checkout.url } });
  } catch (error) {
    logger.error('Job posting failed', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Could not start the posting. Please try again.');
  }
}
