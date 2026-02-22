export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

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

    if (company.claimedByUserId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const analytics = (company.sponsorAnalytics as any) || {
      views: 0,
      clicks: 0,
      leads: 0,
      lastUpdated: null,
    };

    return NextResponse.json({
      companyName: company.name,
      sponsorTier: company.sponsorTier,
      sponsorSince: company.sponsorSince,
      analytics,
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
