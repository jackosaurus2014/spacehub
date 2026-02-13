import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 20);

    if (!q || q.length < 2) {
      return NextResponse.json({ companies: [], otherResults: { news: [], events: [], opportunities: [], blogs: [] } });
    }

    const containsFilter = { contains: q, mode: 'insensitive' as const };

    // 1. Search CompanyProfile with cross-module counts
    const companies = await (prisma.companyProfile as any).findMany({
      where: {
        OR: [
          { name: containsFilter },
          { ticker: containsFilter },
          { description: containsFilter },
          { sector: containsFilter },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        ticker: true,
        sector: true,
        subsector: true,
        headquarters: true,
        country: true,
        isPublic: true,
        tier: true,
        totalFunding: true,
        revenueEstimate: true,
        employeeCount: true,
        employeeRange: true,
        dataCompleteness: true,
        logoUrl: true,
        website: true,
        description: true,
        scores: {
          select: { scoreType: true, score: true },
        },
        _count: {
          select: {
            newsArticles: true,
            contracts: true,
            serviceListings: true,
            satelliteAssets: true,
            fundingRounds: true,
            products: true,
            events: true,
            partnerships: true,
            keyPersonnel: true,
          },
        },
      },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      take: limit,
    });

    // 2. Get aggregate contract values for matched companies
    const companyResults = await Promise.all(
      companies.map(async (company: any) => {
        let contractsValue = 0;
        if (company._count.contracts > 0) {
          const contractAgg = await (prisma.governmentContractAward as any).aggregate({
            where: { companyId: company.id },
            _sum: { value: true },
          });
          contractsValue = contractAgg._sum?.value || 0;
        }

        return {
          company: {
            id: company.id,
            slug: company.slug,
            name: company.name,
            ticker: company.ticker,
            sector: company.sector,
            subsector: company.subsector,
            headquarters: company.headquarters,
            country: company.country,
            isPublic: company.isPublic,
            tier: company.tier,
            totalFunding: company.totalFunding,
            revenueEstimate: company.revenueEstimate,
            employeeCount: company.employeeCount,
            employeeRange: company.employeeRange,
            dataCompleteness: company.dataCompleteness,
            logoUrl: company.logoUrl,
            website: company.website,
            description: company.description,
            scores: company.scores,
          },
          moduleCounts: {
            newsArticles: company._count.newsArticles,
            contracts: company._count.contracts,
            contractsValue,
            serviceListings: company._count.serviceListings,
            satelliteAssets: company._count.satelliteAssets,
            fundingRounds: company._count.fundingRounds,
            products: company._count.products,
            events: company._count.events,
            partnerships: company._count.partnerships,
            keyPersonnel: company._count.keyPersonnel,
          },
          moduleLinks: {
            profile: `/company-profiles/${company.slug}`,
            news: company._count.newsArticles > 0 ? `/news?company=${company.slug}` : null,
            contracts: company._count.contracts > 0 ? `/company-profiles/${company.slug}#contracts` : null,
            marketplace: company._count.serviceListings > 0 ? `/marketplace/search?company=${encodeURIComponent(company.name)}` : null,
            satellites: company._count.satelliteAssets > 0 ? `/company-profiles/${company.slug}#satellites` : null,
            funding: company._count.fundingRounds > 0 ? `/company-profiles/${company.slug}#funding` : null,
          },
        };
      })
    );

    // 3. Also run standard search for non-company results
    const [news, events, opportunities, blogs] = await Promise.all([
      prisma.newsArticle.findMany({
        where: { OR: [{ title: containsFilter }, { summary: containsFilter }] },
        select: { id: true, title: true, summary: true, url: true, source: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      }),
      prisma.spaceEvent.findMany({
        where: { OR: [{ name: containsFilter }, { description: containsFilter }] },
        select: { id: true, name: true, description: true, type: true, status: true, launchDate: true, agency: true },
        orderBy: { launchDate: 'desc' },
        take: limit,
      }),
      prisma.businessOpportunity.findMany({
        where: { OR: [{ title: containsFilter }, { description: containsFilter }] },
        select: { id: true, slug: true, title: true, description: true, type: true, category: true, sector: true },
        orderBy: { discoveredAt: 'desc' },
        take: limit,
      }),
      prisma.blogPost.findMany({
        where: { OR: [{ title: containsFilter }, { excerpt: containsFilter }] },
        select: { id: true, title: true, excerpt: true, url: true, authorName: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      }),
    ]);

    return NextResponse.json({
      companies: companyResults,
      otherResults: { news, events, opportunities, blogs },
    });
  } catch (error) {
    logger.error('Company intel search failed', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Company intelligence search failed');
  }
}
