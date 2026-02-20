import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';
import { MARKET_SEGMENTS } from '@/lib/market-sizing-data';
import { assessRisk, SECTOR_RISK_PROFILES } from '@/lib/regulatory/risk-scoring';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companySlug } = body;

    if (!companySlug || typeof companySlug !== 'string') {
      return NextResponse.json({ error: 'companySlug is required' }, { status: 400 });
    }

    // Gather all platform data about the company
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma.companyProfile as any;
    const company = await db.findUnique({
      where: { slug: companySlug },
      include: {
        fundingRounds: { orderBy: { date: 'desc' } },
        contracts: { orderBy: { awardDate: 'desc' }, take: 10 },
        products: true,
        keyPersonnel: true,
        acquisitions: true,
        competitorOf: {
          include: {
            competitor: {
              select: { name: true, slug: true, sector: true, tier: true },
            },
          },
        },
        scores: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get market data for company's sector
    const sectorLower = (company.sector || '').toLowerCase();
    const sectorSegments = MARKET_SEGMENTS.filter(
      (s) =>
        s.id.includes(sectorLower) ||
        s.name.toLowerCase().includes(sectorLower)
    );

    // Get regulatory risk assessment
    const riskProfile = {
      sector: company.sector || 'satellite',
      activitiesFlags:
        SECTOR_RISK_PROFILES[company.sector || 'satellite'] || [],
    };
    const riskAssessment = assessRisk(riskProfile);

    // Build context for Claude
    const fundingHistory = (company.fundingRounds || [])
      .map(
        (r: {
          seriesLabel?: string;
          roundType?: string;
          amount?: number | null;
          date: Date;
          leadInvestor?: string | null;
        }) =>
          `${r.seriesLabel || r.roundType || 'Unknown'}: $${r.amount ? (r.amount / 1e6).toFixed(1) + 'M' : 'undisclosed'} (${new Date(r.date).toISOString().split('T')[0]})${r.leadInvestor ? ` led by ${r.leadInvestor}` : ''}`
      )
      .join('\n');

    const competitorList =
      (company.competitorOf || [])
        .map(
          (c: {
            competitor: {
              name: string;
              tier: number;
              sector: string | null;
            };
          }) =>
            `${c.competitor.name} (Tier ${c.competitor.tier}, ${c.competitor.sector})`
        )
        .join(', ') || 'Not mapped';

    const contracts = (company.contracts || [])
      .map(
        (c: {
          agency: string;
          title: string;
          value?: number | null;
        }) =>
          `${c.agency}: ${c.title} ($${c.value ? (c.value / 1e6).toFixed(1) + 'M' : 'undisclosed'})`
      )
      .join('\n') || 'None tracked';

    const personnel = (company.keyPersonnel || [])
      .map(
        (p: { name: string; title: string; bio?: string | null }) =>
          `${p.name} - ${p.title}${p.bio ? `: ${p.bio}` : ''}`
      )
      .join('\n') || 'Not available';

    const marketContext =
      sectorSegments
        .map(
          (s) =>
            `${s.name}: $${s.currentTAM}B TAM (${(s.cagr * 100).toFixed(1)}% CAGR, projected $${s.projectedTAM}B by ${s.projectedYear})`
        )
        .join('\n') || 'Sector data not available';

    // Call Claude
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      system: `You are a senior space industry investment analyst at a top-tier venture capital firm. You produce rigorous, data-driven investment theses. Be specific with numbers and cite the data provided. Be balanced — present both bull and bear cases honestly. Format your analysis as clean JSON.`,
      messages: [
        {
          role: 'user',
          content: `Generate a comprehensive investment thesis for the following space company. Use ONLY the data provided — do not fabricate information.

## Company Profile
- **Name**: ${company.name}
- **Sector**: ${company.sector || 'Unknown'}
- **Subsector**: ${company.subsector || 'Unknown'}
- **Founded**: ${company.foundedYear || 'Unknown'}
- **Employees**: ${company.employeeRange || company.employeeCount || 'Unknown'}
- **Headquarters**: ${company.headquarters || 'Unknown'}
- **Status**: ${company.status}
- **Ownership**: ${company.ownershipType || 'Unknown'}
- **Description**: ${company.description || 'Not available'}
- **Total Funding**: $${company.totalFunding ? (company.totalFunding / 1e6).toFixed(1) + 'M' : 'Unknown'}
- **Last Valuation**: $${company.valuation ? (company.valuation / 1e6).toFixed(1) + 'M' : 'Unknown'}
- **Revenue Estimate**: $${company.revenueEstimate ? (company.revenueEstimate / 1e6).toFixed(1) + 'M' : 'Unknown'}
- **Market Cap**: $${company.marketCap ? (company.marketCap / 1e6).toFixed(1) + 'M' : 'N/A (private)'}

## Funding History
${fundingHistory || 'No funding rounds tracked'}

## Key Personnel
${personnel}

## Government Contracts
${contracts}

## Competitors
${competitorList}

## Market Context
${marketContext}

## Regulatory Risk Assessment
- Overall Risk Score: ${riskAssessment.overallScore}/100 (${riskAssessment.riskLevel})
- Estimated Licensing Timeline: ${riskAssessment.estimatedTimeline}
- Required Licenses: ${riskAssessment.requiredLicenses.join(', ') || 'Minimal'}

## Products
${(company.products || []).map((p: { name: string; description?: string | null }) => `- ${p.name}: ${p.description || ''}`).join('\n') || 'Not tracked'}

Respond with valid JSON (no markdown fences) in this exact format:
{
  "executiveSummary": "1-2 paragraph summary of the investment opportunity",
  "recommendation": "invest" | "monitor" | "pass",
  "confidenceLevel": "high" | "medium" | "low",
  "marketOpportunity": {
    "tam": "Total addressable market description with numbers",
    "growth": "Growth drivers and projections",
    "timing": "Why now — what makes this the right time"
  },
  "companyStrengths": ["strength 1", "strength 2", "strength 3"],
  "companyWeaknesses": ["weakness 1", "weakness 2"],
  "competitivePosition": "Analysis of competitive moat and differentiation",
  "financialAnalysis": {
    "fundingEfficiency": "How well has capital been deployed",
    "revenueTrajectory": "Revenue growth assessment",
    "pathToProfitability": "When and how the company reaches profitability"
  },
  "bullCase": "Best case scenario with specific milestones and valuations",
  "bearCase": "Worst case scenario with specific risks and failure modes",
  "keyRisks": [
    { "risk": "risk description", "severity": "high" | "medium" | "low", "mitigation": "how it could be mitigated" }
  ],
  "keyMilestones": ["milestone 1 to watch", "milestone 2", "milestone 3"],
  "comparableTransactions": "Similar companies/deals and what they imply for valuation",
  "regulatoryOutlook": "Based on the risk assessment, what regulatory factors matter most"
}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response format' },
        { status: 500 }
      );
    }

    let thesis;
    try {
      thesis = JSON.parse(content.text);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        thesis = JSON.parse(jsonMatch[0]);
      } else {
        logger.error('Failed to parse thesis JSON', {
          response: content.text.slice(0, 500),
        });
        return NextResponse.json(
          { error: 'Failed to parse thesis' },
          { status: 500 }
        );
      }
    }

    logger.info('Investment thesis generated', {
      company: company.slug,
      recommendation: thesis.recommendation,
    });

    return NextResponse.json({
      company: {
        name: company.name,
        slug: company.slug,
        sector: company.sector,
        tier: company.tier,
        logoUrl: company.logoUrl,
      },
      thesis,
      generatedAt: new Date().toISOString(),
      riskAssessment: {
        overallScore: riskAssessment.overallScore,
        riskLevel: riskAssessment.riskLevel,
        estimatedTimeline: riskAssessment.estimatedTimeline,
      },
    });
  } catch (error) {
    logger.error('Investment thesis generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to generate thesis' },
      { status: 500 }
    );
  }
}
