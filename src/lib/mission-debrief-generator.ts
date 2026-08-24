// ─── Mission Debrief generation — shared core ───────────────────────────────
// Extracted from /api/mission-debriefs/generate-ai (2026-08-24) so the daily
// cron can run the SAME generation pipeline unattended.
//
// Why: the original design was cron-creates-stub → admin clicks "Generate
// with AI" → admin reviews → admin publishes. Nobody ever operated it: after
// months of daily runs the table held 24 placeholder stubs, zero published
// rows, and the /mission-debriefs surface had never shown a single real
// debrief. The generation is now invoked by the cron itself, and drafts that
// pass a quality gate are auto-published; the admin page remains for
// unpublish and manual runs.

import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { EDITORIAL_MODEL } from '@/lib/ai-models';

export const DEBRIEF_SYSTEM_PROMPT = `You are a senior space-mission analyst at SpaceNexus. You produce concise, factual post-launch debriefs grounded ONLY in the data the operator provides. If a field is unknown, leave it empty/null instead of guessing.

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
- Ground every claim in the provided event data and news coverage; never invent outcomes.
- status must be one of: success, partial, failure, scrubbed — judged from the coverage, not assumed.
- Prefer fewer, well-sourced takeaways over padded lists.
- costsEstimate is a number in USD or null when the coverage gives no basis for one.`;

export interface DebriefEventLite {
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

export interface DebriefNewsLite {
  title: string;
  source: string | null;
  publishedAt: Date | null;
  category: string | null;
  url: string | null;
  summary: string | null;
}

export interface DebriefCompanyLite {
  id: string;
  name: string;
  slug: string;
  sector: string | null;
}

export interface NormalizedDebriefDraft {
  executiveSummary: string;
  timeline: unknown[];
  keyTakeaways: string[];
  costsEstimate: number | null;
  status: string;
  fullAnalysis: string;
  sources: unknown[];
}

export interface GeneratedDebrief {
  draft: NormalizedDebriefDraft;
  event: DebriefEventLite;
  suggestedCompanyIds: string[];
  newsCount: number;
}

const EVENT_SELECT = {
  id: true, name: true, description: true, type: true, status: true,
  launchDate: true, windowStart: true, windowEnd: true, location: true,
  country: true, agency: true, rocket: true, mission: true,
  missionPhase: true, orbitType: true, crewCount: true, providerType: true,
  infoUrl: true, videoUrl: true,
} as const;

function formatDate(d: Date | null | undefined): string {
  if (!d) return 'unknown';
  return new Date(d).toISOString();
}

export function buildEventContext(
  event: DebriefEventLite,
  news: DebriefNewsLite[],
  companies: DebriefCompanyLite[],
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

/** Normalize whatever the model returned into safe, typed fields. */
export function normalizeDebriefDraft(
  draft: Record<string, unknown>,
  eventStatus: string,
): NormalizedDebriefDraft {
  return {
    executiveSummary: typeof draft.executiveSummary === 'string' ? draft.executiveSummary : '',
    timeline: Array.isArray(draft.timeline) ? draft.timeline : [],
    keyTakeaways: Array.isArray(draft.keyTakeaways)
      ? draft.keyTakeaways.filter((k): k is string => typeof k === 'string')
      : [],
    costsEstimate:
      typeof draft.costsEstimate === 'number' && Number.isFinite(draft.costsEstimate)
        ? draft.costsEstimate
        : null,
    status: ['success', 'partial', 'failure', 'scrubbed'].includes(String(draft.status))
      ? String(draft.status)
      : eventStatus === 'completed'
        ? 'success'
        : 'partial',
    fullAnalysis: typeof draft.fullAnalysis === 'string' ? draft.fullAnalysis : '',
    sources: Array.isArray(draft.sources) ? draft.sources : [],
  };
}

/**
 * Auto-publish quality gate. A draft ships without human review only when it
 * has real substance: a genuine summary, a long-form analysis, and at least
 * two takeaways. The 24 stub rows this feature accumulated were 127-char
 * placeholders with zero takeaways — the gate exists so nothing of that shape
 * can ever be published mechanically.
 */
export function meetsPublishGate(draft: NormalizedDebriefDraft): boolean {
  return (
    draft.executiveSummary.length >= 300 &&
    draft.fullAnalysis.length >= 1200 &&
    draft.keyTakeaways.length >= 2
  );
}

/**
 * Generate a debrief draft for a SpaceEvent. Throws with a descriptive
 * message on any failure — callers decide whether that is a 500 (admin
 * route) or a logged skip (cron).
 */
export async function generateDebriefDraft(
  eventId: string,
  additionalContext?: string,
): Promise<GeneratedDebrief> {
  const event = await prisma.spaceEvent.findUnique({
    where: { id: eventId },
    select: EVENT_SELECT,
  });
  if (!event) throw new Error(`SpaceEvent ${eventId} not found`);

  // Related news, ±window around the launch date.
  const referenceDate = event.launchDate || new Date();
  const newsWindowStart = new Date(referenceDate);
  newsWindowStart.setDate(newsWindowStart.getDate() - 30);
  const newsWindowEnd = new Date(referenceDate);
  newsWindowEnd.setDate(newsWindowEnd.getDate() + 7);

  const newsTokens: string[] = [event.name];
  if (event.rocket) newsTokens.push(event.rocket);
  if (event.mission) newsTokens.push(event.mission);

  let news: DebriefNewsLite[] = [];
  try {
    news = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: newsWindowStart, lte: newsWindowEnd },
        OR: newsTokens.map((t) => ({ title: { contains: t, mode: 'insensitive' as const } })),
      },
      select: { title: true, source: true, publishedAt: true, category: true, url: true, summary: true },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });
  } catch (err) {
    logger.warn('Mission debrief generation: news lookup failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  let companies: DebriefCompanyLite[] = [];
  try {
    const matchTokens = [event.agency, event.rocket].filter(Boolean) as string[];
    companies = matchTokens.length
      ? await prisma.companyProfile.findMany({
          where: { OR: matchTokens.map((tok) => ({ name: { contains: tok, mode: 'insensitive' as const } })) },
          select: { id: true, name: true, slug: true, sector: true },
          take: 6,
        })
      : [];
  } catch (err) {
    logger.warn('Mission debrief generation: company lookup failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const context = buildEventContext(event, news, companies, additionalContext);
  const anthropic = new Anthropic();
  // max_tokens caps thinking AND text together on EDITORIAL_MODEL (Sonnet 5
  // runs adaptive thinking by default) — the module-refresher learned this
  // the hard way. Generous cap, reasoning bounded by effort instead.
  const response = await anthropic.messages.create({
    model: EDITORIAL_MODEL,
    max_tokens: 12000,
    output_config: { effort: 'medium' },
    system: DEBRIEF_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a post-launch mission debrief for the following event using ONLY the data provided. Return JSON exactly as specified.\n\n${context}`,
      },
    ],
  });

  if (response.stop_reason === 'max_tokens') {
    throw new Error('Debrief generation hit the token cap before finishing');
  }
  if (response.stop_reason === 'refusal') {
    throw new Error('Debrief generation was declined (stop_reason: refusal)');
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    const kinds = response.content.map((b) => b.type).join(', ') || 'none';
    throw new Error(`Debrief generation returned no text block (blocks: ${kinds})`);
  }

  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Debrief generation returned invalid JSON (stop_reason: ${response.stop_reason})`);
  }

  return {
    draft: normalizeDebriefDraft(parsed, event.status),
    event,
    suggestedCompanyIds: companies.map((c) => c.id),
    newsCount: news.length,
  };
}

export interface EnrichResult {
  debriefId: string;
  slug: string;
  enriched: boolean;
  published: boolean;
  reason?: string;
}

/**
 * Enrich one stub debrief with generated content and publish it when the
 * quality gate passes. Never throws — the cron runs this over a batch and a
 * single failure must not kill the run.
 */
export async function enrichAndMaybePublishDebrief(debriefId: string): Promise<EnrichResult> {
  const debrief = await prisma.missionDebrief.findUnique({
    where: { id: debriefId },
    select: { id: true, slug: true, eventId: true, publishedAt: true },
  });
  if (!debrief) return { debriefId, slug: '?', enriched: false, published: false, reason: 'debrief not found' };
  if (debrief.publishedAt) return { debriefId, slug: debrief.slug, enriched: false, published: true, reason: 'already published' };
  if (!debrief.eventId) return { debriefId, slug: debrief.slug, enriched: false, published: false, reason: 'no linked event' };

  try {
    const { draft, suggestedCompanyIds } = await generateDebriefDraft(debrief.eventId);
    const publish = meetsPublishGate(draft);
    await prisma.missionDebrief.update({
      where: { id: debrief.id },
      data: {
        executiveSummary: draft.executiveSummary,
        timeline: draft.timeline as object[],
        keyTakeaways: draft.keyTakeaways,
        costsEstimate: draft.costsEstimate,
        status: draft.status,
        fullAnalysis: draft.fullAnalysis,
        sources: draft.sources as object[],
        companyIds: suggestedCompanyIds,
        generatedBy: 'claude',
        publishedAt: publish ? new Date() : null,
      },
    });
    logger.info('Mission debrief enriched', { debriefId: debrief.id, slug: debrief.slug, published: publish });
    return {
      debriefId: debrief.id,
      slug: debrief.slug,
      enriched: true,
      published: publish,
      reason: publish ? undefined : 'quality gate not met — left as draft for admin review',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Mission debrief enrichment failed', { debriefId: debrief.id, error: message });
    return { debriefId: debrief.id, slug: debrief.slug, enriched: false, published: false, reason: message };
  }
}
