export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// ── View/click dedup ────────────────────────────────────────────────────────
// Sponsor counters are anonymous POSTs, so without this a loop could inflate a
// sponsor's numbers arbitrarily (docs/SECURITY_AUDIT_2026-08.md P9). One
// counted event per (client IP, slug, event) per hour.
//
// This is PER-INSTANCE, in-memory state: it resets on deploy/restart and, if
// the app is ever scaled to N replicas, each replica keeps its own window (so
// the cap becomes N per hour). That is fine for a vanity metric; it is not a
// security boundary. The map is bounded so a header-spoofing flood cannot grow
// it without limit.
const DEDUP_TTL_MS = 60 * 60 * 1000;
const DEDUP_MAX_ENTRIES = 50_000;
const recentEvents = new Map<string, number>();

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    // The RIGHTMOST entry is the one our own edge proxy appended; anything to
    // its left was supplied by the client and is trivially forgeable.
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return request.headers.get('x-real-ip') || request.ip || 'unknown';
}

function pruneRecentEvents(now: number): void {
  // Deleting during Map.forEach is safe per spec (ES5 target: no for..of on iterators).
  recentEvents.forEach((seenAt, key) => {
    if (now - seenAt >= DEDUP_TTL_MS) recentEvents.delete(key);
  });
  // Still full after expiring stale keys (flood of unique keys inside one
  // hour): drop the oldest half. Map iteration is insertion-ordered.
  if (recentEvents.size >= DEDUP_MAX_ENTRIES) {
    Array.from(recentEvents.keys())
      .slice(0, Math.floor(recentEvents.size / 2))
      .forEach((key) => recentEvents.delete(key));
  }
}

/** Returns true if this key was already counted inside the TTL window. */
function isDuplicateEvent(key: string, now = Date.now()): boolean {
  const seenAt = recentEvents.get(key);
  if (seenAt !== undefined && now - seenAt < DEDUP_TTL_MS) return true;
  if (recentEvents.size >= DEDUP_MAX_ENTRIES) pruneRecentEvents(now);
  recentEvents.set(key, now);
  return false;
}

// GET: Get sponsor analytics for a company profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { slug } = await params;

    const company = await (prisma.companyProfile as any).findUnique({
      where: { slug },
      select: {
        id: true,
        claimedByUserId: true,
        sponsorTier: true,
        sponsorSince: true,
        sponsorAnalytics: true,
        name: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId !== session.user.id && !(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const sponsorAnalytics = (company.sponsorAnalytics as any) || {
      views: 0,
      clicks: 0,
      leads: 0,
      lastUpdated: null,
    };

    // Aggregate listing-level metrics for all claimed owners
    const [listingStats, reviewStats, proposalStats, eventCount] = await Promise.all([
      prisma.serviceListing.aggregate({
        where: { companyId: company.id, status: 'active' },
        _sum: { viewCount: true, inquiryCount: true },
        _count: true,
      }),
      prisma.providerReview.aggregate({
        where: { companyId: company.id, status: 'published' },
        _avg: { overallRating: true },
        _count: true,
      }),
      prisma.proposal.count({
        where: { companyId: company.id },
      }),
      prisma.companyEvent.count({
        where: { companyId: company.id },
      }),
    ]);

    return NextResponse.json({
      companyName: company.name,
      sponsorTier: company.sponsorTier,
      sponsorSince: company.sponsorSince,
      sponsorAnalytics,
      metrics: {
        activeListings: listingStats._count,
        totalListingViews: listingStats._sum.viewCount || 0,
        totalInquiries: listingStats._sum.inquiryCount || 0,
        totalReviews: reviewStats._count,
        avgRating: reviewStats._avg.overallRating ? parseFloat(reviewStats._avg.overallRating.toFixed(1)) : null,
        totalProposals: proposalStats,
        totalEvents: eventCount,
        profileViews: sponsorAnalytics.views || 0,
      },
    });
  } catch (error) {
    logger.error('Sponsor analytics failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

// POST: Track a sponsor analytics event (view, click)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const eventType = body.event; // 'view' | 'click'

    if (!['view', 'click'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Repeat from the same client inside the window: acknowledge, don't count.
    if (isDuplicateEvent(`${clientIp(request)}:${slug}:${eventType}`)) {
      return new NextResponse(null, { status: 204 });
    }

    const company = await (prisma.companyProfile as any).findUnique({
      where: { slug },
      select: { sponsorTier: true, sponsorAnalytics: true },
    });

    if (!company || !company.sponsorTier) {
      return NextResponse.json({ success: true }); // Silently skip non-sponsors
    }

    const analytics = (company.sponsorAnalytics as any) || { views: 0, clicks: 0, leads: 0 };

    if (eventType === 'view') {
      analytics.views = (analytics.views || 0) + 1;
    } else if (eventType === 'click') {
      analytics.clicks = (analytics.clicks || 0) + 1;
    }

    analytics.lastUpdated = new Date().toISOString();

    await (prisma.companyProfile as any).update({
      where: { slug },
      data: { sponsorAnalytics: analytics as any },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Analytics tracking failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: true }); // Don't fail the client
  }
}
