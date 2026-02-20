import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { BLOG_POSTS } from '@/lib/blog-content';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

/**
 * Google News Sitemap — only includes SpaceNexus-authored content:
 *  - AI-generated insights (AIInsight model) from the last 48 hours
 *  - SpaceNexus blog posts (BLOG_POSTS) published within the last 30 days
 *  - AI-generated regulation explainers from the last 48 hours
 *
 * Does NOT include external RSS feeds or aggregated news.
 */
export async function GET() {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  interface NewsEntry {
    url: string;
    title: string;
    publicationDate: string;
    keywords: string;
  }

  const entries: NewsEntry[] = [];

  // 1. AI Insights from the last 48 hours
  try {
    const insights = await prisma.aIInsight.findMany({
      where: { generatedAt: { gte: twoDaysAgo } },
      select: { slug: true, title: true, category: true, generatedAt: true },
      orderBy: { generatedAt: 'desc' },
    });

    for (const insight of insights) {
      entries.push({
        url: `https://spacenexus.us/ai-insights/${insight.slug}`,
        title: escapeXml(insight.title),
        publicationDate: insight.generatedAt.toISOString(),
        keywords: `space industry, ${insight.category}, AI analysis`,
      });
    }
  } catch (error) {
    logger.error('News sitemap: Failed to fetch AI insights', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 2. Regulation explainers from the last 48 hours
  try {
    const explainers = await prisma.regulationExplainer.findMany({
      where: { createdAt: { gte: twoDaysAgo } },
      select: { slug: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    for (const explainer of explainers) {
      entries.push({
        url: `https://spacenexus.us/regulation-explainers/${explainer.slug}`,
        title: escapeXml(explainer.title),
        publicationDate: explainer.createdAt.toISOString(),
        keywords: 'space regulation, compliance, space law',
      });
    }
  } catch (error) {
    logger.error('News sitemap: Failed to fetch regulation explainers', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // 3. SpaceNexus blog posts published within the last 30 days
  for (const post of BLOG_POSTS) {
    const publishDate = new Date(post.publishedAt);
    if (publishDate >= thirtyDaysAgo) {
      entries.push({
        url: `https://spacenexus.us/blog/${post.slug}`,
        title: escapeXml(post.title),
        publicationDate: publishDate.toISOString(),
        keywords: `space industry, ${post.category}`,
      });
    }
  }

  // Sort entries by publication date descending (newest first)
  entries.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.map(entry => `  <url>
    <loc>${entry.url}</loc>
    <news:news>
      <news:publication>
        <news:name>SpaceNexus</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${entry.publicationDate}</news:publication_date>
      <news:title>${entry.title}</news:title>
      <news:keywords>${entry.keywords}</news:keywords>
    </news:news>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
