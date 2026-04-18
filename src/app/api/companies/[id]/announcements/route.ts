import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  internalError,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  validationError,
} from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateBody, createCompanyAnnouncementSchema } from '@/lib/validations';
import { createNotification } from '@/lib/notifications/create';

export const dynamic = 'force-dynamic';

// GET: Public list of announcements for a company (pinned first, then recent)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const company = await prisma.companyProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!company) {
      return notFoundError('Company');
    }

    const announcements = await prisma.companyAnnouncement.findMany({
      where: { companyId: company.id },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    logger.error('List announcements error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch announcements');
  }
}

// POST: Company owner posts a new announcement + fans out notifications
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be signed in to post announcements');
    }

    const { id } = await params;

    const company = await prisma.companyProfile.findUnique({
      where: { id },
      select: { id: true, slug: true, name: true, claimedByUserId: true },
    });
    if (!company) {
      return notFoundError('Company');
    }
    if (company.claimedByUserId !== session.user.id) {
      return forbiddenError('Only the profile owner can post announcements');
    }

    const body = await request.json().catch(() => ({}));
    const validation = validateBody(createCompanyAnnouncementSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const announcement = await prisma.companyAnnouncement.create({
      data: {
        companyId: company.id,
        authorId: session.user.id,
        title: data.title,
        body: data.body,
        linkUrl: data.linkUrl ?? null,
        category: data.category ?? 'general',
        pinned: data.pinned ?? false,
      },
    });

    logger.info('Company announcement created', {
      announcementId: announcement.id,
      companyId: company.id,
      companySlug: company.slug,
      authorId: session.user.id,
      category: announcement.category,
    });

    // Best-effort fan-out to all followers — never fails the post
    try {
      const followers = await prisma.companyFollow.findMany({
        where: { companyId: company.id },
        select: { userId: true },
      });

      const linkUrl = `/company-profiles/${company.slug}#announcement-${announcement.id}`;
      const truncatedBody =
        data.body.length > 280 ? `${data.body.slice(0, 280)}…` : data.body;

      // Notify each follower (helper already skips self and handles failures)
      await Promise.allSettled(
        followers.map(f =>
          createNotification({
            userId: f.userId,
            type: 'company_announcement',
            title: `${company.name}: ${announcement.title}`,
            body: truncatedBody,
            link: linkUrl,
            relatedContentType: 'company_announcement',
            relatedContentId: announcement.id,
            relatedUserId: session.user.id,
            // company announcements don't map to a preference; always deliver
            respectPreferences: false,
          })
        )
      );

      logger.info('Announcement fan-out complete', {
        announcementId: announcement.id,
        followerCount: followers.length,
      });
    } catch (fanoutError) {
      logger.warn('Announcement fan-out failed', {
        error: fanoutError instanceof Error ? fanoutError.message : String(fanoutError),
        announcementId: announcement.id,
      });
    }

    return NextResponse.json({ success: true, announcement }, { status: 201 });
  } catch (error) {
    logger.error('Create announcement error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create announcement');
  }
}
