import { EDITORIAL_MODEL } from '@/lib/ai-models';
import prisma from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { isRegulatoryRadarAvailable } from '@/lib/regulatory-radar';
import {
  EXPLAINER_DAILY_CAP,
  EXPLAINER_SLUG_PREFIX,
  buildExplainerPrompt,
  composeExplainerMarkdown,
  countExplainersGeneratedSince,
  explainerSlugForAction,
  isExplainerEligible,
  parseExplainerRaw,
  type ExplainerCandidate,
  type GeneratedExplainerSections,
} from '@/lib/radar-explainers';

/**
 * Radar rule explainer generator (Regulatory Wave B, item 3).
 *
 * For each significant RegulatoryAction (significant=true, or an
 * export-controls Rule/Proposed Rule from BIS/DDTC), auto-drafts a
 * plain-English explainer grounded STRICTLY on the stored FR metadata +
 * abstract, runs it through the same fact-check gate the AI dailies use
 * (pass / minor_issues → published; major_issues → held as pending_review,
 * surfacing in the daily editorial-review email backlog), and stores it as
 * an AIInsight with slug prefix 'regulatory-explainer-<document_number>'.
 *
 * This is a NEW radar-driven path alongside the legacy
 * src/lib/regulation-explainer-generator.ts (ProposedRegulation-sourced,
 * RegulationExplainer-stored, /regulation-explainers surface) — see that
 * file and the Wave B notes for why the two were not merged.
 *
 * Cadence: daily cron /api/cron/radar-explainers (see cron-scheduler.ts).
 * Cap: EXPLAINER_DAILY_CAP per UTC day, oldest-significant-first backlog
 * draining; skips are logged.
 */

export interface RadarExplainerRunResult {
  skipped: boolean;
  generated: number;
  published: number;
  held: number;
  errors: number;
  skips: string[];
}

interface FactCheckResult {
  overallVerdict: 'pass' | 'minor_issues' | 'major_issues';
  notes: string;
  corrections: string[];
}

/**
 * Fact-check gate — same pattern as the AI-dailies gate in
 * /api/ai-insights/generate: pass / minor_issues publish, major_issues hold.
 * For explainers the check is grounding-focused: the checker gets the SAME
 * source metadata the writer got and is told to flag any specific (CFR cite,
 * date, dollar amount, name) that does not appear in the source as a major
 * issue. Fails closed (major_issues → held) on any error.
 */
async function factCheckExplainer(
  anthropic: Anthropic,
  sourcePrompt: string,
  title: string,
  content: string
): Promise<FactCheckResult> {
  try {
    const response = await anthropic.messages.create({
      model: EDITORIAL_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a fact-checker for a space industry regulatory publication. An explainer article was drafted from a Federal Register document's metadata and abstract. Your job is to verify the explainer is STRICTLY GROUNDED in that source material.

## Source material given to the writer
${sourcePrompt}

## Drafted explainer title
${title}

## Drafted explainer content
${content}

## Instructions
Flag as a MAJOR issue any of the following:
1. A specific claim (CFR citation, docket number, date, penalty or dollar amount, license/program name, company name) that does NOT appear in the source material above
2. A misstatement of what the source material says (wrong agency, wrong document type, wrong dates)
3. Speculation presented as fact (invented compliance obligations, invented enforcement intent)

Do NOT flag:
- Plain-English rephrasing of the source text
- Space-industry framing of the stated scope (e.g. "satellite component exporters" for an EAR rule), as long as it doesn't claim the document names entities it doesn't
- Generic next-step advice (read the document, assess exposure, consider filing a comment)
- The deterministic Key dates / Source / disclaimer sections

Respond with valid JSON (no markdown code fences):
{
  "overallVerdict": "pass" | "minor_issues" | "major_issues",
  "notes": "Brief summary of findings (2-3 sentences max)",
  "corrections": ["List of specific corrections needed, if any"]
}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logger.warn('Explainer fact-check returned no text block — holding for review', { title });
      return { overallVerdict: 'major_issues', notes: 'Fact-check returned no response — requires manual review', corrections: [] };
    }
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('Explainer fact-check response could not be parsed — holding for review', { title });
      return { overallVerdict: 'major_issues', notes: 'Could not parse fact-check response — requires manual review', corrections: [] };
    }
    return JSON.parse(jsonMatch[0]) as FactCheckResult;
  } catch (error) {
    logger.warn('Explainer fact-check failed — holding for review', {
      title,
      error: error instanceof Error ? error.message : String(error),
    });
    return { overallVerdict: 'major_issues', notes: 'Fact-check service unavailable — requires manual review', corrections: [] };
  }
}

function parseGeneratedSections(text: string): GeneratedExplainerSections | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<GeneratedExplainerSections>;
    if (
      typeof parsed.title === 'string' && parsed.title.trim() &&
      typeof parsed.summary === 'string' && parsed.summary.trim() &&
      typeof parsed.whatChanged === 'string' && parsed.whatChanged.trim() &&
      typeof parsed.whoIsAffected === 'string' && parsed.whoIsAffected.trim() &&
      typeof parsed.whatToDo === 'string' && parsed.whatToDo.trim()
    ) {
      return parsed as GeneratedExplainerSections;
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Main entry — generate up to EXPLAINER_DAILY_CAP explainers for the
 * oldest un-explained eligible radar actions. Never throws.
 */
export async function generateRadarExplainers(now = new Date()): Promise<RadarExplainerRunResult> {
  const result: RadarExplainerRunResult = { skipped: false, generated: 0, published: 0, held: 0, errors: 0, skips: [] };

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      result.skipped = true;
      result.skips.push('ANTHROPIC_API_KEY not configured');
      logger.info('Radar explainers skipped — ANTHROPIC_API_KEY not set');
      return result;
    }
    if (!(await isRegulatoryRadarAvailable())) {
      result.skipped = true;
      result.skips.push('RegulatoryAction table unavailable');
      return result;
    }

    // Daily budget (cost control)
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const alreadyToday = await countExplainersGeneratedSince(todayStart);
    const budget = EXPLAINER_DAILY_CAP - alreadyToday;
    if (budget <= 0) {
      result.skipped = true;
      result.skips.push(`daily cap reached (${alreadyToday}/${EXPLAINER_DAILY_CAP})`);
      logger.info('Radar explainers skipped — daily cap reached', { alreadyToday, cap: EXPLAINER_DAILY_CAP });
      return result;
    }

    // Candidate pool: FR documents that are significant, or export-controls
    // Rule/Proposed Rule (BIS/DDTC filter applied by isExplainerEligible on
    // the agency/raw fields). Oldest first — backlog drains front-to-back.
    const rows = (await prisma.regulatoryAction.findMany({
      where: {
        source: 'federal-register',
        OR: [
          { significant: true },
          { category: 'export-controls', documentType: { in: ['Rule', 'Proposed Rule'] } },
        ],
      },
      orderBy: { actionDate: 'asc' },
      take: 100,
      select: {
        id: true, dedupKey: true, source: true, category: true, title: true,
        summary: true, actionDate: true, url: true, agency: true,
        documentType: true, actionText: true, commentUrl: true,
        commentCloseDate: true, significant: true, raw: true,
      },
    })) as ExplainerCandidate[];

    const eligible = rows.filter((row) => isExplainerEligible(row) && explainerSlugForAction(row.dedupKey));
    if (eligible.length === 0) {
      result.skips.push('no eligible actions');
      return result;
    }

    // Drop actions that already have an explainer
    const slugByDedupKey = new Map(eligible.map((row) => [row.dedupKey, explainerSlugForAction(row.dedupKey) as string]));
    const existing = await prisma.aIInsight.findMany({
      where: { slug: { in: Array.from(slugByDedupKey.values()) } },
      select: { slug: true },
    });
    const existingSlugs = new Set(existing.map((row) => row.slug));
    const backlog = eligible.filter((row) => !existingSlugs.has(slugByDedupKey.get(row.dedupKey) as string));
    if (backlog.length === 0) {
      result.skips.push('all eligible actions already have explainers');
      return result;
    }
    if (backlog.length > budget) {
      result.skips.push(`backlog ${backlog.length} > budget ${budget} — deferring ${backlog.length - budget} to later runs`);
    }

    const anthropic = new Anthropic();

    for (const action of backlog.slice(0, budget)) {
      const slug = slugByDedupKey.get(action.dedupKey) as string;
      try {
        const prompt = buildExplainerPrompt(action);
        const response = await anthropic.messages.create({
          model: EDITORIAL_MODEL,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        });
        const textBlock = response.content.find((block) => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          result.errors++;
          result.skips.push(`${slug}: generation returned no text`);
          continue;
        }
        const sections = parseGeneratedSections(textBlock.text);
        if (!sections) {
          result.errors++;
          result.skips.push(`${slug}: could not parse generated sections`);
          continue;
        }

        const content = composeExplainerMarkdown(sections, action);
        const title = sections.title.trim().slice(0, 160);

        // Fact-check gate (same pattern as AI dailies): pass/minor → publish,
        // major → hold for admin review.
        const factCheck = await factCheckExplainer(anthropic, prompt, title, content);
        let factCheckNote: string;
        if (factCheck.overallVerdict === 'major_issues') {
          factCheckNote = `MAJOR ISSUES: ${factCheck.notes}${factCheck.corrections.length > 0 ? `\nCorrections needed: ${factCheck.corrections.join('; ')}` : ''}`;
        } else if (factCheck.overallVerdict === 'minor_issues') {
          factCheckNote = `Minor notes: ${factCheck.notes}${factCheck.corrections.length > 0 ? `\nSuggestions: ${factCheck.corrections.join('; ')}` : ''}`;
        } else {
          factCheckNote = factCheck.notes || 'Passed fact-check';
        }
        const status = factCheck.overallVerdict === 'major_issues' ? 'pending_review' : 'published';

        const raw = parseExplainerRaw(action.raw);
        const sources: Array<{ title: string; url: string }> = [
          { title: `${action.title} (Federal Register${raw.citation ? `, ${raw.citation}` : ''})`, url: action.url },
          { title: 'SpaceNexus Regulatory Radar tracking data', url: `https://spacenexus.us/regulatory-radar/action/${action.id}` },
        ];

        await prisma.aIInsight.upsert({
          where: { slug },
          create: {
            title,
            slug,
            summary: sections.summary.trim(),
            content,
            category: 'regulatory',
            sources: JSON.stringify(sources),
            status,
            factCheckNote,
            reviewToken: crypto.randomUUID(),
            generatedAt: now,
          },
          update: {
            title,
            summary: sections.summary.trim(),
            content,
            sources: JSON.stringify(sources),
            status,
            factCheckNote,
            generatedAt: now,
          },
        });

        result.generated++;
        if (status === 'published') result.published++;
        else result.held++;
        logger.info('Radar explainer generated', { slug, status, verdict: factCheck.overallVerdict });
      } catch (error) {
        result.errors++;
        result.skips.push(`${slug}: ${error instanceof Error ? error.message : String(error)}`);
        logger.error('Radar explainer generation failed for action', {
          dedupKey: action.dedupKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (result.skips.length > 0) {
      logger.info('Radar explainer run finished with skips', { skips: result.skips });
    }
    return result;
  } catch (error) {
    result.errors++;
    result.skips.push(error instanceof Error ? error.message : String(error));
    logger.error('Radar explainer run failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  }
}
