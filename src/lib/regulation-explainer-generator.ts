import prisma from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';

interface GeneratedExplainer {
  title: string;
  summary: string;
  content: string;
  whatItMeans: string;
  whoItAffects: string;
  whatToDoNext: string;
  affectedCompanyTypes: string[];
  agency: string;
  category: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  sourceUrls: string[];
  regulationDocketNumber?: string;
}

interface ClaudeExplainerResponse {
  explainers: GeneratedExplainer[];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function generateRegulationExplainers(): Promise<{
  count: number;
  explainers: { id: string; title: string; slug: string }[];
}> {
  // Fetch open/comment period proposed regulations
  const regulations = await prisma.proposedRegulation.findMany({
    where: {
      status: { in: ['open', 'comment_period'] },
    },
    orderBy: { publishedDate: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      summary: true,
      agency: true,
      type: true,
      category: true,
      status: true,
      docketNumber: true,
      commentDeadline: true,
      sourceUrl: true,
      publishedDate: true,
    },
  });

  // Fetch recent legal updates (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const legalUpdates = await prisma.legalUpdate.findMany({
    where: {
      publishedAt: { gte: sevenDaysAgo },
    },
    orderBy: { publishedAt: 'desc' },
    take: 30,
    select: {
      title: true,
      excerpt: true,
      url: true,
      topics: true,
    },
  });

  if (regulations.length === 0 && legalUpdates.length === 0) {
    logger.warn('Regulation explainer generation skipped — no source content');
    return { count: 0, explainers: [] };
  }

  // Check which regulations already have explainers (by docket number or title slug)
  const existingSlugs = new Set<string>();
  const existingDockets = new Set<string>();

  const existing = await (prisma as any).regulationExplainer.findMany({
    select: { slug: true, regulationDocketNumber: true },
  });
  for (const e of existing) {
    existingSlugs.add(e.slug);
    if (e.regulationDocketNumber) existingDockets.add(e.regulationDocketNumber);
  }

  // Filter to new regulations
  const newRegulations = regulations.filter((r) => {
    const slug = generateSlug(r.title);
    if (existingSlugs.has(slug)) return false;
    if (r.docketNumber && existingDockets.has(r.docketNumber)) return false;
    return true;
  });

  if (newRegulations.length === 0 && legalUpdates.length === 0) {
    logger.info('All regulations already have explainers');
    return { count: 0, explainers: [] };
  }

  // Build context
  const regContext = (newRegulations.length > 0 ? newRegulations : regulations)
    .map(
      (r, i) =>
        `${i + 1}. ${r.title}\n   Agency: ${r.agency}\n   Type: ${r.type}\n   Category: ${r.category}\n   Status: ${r.status}\n   Docket: ${r.docketNumber || 'N/A'}\n   Comment Deadline: ${r.commentDeadline ? new Date(r.commentDeadline).toLocaleDateString() : 'N/A'}\n   Summary: ${r.summary || 'N/A'}\n   URL: ${r.sourceUrl || 'N/A'}`
    )
    .join('\n\n');

  const legalContext =
    legalUpdates.length > 0
      ? legalUpdates
          .map(
            (u, i) =>
              `${i + 1}. ${u.title}\n   Topics: ${u.topics}\n   Excerpt: ${u.excerpt || 'N/A'}\n   URL: ${u.url}`
          )
          .join('\n\n')
      : 'No recent legal updates.';

  const anthropic = new Anthropic();

  const prompt = `You are a space industry regulatory affairs expert. Your job is to translate complex regulations into clear, plain-English explainers that space companies can understand and act on.

## Proposed Regulations
${regContext}

## Recent Legal/Regulatory Updates
${legalContext}

## Instructions
Generate plain-English explainers for the most important regulations above (up to 5). For each:

1. **title**: Clear, descriptive title (e.g., "New FCC Rules for Satellite De-Orbiting")
2. **summary**: 2-3 sentence executive summary in plain English
3. **content**: Full explainer (800-1500 words) covering background, key provisions, timeline, and implications
4. **whatItMeans**: 2-3 paragraphs explaining what this regulation actually means in simple terms
5. **whoItAffects**: List the types of companies, operators, and stakeholders affected
6. **whatToDoNext**: Concrete action items (file comments, update compliance plans, etc.)
7. **affectedCompanyTypes**: Array of company types (e.g., ["satellite_operator", "launch_provider", "ground_station"])
8. **agency**: The issuing agency (e.g., "FCC", "FAA", "DOD", "NOAA", "FTC")
9. **category**: One of: "licensing", "spectrum", "export_control", "environmental", "safety", "commercial", "defense", "international"
10. **impactLevel**: "low", "medium", "high", or "critical"
11. **sourceUrls**: Array of source URLs
12. **regulationDocketNumber**: The docket number if available, null otherwise

Respond with valid JSON (no markdown code fences):
{
  "explainers": [
    {
      "title": "...",
      "summary": "...",
      "content": "...",
      "whatItMeans": "...",
      "whoItAffects": "...",
      "whatToDoNext": "...",
      "affectedCompanyTypes": ["..."],
      "agency": "...",
      "category": "...",
      "impactLevel": "medium",
      "sourceUrls": ["..."],
      "regulationDocketNumber": "..."
    }
  ]
}`;

  logger.info('Generating regulation explainers', {
    regulationCount: newRegulations.length || regulations.length,
    legalUpdateCount: legalUpdates.length,
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('AI response contained no text content');
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response — no JSON found');
  }

  const parsed: ClaudeExplainerResponse = JSON.parse(jsonMatch[0]);

  if (!parsed.explainers || !Array.isArray(parsed.explainers) || parsed.explainers.length === 0) {
    throw new Error('AI response contained no explainers');
  }

  const validCategories = new Set([
    'licensing', 'spectrum', 'export_control', 'environmental',
    'safety', 'commercial', 'defense', 'international',
  ]);
  const validImpactLevels = new Set(['low', 'medium', 'high', 'critical']);

  const upserted: { id: string; title: string; slug: string }[] = [];

  for (const explainer of parsed.explainers) {
    const slug = generateSlug(explainer.title);
    const category = validCategories.has(explainer.category) ? explainer.category : 'commercial';
    const impactLevel = validImpactLevels.has(explainer.impactLevel) ? explainer.impactLevel : 'medium';

    try {
      const result = await (prisma as any).regulationExplainer.upsert({
        where: { slug },
        create: {
          slug,
          title: explainer.title,
          summary: explainer.summary,
          content: explainer.content,
          whatItMeans: explainer.whatItMeans || null,
          whoItAffects: explainer.whoItAffects || null,
          whatToDoNext: explainer.whatToDoNext || null,
          affectedCompanyTypes: JSON.stringify(explainer.affectedCompanyTypes || []),
          agency: explainer.agency || 'Unknown',
          category,
          impactLevel,
          sourceUrls: JSON.stringify(explainer.sourceUrls || []),
          regulationDocketNumber: explainer.regulationDocketNumber || null,
        },
        update: {
          title: explainer.title,
          summary: explainer.summary,
          content: explainer.content,
          whatItMeans: explainer.whatItMeans || null,
          whoItAffects: explainer.whoItAffects || null,
          whatToDoNext: explainer.whatToDoNext || null,
          affectedCompanyTypes: JSON.stringify(explainer.affectedCompanyTypes || []),
          agency: explainer.agency || 'Unknown',
          category,
          impactLevel,
          sourceUrls: JSON.stringify(explainer.sourceUrls || []),
          regulationDocketNumber: explainer.regulationDocketNumber || null,
        },
      });
      upserted.push({ id: result.id, title: result.title, slug: result.slug });
    } catch (dbError) {
      logger.error('Failed to upsert regulation explainer', {
        slug,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }
  }

  logger.info('Regulation explainers generated successfully', { count: upserted.length });
  return { count: upserted.length, explainers: upserted };
}
