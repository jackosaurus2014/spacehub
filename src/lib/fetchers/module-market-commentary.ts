/**
 * AI-generated market commentary for Space Insurance and Resource Exchange
 *
 * Runs weekly (or on-demand) to produce professional market commentary
 * based on recent news, blog posts, and module data. Uses the Anthropic
 * API (same pattern as AI Insights). Stores output in DynamicContent.
 */

import prisma from '@/lib/db';
import { upsertContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

interface MarketCommentary {
  title: string;
  summary: string;
  content: string;     // markdown
  keyTakeaways: string[];
  generatedAt: string;
  dataPoints: number;
}

/**
 * Generate AI market commentary for a specific module
 */
async function generateModuleCommentary(
  module: 'space-insurance' | 'resource-exchange',
): Promise<MarketCommentary | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn(`[Commentary] ANTHROPIC_API_KEY not set, skipping ${module} commentary`);
    return null;
  }

  try {
    // Gather recent context
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get module-specific data
    let moduleContext = '';
    let promptInstructions = '';

    if (module === 'space-insurance') {
      // Get recent insurance market data
      const marketData = await prisma.insuranceMarketData.findMany({
        orderBy: { year: 'desc' },
        take: 3,
      });

      const activePolicies = await prisma.insurancePolicy.findMany({
        where: { status: 'active' },
        take: 10,
        select: { missionName: true, insurer: true, insuredValue: true, premiumRate: true, missionType: true },
      });

      const recentClaims = await prisma.insurancePolicy.findMany({
        where: { claimFiled: true },
        orderBy: { yearWritten: 'desc' },
        take: 5,
        select: { missionName: true, claimAmount: true, claimPaid: true, claimReason: true, yearWritten: true },
      });

      moduleContext = `## Space Insurance Market Data (Most Recent Years)
${marketData.map((m) => `- ${m.year}: Premiums $${m.totalPremiums}M, Claims $${m.totalClaims}M, Loss Ratio ${m.lossRatio}%, Capacity $${m.marketCapacity}B, ${m.numberOfPolicies} policies`).join('\n')}

## Active Policies (Sample)
${activePolicies.map((p) => `- ${p.missionName || 'Unnamed'}: ${p.insurer}, $${p.insuredValue}M insured, ${p.premiumRate}% rate, ${p.missionType}`).join('\n')}

## Recent Claims
${recentClaims.map((c) => `- ${c.missionName}: Claim $${c.claimAmount}M, Paid $${c.claimPaid}M (${c.yearWritten}) — ${c.claimReason || 'N/A'}`).join('\n')}`;

      promptInstructions = `Write a professional weekly market commentary for the space insurance industry. Cover:
1. **Market Conditions**: Current premium rate trends, capacity outlook, loss ratio analysis
2. **Recent Claims & Events**: Impact of any recent launch failures or anomalies on the market
3. **Underwriting Trends**: How underwriters are adjusting to mega-constellation risk, reusable vehicles, and new entrants
4. **Regulatory Outlook**: Any pending regulations that could affect space insurance requirements
5. **Key Risks to Watch**: Emerging risks (debris, solar weather, cyber threats to satellites)

Tone: Professional, analytical — aimed at space industry executives and insurance professionals.`;

    } else {
      // Resource Exchange context
      const resources = await prisma.spaceResource.findMany({
        take: 20,
        orderBy: { earthPricePerKg: 'desc' },
        select: { name: true, category: true, earthPricePerKg: true, availability: true, priceSource: true },
      });

      const providers = await prisma.launchProvider.findMany({
        where: { status: 'operational' },
        select: { name: true, vehicle: true, costPerKgToLEO: true, reusable: true },
      });

      moduleContext = `## Top Space Resources by Price
${resources.map((r) => `- ${r.name} (${r.category}): $${r.earthPricePerKg.toLocaleString()}/kg — ${r.availability} — Source: ${r.priceSource || 'reference'}`).join('\n')}

## Active Launch Providers
${providers.map((p) => `- ${p.name} ${p.vehicle}: $${p.costPerKgToLEO.toLocaleString()}/kg to LEO ${p.reusable ? '(reusable)' : ''}`).join('\n')}`;

      promptInstructions = `Write a professional weekly market commentary for space industry resources and commodities. Cover:
1. **Launch Cost Trends**: How reusable vehicle economics are changing the cost-to-orbit equation
2. **Critical Material Pricing**: Trends in aerospace-grade materials (titanium, carbon fiber, radiation-hardened electronics)
3. **Propellant Markets**: LOX, LH2, methane, xenon pricing and availability
4. **ISRU Developments**: Any in-situ resource utilization breakthroughs (lunar water ice, asteroid mining)
5. **Supply Chain Risks**: Material shortages, geopolitical factors, supplier concentration risks

Tone: Professional, analytical — aimed at space procurement managers and mission planners.`;
    }

    // Get related news articles
    const newsArticles = await prisma.newsArticle.findMany({
      where: { publishedAt: { gte: sevenDaysAgo } },
      orderBy: { publishedAt: 'desc' },
      take: 30,
      select: { title: true, summary: true, source: true },
    });

    const blogPosts = await prisma.blogPost.findMany({
      where: { publishedAt: { gte: thirtyDaysAgo } },
      orderBy: { publishedAt: 'desc' },
      take: 15,
      select: { title: true, excerpt: true, source: { select: { name: true } } },
    });

    const newsContext = newsArticles
      .map((a, i) => `${i + 1}. ${a.title} (${a.source}): ${a.summary || 'N/A'}`)
      .join('\n');

    const blogContext = blogPosts
      .map((b, i) => `${i + 1}. ${b.title} (${b.source?.name || 'Unknown'}): ${b.excerpt || 'N/A'}`)
      .join('\n');

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic();

    const prompt = `You are a senior space industry analyst writing a weekly market commentary for SpaceNexus, a professional space industry intelligence platform.

${promptInstructions}

## Module Data
${moduleContext}

## Recent News Headlines (Last 7 Days)
${newsContext || 'No recent news available.'}

## Recent Industry Blog Posts (Last 30 Days)
${blogContext || 'No recent blog posts available.'}

## Output Format
Respond with valid JSON (no markdown code fences):
{
  "title": "Weekly ${module === 'space-insurance' ? 'Space Insurance' : 'Space Resource'} Market Commentary — Week of [date]",
  "summary": "2-3 sentence executive summary of the week's key developments.",
  "content": "Full commentary in markdown (800-1200 words). Use ## headers for sections.",
  "keyTakeaways": ["3-5 bullet points summarizing actionable takeaways"]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logger.error(`[Commentary] No text in AI response for ${module}`);
      return null;
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error(`[Commentary] No valid JSON in AI response for ${module}`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      title: parsed.title,
      summary: parsed.summary,
      content: parsed.content,
      keyTakeaways: parsed.keyTakeaways || [],
      generatedAt: new Date().toISOString(),
      dataPoints: newsArticles.length + blogPosts.length,
    };
  } catch (error) {
    logger.error(`[Commentary] Generation failed for ${module}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Generate and store insurance market commentary
 */
export async function generateInsuranceCommentary(): Promise<boolean> {
  const commentary = await generateModuleCommentary('space-insurance');
  if (!commentary) return false;

  await upsertContent(
    'space-insurance:market-commentary',
    'space-insurance',
    'market-commentary',
    commentary,
    {
      sourceType: 'ai-research',
      aiConfidence: 0.85,
      aiNotes: `Generated from ${commentary.dataPoints} recent articles + module data`,
    }
  );

  logger.info('[Commentary] Insurance market commentary generated', {
    title: commentary.title,
    dataPoints: commentary.dataPoints,
  });
  return true;
}

/**
 * Generate and store resource exchange market commentary
 */
export async function generateResourceCommentary(): Promise<boolean> {
  const commentary = await generateModuleCommentary('resource-exchange');
  if (!commentary) return false;

  await upsertContent(
    'resource-exchange:market-commentary',
    'resource-exchange',
    'market-commentary',
    commentary,
    {
      sourceType: 'ai-research',
      aiConfidence: 0.85,
      aiNotes: `Generated from ${commentary.dataPoints} recent articles + module data`,
    }
  );

  logger.info('[Commentary] Resource exchange market commentary generated', {
    title: commentary.title,
    dataPoints: commentary.dataPoints,
  });
  return true;
}
