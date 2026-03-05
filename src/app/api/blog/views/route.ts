import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getBlogPost } from '@/lib/blog-content';
import { validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/blog/views
 * Record a page view for a blog post.
 * Fire-and-forget pattern — errors are swallowed so the reader experience
 * is never degraded by analytics failures.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';

    if (!slug) {
      return validationError('slug is required');
    }

    // Validate slug exists in our static blog content
    const post = getBlogPost(slug);
    if (!post) {
      return validationError('Unknown blog post slug');
    }

    // Upsert: create on first view, increment on subsequent
    await prisma.blogPostView.upsert({
      where: { slug },
      create: {
        slug,
        viewCount: 1,
        publishedAt: new Date(post.publishedAt),
      },
      update: {
        viewCount: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Blog view recording failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to record view');
  }
}
