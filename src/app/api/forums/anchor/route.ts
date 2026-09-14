import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkUserBanStatus } from '@/lib/moderation';
import {
  unauthorizedError,
  forbiddenError,
  validationError,
  notFoundError,
  internalError,
  rateLimitedError,
} from '@/lib/errors';
import { validateBody, forumAnchorSchema } from '@/lib/validations';
import {
  ensureAnchor,
  getAnchor,
  anchorThreadPath,
  isAnchorType,
  type AnchorSubject,
  type AnchorType,
} from '@/lib/forum-anchors';
import { launchSubject } from '@/lib/forum-anchor-sync';
import {
  postingThrottle,
  sanitizeForumBody,
  inspectContent,
  validationMessage,
} from '@/lib/forum-guard';
import { APP_URL } from '@/lib/constants';
import { GUIDE_LIST } from '@/lib/guide-navigation';

export const dynamic = 'force-dynamic';

/**
 * Resolve an anchor key to a real subject on this site.
 *
 * This is the security boundary of the whole anchor feature. The anchor key
 * arrives from the client, and an anchor becomes a thread title, a public
 * page and an outbound link — so a key that does not resolve to something we
 * actually publish must never create anything. Every branch below reads the
 * subject from our own data and builds the URL itself; nothing the caller
 * sends is used as a URL, a title or a description.
 */
async function resolveSubject(
  anchorType: AnchorType,
  anchorKey: string
): Promise<AnchorSubject | null> {
  if (anchorType === 'launch') {
    const e = await prisma.spaceEvent.findUnique({
      where: { id: anchorKey },
      select: {
        id: true,
        name: true,
        rocket: true,
        location: true,
        agency: true,
        mission: true,
        launchDate: true,
        launchDatePrecision: true,
        status: true,
        type: true,
      },
    });
    if (!e || e.type !== 'launch') return null;
    return launchSubject(e);
  }

  if (anchorType === 'company') {
    const c = await prisma.companyProfile.findUnique({
      where: { slug: anchorKey },
      select: {
        slug: true,
        name: true,
        sector: true,
        headquarters: true,
        status: true,
        foundedYear: true,
      },
    });
    if (!c) return null;

    const facts: Record<string, string> = {};
    if (c.sector) facts['Sector'] = c.sector;
    if (c.headquarters) facts['Headquarters'] = c.headquarters;
    if (c.foundedYear) facts['Founded'] = String(c.foundedYear);
    if (c.status) facts['Status'] = c.status;

    return {
      anchorType: 'company',
      anchorKey: c.slug,
      title: c.name,
      url: `${APP_URL}/company-profiles/${c.slug}`,
      subtitle: `Discussion of ${c.name} — its contracts, hiring, funding and prospects.`,
      facts,
    };
  }

  if (anchorType === 'guide') {
    const guide = GUIDE_LIST.find((g) => g.slug === anchorKey);
    if (!guide) return null;
    return {
      anchorType: 'guide',
      anchorKey: guide.slug,
      title: guide.title,
      url: `${APP_URL}/guide/${guide.slug}`,
      subtitle: `Questions, corrections and additions for the ${guide.shortTitle || guide.title} guide.`,
    };
  }

  // 'tycoon' anchors are opened by internal callers only — there is no
  // enumerable registry of game surfaces to validate a key against, so
  // accepting one from a request would let anyone mint an arbitrary thread
  // title. Refused here on purpose.
  return null;
}

/**
 * GET /api/forums/anchor?type=launch&key=<id>
 *
 * Does a discussion exist for this subject yet? Public and read-only — the
 * subject page calls this to decide between "Join the discussion (4 replies)"
 * and "Start the discussion". It never creates anything: a bot crawling every
 * company page must not be able to open 253 threads.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || '';
    const key = searchParams.get('key') || '';

    if (!isAnchorType(type) || !key) {
      return validationError('An anchor type and key are required');
    }

    const anchor = await getAnchor(type, key);
    if (!anchor) {
      return NextResponse.json({ success: true, data: { exists: false } });
    }

    const thread = await prisma.forumThread.findUnique({
      where: { id: anchor.threadId },
      select: { id: true, isLocked: true, viewCount: true, _count: { select: { posts: true } } },
    });

    // The anchor outlived its thread (moderator deletion). Report it as
    // absent so the page offers to start a new discussion; the cron sweeps
    // the dangling row on its next pass.
    if (!thread) {
      return NextResponse.json({ success: true, data: { exists: false } });
    }

    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        threadId: anchor.threadId,
        url: anchorThreadPath(anchor),
        postCount: thread._count.posts,
        viewCount: thread.viewCount,
        isLocked: thread.isLocked,
      },
    });
  } catch (error) {
    logger.error('Forum anchor lookup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not check for a discussion thread');
  }
}

/**
 * POST /api/forums/anchor
 * body: { anchorType, anchorKey, content }
 *
 * Open the discussion for a subject and post the caller's first reply in one
 * step. This is how company and guide anchors come into existence — on first
 * post, never in bulk. 253 company profiles and 31 guides pre-seeded as empty
 * threads would be the mothballed ghost town rebuilt, so a thread here is
 * only ever born with a real member's words already in it.
 *
 * If the anchor already exists this just adds the reply, so two people
 * clicking "start the discussion" at the same moment get one thread with two
 * posts rather than two threads with one each.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const banStatus = await checkUserBanStatus(session.user.id);
    if (banStatus.isBanned) {
      return forbiddenError(
        'Your account has been suspended' + (banStatus.banReason ? `: ${banStatus.banReason}` : '')
      );
    }
    if (banStatus.isMuted) {
      return forbiddenError('Your account is temporarily muted and cannot post right now.');
    }

    const body = await req.json().catch(() => null);
    if (!body) return validationError('A request body is required');

    const validation = validateBody(forumAnchorSchema, body);
    if (!validation.success) {
      return validationError(validationMessage(validation.errors), validation.errors);
    }
    const { anchorType, anchorKey } = validation.data;

    const throttle = postingThrottle(session.user.id, 'anchor');
    if (!throttle.allowed) {
      return rateLimitedError(Math.ceil(throttle.retryAfterMs / 1000));
    }

    const content = sanitizeForumBody(validation.data.content);
    const author = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true, claimedCompanyId: true },
    });

    const verdict = inspectContent(content, { accountCreatedAt: author?.createdAt ?? null });
    if (!verdict.ok) {
      return validationError(verdict.reason || 'That post was rejected');
    }

    const subject = await resolveSubject(anchorType, anchorKey);
    if (!subject) {
      return notFoundError('Subject');
    }

    const result = await ensureAnchor(subject);
    if (!result) {
      return internalError('Could not open a discussion thread');
    }
    const { anchor } = result;

    const thread = await prisma.forumThread.findUnique({
      where: { id: anchor.threadId },
      select: { id: true, isLocked: true },
    });
    if (!thread) {
      return notFoundError('Forum thread');
    }
    if (thread.isLocked) {
      return forbiddenError('This discussion is locked and cannot receive new replies');
    }

    const post = await prisma.forumPost.create({
      data: {
        threadId: thread.id,
        authorId: session.user.id,
        content,
      },
      select: { id: true, createdAt: true },
    });

    await prisma.forumThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    // The member who opens a discussion is the one most likely to want to
    // know it got a reply.
    prisma.threadSubscription
      .upsert({
        where: { userId_threadId: { userId: session.user.id, threadId: thread.id } },
        create: { userId: session.user.id, threadId: thread.id },
        update: {},
      })
      .catch(() => {});

    logger.info('Forum anchor discussion opened', {
      anchorType,
      anchorKey,
      threadId: thread.id,
      postId: post.id,
      newThread: result.created,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          threadId: thread.id,
          postId: post.id,
          url: anchorThreadPath(anchor),
          createdThread: result.created,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Forum anchor creation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not open the discussion');
  }
}
