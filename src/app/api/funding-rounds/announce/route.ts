import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, validationError } from '@/lib/errors';
import { authOptions } from '@/lib/auth';
import {
  announceFundingRoundSchema,
  FUNDING_ROUND_TYPE_LABELS,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * Self-service funding round announcement.
 *
 * POST creates TWO rows in a single transaction:
 *   1. FundingRound — structured record for the funding tracker / profile tab.
 *   2. CompanyEvent (type='funding_round') — surfaces in the public feed.
 *
 * The schema has no `announcedByUserId` column, so we mark the self-reported
 * entries via `source = 'self_reported'` on both rows. The CompanyEvent row
 * carries the implicit user attribution through ownership of the claimed
 * company profile.
 */

async function requireClaimedCompany(userId: string) {
  return prisma.companyProfile.findFirst({
    where: { claimedByUserId: userId },
    select: { id: true, slug: true, name: true, claimedByUserId: true },
  });
}

// POST — create a self-service funding round announcement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const company = await requireClaimedCompany(session.user.id);
    if (!company) {
      return NextResponse.json(
        { error: 'You must claim a company profile before announcing a funding round' },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError('Invalid JSON body');
    }

    const validation = announceFundingRoundSchema.safeParse(body);
    if (!validation.success) {
      return validationError(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const data = validation.data;
    const roundDate = new Date(data.date);
    const seriesLabel = FUNDING_ROUND_TYPE_LABELS[data.roundType];

    // De-dupe investor list: lead + others, trim empties, unique
    const investorList = Array.from(
      new Set(
        [data.leadInvestor, ...(data.otherInvestors || [])]
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          .map(v => v.trim())
      )
    );

    // Build a human-readable title for the public feed
    const amountLabel = (() => {
      if (data.amount >= 1_000_000_000) return `$${(data.amount / 1_000_000_000).toFixed(1)}B`;
      if (data.amount >= 1_000_000) return `$${(data.amount / 1_000_000).toFixed(1)}M`;
      if (data.amount >= 1_000) return `$${(data.amount / 1_000).toFixed(0)}K`;
      return `$${data.amount.toFixed(0)}`;
    })();

    const currencyPrefix = data.currency && data.currency !== 'USD' ? `${data.currency} ` : '';
    const eventTitle = `${company.name} raises ${currencyPrefix}${amountLabel} ${seriesLabel}`;

    const eventDescriptionParts: string[] = [];
    if (data.leadInvestor) eventDescriptionParts.push(`Led by ${data.leadInvestor}.`);
    if (data.valuation) {
      const valLabel = data.valuation >= 1_000_000_000
        ? `$${(data.valuation / 1_000_000_000).toFixed(1)}B`
        : `$${(data.valuation / 1_000_000).toFixed(1)}M`;
      eventDescriptionParts.push(`Valuation: ${valLabel}.`);
    }
    if (data.blurb) eventDescriptionParts.push(data.blurb);

    const { fundingRound, companyEvent } = await prisma.$transaction(async tx => {
      const fundingRound = await tx.fundingRound.create({
        data: {
          companyId: company.id,
          date: roundDate,
          amount: data.amount,
          currency: data.currency,
          seriesLabel,
          roundType: data.roundType,
          preValuation: null,
          postValuation: data.valuation ?? null,
          leadInvestor: data.leadInvestor || null,
          investors: investorList,
          source: 'self_reported',
          sourceUrl: data.pressReleaseUrl || null,
          notes: data.blurb || null,
        },
      });

      const companyEvent = await tx.companyEvent.create({
        data: {
          companyId: company.id,
          date: roundDate,
          type: 'funding_round',
          title: eventTitle,
          description: eventDescriptionParts.join(' ') || null,
          source: 'self_reported',
          sourceUrl: data.pressReleaseUrl || data.pitchDeckUrl || null,
          importance: 7,
        },
      });

      return { fundingRound, companyEvent };
    });

    logger.info('Funding round announced (self-service)', {
      fundingRoundId: fundingRound.id,
      companyEventId: companyEvent.id,
      companyId: company.id,
      companySlug: company.slug,
      userId: session.user.id,
      roundType: data.roundType,
      amount: data.amount,
      currency: data.currency,
    });

    return NextResponse.json(
      {
        success: true,
        fundingRound,
        companyEvent,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to announce funding round', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to announce funding round');
  }
}

// GET — list announcements for the signed-in user's claimed company
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const company = await requireClaimedCompany(session.user.id);
    if (!company) {
      return NextResponse.json({ announcements: [], company: null });
    }

    const announcements = await prisma.fundingRound.findMany({
      where: { companyId: company.id },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      company: { id: company.id, slug: company.slug, name: company.name },
      announcements,
    });
  } catch (error) {
    logger.error('Failed to list funding round announcements', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list funding round announcements');
  }
}
