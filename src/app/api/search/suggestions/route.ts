import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q')?.trim();
    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: { companies: [], articles: [], modules: [] } });
    }

    const lowerQuery = query.toLowerCase();

    // Search companies and news articles in parallel
    const [companies, articles] = await Promise.all([
      (prisma.companyProfile as any).findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { slug: { contains: lowerQuery } },
          ],
        },
        select: { name: true, slug: true, sector: true },
        take: 5,
      }).catch((err: unknown) => {
        logger.error('Suggestion company search failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return [];
      }),

      prisma.newsArticle.findMany({
        where: {
          title: { contains: query, mode: 'insensitive' },
        },
        select: { title: true, id: true, category: true },
        take: 3,
        orderBy: { publishedAt: 'desc' },
      }).catch((err: unknown) => {
        logger.error('Suggestion article search failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return [];
      }),
    ]);

    // Static module suggestions
    const moduleKeywords: Record<string, { name: string; path: string }> = {
      'satellite': { name: 'Satellite Tracker', path: '/satellites' },
      'launch': { name: 'Launch Dashboard', path: '/launch' },
      'market': { name: 'Market Intelligence', path: '/market-intel' },
      'funding': { name: 'Funding Tracker', path: '/funding-tracker' },
      'news': { name: 'Space News', path: '/news' },
      'company': { name: 'Company Profiles', path: '/company-profiles' },
      'compliance': { name: 'Regulatory Compliance', path: '/compliance' },
      'talent': { name: 'Space Talent Hub', path: '/space-talent' },
      'procurement': { name: 'Procurement Intelligence', path: '/procurement' },
      'marketplace': { name: 'Marketplace', path: '/marketplace' },
      'compare': { name: 'Compare Companies', path: '/compare/companies' },
      'calculator': { name: 'Launch Cost Calculator', path: '/launch-cost-calculator' },
      'insurance': { name: 'Space Insurance', path: '/space-insurance' },
      'spectrum': { name: 'Spectrum Management', path: '/spectrum' },
      'debris': { name: 'Space Environment', path: '/space-environment' },
      'weather': { name: 'Space Weather', path: '/space-environment?tab=weather' },
      'mars': { name: 'Mars Planner', path: '/mars-planner' },
      'asteroid': { name: 'Asteroid Watch', path: '/asteroid-watch' },
      'blueprint': { name: 'Blueprints', path: '/blueprints' },
      'forum': { name: 'Community Forum', path: '/community/forums' },
      'alert': { name: 'Alerts', path: '/alerts' },
      'dashboard': { name: 'Dashboard Builder', path: '/dashboard' },
      'mission': { name: 'Mission Control', path: '/mission-control' },
      'solar': { name: 'Solar Exploration', path: '/solar-exploration' },
      'orbital': { name: 'Orbital Management', path: '/orbital-slots' },
      'blog': { name: 'Blogs & Articles', path: '/blogs' },
      'job': { name: 'Space Talent Hub', path: '/space-talent' },
      'opportunity': { name: 'Business Opportunities', path: '/business-opportunities' },
    };

    const matchedModules = Object.entries(moduleKeywords)
      .filter(([keyword]) => keyword.includes(lowerQuery) || lowerQuery.includes(keyword))
      .map(([, val]) => val)
      // Deduplicate by path
      .filter((val, idx, arr) => arr.findIndex(v => v.path === val.path) === idx)
      .slice(0, 3);

    return NextResponse.json({
      suggestions: {
        companies: companies.map((c: { name: string; slug: string; sector: string | null }) => ({
          type: 'company' as const,
          name: c.name,
          path: `/company-profiles/${c.slug}`,
          detail: c.sector ? c.sector.replace(/_/g, ' ') : null,
        })),
        articles: articles.map((a: { title: string; id: string; category: string }) => ({
          type: 'article' as const,
          name: a.title.length > 60 ? a.title.slice(0, 60) + '...' : a.title,
          path: `/news/${a.id}`,
          detail: a.category,
        })),
        modules: matchedModules.map(m => ({
          type: 'module' as const,
          name: m.name,
          path: m.path,
          detail: 'Module',
        })),
      },
    });
  } catch (error) {
    logger.error('Search suggestions failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { suggestions: { companies: [], articles: [], modules: [] } },
      { status: 500 }
    );
  }
}
