import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const CODE = 'FOUNDER50';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface PromoStatus {
  active: boolean;
  code?: string;
  percentOff?: number;
  durationMonths?: number;
  remaining?: number;
  total?: number;
}

let cached: { data: PromoStatus; at: number } | null = null;

/**
 * GET /api/promo/founding
 * Live status of the Founding Member promotion, read from Stripe so the
 * "spots remaining" counter is always honest. Cached for 5 minutes.
 */
export async function GET() {
  try {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ active: false } satisfies PromoStatus);
    }

    const list = await getStripe().promotionCodes.list({ code: CODE, limit: 1 });
    const pc = list.data[0];

    let data: PromoStatus;
    if (!pc || !pc.active) {
      data = { active: false };
    } else {
      const total = pc.max_redemptions ?? 0;
      const remaining = total > 0 ? Math.max(0, total - pc.times_redeemed) : 0;
      data = {
        active: remaining > 0,
        code: pc.code,
        percentOff: pc.coupon.percent_off ?? undefined,
        durationMonths: pc.coupon.duration_in_months ?? undefined,
        remaining,
        total,
      };
    }

    cached = { data, at: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Failed to fetch founding promo status', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ active: false } satisfies PromoStatus);
  }
}
