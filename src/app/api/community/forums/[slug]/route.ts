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
  constrainPagination,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Default forum categories — auto-seeded if the ForumCategory table is empty.
 * Kept in sync with the init route's FORUM_CATEGORIES list.
 */
const DEFAULT_FORUM_CATEGORIES = [
  { slug: 'launch-tech', name: 'Launch Technology', description: 'Discuss propulsion systems, launch vehicles, reusability, and next-gen launch platforms.', icon: '🚀', sortOrder: 1 },
  { slug: 'satellite-ops', name: 'Satellite Operations', description: 'Orbital mechanics, satellite design, constellation management, and ground systems.', icon: '🛰️', sortOrder: 2 },
  { slug: 'space-policy', name: 'Space Policy & Regulation', description: 'Government policy, spectrum allocation, licensing, and international space law.', icon: '⚖️', sortOrder: 3 },
  { slug: 'business-funding', name: 'Business & Funding', description: 'Space industry investment, startup funding, business models, and market analysis.', icon: '💰', sortOrder: 4 },
  { slug: 'deep-space', name: 'Deep Space Exploration', description: 'Lunar missions, Mars colonization, asteroid mining, and interplanetary travel.', icon: '🌌', sortOrder: 5 },
  { slug: 'careers', name: 'Careers & Education', description: 'Career advice, job opportunities, academic programs, and professional development.', icon: '🎓', sortOrder: 6 },
  { slug: 'general', name: 'General Discussion', description: "Open forum for space industry topics that don't fit neatly into other categories.", icon: '💬', sortOrder: 7 },
  { slug: 'announcements', name: 'Announcements', description: 'Official SpaceNexus announcements, platform updates, and community news.', icon: '📢', sortOrder: 8 },
];

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
      parseInt(searchParams.get('limit') || '20', 10),
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
            select: { id: true, name: true },
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

    // Transform to include postCount, tags, vote counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threadsData = threads.map((t: any) => ({
      id: t.id,
      title: t.title,
      content: t.content,
      author: t.author,
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

    const body = await req.json();
    const { title, content, tags, postAsCompany } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return validationError('Thread title is required');
    }

    if (title.trim().length > 200) {
      return validationError('Thread title must be 200 characters or less');
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return validationError('Thread content is required');
    }

    if (content.length > 10000) {
      return validationError('Thread content must be 10000 characters or less');
    }

    // Validate tags if provided (max 5, must be from allowed list)
    const validTags = Array.isArray(tags) ? tags.filter((t: string) => typeof t === 'string').slice(0, 5) : [];

    // Optional: post as company (must own a claimed company)
    let companyId: string | null = null;
    if (postAsCompany) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { claimedCompanyId: true },
      });
      if (user?.claimedCompanyId) {
        companyId = user.claimedCompanyId;
      }
    }

    const thread = await prisma.forumThread.create({
      data: {
        categoryId: category.id,
        authorId: session.user.id,
        ...(companyId ? { companyId } : {}),
        title: title.trim(),
        content: content.trim(),
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
