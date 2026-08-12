import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL as SITE_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const RSS_ITEM_COUNT = 100;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function buildDescription(job: {
  title: string;
  company: string;
  location: string;
  remoteOk: boolean;
  seniorityLevel: string;
  description: string | null;
}): string {
  if (job.description) {
    const text = stripHtml(job.description);
    if (text.length > 0) {
      return text.length > 280 ? `${text.slice(0, 277).trimEnd()}...` : text;
    }
  }
  const seniority = job.seniorityLevel ? job.seniorityLevel.replace(/_/g, ' ') : 'open';
  const remoteNote = job.remoteOk ? ', remote-eligible' : '';
  return `${job.title} at ${job.company} in ${job.location}${remoteNote}. ${seniority} level role.`;
}

export async function GET() {
  try {
    const jobs = await prisma.spaceJobPosting.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        remoteOk: true,
        seniorityLevel: true,
        description: true,
        postedDate: true,
      },
      orderBy: { postedDate: 'desc' },
      take: RSS_ITEM_COUNT,
    });

    const items = jobs
      .map((job) => {
        const link = `${SITE_URL}/space-talent/job/${job.id}`;
        const title = `${job.title} — ${job.company} (${job.location})`;
        return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(buildDescription(job))}</description>
      <pubDate>${job.postedDate.toUTCString()}</pubDate>
      <category>${escapeXml(job.company)}</category>
    </item>`;
      })
      .join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SpaceNexus Space Industry Jobs</title>
    <link>${SITE_URL}/space-talent</link>
    <description>Newest open space industry job postings from SpaceNexus — engineering, operations, business, research, and more.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/api/feed/jobs/rss" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/spacenexus-logo.png</url>
      <title>SpaceNexus Space Industry Jobs</title>
      <link>${SITE_URL}/space-talent</link>
    </image>
${items}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('Failed to build jobs RSS feed', {
      error: error instanceof Error ? error.message : String(error),
    });
    const empty = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>SpaceNexus Space Industry Jobs</title>
  <link>${SITE_URL}/space-talent</link>
  <description>Newest open space industry job postings from SpaceNexus.</description>
</channel></rss>`;
    return new Response(empty, {
      status: 500,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
