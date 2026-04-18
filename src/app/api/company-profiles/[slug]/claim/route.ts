import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, claimProfileSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { recomputeVerificationBadge } from '@/lib/verification/auto-badge';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Company claiming requires Pro or Enterprise subscription
    const claimUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true, trialTier: true, trialEndDate: true },
    });
    const isTrialing = claimUser?.trialTier && claimUser?.trialEndDate && new Date(claimUser.trialEndDate) > new Date();
    const effectiveTier = isTrialing ? claimUser.trialTier : claimUser?.subscriptionTier;
    if (!effectiveTier || effectiveTier === 'free') {
      return NextResponse.json(
        { error: 'Company claiming requires a Pro or Enterprise subscription. Upgrade your plan to claim and manage a company profile.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(claimProfileSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;

    // Find the company profile
    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true, name: true, claimedByUserId: true, slug: true, website: true, tier: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId) {
      if (company.claimedByUserId === session.user.id) {
        return NextResponse.json({ error: 'You have already claimed this profile' }, { status: 409 });
      }
      return NextResponse.json({ error: 'This profile has already been claimed' }, { status: 409 });
    }

    // Check if user has already claimed another company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { claimedCompanyId: true },
    });

    if (user?.claimedCompanyId) {
      return NextResponse.json(
        { error: 'You have already claimed a company profile. Each user may only claim one company.' },
        { status: 409 }
      );
    }

    // Domain verification: check if the user's email domain matches the company website
    let domainMatch = false;
    if (company.website) {
      try {
        const companyDomain = new URL(company.website).hostname.replace(/^www\./, '');
        const emailDomain = data.contactEmail.split('@')[1]?.toLowerCase();
        domainMatch = !!emailDomain && emailDomain === companyDomain;
      } catch {
        // Invalid website URL, skip domain check
      }
    }

    // Tier 1 companies require domain match or admin approval
    if (company.tier === 1 && !domainMatch) {
      return NextResponse.json(
        { error: 'Claiming a Tier 1 company requires a matching company email domain. Please use your official company email address or contact support for manual verification.' },
        { status: 403 }
      );
    }

    // Set verification level based on domain match
    const verificationLevel = domainMatch ? 'identity' : 'pending';

    // Update company profile and user in a transaction
    const [updatedCompany] = await prisma.$transaction([
      prisma.companyProfile.update({
        where: { id: company.id },
        data: {
          claimedByUserId: session.user.id,
          claimedAt: new Date(),
          verificationLevel,
          contactEmail: data.contactEmail,
          marketplaceActive: domainMatch, // Only auto-activate if domain matches
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { claimedCompanyId: company.id },
      }),
    ]);

    logger.info('Company profile claimed', {
      companyId: company.id,
      companySlug: company.slug,
      userId: session.user.id,
      domainMatch,
      verificationLevel,
    });

    // Auto-recompute the verifiedBadge — if the email domain matched, this
    // will upgrade the user from 'email' to 'domain'. Never blocks the claim.
    try {
      await recomputeVerificationBadge(session.user.id);
    } catch (badgeErr) {
      logger.error('recomputeVerificationBadge failed after company claim', {
        userId: session.user.id,
        error: badgeErr instanceof Error ? badgeErr.message : String(badgeErr),
      });
    }

    const message = domainMatch
      ? `You have successfully claimed ${company.name}. Your verification level is set to "identity".`
      : `You have claimed ${company.name}. Your claim is pending admin review since your email domain does not match the company website.`;

    return NextResponse.json({
      success: true,
      company: {
        id: updatedCompany.id,
        slug: updatedCompany.slug,
        name: updatedCompany.name,
        verificationLevel: updatedCompany.verificationLevel,
      },
      message,
    }, { status: 200 });
  } catch (error) {
    logger.error('Claim profile error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to claim company profile');
  }
}
