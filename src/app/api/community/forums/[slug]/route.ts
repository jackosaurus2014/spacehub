import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { FORUM_CATEGORY_SEEDS } from '@/lib/forum-categories';
import { checkUserBanStatus } from '@/lib/moderation';
import {
  unauthorizedError,
  forbiddenError,
  validationError,
  notFoundError,
  internalError,
  rateLimitedError,
  constrainPagination,
} from '@/lib/errors';
import { validateBody, forumThreadCreateSchema } from '@/lib/validations';
import {
  postingThrottle,
  sanitizeForumBody,
  sanitizeForumTitle,
  inspectContent,
  validationMessage,
} from '@/lib/forum-guard';
import { getAnchorsForThreads } from '@/lib/forum-anchors';
import { THREADS_PER_PAGE } from '@/lib/forum-seo';

export const dynamic = 'force-dynamic';

/**
 * Default forum categories — auto-seeded if the ForumCategory table is empty.
 * Kept in sync with the init route's FORUM_CATEGORIES list.
 */
// Canonical list lives in src/lib/forum-categories.ts. It used to be copied
// into three route files that each asked the next person to keep them in
// sync; the alias keeps the local name while removing the duplicate.
const DEFAULT_FORUM_CATEGORIES = FORUM_CATEGORY_SEEDS;

/**
 * Auto-seed forum categories if the table is empty.
 * Returns the category matching the given slug, or null if slug is not in the default list.
 */
async function ensureCategoriesSeeded(slug: string) {
  const existingCount = await prisma.forumCategory.count();
  if (existingCount > 0) return null;

  logger.info('Forum categories table empty — auto-seeding default categories');

  for (const cat of DEFAULT_FORUM_CATEGORIES) {
    await prisma.forumCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // Now look up the requested category
  return prisma.forumCategory.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, description: true, icon: true },
  });
}

/**
 * GET /api/community/forums/[slug]
 * List threads in a forum category (pinned first, then by sort)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = constrainPagination(
      parseInt(searchParams.get('limit') || String(THREADS_PER_PAGE), 10),
      50
    );
    const sort = searchParams.get('sort') || 'newest'; // newest | popular | top
    const skip = (page - 1) * limit;

    // Find the category (auto-seed defaults if table is empty)
    let category = await prisma.forumCategory.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, description: true, icon: true },
    });

    if (!category) {
      // Categories may not have been seeded yet — try auto-seeding
      category = await ensureCategoriesSeeded(slug);
    }

    if (!category) {
      return notFoundError('Forum category');
    }

    // Build sort order: pinned first, then by chosen sort
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderBy: any[] = [{ isPinned: 'desc' }];
    if (sort === 'popular') {
      orderBy.push({ viewCount: 'desc' });
    } else if (sort === 'top') {
      orderBy.push({ upvoteCount: 'desc' });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }

    const where = { categoryId: category.id };

    const [threads, total] = await Promise.all([
      prisma.forumThread.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, isAdmin: true },
          },
          _count: {
            select: { posts: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.forumThread.count({ where }),
    ]);

    // Anchors for this page of threads, in one query. An anchored thread
    // shows what it is about in the listing, so a category of launch threads
    // reads as a launch schedule rather than a wall of near-identical titles.
    // Fail soft: a listing must still render if the anchor lookup breaks.
    // Anchors are context on top of a thread, never the thread itself.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anchors = await getAnchorsForThreads(threads.map((t: any) => t.id)).catch(
      () => new Map()
    );

    // Transform to include postCount, tags, vote counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threadsData = threads.map((t: any) => ({
      id: t.id,
      title: t.title,
      content: t.content,
      author: t.author ? { id: t.author.id, name: t.author.name } : null,
      // Platform/staff-authored content (e.g. seeded threads) is labeled, not hidden.
      isStaffAuthor: t.author?.isAdmin === true,
      isPinned: t.isPinned,
      isLocked: t.isLocked,
      viewCount: t.viewCount,
      postCount: t._count.posts,
      tags: t.tags || [],
      acceptedPostId: t.acceptedPostId || null,
      upvoteCount: t.upvoteCount || 0,
      downvoteCount: t.downvoteCount || 0,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      anchor: anchors.get(t.id)
        ? {
            anchorType: anchors.get(t.id)!.anchorType,
            subjectTitle: anchors.get(t.id)!.subjectTitle,
            subjectUrl: anchors.get(t.id)!.retiredAt ? null : anchors.get(t.id)!.subjectUrl,
            subtitle: anchors.get(t.id)!.subtitle,
            subjectDate: anchors.get(t.id)!.subjectDate,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        category,
        threads: threadsData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (error) {
    logger.error('Error fetching forum threads', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch forum threads');
  }
}

/**
 * POST /api/community/forums/[slug]
 * Create a new thread in a forum category
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
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

    const { slug } = await params;

    // Find the category (auto-seed defaults if table is empty)
    let category = await prisma.forumCategory.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!category) {
      const seeded = await ensureCategoriesSeeded(slug);
      if (seeded) {
        category = { id: seeded.id };
      }
    }

    if (!category) {
      return notFoundError('Forum category');
    }

    const raw = await req.json().catch(() => null);
    if (!raw) return validationError('A request body is required');

    const validation = validateBody(forumThreadCreateSchema, raw);
    if (!validation.success) {
      return validationError(validationMessage(validation.errors), validation.errors);
    }
    const { tags: validTags, postAsCompany } = validation.data;

    // Per-account posting budget. A new thread is the expensive object here —
    // each one is a new indexable page — so it carries the tightest budget.
    // The middleware's per-IP bucket sits in front of this; neither is
    // sufficient alone (see src/lib/forum-guard.ts).
    const throttle = postingThrottle(session.user.id, 'thread');
    if (!throttle.allowed) {
      return rateLimitedError(Math.ceil(throttle.retryAfterMs / 1000));
    }

    // Strip HTML before anything is persisted. Bodies are stored as Markdown
    // source and rendered without rehype-raw, so tags are already inert at
    // render time — this is defence in depth for the next renderer (an email
    // digest, an RSS feed) that forgets.
    const title = sanitizeForumTitle(validation.data.title);
    const content = sanitizeForumBody(validation.data.content);

    if (title.length < 3) {
      return validationError('Give the thread a title of at least 3 characters');
    }

    const author = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true, claimedCompanyId: true },
    });

    const titleVerdict = inspectContent(title, {
      accountCreatedAt: author?.createdAt ?? null,
      isTitle: true,
    });
    if (!titleVerdict.ok) {
      return validationError(titleVerdict.reason || 'That title was rejected');
    }

    const contentVerdict = inspectContent(content, {
      accountCreatedAt: author?.createdAt ?? null,
    });
    if (!contentVerdict.ok) {
      return validationError(contentVerdict.reason || 'That post was rejected');
    }

    // Optional: post as company (must own a claimed company). Read from the
    // DB, never from the request — the flag only says "use my claim".
    let companyId: string | null = null;
    if (postAsCompany && author?.claimedCompanyId) {
      companyId = author.claimedCompanyId;
    }

    const thread = await prisma.forumThread.create({
      data: {
        categoryId: category.id,
        authorId: session.user.id,
        ...(companyId ? { companyId } : {}),
        title,
        content,
        tags: validTags,
      } as any,
      include: {
        author: {
          select: { id: true, name: true },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    logger.info('Forum thread created', {
      threadId: thread.id,
      categorySlug: slug,
      authorId: session.user.id,
    });

    // Auto-subscribe the thread author
    prisma.threadSubscription
      .create({ data: { userId: session.user.id, threadId: thread.id } })
      .catch(() => {});

    return NextResponse.json(
      {
        success: true,
        data: {
          id: thread.id,
          title: thread.title,
          content: thread.content,
          author: thread.author,
          isPinned: thread.isPinned,
          isLocked: thread.isLocked,
          viewCount: thread.viewCount,
          postCount: thread._count.posts,
          tags: thread.tags || [],
          acceptedPostId: null,
          upvoteCount: 0,
          downvoteCount: 0,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating forum thread', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create forum thread');
  }
}
