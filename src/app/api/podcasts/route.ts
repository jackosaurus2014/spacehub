import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, createPodcastSchema } from '@/lib/validations';
import { validationError, internalError, alreadyExistsError } from '@/lib/errors';
import { generateSlug } from '@/lib/marketplace-types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/podcasts
 *
 * Returns the curated podcast directory ordered by episode count desc.
 * Optional query params:
 *   - q: case-insensitive name/description match
 *   - category: filter by category
 *   - includePending=1: include never-synced submissions (default false)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const includePending = searchParams.get('includePending') === '1';

    const where: Record<string, unknown> = {};

    if (!includePending) {
      // Only show podcasts that have been synced or have any episodes
      where.OR = [
        { lastFetchedAt: { not: null } },
        { episodeCount: { gt: 0 } },
      ];
    }

    if (q) {
      const ilike = { contains: q, mode: 'insensitive' as const };
      const orFilter = [
        { name: ilike },
        { description: ilike },
        { author: ilike },
      ];
      // Combine OR filters when both exist
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: orFilter }];
        delete where.OR;
      } else {
        where.OR = orFilter;
      }
    }

    if (category) {
      where.category = category;
    }

    const podcasts = await prisma.podcast.findMany({
      where: where as never,
      orderBy: [{ episodeCount: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        feedUrl: true,
        websiteUrl: true,
        artworkUrl: true,
        author: true,
        category: true,
        language: true,
        episodeCount: true,
        lastFetchedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      podcasts,
      total: podcasts.length,
    });
  } catch (error) {
    logger.error('[Podcasts API] List failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load podcasts');
  }
}

/**
 * POST /api/podcasts
 *
 * Open submission endpoint for adding a new podcast to the directory.
 * Submissions are created in pending state (lastFetchedAt = null) and
 * surface only after an admin syncs the feed.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return validationError('Invalid JSON body', { body: 'Expected JSON object' });
    }

    const validation = validateBody(createPodcastSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const { name, description, feedUrl, websiteUrl, artworkUrl, author, category, language } = validation.data;

    // Build a unique slug
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let suffix = 1;
    // Loop with bounded retries
    for (let i = 0; i < 10; i++) {
      const existing = await prisma.podcast.findUnique({ where: { slug }, select: { id: true } });
      if (!existing) break;
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
      if (i === 9) {
        return alreadyExistsError('Podcast');
      }
    }

    const created = await prisma.podcast.create({
      data: {
        slug,
        name,
        description: description ?? null,
        feedUrl: feedUrl ?? null,
        websiteUrl: websiteUrl ?? null,
        artworkUrl: artworkUrl ?? null,
        author: author ?? null,
        category,
        language: language ?? 'en',
      },
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
      },
    });

    logger.info('[Podcasts API] New podcast submitted', {
      id: created.id,
      slug: created.slug,
      name: created.name,
    });

    return NextResponse.json(
      {
        success: true,
        podcast: created,
        message: 'Podcast submitted. It will appear in the directory after our team reviews and syncs the feed.',
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error('[Podcasts API] Submission failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to submit podcast');
  }
}
