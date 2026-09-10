import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { unauthorizedError, notFoundError, validationError, internalError } from '@/lib/errors';
import { APP_URL } from '@/lib/constants';
import { getJobPostingPlan, JOB_POSTING_PAYMENT_KIND } from '@/lib/job-posting-plans';

export const dynamic = 'force-dynamic';

/**
 * POST /api/jobs/[id]/checkout { planId? } (2026-09-10) — pay for an unpaid
 * draft, or renew an expired/removed listing, from the employer portal.
 * Opens a fresh Stripe Checkout for the row; the webhook re-activates it
 * with a new expiry (and featured window when the plan is featured).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return unauthorizedError();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const row = await prisma.spaceJobPosting.findUnique({
      where: { id },
      select: { id: true, title: true, postedByUserId: true, source: true, planId: true, paidAt: true, expiresAt: true, isActive: true },
    });
    if (!row || row.source !== 'direct' || row.postedByUserId !== session.user.id) return notFoundError('Job posting');
    const plan = getJobPostingPlan(typeof body?.planId === 'string' ? body.planId : row.planId);
    if (!plan) return validationError('Choose a plan');
    const liveAndPaid = row.paidAt && row.isActive && (!row.expiresAt || row.expiresAt.getTime() > Date.now());
    if (liveAndPaid) return validationError('This listing is already live; renewal opens when it expires');

    const checkout = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: session.user.email,
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: plan.priceUsd * 100, product_data: { name: `SpaceNexus ${plan.name} — ${row.title}`, description: `${plan.days}-day listing on the SpaceNexus space jobs board${plan.featured ? ', featured' : ''}.` } } }],
      metadata: { kind: JOB_POSTING_PAYMENT_KIND, jobId: row.id, planId: plan.id, userId: session.user.id, renewal: row.paidAt ? '1' : '0' },
      success_url: `${APP_URL}/hire/dashboard?posted=${row.id}`,
      cancel_url: `${APP_URL}/hire/dashboard?canceled=${row.id}`,
    });
    await prisma.spaceJobPosting.update({ where: { id }, data: { planId: plan.id, stripeSessionId: checkout.id } });
    logger.info('Job posting checkout (portal)', { jobId: id, planId: plan.id, renewal: !!row.paidAt });
    return NextResponse.json({ success: true, data: { url: checkout.url } });
  } catch (error) {
    logger.error('Job posting checkout failed', { jobId: id, error: error instanceof Error ? error.message : String(error) });
    return internalError('Could not start checkout');
  }
}
