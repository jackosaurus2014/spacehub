import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { searchQuerySchema, validateSearchParams } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const validation = validateSearchParams(searchQuerySchema, searchParams);

    if (!validation.success) {
      return validationError('Invalid search parameters', validation.errors);
    }

    const { q, limit } = validation.data;

    const containsFilter = { contains: q, mode: 'insensitive' as const };

    const [news, companies, events, opportunities, blogs] = await Promise.all([
      prisma.newsArticle.findMany({
        where: {
          OR: [
            { title: containsFilter },
            { summary: containsFilter },
          ],
        },
        select: {
          id: true,
          title: true,
          summary: true,
          url: true,
          source: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      }),
      prisma.spaceCompany.findMany({
        where: {
          OR: [
            { name: containsFilter },
            { description: containsFilter },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          country: true,
          isPublic: true,
          ticker: true,
        },
        orderBy: { name: 'asc' },
        take: limit,
      }),
      prisma.spaceEvent.findMany({
        where: {
          OR: [
            { name: containsFilter },
            { description: containsFilter },
            { mission: containsFilter },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          status: true,
          launchDate: true,
          agency: true,
        },
        orderBy: { launchDate: 'desc' },
        take: limit,
      }),
      prisma.businessOpportunity.findMany({
        where: {
          OR: [
            { title: containsFilter },
            { description: containsFilter },
          ],
        },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          type: true,
          category: true,
          sector: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      }),
      prisma.blogPost.findMany({
        where: {
          OR: [
            { title: containsFilter },
            { excerpt: containsFilter },
          ],
        },
        select: {
          id: true,
          title: true,
          excerpt: true,
          url: true,
          authorName: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      }),
    ]);

    return NextResponse.json({
      news,
      companies,
      events,
      opportunities,
      blogs,
    });
  } catch (error) {
    console.error('Search failed:', error);
    return internalError('Search failed');
  }
}
