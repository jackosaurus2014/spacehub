export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody } from '@/lib/validations';
import { z } from 'zod';

const leadCaptureSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  company: z.string().max(100).optional(),
  message: z.string().min(10).max(2000),
  phone: z.string().max(30).optional(),
});

// POST: Submit a lead for a sponsored company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const validation = validateBody(leadCaptureSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    // Verify company exists and is a premium sponsor
    const company = await (prisma.companyProfile as any).findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        sponsorTier: true,
        contactEmail: true,
        sponsorAnalytics: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.sponsorTier !== 'premium') {
      return NextResponse.json({ error: 'Lead capture is only available for premium sponsors' }, { status: 403 });
    }

    // Store the lead (using DynamicContent as a generic store)
    await (prisma.dynamicContent as any).create({
      data: {
        module: 'sponsor-leads',
        contentType: 'lead',
        slug: `lead-${slug}-${Date.now()}`,
        title: `Lead from ${validation.data.name}`,
        content: JSON.stringify({
          ...validation.data,
          companySlug: slug,
          submittedAt: new Date().toISOString(),
        }),
        metadata: { companySlug: slug, companyId: company.id } as any,
        isActive: true,
      },
    });

    // Increment lead count in analytics
    const analytics = (company.sponsorAnalytics as any) || { views: 0, clicks: 0, leads: 0 };
    analytics.leads = (analytics.leads || 0) + 1;
    analytics.lastUpdated = new Date().toISOString();

    await (prisma.companyProfile as any).update({
      where: { slug },
      data: { sponsorAnalytics: analytics as any },
    });

    logger.info('Sponsor lead captured', { companySlug: slug, leadEmail: validation.data.email });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Lead capture failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
  }
}

// GET: List leads for a sponsored company (owner only)
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

    // Verify ownership
    const company = await (prisma.companyProfile as any).findUnique({
      where: { slug },
      select: { claimedByUserId: true, sponsorTier: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch leads
    const leads = await (prisma.dynamicContent as any).findMany({
      where: {
        module: 'sponsor-leads',
        contentType: 'lead',
        slug: { startsWith: `lead-${slug}-` },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const parsed = leads.map((l: any) => {
      try {
        return { id: l.id, ...JSON.parse(l.content), createdAt: l.createdAt };
      } catch {
        return { id: l.id, raw: l.content, createdAt: l.createdAt };
      }
    });

    return NextResponse.json({ leads: parsed, total: parsed.length });
  } catch (error) {
    logger.error('Lead list failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
