import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Default forum categories — auto-seeded if the ForumCategory table is empty.
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
 * GET /api/community/forums
 * List forum categories with thread count and latest thread info
 */
export async function GET() {
  try {
    let categories = await prisma.forumCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { threads: true },
        },
        threads: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            title: true,
            createdAt: true,
            author: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Auto-seed default categories if table is empty
    if (categories.length === 0) {
      logger.info('Forum categories table empty — auto-seeding default categories');
      for (const cat of DEFAULT_FORUM_CATEGORIES) {
        await prisma.forumCategory.upsert({
          where: { slug: cat.slug },
          update: {},
          create: cat,
        });
      }
      categories = await prisma.forumCategory.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { threads: true } },
          threads: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              title: true,
              createdAt: true,
              author: { select: { id: true, name: true } },
            },
          },
        },
      });
    }

    // Transform response to flatten latest thread
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = categories.map((cat: any) => ({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
      threadCount: cat._count.threads,
      latestThread: cat.threads[0]
        ? {
            id: cat.threads[0].id,
            title: cat.threads[0].title,
            authorName: cat.threads[0].author?.name || 'Unknown',
            createdAt: cat.threads[0].createdAt,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: { categories: data },
    });
  } catch (error) {
    logger.error('Error fetching forum categories', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch forum categories');
  }
}
