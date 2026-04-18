import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  forbiddenError,
  internalError,
  unauthorizedError,
  validationError,
  notFoundError,
} from '@/lib/errors';
import { validateBody, generateDebriefSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a senior space-mission analyst at SpaceNexus. You produce concise, factual post-launch debriefs grounded ONLY in the data the operator provides. If a field is unknown, leave it empty/null instead of guessing.

Return ONLY a single valid JSON object (no markdown fences, no commentary) with EXACTLY this shape:

{
  "executiveSummary": "2-3 paragraph synthesis of mission outcome, what worked, what failed, and immediate consequences",
  "timeline": [
    { "t": "T-0", "label": "Liftoff", "note": "optional 1-line context" }
  ],
  "keyTakeaways": [
    "concise bullet (1 sentence) — strategic, technical, or commercial implication"
  ],
  "costsEstimate": 12500000,
  "status": "success",
  "fullAnalysis": "Markdown long-form analysis. Use ## headings. Cover: Mission Profile, Vehicle & Payload, Execution Timeline, Anomalies & Recovery, Commercial Impact, Geopolitical / Regulatory Implications, What's Next.",
  "sources": [
    { "url": "https://example.com/...", "title": "Source title" }
  ]
}

Rules:
- "status" MUST be exactly one of: "success", "partial", "failure", "scrubbed"
- "costsEstimate" is in USD as a plain number, or null if unknown
- "timeline" should have 4-12 entries covering pre-launch, ascent, key milestones, and outcome
- "keyTakeaways" 3-7 bullets max
- "sources" should reference operator-provided sources only; do not fabricate URLs
- Keep "executiveSummary" under 1500 chars; "fullAnalysis" under 12000 chars
- Use ISO timestamps where possible inside notes
`;

interface SpaceEventLite {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  launchDate: Date | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  location: string | null;
  country: string | null;
  agency: string | null;
  rocket: string | null;
  mission: string | null;
  missionPhase: string | null;
  orbitType: string | null;
  crewCount: number | null;
  providerType: string | null;
  infoUrl: string | null;
  videoUrl: string | null;
}

interface NewsArticleLite {
  title: string;
  source: string | null;
  publishedAt: Date | null;
  category: string | null;
  url: string | null;
  summary: string | null;
}

interface CompanyLite {
  id: string;
  name: string;
  slug: string;
  sector: string | null;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return 'unknown';
  return new Date(d).toISOString();
}

function buildEventContext(
  event: SpaceEventLite,
  news: NewsArticleLite[],
  companies: CompanyLite[],
  additionalContext?: string
): string {
  const parts: string[] = [];
  parts.push('## Mission Event');
  parts.push(`Name: ${event.name}`);
  parts.push(`Type: ${event.type}`);
  parts.push(`Status: ${event.status}`);
  parts.push(`Launch date: ${formatDate(event.launchDate)}`);
  if (event.windowStart) parts.push(`Window start: ${formatDate(event.windowStart)}`);
  if (event.windowEnd) parts.push(`Window end: ${formatDate(event.windowEnd)}`);
  if (event.agency) parts.push(`Agency: ${event.agency}`);
  if (event.country) parts.push(`Country: ${event.country}`);
  if (event.rocket) parts.push(`Rocket: ${event.rocket}`);
  if (event.mission) parts.push(`Mission designation: ${event.mission}`);
  if (event.missionPhase) parts.push(`Mission phase: ${event.missionPhase}`);
  if (event.location) parts.push(`Launch site: ${event.location}`);
  if (event.orbitType) parts.push(`Target orbit: ${event.orbitType}`);
  if (event.crewCount !== null && event.crewCount !== undefined) {
    parts.push(`Crew count: ${event.crewCount}`);
  }
  if (event.providerType) parts.push(`Provider type: ${event.providerType}`);
  if (event.description) parts.push(`Description: ${event.description}`);
  if (event.infoUrl) parts.push(`Reference URL: ${event.infoUrl}`);
  if (event.videoUrl) parts.push(`Video URL: ${event.videoUrl}`);

  if (companies.length > 0) {
    parts.push('\n## Linked Companies');
    for (const c of companies) {
      parts.push(`- ${c.name} (slug: ${c.slug})${c.sector ? ` — sector: ${c.sector}` : ''}`);
    }
  }

  if (news.length > 0) {
    parts.push(`\n## Related News Coverage (last 30 days, ${news.length} articles)`);
    for (const n of news) {
      const datePart = n.publishedAt ? formatDate(n.publishedAt).slice(0, 10) : 'unknown';
      parts.push(
        `- [${datePart}] ${n.title}${n.source ? ` — ${n.source}` : ''}${n.url ? ` (${n.url})` : ''}`
      );
      if (n.summary) parts.push(`    summary: ${n.summary.slice(0, 240)}`);
    }
  }

  if (additionalContext && additionalContext.trim()) {
    parts.push('\n## Operator-Provided Context');
    parts.push(additionalContext.trim());
  }

  return parts.join('\n');
}

/**
 * POST /api/mission-debriefs/generate-ai
 *
 * Admin only. Generates a draft mission debrief using Claude. Does NOT persist
 * to the database — caller is expected to review the draft, edit it, and POST
 * to /api/mission-debriefs to save.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();
    if (!session.user.isAdmin) return forbiddenError('Admin access required');

    const body = await request.json().catch(() => ({}));
    const validation = validateBody(generateDebriefSchema, body);
    if (!validation.success) {
      return validationError('Invalid generate request', validation.errors);
    }
    const { eventId, additionalContext } = validation.data;

    const event = await prisma.spaceEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        status: true,
        launchDate: true,
        windowStart: true,
        windowEnd: true,
        location: true,
        country: true,
        agency: true,
        rocket: true,
        mission: true,
        missionPhase: true,
        orbitType: true,
        crewCount: true,
        providerType: true,
        infoUrl: true,
        videoUrl: true,
      },
    });
    if (!event) return notFoundError('SpaceEvent');

    // Fetch related news (last 30 days around the launch date when known)
    const referenceDate = event.launchDate || new Date();
    const newsWindowStart = new Date(referenceDate);
    newsWindowStart.setDate(newsWindowStart.getDate() - 30);
    const newsWindowEnd = new Date(referenceDate);
    newsWindowEnd.setDate(newsWindowEnd.getDate() + 7);

    const newsTokens: string[] = [event.name];
    if (event.rocket) newsTokens.push(event.rocket);
    if (event.mission) newsTokens.push(event.mission);
    const newsOr = newsTokens.map((t) => ({
      OR: [
        { title: { contains: t, mode: 'insensitive' as const } },
        { summary: { contains: t, mode: 'insensitive' as const } },
      ],
    }));

    let news: NewsArticleLite[] = [];
    try {
      news = await prisma.newsArticle.findMany({
        where: {
          publishedAt: { gte: newsWindowStart, lte: newsWindowEnd },
          OR: newsOr.flatMap((o) => o.OR),
        },
        select: {
          title: true,
          source: true,
          publishedAt: true,
          category: true,
          url: true,
          summary: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: 12,
      });
    } catch (newsErr) {
      logger.warn('Mission debrief AI: news lookup failed', {
        error: newsErr instanceof Error ? newsErr.message : String(newsErr),
      });
    }

    // Try to find related companies via news tags or by matching agency/rocket name
    let companies: CompanyLite[] = [];
    try {
      const matchTokens = [event.agency, event.rocket].filter(Boolean) as string[];
      const orFilters: Array<Record<string, unknown>> = [];
      for (const tok of matchTokens) {
        orFilters.push({ name: { contains: tok, mode: 'insensitive' } });
      }
      companies = orFilters.length
        ? await prisma.companyProfile.findMany({
            where: { OR: orFilters },
            select: { id: true, name: true, slug: true, sector: true },
            take: 6,
          })
        : [];
    } catch (companiesErr) {
      logger.warn('Mission debrief AI: company lookup failed', {
        error: companiesErr instanceof Error ? companiesErr.message : String(companiesErr),
      });
    }

    const context = buildEventContext(event, news, companies, additionalContext);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error('ANTHROPIC_API_KEY not configured for mission-debrief generation');
      return internalError('AI generation is not configured');
    }

    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a post-launch mission debrief for the following event using ONLY the data provided. Return JSON exactly as specified.\n\n${context}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logger.error('Mission debrief AI: no text content in Claude response');
      return internalError('AI returned no text content');
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let draft: Record<string, unknown>;
    try {
      draft = JSON.parse(jsonText);
    } catch (parseErr) {
      logger.error('Mission debrief AI: failed to parse JSON', {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        preview: jsonText.slice(0, 240),
      });
      return internalError('AI response was not valid JSON');
    }

    // Normalise + provide safe fallbacks so the admin form can hydrate
    const normalised = {
      executiveSummary: typeof draft.executiveSummary === 'string' ? draft.executiveSummary : '',
      timeline: Array.isArray(draft.timeline) ? draft.timeline : [],
      keyTakeaways: Array.isArray(draft.keyTakeaways) ? draft.keyTakeaways : [],
      costsEstimate:
        typeof draft.costsEstimate === 'number' && Number.isFinite(draft.costsEstimate)
          ? draft.costsEstimate
          : null,
      status: ['success', 'partial', 'failure', 'scrubbed'].includes(String(draft.status))
        ? String(draft.status)
        : event.status === 'completed'
          ? 'success'
          : 'partial',
      fullAnalysis: typeof draft.fullAnalysis === 'string' ? draft.fullAnalysis : '',
      sources: Array.isArray(draft.sources) ? draft.sources : [],
    };

    logger.info('Mission debrief AI draft generated', {
      eventId: event.id,
      missionName: event.name,
      timelineEntries: normalised.timeline.length,
      takeaways: normalised.keyTakeaways.length,
      userId: session.user.id,
    });

    return NextResponse.json({
      draft: normalised,
      missionName: event.name,
      missionDate: event.launchDate?.toISOString() ?? null,
      eventId: event.id,
      suggestedCompanyIds: companies.map((c) => c.id),
      generatedBy: 'claude',
    });
  } catch (error) {
    logger.error('Mission debrief AI generation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return internalError('Failed to generate mission debrief');
  }
}
