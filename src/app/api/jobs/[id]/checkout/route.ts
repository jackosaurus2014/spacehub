import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { unauthorizedError, notFoundError, validationError, internalError } from '@/lib/errors';
import { APP_URL } from '@/lib/constants';
import { getJobPostingPlan, JOB_POSTING_PAYMENT_KIND } from '@/lib/job-posting-plans';
import { ownedJobPosting } from '@/lib/job-posting-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/jobs/[id]/checkout { planId? } (2026-09-10) — pay for an unpaid
 * draft, renew an expired/removed listing, or upgrade a live standard
 * listing to featured, from the employer portal. Opens a fresh Stripe
 * Checkout for the row; the webhook re-activates it with a new expiry (and
 * featured window when the plan is featured). An upgrade keeps whichever
 * expiry is later.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return unauthorizedError();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const row = await ownedJobPosting(id, session.user.id);
    if (!row) return notFoundError('Job posting');
    const plan = getJobPostingPlan(typeof body?.planId === 'string' ? body.planId : row.planId);
    if (!plan) return validationError('Choose a plan');
    const livePaid = !!row.paidAt && (!row.expiresAt || row.expiresAt.getTime() > Date.now());
    const currentlyFeatured = row.featured && (!row.featuredUntil || row.featuredUntil.getTime() > Date.now());
    const upgrade = livePaid && plan.featured && !currentlyFeatured;
    if (livePaid && !upgrade) return validationError(plan.featured ? 'This listing is already featured; renewal opens when it expires' : 'This listing is already live; renewal opens when it expires');

    const checkout = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: session.user.email,
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: plan.priceUsd * 100, product_data: { name: `SpaceNexus ${plan.name}${upgrade ? ' upgrade' : ''} — ${row.title}`, description: upgrade ? `Pin the listing to the top of the SpaceNexus space jobs board for ${plan.days} days.` : `${plan.days}-day listing on the SpaceNexus space jobs board${plan.featured ? ', featured' : ''}.` } } }],
      metadata: { kind: JOB_POSTING_PAYMENT_KIND, jobId: row.id, planId: plan.id, userId: session.user.id, renewal: row.paidAt ? '1' : '0', upgrade: upgrade ? '1' : '0' },
      success_url: `${APP_URL}/hire/dashboard?posted=${row.id}`,
      cancel_url: `${APP_URL}/hire/dashboard?canceled=${row.id}`,
    });
    await prisma.spaceJobPosting.update({ where: { id }, data: { planId: plan.id, stripeSessionId: checkout.id } });
    logger.info('Job posting checkout (portal)', { jobId: id, planId: plan.id, renewal: !!row.paidAt, upgrade });
    return NextResponse.json({ success: true, data: { url: checkout.url } });
  } catch (error) {
    logger.error('Job posting checkout failed', { jobId: id, error: error instanceof Error ? error.message : String(error) });
    return internalError('Could not start checkout');
  }
}
