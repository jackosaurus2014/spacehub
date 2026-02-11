import prisma from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';

interface GeneratedDigest {
  companyName: string;
  title: string;
  summary: string;
  content: string;
  highlights: string[];
}

interface ClaudeDigestResponse {
  digests: GeneratedDigest[];
}

export async function generateCompanyDigests(): Promise<{
  count: number;
  digests: { id: string; title: string; companyProfileId: string | null }[];
}> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  // Find companies with >= 2 news articles tagged in the last 7 days
  const companiesWithNews = await prisma.companyProfile.findMany({
    where: {
      newsArticles: {
        some: {
          publishedAt: { gte: sevenDaysAgo },
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sector: true,
      newsArticles: {
        where: { publishedAt: { gte: sevenDaysAgo } },
        orderBy: { publishedAt: 'desc' },
        take: 20,
        select: {
          title: true,
          summary: true,
          url: true,
          source: true,
          category: true,
          publishedAt: true,
        },
      },
    },
  });

  // Filter to companies with >= 2 recent articles
  const eligibleCompanies = companiesWithNews.filter((c) => c.newsArticles.length >= 2);

  if (eligibleCompanies.length === 0) {
    logger.info('No companies with sufficient news for digest generation');
    return { count: 0, digests: [] };
  }

  // Check existing digests for this period to avoid duplicates
  const existingDigests = await (prisma as any).companyDigest.findMany({
    where: {
      periodStart: { gte: sevenDaysAgo },
      companyProfileId: { in: eligibleCompanies.map((c) => c.id) },
    },
    select: { companyProfileId: true },
  });
  const alreadyGenerated = new Set(existingDigests.map((d: any) => d.companyProfileId));

  const newCompanies = eligibleCompanies.filter((c) => !alreadyGenerated.has(c.id));
  if (newCompanies.length === 0) {
    logger.info('All eligible companies already have digests for this period');
    return { count: 0, digests: [] };
  }

  const anthropic = new Anthropic();
  const allUpserted: { id: string; title: string; companyProfileId: string | null }[] = [];

  // Process in batches of 5 companies per Claude call
  for (let batchStart = 0; batchStart < newCompanies.length; batchStart += 5) {
    const batch = newCompanies.slice(batchStart, batchStart + 5);

    const companiesContext = batch
      .map((company) => {
        const articles = company.newsArticles
          .map(
            (a, i) =>
              `  ${i + 1}. ${a.title}\n     Source: ${a.source}\n     Date: ${new Date(a.publishedAt).toLocaleDateString()}\n     Summary: ${a.summary || 'N/A'}\n     URL: ${a.url}`
          )
          .join('\n');
        return `### ${company.name} (${company.sector || 'Space Industry'})\nRecent Articles (${company.newsArticles.length}):\n${articles}`;
      })
      .join('\n\n---\n\n');

    const prompt = `You are a space industry analyst writing weekly company news digests for SpaceNexus.

## Companies to Summarize
${companiesContext}

## Instructions
For each company above, write a weekly news digest:

1. **title**: "[Company Name] Weekly Digest — [Date Range]"
2. **summary**: 2-3 sentence overview of the week's key developments
3. **content**: 500-1000 word digest covering:
   - Key developments this week
   - What it means for the company
   - Market/competitive implications
   - What to watch next
4. **highlights**: Array of 3-5 bullet-point highlights (1 sentence each)
5. **companyName**: Exact company name as provided

Respond with valid JSON (no markdown code fences):
{
  "digests": [
    {
      "companyName": "...",
      "title": "...",
      "summary": "...",
      "content": "...",
      "highlights": ["...", "..."]
    }
  ]
}`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 12000,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') continue;

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed: ClaudeDigestResponse = JSON.parse(jsonMatch[0]);
      if (!parsed.digests || !Array.isArray(parsed.digests)) continue;

      for (const digest of parsed.digests) {
        const company = batch.find(
          (c) => c.name.toLowerCase() === digest.companyName.toLowerCase()
        );
        if (!company) continue;

        try {
          const result = await (prisma as any).companyDigest.upsert({
            where: {
              companyProfileId_periodStart_periodEnd: {
                companyProfileId: company.id,
                periodStart: sevenDaysAgo,
                periodEnd: now,
              },
            },
            create: {
              companyProfileId: company.id,
              sector: company.sector,
              title: digest.title,
              summary: digest.summary,
              content: digest.content,
              highlights: JSON.stringify(digest.highlights || []),
              periodStart: sevenDaysAgo,
              periodEnd: now,
              newsCount: company.newsArticles.length,
            },
            update: {
              title: digest.title,
              summary: digest.summary,
              content: digest.content,
              highlights: JSON.stringify(digest.highlights || []),
              newsCount: company.newsArticles.length,
            },
          });
          allUpserted.push({
            id: result.id,
            title: result.title,
            companyProfileId: result.companyProfileId,
          });
        } catch (dbError) {
          logger.error('Failed to upsert company digest', {
            company: company.name,
            error: dbError instanceof Error ? dbError.message : String(dbError),
          });
        }
      }
    } catch (batchError) {
      logger.error('Failed to generate digest batch', {
        batchStart,
        error: batchError instanceof Error ? batchError.message : String(batchError),
      });
    }
  }

  // Generate sector-level digests for sectors with >= 3 active companies
  const sectorCounts: Record<string, typeof eligibleCompanies> = {};
  for (const company of eligibleCompanies) {
    const sector = company.sector || 'General';
    if (!sectorCounts[sector]) sectorCounts[sector] = [];
    sectorCounts[sector].push(company);
  }

  for (const [sector, companies] of Object.entries(sectorCounts)) {
    if (companies.length < 3) continue;

    // Check if sector digest already exists
    const existingSector = await (prisma as any).companyDigest.findFirst({
      where: {
        sector,
        companyProfileId: null,
        periodStart: { gte: sevenDaysAgo },
      },
    });
    if (existingSector) continue;

    const sectorArticles = companies
      .flatMap((c) =>
        c.newsArticles.map((a) => ({
          ...a,
          companyName: c.name,
        }))
      )
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 30);

    const articlesContext = sectorArticles
      .map(
        (a, i) =>
          `${i + 1}. [${a.companyName}] ${a.title}\n   Source: ${a.source}\n   Summary: ${a.summary || 'N/A'}`
      )
      .join('\n');

    const sectorPrompt = `Write a weekly sector digest for the "${sector}" sector in the space industry.

## Companies Active This Week
${companies.map((c) => c.name).join(', ')}

## Recent Articles (${sectorArticles.length})
${articlesContext}

Write a 500-800 word digest covering key sector themes, competitive dynamics, and what to watch next.

Respond with JSON (no markdown code fences):
{
  "title": "${sector} Sector Weekly Digest",
  "summary": "2-3 sentence overview",
  "content": "Full digest...",
  "highlights": ["...", "..."]
}`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 6000,
        messages: [{ role: 'user', content: sectorPrompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') continue;

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);

      const result = await (prisma as any).companyDigest.create({
        data: {
          companyProfileId: null,
          sector,
          title: parsed.title || `${sector} Weekly Digest`,
          summary: parsed.summary || '',
          content: parsed.content || '',
          highlights: JSON.stringify(parsed.highlights || []),
          periodStart: sevenDaysAgo,
          periodEnd: now,
          newsCount: sectorArticles.length,
        },
      });
      allUpserted.push({
        id: result.id,
        title: result.title,
        companyProfileId: null,
      });
    } catch (sectorError) {
      logger.error('Failed to generate sector digest', {
        sector,
        error: sectorError instanceof Error ? sectorError.message : String(sectorError),
      });
    }
  }

  logger.info('Company digests generated successfully', { count: allUpserted.length });
  return { count: allUpserted.length, digests: allUpserted };
}
