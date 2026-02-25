import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { question, companySlug } = await request.json();

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question required' }, { status: 400 });
    }

    if (question.length > 500) {
      return NextResponse.json({ error: 'Question too long (max 500 characters)' }, { status: 400 });
    }

    // Fetch company data if specific company mentioned
    let companyContext = '';
    if (companySlug && typeof companySlug === 'string') {
      const company = await prisma.companyProfile.findUnique({
        where: { slug: companySlug },
        include: {
          events: { take: 5, orderBy: { date: 'desc' } },
          satelliteAssets: { take: 10 },
          scores: { take: 1, orderBy: { calculatedAt: 'desc' } },
        },
      });

      if (company) {
        companyContext = `
Company: ${company.name}
Sector: ${company.sector || 'N/A'}
Founded: ${company.foundedYear || 'N/A'}
HQ: ${company.headquarters || 'N/A'}, ${company.country || 'N/A'}
Employees: ${company.employeeCount || 'N/A'}
Description: ${company.description || 'N/A'}
Valuation: ${company.valuation ? '$' + (company.valuation / 1e9).toFixed(1) + 'B' : 'N/A'}
Total Funding: ${company.totalFunding ? '$' + (company.totalFunding / 1e6).toFixed(0) + 'M' : 'N/A'}
Revenue Estimate: ${company.revenueEstimate ? '$' + (company.revenueEstimate / 1e6).toFixed(0) + 'M' : 'N/A'}
Public: ${company.isPublic ? 'Yes' : 'No'}
Tags: ${(company.tags as string[] || []).join(', ')}
Satellites: ${company.satelliteAssets?.length || 0} tracked assets
Recent Events: ${company.events?.map((e: any) => `${e.type}: ${e.title}`).join('; ') || 'None'}
`;
      }
    }

    // Also search for companies matching the question
    const searchTerms = question
      .split(' ')
      .filter((w: string) => w.length > 3)
      .slice(0, 3);

    const relatedCompanies = searchTerms.length > 0
      ? await prisma.companyProfile.findMany({
          where: {
            OR: searchTerms.map((term: string) => ({
              OR: [
                { name: { contains: term, mode: 'insensitive' as const } },
                { sector: { contains: term, mode: 'insensitive' as const } },
              ],
            })),
          },
          select: { name: true, slug: true, sector: true, country: true },
          take: 5,
        })
      : [];

    // Generate response using template-based approach (no external AI API needed)
    const answer = generateResearchAnswer(question, companyContext, relatedCompanies);

    logger.info('Company research query', {
      questionLength: question.length,
      hasCompanySlug: !!companySlug,
      hasCompanyContext: !!companyContext,
      relatedCompaniesFound: relatedCompanies.length,
    });

    return NextResponse.json({
      answer,
      relatedCompanies: relatedCompanies.map(c => ({
        name: c.name,
        slug: c.slug,
        sector: c.sector,
      })),
      confidence: companyContext ? 'high' : relatedCompanies.length > 0 ? 'medium' : 'low',
      source: companyContext ? 'database' : 'general-knowledge',
    });
  } catch (error) {
    logger.error('Company research error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Research failed' }, { status: 500 });
  }
}

function generateResearchAnswer(
  question: string,
  companyContext: string,
  relatedCompanies: Array<{ name: string; slug: string; sector: string | null; country: string | null }>
): string {
  const q = question.toLowerCase();

  if (companyContext) {
    // We have specific company data
    if (q.includes('funding') || q.includes('raised') || q.includes('investment') || q.includes('valuation')) {
      const relevantLines = companyContext
        .split('\n')
        .filter(l =>
          l.includes('Funding') ||
          l.includes('Valuation') ||
          l.includes('Revenue') ||
          l.includes('Company:') ||
          l.includes('Public:')
        )
        .join('\n');
      return `Based on our database:\n\n${relevantLines}\n\nFor detailed funding history and investor information, visit the company's profile page. You can also compare funding metrics with competitors using our Company Comparison tool at /compare/companies.`;
    }
    if (q.includes('compete') || q.includes('competitor') || q.includes('rival') || q.includes('vs') || q.includes('versus')) {
      const companyName = companyContext.split('\n').find(l => l.startsWith('Company:'))?.replace('Company: ', '') || '';
      const competitors = relatedCompanies.filter(c => c.name !== companyName);
      if (competitors.length > 0) {
        return `Based on sector analysis, companies operating in similar markets to ${companyName} include:\n\n${competitors.map(c => `- **${c.name}** (${c.sector || 'Space Industry'}) [View Profile](/company-profiles/${c.slug})`).join('\n')}\n\nUse our Company Comparison tool at /compare/companies for a detailed side-by-side analysis including financials, capabilities, and market position.`;
      }
      return `For competitor analysis of ${companyName}, visit the full company profile which includes competitive landscape data. You can also use our Company Comparison tool at /compare/companies for side-by-side analysis.`;
    }
    if (q.includes('satellite') || q.includes('asset') || q.includes('constellation')) {
      const satLine = companyContext.split('\n').find(l => l.includes('Satellites'));
      return `Based on our tracking data:\n\n${satLine || 'Satellite data not available'}\n\nFor a full list of tracked satellite assets, orbital parameters, and constellation details, visit the company profile page and check the Assets tab. You can also explore our Satellite Tracker at /satellites for real-time tracking.`;
    }
    if (q.includes('employee') || q.includes('team') || q.includes('headcount') || q.includes('staff') || q.includes('workforce')) {
      const relevantLines = companyContext
        .split('\n')
        .filter(l => l.includes('Employee') || l.includes('Company:') || l.includes('HQ:'))
        .join('\n');
      return `Based on our database:\n\n${relevantLines}\n\nFor leadership details and organizational information, visit the company profile page. Our Space Talent Hub at /space-talent also tracks workforce trends across the industry.`;
    }
    // Default: return full profile summary
    return `Here is what we know:\n\n${companyContext}\nFor the full profile with financial details, satellite assets, facility locations, and recent news, visit the company profile page. You can also use our Market Intelligence module at /market-intel for deeper analysis.`;
  }

  // General question without specific company context
  if (q.includes('compare') || q.includes('comparison') || q.includes('vs') || q.includes('versus')) {
    if (relatedCompanies.length > 0) {
      return `Here are companies that may be relevant to your comparison:\n\n${relatedCompanies.map(c => `- **${c.name}** -- ${c.sector || 'Space Industry'} [View Profile](/company-profiles/${c.slug})`).join('\n')}\n\nUse our Company Comparison tool at /compare/companies for detailed side-by-side analysis including financials, capabilities, and market position.`;
    }
    return `Try our Company Comparison tool at /compare/companies for detailed side-by-side analysis. You can compare companies on financials, market position, capabilities, and more.\n\nSearch our company directory at /company-profiles to find the companies you want to compare.`;
  }

  if (q.includes('sector') || q.includes('industry') || q.includes('market') || q.includes('segment')) {
    if (relatedCompanies.length > 0) {
      return `Companies matching your query:\n\n${relatedCompanies.map(c => `- **${c.name}** -- ${c.sector || 'Space Industry'}, ${c.country || 'Global'} [View Profile](/company-profiles/${c.slug})`).join('\n')}\n\nExplore sector-level analysis at /market-intel and market sizing data at /market-sizing for comprehensive industry intelligence.`;
    }
    return `For sector and market analysis, explore these resources:\n\n- **Market Intelligence** at /market-intel for company and sector tracking\n- **Space Economy** at /space-economy for market size, investment, and budgets\n- **Market Sizing** at /market-sizing for interactive TAM analysis\n- **Company Directory** at /company-profiles to browse 100+ company profiles by sector\n\nTry narrowing your question with a specific sector like launch, satellite, defense, or analytics.`;
  }

  if (relatedCompanies.length > 0) {
    return `Based on your question, these companies may be relevant:\n\n${relatedCompanies.map(c => `- **${c.name}** -- ${c.sector || 'Space Industry'} [View Profile](/company-profiles/${c.slug})`).join('\n')}\n\nFor deeper analysis, try our Market Intelligence module at /market-intel or the Procurement Copilot at /marketplace/copilot.`;
  }

  return `I can help you research space industry companies. Try asking about:\n\n- A specific company (e.g., "Tell me about SpaceX")\n- Competitors (e.g., "Who competes with Rocket Lab?")\n- Funding (e.g., "How much has Axiom Space raised?")\n- Market segments (e.g., "Which companies do Earth observation?")\n- Comparisons (e.g., "Compare launch providers")\n\nOur database includes 100+ company profiles with financial data, satellite assets, and industry analysis. You can also browse the full directory at /company-profiles.`;
}
