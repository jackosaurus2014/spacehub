import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkUserBanStatus } from '@/lib/moderation';
import { notifyThreadSubscribers, createNotification } from '@/lib/notifications-server';
import { parseMentions } from '@/lib/mentions';
import {
  unauthorizedError,
  validationError,
  notFoundError,
  forbiddenError,
  internalError,
  rateLimitedError,
} from '@/lib/errors';
import { validateBody, editContentSchema, forumReplySchema } from '@/lib/validations';
import {
  postingThrottle,
  sanitizeForumBody,
  sanitizeForumTitle,
  inspectContent,
  isDuplicateBody,
  validationMessage,
} from '@/lib/forum-guard';
import { getAnchorForThread, anchorThreadPath } from '@/lib/forum-anchors';
import { REPLIES_PER_PAGE, clampPage, pageCount, wasEdited } from '@/lib/forum-seo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/forums/[slug]/[threadId]
 * Get thread details with all posts, increment viewCount
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string }> }
) {
  try {
    const { slug, threadId } = await params;
    const { searchParams } = new URL(req.url);

    // Verify category exists
    const category = await prisma.forumCategory.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    // Check if user is logged in (for vote/subscription data)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Replies are paginated (2026-09-14). This route used to select EVERY
    // post on a thread; a thread that actually takes off would have shipped
    // the whole discussion in one response, on every view, to every reader.
    const totalPosts = await prisma.forumPost.count({ where: { threadId } });
    const totalPages = pageCount(totalPosts, REPLIES_PER_PAGE);
    const page = clampPage(searchParams.get('page'), totalPages);

    // Fetch thread with one page of posts
    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      include: {
        // NEVER select email on these joins. This GET calls getServerSession
        // only to decorate vote state — an anonymous caller is allowed through,
        // so every field here is public. With email selected, walking the
        // public category -> thread listings dumped the address of the thread
        // author and every replier.
        author: {
          select: { id: true, name: true, verifiedBadge: true, isAdmin: true },
        },
        posts: {
          include: {
            author: {
              select: { id: true, name: true, verifiedBadge: true, isAdmin: true },
            },
          },
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * REPLIES_PER_PAGE,
          take: REPLIES_PER_PAGE,
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!thread || thread.categoryId !== category.id) {
      return notFoundError('Forum thread');
    }

    // Increment view count (fire and forget). Page 1 only — paging through a
    // long thread is one reader, not twenty, and viewCount feeds the 'popular'
    // sort, so counting pages would rank long threads over read ones.
    if (page === 1) {
      prisma.forumThread
      .update({
        where: { id: threadId },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err: Error) => {
        logger.error('Failed to increment view count', {
          threadId,
          error: err.message,
        });
      });
    }

    // The anchor, when this is an anchored thread. Carries the subject so an
    // empty thread still renders the launch/company/guide it is about — an
    // anchored thread with no replies is thin, not blank.
    const anchor = await getAnchorForThread(threadId).catch(() => null);

    // Get user's vote on the thread and subscription status
    let userThreadVote: number | null = null;
    let isSubscribed = false;
    const userPostVotes: Record<string, number> = {};

    if (userId) {
      try {
        const [threadVote, subscription, postVotes] = await Promise.all([
          prisma.threadVote.findUnique({
            where: { threadId_userId: { threadId, userId } },
            select: { value: true },
          }),
          prisma.threadSubscription.findUnique({
            where: { userId_threadId: { userId, threadId } },
            select: { id: true },
          }),
          prisma.postVote.findMany({
            where: { userId, postId: { in: thread.posts.map((p: any) => p.id) } },
            select: { postId: true, value: true },
          }),
        ]);
        userThreadVote = threadVote?.value ?? null;
        isSubscribed = !!subscription;
        for (const pv of postVotes) {
          userPostVotes[pv.postId] = pv.value;
        }
      } catch {
        // Models may not exist yet
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        thread: {
          id: thread.id,
          title: thread.title,
          content: thread.content,
          author: thread.author,
          // Platform/staff-authored content (e.g. seeded threads) is labeled, not hidden.
          isStaffAuthor: thread.author?.isAdmin === true,
          isPinned: thread.isPinned,
          isLocked: thread.isLocked,
          viewCount: thread.viewCount,
          postCount: thread._count.posts,
          tags: thread.tags || [],
          acceptedPostId: thread.acceptedPostId || null,
          upvoteCount: thread.upvoteCount || 0,
          downvoteCount: thread.downvoteCount || 0,
          userVote: userThreadVote,
          isSubscribed,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          // An edit is disclosed, never silent: a post whose text changed
          // after people replied to it has to say so.
          isEdited: wasEdited(thread.createdAt, thread.updatedAt),
        },
        posts: thread.posts.map((p: any) => ({
          ...p,
          isStaffAuthor: p.author?.isAdmin === true,
          upvoteCount: p.upvoteCount || 0,
          downvoteCount: p.downvoteCount || 0,
          isAccepted: p.isAccepted || false,
          userVote: userPostVotes[p.id] ?? null,
          isEdited: wasEdited(p.createdAt, p.updatedAt),
        })),
        category,
        anchor: anchor
          ? {
              anchorType: anchor.anchorType,
              anchorKey: anchor.anchorKey,
              subjectTitle: anchor.subjectTitle,
              subjectUrl: anchor.retiredAt ? null : anchor.subjectUrl,
              subtitle: anchor.subtitle,
              facts: anchor.facts,
              subjectDate: anchor.subjectDate,
              retired: !!anchor.retiredAt,
              threadPath: anchorThreadPath(anchor),
            }
          : null,
        pagination: {
          page,
          limit: REPLIES_PER_PAGE,
          total: totalPosts,
          totalPages,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching forum thread', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch forum thread');
  }
}

/**
 * POST /api/community/forums/[slug]/[threadId]
 * Reply to a thread (create a ForumPost)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Check if user is banned or muted
    const banStatus = await checkUserBanStatus(session.user.id);
    if (banStatus.isBanned) {
      return forbiddenError('Your account has been suspended' + (banStatus.banReason ? `: ${banStatus.banReason}` : ''));
    }
    if (banStatus.isMuted) {
      return forbiddenError('Your account has been temporarily muted. You cannot create new content at this time.');
    }

    const { slug, threadId } = await params;

    // Verify category exists
    const category = await prisma.forumCategory.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    // Fetch thread to verify it exists and check locked status
    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, categoryId: true, isLocked: true, authorId: true },
    });

    if (!thread || thread.categoryId !== category.id) {
      return notFoundError('Forum thread');
    }

    if (thread.isLocked) {
      return forbiddenError('This thread is locked and cannot receive new replies');
    }

    const raw = await req.json().catch(() => null);
    if (!raw) return validationError('A request body is required');

    const validation = validateBody(forumReplySchema, raw);
    if (!validation.success) {
      return validationError(validationMessage(validation.errors), validation.errors);
    }
    const { postAsCompany } = validation.data;

    const throttle = postingThrottle(session.user.id, 'reply');
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
      return validationError(verdict.reason || 'That reply was rejected');
    }

    // Same body twice in a row from the same person is a double-submit or a
    // bot. Checked against this author's own recent posts only — two people
    // independently writing the same sentence is not an offence.
    const recent = await prisma.forumPost.findMany({
      where: {
        authorId: session.user.id,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { content: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (recent.some((r: any) => isDuplicateBody(r.content, content))) {
      return validationError('You have already posted that. Say something new, or edit the original.');
    }

    // Optional: post as company. The claim is read from the DB — the request
    // flag only says "use my claim", it never names the company.
    let companyId: string | null = null;
    if (postAsCompany && author?.claimedCompanyId) {
      companyId = author.claimedCompanyId;
    }

    // Create the post, update thread's updatedAt, and auto-subscribe the replier
    const [post] = await prisma.$transaction([
      prisma.forumPost.create({
        data: {
          threadId,
          authorId: session.user.id,
          ...(companyId ? { companyId } : {}),
          content,
        },
        include: {
          author: {
            select: { id: true, name: true, verifiedBadge: true, isAdmin: true },
          },
        },
      }),
      prisma.forumThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      }),
    ]);

    // Auto-subscribe the replier to the thread (fire and forget)
    prisma.threadSubscription
      .upsert({
        where: { userId_threadId: { userId: session.user.id, threadId } },
        create: { userId: session.user.id, threadId },
        update: {},
      })
      .catch(() => {});

    // Notify thread subscribers about the new reply (fire and forget)
    const threadForNotify = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { title: true, categoryId: true, category: { select: { slug: true } } },
    });
    if (threadForNotify) {
      notifyThreadSubscribers(
        threadId,
        threadForNotify.title,
        session.user.id,
        session.user.name || 'Someone',
        threadForNotify.category?.slug || slug
      ).catch(() => {});
    }

    // Notify thread author if they're not the replier
    if (thread.authorId && thread.authorId !== session.user.id) {
      createNotification({
        userId: thread.authorId,
        type: 'reply',
        title: 'New reply to your thread',
        message: `${session.user.name || 'Someone'} replied to your thread`,
        relatedUserId: session.user.id,
        relatedContentType: 'thread',
        relatedContentId: threadId,
        linkUrl: `/community/forums/${slug}/${threadId}`,
      }).catch(() => {});
    }

    // Parse @mentions and notify mentioned users (fire and forget)
    try {
      const mentionedUsernames = parseMentions(content);
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = await prisma.user.findMany({
          where: {
            name: { in: mentionedUsernames },
            id: { not: session.user.id }, // Don't notify yourself
          },
          select: { id: true, name: true },
        });

        for (const user of mentionedUsers) {
          createNotification({
            userId: user.id,
            type: 'mention',
            title: 'You were mentioned',
            message: `@${session.user.name || 'Someone'} mentioned you in a forum post`,
            relatedUserId: session.user.id,
            relatedContentType: 'post',
            relatedContentId: post.id,
            linkUrl: `/community/forums/${slug}/${threadId}`,
          }).catch(() => {});
        }

        if (mentionedUsers.length > 0) {
          logger.info('Mention notifications queued', {
            postId: post.id,
            mentionedCount: mentionedUsers.length,
          });
        }
      }
    } catch (mentionError) {
      logger.warn('Failed to process mentions', {
        postId: post.id,
        error: mentionError instanceof Error ? mentionError.message : String(mentionError),
      });
    }

    logger.info('Forum post created', {
      postId: post.id,
      threadId,
      authorId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: { ...post, isStaffAuthor: (post as any).author?.isAdmin === true } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating forum post', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create reply');
  }
}

/**
 * PATCH /api/community/forums/[slug]/[threadId]
 * Edit a forum thread (author or admin)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug, threadId } = await params;

    const body = await req.json();
    const validation = validateBody(editContentSchema, body);
    if (!validation.success) {
      return validationError('Invalid content', validation.errors);
    }

    const { content, title } = validation.data;

    // Verify category exists
    const category = await prisma.forumCategory.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    // Find thread and verify it belongs to this category
    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, categoryId: true, authorId: true },
    });

    if (!thread || thread.categoryId !== category.id) {
      return notFoundError('Forum thread');
    }

    // Check authorization: must be author or admin
    if (thread.authorId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You can only edit your own threads');
    }

    const throttle = postingThrottle(session.user.id, 'edit');
    if (!throttle.allowed) {
      return rateLimitedError(Math.ceil(throttle.retryAfterMs / 1000));
    }

    // Edits go through exactly the same sanitiser and spam inspection as the
    // original post. Skipping it here would leave the obvious hole: post
    // something clean, then edit the links in.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    const editor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true },
    });

    if (content) {
      const clean = sanitizeForumBody(content);
      const verdict = inspectContent(clean, { accountCreatedAt: editor?.createdAt ?? null });
      if (!verdict.ok) {
        return validationError(verdict.reason || 'That edit was rejected');
      }
      updateData.content = clean;
    }

    if (title) {
      const clean = sanitizeForumTitle(title);
      if (clean.length < 3) {
        return validationError('Give the thread a title of at least 3 characters');
      }
      const verdict = inspectContent(clean, {
        accountCreatedAt: editor?.createdAt ?? null,
        isTitle: true,
      });
      if (!verdict.ok) {
        return validationError(verdict.reason || 'That title was rejected');
      }
      updateData.title = clean;
    }

    if (Object.keys(updateData).length === 0) {
      return validationError('No fields to update');
    }

    const updatedThread = await prisma.forumThread.update({
      where: { id: threadId },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, verifiedBadge: true },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    logger.info('Forum thread edited', {
      threadId,
      editedBy: session.user.id,
      isAdminEdit: thread.authorId !== session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedThread.id,
        title: updatedThread.title,
        content: updatedThread.content,
        author: updatedThread.author,
        isPinned: updatedThread.isPinned,
        isLocked: updatedThread.isLocked,
        viewCount: updatedThread.viewCount,
        postCount: updatedThread._count.posts,
        createdAt: updatedThread.createdAt,
        updatedAt: updatedThread.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error editing forum thread', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to edit forum thread');
  }
}

/**
 * DELETE /api/community/forums/[slug]/[threadId]
 * Delete a forum thread (author or admin). Cascade deletes all posts.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { slug, threadId } = await params;

    // Verify category exists
    const category = await prisma.forumCategory.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!category) {
      return notFoundError('Forum category');
    }

    // Find thread and verify it belongs to this category
    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, categoryId: true, authorId: true },
    });

    if (!thread || thread.categoryId !== category.id) {
      return notFoundError('Forum thread');
    }

    // Check authorization: must be author or admin
    if (thread.authorId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You can only delete your own threads');
    }

    // If admin deleting someone else's thread, log moderation action
    if (session.user.isAdmin && thread.authorId !== session.user.id) {
      await prisma.moderationAction.create({
        data: {
          moderatorId: session.user.id,
          targetUserId: thread.authorId,
          action: 'delete_content',
          reason: 'Admin deleted forum thread',
          contentType: 'thread',
          contentId: threadId,
        },
      });
    }

    // Delete thread (cascade deletes all posts via Prisma onDelete: Cascade)
    await prisma.forumThread.delete({
      where: { id: threadId },
    });

    logger.info('Forum thread deleted', {
      threadId,
      deletedBy: session.user.id,
      isAdminDelete: thread.authorId !== session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting forum thread', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete forum thread');
  }
}
