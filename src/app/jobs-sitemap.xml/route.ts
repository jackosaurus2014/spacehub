import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

const BASE_URL = 'https://spacenexus.us';
const MAX_URLS = 10_000;

/**
 * Jobs sitemap — one <url> per active, ATS-synced SpaceJobPosting so Google
 * (and Google for Jobs, via the JobPosting structured data on the detail
 * page) can discover and index every listing. Capped at MAX_URLS and sorted
 * newest-first so the cap always favors the freshest postings.
 */
export async function GET() {
  interface JobEntry {
    id: string;
    postedDate: Date;
  }

  let jobs: JobEntry[] = [];

  try {
    jobs = await prisma.spaceJobPosting.findMany({
      where: { isActive: true },
      select: { id: true, postedDate: true },
      orderBy: { postedDate: 'desc' },
      take: MAX_URLS,
    });
  } catch (error) {
    logger.error('Jobs sitemap: Failed to fetch job postings', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${jobs
  .map(
    (job) => `  <url>
    <loc>${BASE_URL}/space-talent/job/${job.id}</loc>
    <lastmod>${job.postedDate.toISOString().slice(0, 10)}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
