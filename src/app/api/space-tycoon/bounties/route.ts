import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/space-tycoon/bounties
 * Returns open resource bounties that other players can fill.
 */
export async function GET() {
  try {
    const bounties = await prisma.resourceBounty.findMany({
      where: {
        status: { in: ['open', 'partial'] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        resourceSlug: true,
        quantity: true,
        filledQty: true,
        pricePerUnit: true,
        totalBudget: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        poster: { select: { companyName: true } },
      },
    });

    return NextResponse.json({ bounties });
  } catch (error) {
    return NextResponse.json({ bounties: [] });
  }
}

/**
 * POST /api/space-tycoon/bounties
 * Create a new resource bounty or fill an existing one.
 *
 * Create: { action: "create", resourceSlug, quantity, pricePerUnit }
 * Fill:   { action: "fill", bountyId, quantity }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const body = await request.json();

    if (body.action === 'create') {
      const { resourceSlug, quantity, pricePerUnit } = body;
      if (!resourceSlug || !quantity || !pricePerUnit || quantity <= 0 || pricePerUnit <= 0) {
        return NextResponse.json({ error: 'Invalid bounty parameters' }, { status: 400 });
      }

      const totalBudget = quantity * pricePerUnit;
      const bounty = await prisma.resourceBounty.create({
        data: {
          posterId: profile.id,
          resourceSlug,
          quantity: Math.round(quantity),
          pricePerUnit,
          totalBudget,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
        },
      });

      // Log activity
      await prisma.playerActivity.create({
        data: {
          profileId: profile.id,
          companyName: profile.companyName,
          type: 'bounty_posted',
          title: `${profile.companyName} posted a bounty for ${quantity} ${resourceSlug.replace(/_/g, ' ')}`,
          metadata: { resourceSlug, quantity, pricePerUnit, totalBudget },
        },
      });

      return NextResponse.json({ success: true, bounty });
    }

    if (body.action === 'fill') {
      const { bountyId, quantity } = body;
      if (!bountyId || !quantity || quantity <= 0) {
        return NextResponse.json({ error: 'Invalid fill parameters' }, { status: 400 });
      }

      const bounty = await prisma.resourceBounty.findUnique({ where: { id: bountyId } });
      if (!bounty || bounty.status === 'filled' || bounty.status === 'cancelled') {
        return NextResponse.json({ error: 'Bounty not available' }, { status: 400 });
      }
      if (bounty.posterId === profile.id) {
        return NextResponse.json({ error: 'Cannot fill your own bounty' }, { status: 400 });
      }

      const remaining = bounty.quantity - bounty.filledQty;
      const fillQty = Math.min(quantity, remaining);
      const payout = fillQty * bounty.pricePerUnit;
      const newFilledQty = bounty.filledQty + fillQty;
      const newStatus = newFilledQty >= bounty.quantity ? 'filled' : 'partial';

      await prisma.resourceBounty.update({
        where: { id: bountyId },
        data: {
          filledQty: newFilledQty,
          status: newStatus,
          fillerId: profile.id,
          filledAt: newStatus === 'filled' ? new Date() : undefined,
        },
      });

      logger.info('Bounty filled', {
        bountyId, fillQty, payout,
        filler: profile.companyName,
        poster: bounty.posterId,
      });

      return NextResponse.json({
        success: true,
        filled: fillQty,
        payout,
        remainingQty: remaining - fillQty,
        status: newStatus,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Bounty error', { error: String(error) });
    return NextResponse.json({ error: 'Bounty operation failed' }, { status: 500 });
  }
}
