import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { authOptions } from '@/lib/auth';
import { MARKET_SEGMENTS } from '@/lib/market-sizing-data';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a senior space industry analyst preparing a quarterly board briefing for a space company's board of directors. Write a comprehensive, data-driven report that a CEO would present. Be specific with numbers, dates, and actionable insights.

Structure the report as exactly 8 sections plus an executive summary. Each section should contain substantive, forward-looking analysis — not just a recap of raw data. Identify patterns, quantify trends, and provide concrete strategic recommendations where appropriate.

Return valid JSON with this exact structure:
{
  "title": "Q[N] [Year] Board Briefing: [Company Name]",
  "generatedAt": "ISO date",
  "periodStart": "ISO date",
  "periodEnd": "ISO date",
  "executiveSummary": "2-3 paragraph executive summary highlighting the most critical items for board attention",
  "sections": [
    { "id": "company-performance", "title": "Company Performance Summary", "content": "markdown content covering recent contracts, events, milestones, and operational achievements" },
    { "id": "market-landscape", "title": "Market Landscape", "content": "markdown content covering TAM updates, sector funding activity, competitor moves, and market dynamics" },
    { "id": "competitive-intelligence", "title": "Competitive Intelligence", "content": "markdown content covering competitor funding rounds, key hires, contract wins, and strategic moves" },
    { "id": "regulatory-policy", "title": "Regulatory & Policy Developments", "content": "markdown content covering upcoming comment deadlines, new rules, effective dates, and impact assessment" },
    { "id": "talent-workforce", "title": "Talent & Workforce", "content": "markdown content covering hiring trends, salary movements, skills demand, and workforce planning implications" },
    { "id": "financial-position", "title": "Financial Position", "content": "markdown content covering funding history, valuation trajectory, revenue estimates, and capital needs" },
    { "id": "strategic-opportunities", "title": "Strategic Opportunities", "content": "markdown content covering procurement pipeline, partnership potential, M&A targets, and growth vectors" },
    { "id": "risks-mitigations", "title": "Key Risks & Mitigations", "content": "markdown content covering regulatory, competitive, technical, and financial risks with severity ratings and mitigation strategies" }
  ]
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

/* eslint-disable @typescript-eslint/no-explicit-any */

function buildBoardPrepContext(
  company: any,
  recentNews: any[],
  upcomingRegulations: any[],
  recentPolicyChanges: any[],
  workforceTrends: any[],
  sectorFunding: any[],
  sectorContracts: any[],
  sectorMnA: any[],
  marketSegment: any | undefined,
  periodStart: Date,
  periodEnd: Date
): string {
  const sections: string[] = [];

  // === Company Overview ===
  sections.push(`# COMPANY: ${company.name}`);
  if (company.description) sections.push(`Description: ${company.description}`);
  if (company.sector) sections.push(`Sector: ${company.sector}`);
  if (company.subsector) sections.push(`Sub-sector: ${company.subsector}`);
  if (company.headquarters) sections.push(`Headquarters: ${company.headquarters}`);
  if (company.foundedYear) sections.push(`Founded: ${company.foundedYear}`);
  if (company.employeeCount) sections.push(`Employees: ${company.employeeCount}`);
  if (company.tier) sections.push(`Tier: ${company.tier}`);
  if (company.status) sections.push(`Status: ${company.status}`);
  if (company.revenueEstimate) sections.push(`Revenue Estimate: ${formatCurrency(company.revenueEstimate)}`);
  if (company.valuation) sections.push(`Valuation: ${formatCurrency(company.valuation)}`);
  if (company.totalFunding) sections.push(`Total Funding: ${formatCurrency(company.totalFunding)}`);
  if (company.lastFundingRound) sections.push(`Last Funding Round: ${company.lastFundingRound}`);
  if (company.isPublic && company.stockPrice) sections.push(`Stock: ${company.ticker} at $${company.stockPrice} (24h change: ${company.priceChange24h ?? 'N/A'}%)`);

  // === Funding Rounds ===
  if (company.fundingRounds?.length > 0) {
    sections.push(`\n## FUNDING HISTORY (${company.fundingRounds.length} rounds)`);
    company.fundingRounds.forEach((round: any) => {
      sections.push(`- ${round.seriesLabel || round.roundType || 'Unknown'}: ${formatCurrency(round.amount)} (${formatDate(round.date)})${round.leadInvestor ? ` — Lead: ${round.leadInvestor}` : ''}${round.investors?.length ? ` — Investors: ${round.investors.join(', ')}` : ''}${round.postValuation ? ` — Post-money: ${formatCurrency(round.postValuation)}` : ''}`);
    });
  }

  // === Products ===
  if (company.products?.length > 0) {
    sections.push(`\n## PRODUCTS & SERVICES (${company.products.length})`);
    company.products.forEach((p: any) => {
      sections.push(`- ${p.name}${p.category ? ` [${p.category}]` : ''}${p.status ? ` (${p.status})` : ''}: ${p.description || 'No description'}`);
    });
  }

  // === Key Personnel ===
  if (company.keyPersonnel?.length > 0) {
    sections.push(`\n## KEY PERSONNEL (${company.keyPersonnel.length} current)`);
    company.keyPersonnel.forEach((person: any) => {
      sections.push(`- ${person.name}, ${person.title}${person.startDate ? ` (since ${formatDate(person.startDate)})` : ''}${person.background ? ` — ${person.background}` : ''}`);
    });
  }

  // === Government Contracts ===
  if (company.contracts?.length > 0) {
    sections.push(`\n## GOVERNMENT CONTRACTS (showing ${company.contracts.length} most recent)`);
    company.contracts.forEach((c: any) => {
      sections.push(`- ${c.title || c.contractNumber || 'Unnamed'}: ${formatCurrency(c.value)} from ${c.agency || 'Unknown'} (${formatDate(c.awardDate)})${c.type ? ` [${c.type}]` : ''}${c.status ? ` — ${c.status}` : ''}${c.numberOfOffers ? ` — ${c.numberOfOffers} bidders` : ''}`);
    });
  }

  // === Recent Events ===
  if (company.events?.length > 0) {
    sections.push(`\n## RECENT EVENTS (${company.events.length})`);
    company.events.forEach((e: any) => {
      sections.push(`- [${e.type || 'event'}] ${e.title || 'Untitled'} (${formatDate(e.date)})${e.description ? ` — ${e.description}` : ''}`);
    });
  }

  // === Competitors ===
  if (company.competitorOf?.length > 0) {
    sections.push(`\n## COMPETITIVE LANDSCAPE`);
    company.competitorOf.forEach((c: any) => {
      const comp = c.competitor;
      sections.push(`- ${comp?.name || 'Unknown'}${c.overlapArea ? ` (overlap: ${c.overlapArea})` : ''}${comp?.totalFunding ? ` — Funding: ${formatCurrency(comp.totalFunding)}` : ''}${comp?.employeeCount ? ` — Employees: ${comp.employeeCount}` : ''}`);
    });
  }

  // === Company Scores ===
  if (company.scores?.length > 0) {
    sections.push(`\n## COMPANY SCORES`);
    company.scores.forEach((s: any) => {
      sections.push(`- ${s.category || 'Overall'}: ${s.score}/100${s.trend ? ` (trend: ${s.trend})` : ''}`);
    });
  }

  // === Partnerships ===
  if (company.partnerships?.length > 0) {
    sections.push(`\n## STRATEGIC PARTNERSHIPS (${company.partnerships.length})`);
    company.partnerships.forEach((p: any) => {
      sections.push(`- ${p.partnerName || 'Unknown'}${p.type ? ` [${p.type}]` : ''} (${formatDate(p.announcedDate)})${p.description ? ` — ${p.description}` : ''}${p.value ? ` — Value: ${formatCurrency(p.value)}` : ''}`);
    });
  }

  // === Recent News Coverage ===
  if (recentNews.length > 0) {
    sections.push(`\n## RECENT NEWS COVERAGE (${recentNews.length} articles, last ${Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))} days)`);
    recentNews.forEach((n: any) => {
      sections.push(`- [${formatDate(n.publishedAt)}] ${n.title}${n.source ? ` (${n.source})` : ''}${n.category ? ` [${n.category}]` : ''}`);
    });
  }

  // === Regulatory / Upcoming Regulations ===
  if (upcomingRegulations.length > 0) {
    sections.push(`\n## UPCOMING REGULATORY DEADLINES (${upcomingRegulations.length})`);
    upcomingRegulations.forEach((r: any) => {
      sections.push(`- ${r.title} [${r.agency}]${r.type ? ` (${r.type})` : ''}`);
      if (r.commentDeadline) sections.push(`  Comment deadline: ${formatDate(r.commentDeadline)}`);
      if (r.effectiveDate) sections.push(`  Effective date: ${formatDate(r.effectiveDate)}`);
      if (r.impactSeverity) sections.push(`  Impact severity: ${r.impactSeverity}`);
      if (r.summary) sections.push(`  Summary: ${r.summary}`);
    });
  }

  // === Recent Policy Changes ===
  if (recentPolicyChanges.length > 0) {
    sections.push(`\n## RECENT POLICY CHANGES (${recentPolicyChanges.length})`);
    recentPolicyChanges.forEach((p: any) => {
      sections.push(`- ${p.title} [${p.agency}] — ${p.status} (published ${formatDate(p.publishedDate)})`);
      if (p.impactSeverity) sections.push(`  Impact: ${p.impactSeverity}`);
      if (p.impactAnalysis) sections.push(`  Analysis: ${p.impactAnalysis.substring(0, 300)}`);
    });
  }

  // === Workforce Trends ===
  if (workforceTrends.length > 0) {
    sections.push(`\n## WORKFORCE TRENDS`);
    workforceTrends.forEach((w: any) => {
      sections.push(`- ${w.period}: ${w.totalOpenings} open positions${w.totalHires ? `, ${w.totalHires} hires` : ''}`);
      if (w.avgSalary) sections.push(`  Avg salary: ${formatCurrency(w.avgSalary)}`);
      if (w.medianSalary) sections.push(`  Median salary: ${formatCurrency(w.medianSalary)}`);
      sections.push(`  By category: Engineering ${w.engineeringOpenings}, Operations ${w.operationsOpenings}, Business ${w.businessOpenings}, Research ${w.researchOpenings}`);
      if (w.yoyGrowth !== null && w.yoyGrowth !== undefined) sections.push(`  YoY growth: ${(w.yoyGrowth * 100).toFixed(1)}%`);
      if (w.topSkills) {
        try {
          const skills = JSON.parse(w.topSkills);
          if (Array.isArray(skills)) sections.push(`  Top skills: ${skills.join(', ')}`);
        } catch { /* skip */ }
      }
    });
  }

  // === Sector Funding Activity (market context) ===
  if (sectorFunding.length > 0) {
    const totalSectorFunding = sectorFunding.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
    sections.push(`\n## SECTOR FUNDING ACTIVITY (${sectorFunding.length} rounds, ${formatCurrency(totalSectorFunding)} total in period)`);
    sectorFunding.forEach((f: any) => {
      sections.push(`- ${f.company?.name || 'Unknown'}: ${f.seriesLabel || f.roundType || 'Unknown'} — ${formatCurrency(f.amount)} (${formatDate(f.date)})${f.leadInvestor ? ` — Lead: ${f.leadInvestor}` : ''}`);
    });
  }

  // === Sector Contract Awards ===
  if (sectorContracts.length > 0) {
    const totalContractValue = sectorContracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0);
    sections.push(`\n## SECTOR CONTRACT AWARDS (${sectorContracts.length} awards, ${formatCurrency(totalContractValue)} total in period)`);
    sectorContracts.forEach((c: any) => {
      sections.push(`- ${c.companyName}: ${c.title || c.contractNumber || 'Unnamed'} — ${formatCurrency(c.value)} from ${c.agency} (${formatDate(c.awardDate)})${c.numberOfOffers ? ` [${c.numberOfOffers} bidders]` : ''}`);
    });
  }

  // === Sector M&A Activity ===
  if (sectorMnA.length > 0) {
    sections.push(`\n## SECTOR M&A ACTIVITY (${sectorMnA.length} deals in period)`);
    sectorMnA.forEach((m: any) => {
      sections.push(`- ${m.acquirer?.name || 'Unknown'} acquiring ${m.targetName}${m.price ? ` for ${formatCurrency(m.price)}` : ''} (${formatDate(m.date)})${m.dealType ? ` [${m.dealType}]` : ''} — ${m.status}`);
    });
  }

  // === Market Sizing Context ===
  if (marketSegment) {
    sections.push(`\n## MARKET SIZING (${marketSegment.name})`);
    sections.push(`- Current TAM (${marketSegment.tamYear}): $${marketSegment.currentTAM}B`);
    sections.push(`- Projected TAM (${marketSegment.projectedYear}): $${marketSegment.projectedTAM}B`);
    sections.push(`- CAGR: ${(marketSegment.cagr * 100).toFixed(1)}%`);
    sections.push(`- Government share: ${(marketSegment.governmentShare * 100).toFixed(0)}%`);
    sections.push(`- Key players: ${marketSegment.keyPlayers.join(', ')}`);
    sections.push(`- Trends: ${marketSegment.trends.join('; ')}`);
  }

  return sections.join('\n');
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Find the best-matching market segment for a company's sector.
 */
function findMarketSegment(sector: string | null | undefined) {
  if (!sector) return undefined;
  const sectorLower = sector.toLowerCase();

  // Map company sectors to market segment IDs
  const sectorMap: Record<string, string> = {
    launch: 'launch-services',
    satellite: 'satellite-services',
    'ground-segment': 'ground-systems',
    infrastructure: 'space-infrastructure',
    defense: 'national-security-space',
    analytics: 'earth-observation',
    manufacturing: 'space-manufacturing',
    agency: 'global-space-economy',
  };

  const segmentId = sectorMap[sectorLower];
  if (segmentId) {
    return MARKET_SEGMENTS.find((s) => s.id === segmentId);
  }

  // Fallback: try partial name matching
  return (
    MARKET_SEGMENTS.find((s) => s.id.includes(sectorLower) || s.name.toLowerCase().includes(sectorLower)) ||
    MARKET_SEGMENTS.find((s) => s.id === 'global-space-economy')
  );
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
    const { companySlug, periodDays = 90 } = body;

    if (!companySlug || typeof companySlug !== 'string') {
      return NextResponse.json(
        { error: 'companySlug is required and must be a string' },
        { status: 400 }
      );
    }

    if (typeof periodDays !== 'number' || periodDays < 1 || periodDays > 365) {
      return NextResponse.json(
        { error: 'periodDays must be a number between 1 and 365' },
        { status: 400 }
      );
    }

    // Calculate period boundaries
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Future window for upcoming regulations (next 90 days from now)
    const futureWindow = new Date();
    futureWindow.setDate(futureWindow.getDate() + 90);

    // 1. Fetch company with core relations
    const company = await prisma.companyProfile.findUnique({
      where: { slug: companySlug },
      include: {
        fundingRounds: { orderBy: { date: 'desc' } },
        products: { orderBy: { name: 'asc' } },
        keyPersonnel: { where: { isCurrent: true } },
        contracts: { take: 20, orderBy: { awardDate: 'desc' } },
        events: { take: 30, orderBy: { date: 'desc' } },
        competitorOf: {
          include: {
            competitor: {
              select: {
                name: true,
                slug: true,
                totalFunding: true,
                employeeCount: true,
                valuation: true,
                sector: true,
              },
            },
          },
        },
        scores: true,
        partnerships: { orderBy: { announcedDate: 'desc' } },
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: `Company not found: ${companySlug}` },
        { status: 404 }
      );
    }

    // 2. Run parallel data queries for the reporting period
    const [
      recentNews,
      upcomingRegulations,
      recentPolicyChanges,
      workforceTrends,
      sectorFunding,
      sectorContracts,
      sectorMnA,
    ] = await Promise.all([
      // News tagged to this company within the period
      prisma.newsArticle.findMany({
        where: {
          companyTags: { some: { id: company.id } },
          publishedAt: { gte: periodStart },
        },
        select: {
          title: true,
          source: true,
          publishedAt: true,
          category: true,
          summary: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      }),

      // Proposed regulations with deadlines in the next 90 days
      prisma.proposedRegulation.findMany({
        where: {
          OR: [
            { commentDeadline: { gte: new Date(), lte: futureWindow } },
            { effectiveDate: { gte: new Date(), lte: futureWindow } },
          ],
        },
        select: {
          title: true,
          summary: true,
          agency: true,
          type: true,
          category: true,
          impactSeverity: true,
          commentDeadline: true,
          effectiveDate: true,
          status: true,
        },
        orderBy: { commentDeadline: 'asc' },
        take: 15,
      }),

      // Policy changes published in the period
      prisma.policyChange.findMany({
        where: {
          publishedDate: { gte: periodStart, lte: periodEnd },
        },
        select: {
          title: true,
          summary: true,
          agency: true,
          impactSeverity: true,
          impactAnalysis: true,
          status: true,
          publishedDate: true,
          effectiveDate: true,
        },
        orderBy: { publishedDate: 'desc' },
        take: 15,
      }),

      // Workforce trends (latest 2 quarters)
      prisma.workforceTrend.findMany({
        orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
        take: 2,
      }),

      // Sector funding: all funding rounds for companies in the same sector during period
      company.sector
        ? prisma.fundingRound.findMany({
            where: {
              date: { gte: periodStart, lte: periodEnd },
              company: { sector: company.sector },
            },
            select: {
              amount: true,
              seriesLabel: true,
              roundType: true,
              date: true,
              leadInvestor: true,
              company: { select: { name: true, slug: true } },
            },
            orderBy: { date: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),

      // Sector contract awards during the period
      company.sector
        ? prisma.governmentContractAward.findMany({
            where: {
              awardDate: { gte: periodStart, lte: periodEnd },
              company: { sector: company.sector },
            },
            select: {
              companyName: true,
              title: true,
              contractNumber: true,
              agency: true,
              value: true,
              awardDate: true,
              type: true,
              numberOfOffers: true,
            },
            orderBy: { awardDate: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),

      // Sector M&A activity during the period
      company.sector
        ? prisma.mergerAcquisition.findMany({
            where: {
              date: { gte: periodStart, lte: periodEnd },
              acquirer: { sector: company.sector },
            },
            select: {
              targetName: true,
              price: true,
              date: true,
              dealType: true,
              status: true,
              rationale: true,
              acquirer: { select: { name: true, slug: true } },
            },
            orderBy: { date: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

    // 3. Find matching market segment for TAM data
    const marketSegment = findMarketSegment(company.sector);

    // 4. Build the comprehensive context string
    const contextString = buildBoardPrepContext(
      company,
      recentNews,
      upcomingRegulations,
      recentPolicyChanges,
      workforceTrends,
      sectorFunding,
      sectorContracts,
      sectorMnA,
      marketSegment,
      periodStart,
      periodEnd
    );

    // 5. Determine quarter label for the prompt
    const currentQuarter = Math.ceil((periodEnd.getMonth() + 1) / 3);
    const currentYear = periodEnd.getFullYear();

    const userPrompt = `Generate a Q${currentQuarter} ${currentYear} board briefing report for ${company.name}. The reporting period covers ${formatDate(periodStart)} to ${formatDate(periodEnd)} (${periodDays} days).

Here is all available data for this company and its market sector:

${contextString}

Generate the board briefing as the specified JSON structure. Each section should contain substantive, board-ready analysis with specific numbers and dates. The executive summary should highlight the 3-5 most critical items requiring board attention. Where data is limited, note the gaps and provide analysis based on available information and general space industry knowledge.`;

    // 6. Call Claude for synthesis
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // 7. Extract text content from response
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logger.error('No text content in Claude response for board prep generation');
      return NextResponse.json(
        { error: 'Failed to generate board briefing: no response content' },
        { status: 500 }
      );
    }

    // 8. Parse the JSON response
    let report;
    try {
      let jsonText = textBlock.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      report = JSON.parse(jsonText);
    } catch (parseError) {
      logger.error('Failed to parse Claude board prep response as JSON', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responsePreview: textBlock.text.substring(0, 200),
      });
      return NextResponse.json(
        { error: 'Failed to parse board briefing response' },
        { status: 500 }
      );
    }

    // Ensure period dates are in the response
    report.periodStart = periodStart.toISOString();
    report.periodEnd = periodEnd.toISOString();

    logger.info('Board prep report generated successfully', {
      companySlug,
      periodDays,
      sectionsCount: report.sections?.length || 0,
      userId: session.user.email,
    });

    return NextResponse.json({
      title: report.title,
      generatedAt: report.generatedAt,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      sections: report.sections,
      executiveSummary: report.executiveSummary,
    });
  } catch (error) {
    logger.error('Error generating board prep report', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error generating board briefing' },
      { status: 500 }
    );
  }
}
