import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Radar rule explainers (Regulatory Wave B, item 3) — shared helpers for the
 * plain-English explainer pipeline that turns significant RegulatoryAction
 * rows (Federal Register documents) into published AIInsight articles.
 *
 * This module is deliberately Anthropic-free: pure selection/slug/prompt/
 * composition helpers (unit-testable without mocks) plus small fail-soft DB
 * lookups used by pages. The AI-calling generator lives in
 * src/lib/radar-explainer-generator.ts.
 *
 * Storage convention: explainers are AIInsight rows with category
 * 'regulatory' and slug prefix 'regulatory-explainer-<document_number>' —
 * the prefix is what distinguishes an explainer from the weekly regulatory
 * brief ('regulatory-radar-week-of-...') in the /ai-insights hub.
 */

export const EXPLAINER_SLUG_PREFIX = 'regulatory-explainer-';

/** Max explainers generated per UTC day (cost control). */
export const EXPLAINER_DAILY_CAP = 2;

// ─── Candidate shape ─────────────────────────────────────────────────────────

export interface ExplainerCandidate {
  id: string;
  dedupKey: string;
  source: string;
  category: string;
  title: string;
  summary: string | null;
  actionDate: Date;
  url: string;
  agency: string | null;
  documentType: string | null;
  actionText: string | null;
  commentUrl: string | null;
  commentCloseDate: Date | null;
  significant: boolean;
  /** Raw FederalRegisterEntry JSON string (RegulatoryAction.raw). */
  raw: string | null;
}

/** Subset of the stored FR payload (FederalRegisterEntry, camelCase) we ground on. */
export interface ExplainerRawPayload {
  abstract?: string | null;
  citation?: string | null;
  docketIds?: string[];
  effectiveDate?: string | null;
  agencies?: string[];
  agencySlugs?: string[];
  pdfUrl?: string;
}

/** Parse RegulatoryAction.raw fail-soft (pure). */
export function parseExplainerRaw(raw: string | null): ExplainerRawPayload {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as ExplainerRawPayload;
  } catch {
    // fall through
  }
  return {};
}

// ─── Selection ───────────────────────────────────────────────────────────────

/**
 * Extract the FR document number from a radar dedupKey
 * ("federal-register:2026-12345" → "2026-12345"). Null for other sources.
 * Pure, exported for tests.
 */
export function documentNumberFromDedupKey(dedupKey: string): string | null {
  const match = /^federal-register:(.+)$/.exec(dedupKey);
  if (!match || !match[1]) return null;
  return match[1];
}

/**
 * Deterministic explainer slug for a radar action
 * ("federal-register:2026-12345" → "regulatory-explainer-2026-12345").
 * Null when the action is not a Federal Register document. Pure.
 */
export function explainerSlugForAction(dedupKey: string): string | null {
  const docNumber = documentNumberFromDedupKey(dedupKey);
  if (!docNumber) return null;
  const sanitized = docNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!sanitized) return null;
  return `${EXPLAINER_SLUG_PREFIX}${sanitized}`;
}

const EXPORT_CONTROL_AGENCY_NAME_PATTERN = /industry and security|state department|department of state/i;
const EXPORT_CONTROL_AGENCY_SLUGS = ['industry-and-security-bureau', 'state-department'];

/**
 * Whether a radar action qualifies for an explainer: any FR document flagged
 * significant, or an export-controls Rule / Proposed Rule from BIS or DDTC
 * (State). Pure, exported for tests.
 */
export function isExplainerEligible(
  action: Pick<ExplainerCandidate, 'source' | 'significant' | 'category' | 'documentType' | 'agency' | 'raw'>
): boolean {
  if (action.source !== 'federal-register') return false;
  if (action.significant) return true;
  if (action.category !== 'export-controls') return false;
  const docType = (action.documentType || '').toLowerCase();
  if (docType !== 'rule' && docType !== 'proposed rule') return false;
  if (EXPORT_CONTROL_AGENCY_NAME_PATTERN.test(action.agency || '')) return true;
  const slugs = parseExplainerRaw(action.raw).agencySlugs || [];
  return slugs.some((slug) => EXPORT_CONTROL_AGENCY_SLUGS.includes(slug));
}

// ─── Prompt (grounding-first) ────────────────────────────────────────────────

function fmtDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Build the generation prompt for one action. The prompt is grounded STRICTLY
 * on the stored document metadata + abstract — it embeds the source text and
 * an explicit forbids-invention block. Pure, exported for tests (the
 * prompt-grounding guard tests assert on this function's output).
 */
export function buildExplainerPrompt(action: ExplainerCandidate): string {
  const raw = parseExplainerRaw(action.raw);
  const sourceLines = [
    `Title: ${action.title}`,
    `Document type: ${action.documentType || 'Unknown'}`,
    `Agency: ${action.agency || 'Unknown'}`,
    `Publication date: ${fmtDateUTC(action.actionDate)}`,
    raw.citation ? `Federal Register citation: ${raw.citation}` : null,
    raw.docketIds && raw.docketIds.length > 0 ? `Docket ID(s): ${raw.docketIds.join(', ')}` : null,
    action.actionText ? `Action line: ${action.actionText}` : null,
    action.commentCloseDate ? `Public comments close: ${fmtDateUTC(action.commentCloseDate)}` : null,
    raw.effectiveDate ? `Effective date: ${raw.effectiveDate}` : null,
    `Source URL: ${action.url}`,
    '',
    `Abstract (the ONLY substantive source text available):`,
    raw.abstract || action.summary || '(No abstract provided by the Federal Register for this document.)',
  ].filter((line): line is string => line !== null);

  return `You are a space-industry regulatory analyst writing a plain-English explainer of a U.S. federal regulatory document for SpaceNexus, a space industry platform read by satellite operators, launch providers, component manufacturers, and space investors.

## Source document metadata (Federal Register)
${sourceLines.join('\n')}

## STRICT GROUNDING RULES — read carefully
- Base EVERY statement ONLY on the source metadata and abstract above. This is a hard requirement.
- Do NOT invent specifics that do not appear above: no CFR citations, no docket numbers, no dates, no penalty or dollar amounts, no license or program names, no company names.
- If the abstract does not say what specifically changed, say so plainly (e.g. "The published abstract does not detail the specific provisions") and describe only what IS stated.
- Do not speculate about compliance costs, legal outcomes, or enforcement intent.
- When explaining who is affected, you may frame the stated scope in space-industry terms (e.g. an EAR rule affects satellite component exporters), but do not claim the document names industries or companies it does not name.

## Task
Write a plain-English explainer with these sections:
1. "whatChanged" — 1-3 short paragraphs: what this document does, in plain English, from the source text only.
2. "whoIsAffected" — 1-2 short paragraphs: which kinds of space-industry organizations should pay attention, grounded in the stated scope.
3. "whatToDo" — 2-4 concrete, generic next steps (e.g. read the full document, assess exposure, file a comment before the close date if one is listed). Do not invent obligations.
4. "summary" — a 1-2 sentence executive summary.
5. "title" — a clear, specific headline (max 110 characters) naming the agency and the subject. No clickbait.

Respond with valid JSON only (no markdown code fences):
{
  "title": "...",
  "summary": "...",
  "whatChanged": "...",
  "whoIsAffected": "...",
  "whatToDo": "..."
}`;
}

// ─── Composition (deterministic assembly) ────────────────────────────────────

export interface GeneratedExplainerSections {
  title: string;
  summary: string;
  whatChanged: string;
  whoIsAffected: string;
  whatToDo: string;
}

export const EXPLAINER_DISCLAIMER =
  '*This explainer was generated from the official document’s published metadata and abstract. It is regulatory information for awareness and research purposes only — not legal advice. Consult counsel before acting.*';

/**
 * Assemble the final explainer markdown. Key dates and all links are composed
 * deterministically from the database row — never from AI output. Every
 * explainer carries the source link, a link back to its Regulatory Radar
 * detail page, and the not-legal-advice disclaimer. Pure, exported for tests.
 */
export function composeExplainerMarkdown(
  sections: GeneratedExplainerSections,
  action: ExplainerCandidate
): string {
  const raw = parseExplainerRaw(action.raw);
  const lines: string[] = [];

  lines.push(
    `*Plain-English explainer of a ${action.documentType || 'Federal Register document'} published ${fmtDateUTC(action.actionDate)} by ${action.agency || 'a federal agency'}.*`
  );
  lines.push('');
  lines.push('## What changed');
  lines.push('');
  lines.push(sections.whatChanged.trim());
  lines.push('');
  lines.push("## Who's affected");
  lines.push('');
  lines.push(sections.whoIsAffected.trim());
  lines.push('');
  lines.push('## Key dates');
  lines.push('');
  lines.push(`- **Published:** ${fmtDateUTC(action.actionDate)}`);
  if (action.commentCloseDate) {
    lines.push(`- **Public comments close:** ${fmtDateUTC(action.commentCloseDate)}`);
  }
  if (raw.effectiveDate) {
    lines.push(`- **Effective date:** ${raw.effectiveDate}`);
  }
  lines.push('');
  lines.push('## What to do about it');
  lines.push('');
  lines.push(sections.whatToDo.trim());
  if (action.commentCloseDate && action.commentUrl) {
    lines.push('');
    lines.push(`Comments can be submitted via [Regulations.gov](${action.commentUrl}).`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(
    `**Source:** [${action.title}](${action.url}) (Federal Register). Full tracking detail on the [SpaceNexus Regulatory Radar](/regulatory-radar/action/${action.id}).`
  );
  lines.push('');
  lines.push(EXPLAINER_DISCLAIMER);

  return lines.join('\n');
}

// ─── Fail-soft DB lookups (used by pages) ────────────────────────────────────

export interface ExplainerLink {
  slug: string;
  title: string;
}

/**
 * Published explainer for a radar action, matched by document number in the
 * dedupKey. Fails soft to null (missing table, non-FR action, no explainer,
 * pending review).
 */
export async function getExplainerForAction(dedupKey: string): Promise<ExplainerLink | null> {
  const slug = explainerSlugForAction(dedupKey);
  if (!slug) return null;
  try {
    const row = await prisma.aIInsight.findFirst({
      where: { slug, status: 'published' },
      select: { slug: true, title: true },
    });
    return row || null;
  } catch {
    return null;
  }
}

/**
 * Count explainers generated on/after `since` (daily-cap accounting). Fails
 * soft to the cap itself (i.e. "assume budget exhausted") so a DB error can
 * never cause over-generation.
 */
export async function countExplainersGeneratedSince(since: Date): Promise<number> {
  try {
    return await prisma.aIInsight.count({
      where: { slug: { startsWith: EXPLAINER_SLUG_PREFIX }, generatedAt: { gte: since } },
    });
  } catch (error) {
    logger.warn('countExplainersGeneratedSince failed — treating daily budget as exhausted', {
      error: error instanceof Error ? error.message : String(error),
    });
    return EXPLAINER_DAILY_CAP;
  }
}
