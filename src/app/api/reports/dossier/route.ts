import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a senior space industry intelligence analyst at SpaceNexus. Generate a comprehensive company intelligence dossier. Structure the report with these sections, each with a clear title and substantive analysis:

1. Executive Summary (2-3 paragraph synthesis of company position)
2. Company Overview (founding, leadership, headquarters, mission)
3. Financial Profile (funding history, valuation trajectory, revenue)
4. Leadership & Team Analysis (key executives, stability, notable hires/departures)
5. Products & Technology Portfolio (product lines, technology readiness, competitive advantages)
6. Government & Defense Contracts (contract history, agency relationships, win patterns)
7. Space Assets & Operations (satellites, facilities, operational capabilities)
8. Strategic Partnerships & Ecosystem (partners, joint ventures, supply chain position)
9. Competitive Positioning (direct/indirect competitors, market share, differentiation)
10. M&A Activity (acquisitions made, potential as target)
11. Market Sentiment & Recent Developments (news coverage, milestone events)
12. Risk Assessment (key risks with severity ratings)
13. Strategic Outlook (forward-looking analysis, opportunities, threats)

Return valid JSON with:
{
  "title": "Company Intelligence Dossier: [Company Name]",
  "generatedAt": "ISO date",
  "sections": [
    { "id": "section-id", "title": "Section Title", "content": "markdown content" }
  ],
  "recommendation": "brief strategic recommendation",
  "dataQuality": "assessment of data completeness"
}

Important: Return ONLY the JSON object, no markdown code fences or other text.`;

function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return 'N/A';
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toISOString().split('T')[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCompanyContext(company: any, recentNews: any[], marketContext: any): string {
  const sections: string[] = [];

  // Basic info
  sections.push(`## Company: ${company.name}`);
  sections.push(`Slug: ${company.slug}`);
  if (company.description) sections.push(`Description: ${company.description}`);
  if (company.sector) sections.push(`Sector: ${company.sector}`);
  if (company.subSector) sections.push(`Sub-sector: ${company.subSector}`);
  if (company.headquarters) sections.push(`Headquarters: ${company.headquarters}`);
  if (company.foundedYear) sections.push(`Founded: ${company.foundedYear}`);
  if (company.employeeCount) sections.push(`Employees: ${company.employeeCount}`);
  if (company.website) sections.push(`Website: ${company.website}`);
  if (company.stockTicker) sections.push(`Stock Ticker: ${company.stockTicker}`);
  if (company.tier) sections.push(`Tier: ${company.tier}`);
  if (company.tags?.length) sections.push(`Tags: ${company.tags.join(', ')}`);
  if (company.revenue) sections.push(`Revenue: ${formatCurrency(company.revenue)}`);
  if (company.valuation) sections.push(`Valuation: ${formatCurrency(company.valuation)}`);

  // Funding rounds
  if (company.fundingRounds?.length > 0) {
    sections.push(`\n## Funding Rounds (${company.fundingRounds.length} total)`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.fundingRounds.forEach((round: any) => {
      sections.push(`- ${round.series || 'Unknown'}: ${formatCurrency(round.amount)} (${formatDate(round.date)})${round.leadInvestor ? ` — Lead: ${round.leadInvestor}` : ''}${round.investors?.length ? ` — Investors: ${round.investors.join(', ')}` : ''}`);
    });
  }

  // Products
  if (company.products?.length > 0) {
    sections.push(`\n## Products & Services (${company.products.length})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.products.forEach((product: any) => {
      sections.push(`- ${product.name}${product.category ? ` [${product.category}]` : ''}${product.status ? ` (${product.status})` : ''}: ${product.description || 'No description'}`);
    });
  }

  // Key Personnel
  if (company.keyPersonnel?.length > 0) {
    sections.push(`\n## Key Personnel (${company.keyPersonnel.length} current)`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.keyPersonnel.forEach((person: any) => {
      sections.push(`- ${person.name}, ${person.title}${person.startDate ? ` (since ${formatDate(person.startDate)})` : ''}${person.background ? ` — ${person.background}` : ''}`);
    });
  }

  // Acquisitions made
  if (company.acquisitions?.length > 0) {
    sections.push(`\n## Acquisitions Made (${company.acquisitions.length})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.acquisitions.forEach((acq: any) => {
      sections.push(`- ${acq.targetName || acq.target?.name || 'Unknown target'}${acq.amount ? ` for ${formatCurrency(acq.amount)}` : ''} (${formatDate(acq.date)})${acq.status ? ` — Status: ${acq.status}` : ''}`);
    });
  }

  // Acquired by
  if (company.acquisitionsOf?.length > 0) {
    sections.push(`\n## Acquisition Target History (${company.acquisitionsOf.length})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.acquisitionsOf.forEach((acq: any) => {
      sections.push(`- Acquired by ${acq.acquirerName || acq.acquirer?.name || 'Unknown'}${acq.amount ? ` for ${formatCurrency(acq.amount)}` : ''} (${formatDate(acq.date)})${acq.status ? ` — Status: ${acq.status}` : ''}`);
    });
  }

  // Partnerships
  if (company.partnerships?.length > 0) {
    sections.push(`\n## Strategic Partnerships (${company.partnerships.length})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.partnerships.forEach((p: any) => {
      sections.push(`- ${p.partnerName || 'Unknown partner'}${p.type ? ` [${p.type}]` : ''} (${formatDate(p.announcedDate)})${p.description ? ` — ${p.description}` : ''}`);
    });
  }

  // Government contracts
  if (company.contracts?.length > 0) {
    sections.push(`\n## Government Contracts (showing ${company.contracts.length})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.contracts.forEach((c: any) => {
      sections.push(`- ${c.title || c.contractNumber || 'Unnamed'}: ${formatCurrency(c.awardAmount)} from ${c.agency || 'Unknown agency'} (${formatDate(c.awardDate)})${c.status ? ` — ${c.status}` : ''}`);
    });
  }

  // Events
  if (company.events?.length > 0) {
    sections.push(`\n## Recent Events (${company.events.length})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.events.forEach((e: any) => {
      sections.push(`- [${e.type || 'event'}] ${e.title || 'Untitled'} (${formatDate(e.date)})${e.description ? ` — ${e.description}` : ''}`);
    });
  }

  // Satellite assets
  if (company.satelliteAssets?.length > 0) {
    sections.push(`\n## Satellite Assets (${company.satelliteAssets.length})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.satelliteAssets.forEach((s: any) => {
      sections.push(`- ${s.name || s.noradId || 'Unknown'}: ${s.type || 'Unknown type'}${s.orbit ? ` in ${s.orbit}` : ''} (launched ${formatDate(s.launchDate)})${s.status ? ` — ${s.status}` : ''}`);
    });
  }

  // Facilities
  if (company.facilities?.length > 0) {
    sections.push(`\n## Facilities (${company.facilities.length})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.facilities.forEach((f: any) => {
      sections.push(`- ${f.name || 'Unnamed'} [${f.type || 'Unknown'}]${f.location ? ` at ${f.location}` : ''}${f.description ? ` — ${f.description}` : ''}`);
    });
  }

  // Scores
  if (company.scores?.length > 0) {
    sections.push(`\n## Company Scores`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.scores.forEach((s: any) => {
      sections.push(`- ${s.category || 'Overall'}: ${s.score}/100${s.trend ? ` (${s.trend})` : ''}`);
    });
  }

  // SEC Filings
  if (company.secFilings?.length > 0) {
    sections.push(`\n## SEC Filings (${company.secFilings.length})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.secFilings.forEach((f: any) => {
      sections.push(`- ${f.formType || 'Unknown'}: ${f.title || 'Untitled'} (${formatDate(f.filingDate)})`);
    });
  }

  // Competitors
  if (company.competitorOf?.length > 0) {
    sections.push(`\n## Competitors`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.competitorOf.forEach((c: any) => {
      const competitorName = c.competitor?.name || 'Unknown';
      sections.push(`- ${competitorName}${c.overlapArea ? ` (overlap: ${c.overlapArea})` : ''}`);
    });
  }

  // Service listings
  if (company.serviceListings?.length > 0) {
    sections.push(`\n## Active Service Listings (${company.serviceListings.length})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.serviceListings.forEach((l: any) => {
      sections.push(`- ${l.title || 'Untitled'}${l.category ? ` [${l.category}]` : ''}${l.pricingType ? ` (${l.pricingType})` : ''}`);
    });
  }

  // Reviews
  if (company.reviews?.length > 0) {
    const avgRating = company.reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / company.reviews.length;
    sections.push(`\n## Provider Reviews (${company.reviews.length}, avg: ${avgRating.toFixed(1)}/5)`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    company.reviews.slice(0, 5).forEach((r: any) => {
      sections.push(`- ${r.rating}/5: "${r.title || r.comment || 'No comment'}" (${formatDate(r.createdAt)})`);
    });
  }

  // Recent news
  if (recentNews.length > 0) {
    sections.push(`\n## Recent News Coverage (${recentNews.length} articles, last 90 days)`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentNews.forEach((n: any) => {
      sections.push(`- [${formatDate(n.publishedAt)}] ${n.title}${n.source ? ` (${n.source})` : ''}${n.category ? ` [${n.category}]` : ''}`);
    });
  }

  // Market context
  sections.push(`\n## Market Context`);
  sections.push(`- Total government contract value: ${formatCurrency(marketContext.totalContractValue)}`);
  sections.push(`- Active satellite assets: ${marketContext.activeSatellites}`);
  sections.push(`- Total funding rounds: ${marketContext.totalFundingRounds}`);

  return sections.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { companySlug } = body;

    if (!companySlug || typeof companySlug !== 'string') {
      return NextResponse.json(
        { error: 'companySlug is required and must be a string' },
        { status: 400 }
      );
    }

    // Fetch company with all relations
    const company = await prisma.companyProfile.findUnique({
      where: { slug: companySlug },
      include: {
        fundingRounds: { orderBy: { date: 'desc' } },
        products: { orderBy: { name: 'asc' } },
        keyPersonnel: { where: { isCurrent: true } },
        acquisitions: { orderBy: { date: 'desc' } },
        acquisitionsOf: { orderBy: { date: 'desc' } },
        partnerships: { orderBy: { announcedDate: 'desc' } },
        contracts: { take: 20, orderBy: { awardDate: 'desc' } },
        events: { take: 20, orderBy: { date: 'desc' } },
        satelliteAssets: { orderBy: { launchDate: 'desc' } },
        facilities: { orderBy: { type: 'asc' } },
        scores: true,
        secFilings: { take: 10, orderBy: { filingDate: 'desc' } },
        competitorOf: {
          include: { competitor: { select: { name: true, slug: true } } },
        },
        serviceListings: { where: { status: 'active' } },
        reviews: { where: { status: 'published' } },
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: `Company not found: ${companySlug}` },
        { status: 404 }
      );
    }

    // Fetch recent news mentioning this company (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentNews = await prisma.newsArticle.findMany({
      where: {
        companyTags: { some: { id: company.id } },
        publishedAt: { gte: ninetyDaysAgo },
      },
      select: {
        title: true,
        source: true,
        publishedAt: true,
        category: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 15,
    });

    // Gather market context
    const [contractAgg, activeSatellites, totalFundingRounds] = await Promise.all([
      prisma.governmentContractAward.aggregate({
        where: { companyId: company.id },
        _sum: { awardAmount: true },
      }),
      prisma.satelliteAsset.count({
        where: { companyId: company.id, status: 'active' },
      }),
      prisma.fundingRound.count({
        where: { companyId: company.id },
      }),
    ]);

    const marketContext = {
      totalContractValue: contractAgg._sum.awardAmount || 0,
      activeSatellites,
      totalFundingRounds,
    };

    // Build comprehensive context
    const companyContext = buildCompanyContext(company, recentNews, marketContext);

    const userPrompt = `Generate a comprehensive intelligence dossier for the following company. Analyze all available data points, identify patterns, and provide strategic insights. Where data is limited, note the gaps and provide analysis based on available information.

${companyContext}

Generate the dossier as the specified JSON structure. Ensure each section contains substantive analysis, not just a restatement of data points. Identify trends, risks, and strategic implications.`;

    // Call Claude for synthesis
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract text content from response
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logger.error('No text content in Claude response for dossier generation');
      return NextResponse.json(
        { error: 'Failed to generate dossier: no response content' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let dossier;
    try {
      // Strip any markdown code fences if present
      let jsonText = textBlock.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      dossier = JSON.parse(jsonText);
    } catch (parseError) {
      logger.error('Failed to parse Claude dossier response as JSON', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responsePreview: textBlock.text.substring(0, 200),
      });
      return NextResponse.json(
        { error: 'Failed to parse dossier response' },
        { status: 500 }
      );
    }

    logger.info('Company dossier generated successfully', {
      companySlug,
      sectionsCount: dossier.sections?.length || 0,
      userId: session.user.email,
    });

    return NextResponse.json({
      success: true,
      dossier,
      company: {
        name: company.name,
        slug: company.slug,
        tier: company.tier,
      },
    });
  } catch (error) {
    logger.error('Error generating company dossier', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error generating dossier' },
      { status: 500 }
    );
  }
}
