/**
 * Fact-check publication gate — the single source of truth for "does this
 * AI-written article publish, or is it held for a human?".
 *
 * Founder decision 2026-08-15: a `pass` or `minor_issues` verdict
 * auto-publishes; ONLY `major_issues` is held as `pending_review`.
 *
 * WHY THIS LIVES IN ONE PLACE
 * ---------------------------
 * The gate used to be duplicated inline in every generator (the daily
 * AI-insights route and the Regulatory Radar explainer generator each had
 * their own copy of the branch). Duplicated gates drift: a 2026-08-20 audit
 * found every daily article since 08-16 sitting in `pending_review` while
 * carrying a *passing* fact-check note ("Minor notes: …", or an unprefixed
 * pass summary) — a (status, note) pair that the post-08-15 code cannot
 * produce, because both are derived from the same verdict in the same
 * synchronous block. It is exactly what the PRE-08-15 code produced, where
 * the note branches were byte-identical but the status was a hardcoded
 * `'pending_review'`. In other words: a stale copy of the generator was
 * still executing in production after the fix shipped.
 *
 * Two protections follow from that:
 *   1. `resolveFactCheckGate()` returns status and note together, so they
 *      can never disagree. The invariant is asserted in unit tests:
 *      status === 'pending_review'  <=>  note starts with 'MAJOR ISSUES:'.
 *   2. `releaseMisheldInsights()` reconciles the table on every generation
 *      run, so a row written by ANY other writer (including a stale build)
 *      that violates the invariant is released automatically instead of
 *      silently starving the news feed for days.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export type FactCheckVerdict = 'pass' | 'minor_issues' | 'major_issues';

export interface FactCheckResult {
  overallVerdict: FactCheckVerdict;
  notes: string;
  corrections: string[];
}

export type InsightStatus = 'published' | 'pending_review';

export interface FactCheckGate {
  status: InsightStatus;
  note: string;
}

/**
 * The marker that makes a held article auditable. A `pending_review` row
 * whose note does NOT start with this prefix was not held by the gate.
 */
export const MAJOR_ISSUES_PREFIX = 'MAJOR ISSUES:';

function normalizeNotes(notes: unknown): string {
  return typeof notes === 'string' ? notes.trim() : '';
}

/**
 * Defensive: the fact-check model occasionally omits `corrections` entirely
 * (or returns a string instead of an array). The previous inline gate called
 * `factCheck.corrections.join('; ')` unguarded, which threw a TypeError out
 * of the per-insight loop and aborted the WHOLE generation run — every
 * article after the offending one was silently lost for the day.
 */
function normalizeCorrections(corrections: unknown): string[] {
  if (Array.isArray(corrections)) {
    return corrections.map((c) => String(c).trim()).filter((c) => c.length > 0);
  }
  if (typeof corrections === 'string' && corrections.trim().length > 0) {
    return [corrections.trim()];
  }
  return [];
}

/**
 * Resolve a fact-check verdict into the publication status AND the stored
 * note, together, from one evaluation of the verdict.
 *
 * Unknown / missing verdicts are treated as a pass: the fact-check plumbing
 * fails closed *upstream* by returning an explicit `major_issues` verdict
 * (see the generators), so an unrecognized string here means the checker
 * answered with something other than the three enum values while still
 * producing prose — not a plumbing failure.
 */
export function resolveFactCheckGate(factCheck: Partial<FactCheckResult> | null | undefined): FactCheckGate {
  const notes = normalizeNotes(factCheck?.notes);
  const corrections = normalizeCorrections(factCheck?.corrections);

  if (factCheck?.overallVerdict === 'major_issues') {
    const detail = notes || 'Fact-check flagged major issues';
    const suffix = corrections.length > 0 ? `\nCorrections needed: ${corrections.join('; ')}` : '';
    return { status: 'pending_review', note: `${MAJOR_ISSUES_PREFIX} ${detail}${suffix}` };
  }

  if (factCheck?.overallVerdict === 'minor_issues') {
    const detail = notes || 'Minor issues noted without detail';
    const suffix = corrections.length > 0 ? `\nSuggestions: ${corrections.join('; ')}` : '';
    return { status: 'published', note: `Minor notes: ${detail}${suffix}` };
  }

  return { status: 'published', note: notes || 'Passed fact-check' };
}

/**
 * Is this stored row held without a major-issues justification? Such a row
 * is a bug artifact, not an editorial decision — an admin who genuinely
 * wants an article off the site uses the reject flow, which sets
 * `status: 'rejected'`, never `pending_review`.
 *
 * A NULL note is deliberately NOT considered misheld: we cannot prove the
 * gate passed it, and the system's stated posture is fail-closed.
 */
export function isMisheld(status: string, factCheckNote: string | null | undefined): boolean {
  if (status !== 'pending_review') return false;
  if (typeof factCheckNote !== 'string' || factCheckNote.length === 0) return false;
  return !factCheckNote.startsWith(MAJOR_ISSUES_PREFIX);
}

/** Prisma `where` clause matching exactly the rows `isMisheld` accepts. */
export const MISHELD_WHERE = {
  status: 'pending_review',
  factCheckNote: { not: null },
  NOT: { factCheckNote: { startsWith: MAJOR_ISSUES_PREFIX } },
} as const;

export interface ReleaseResult {
  released: number;
  slugs: string[];
}

/**
 * Self-heal: publish any `pending_review` row whose fact-check note shows it
 * passed. Runs on every generation invocation (cheap, indexed, normally a
 * no-op) so a bad write by any writer clears within one cron tick instead of
 * sitting on the shelf until a human notices.
 */
export async function releaseMisheldInsights(): Promise<ReleaseResult> {
  try {
    // `status`/`factCheckNote` are cast-through fields on the Prisma client.
    const misheld = await (prisma.aIInsight as any).findMany({
      where: MISHELD_WHERE,
      select: { id: true, slug: true, factCheckNote: true },
    });

    if (!misheld || misheld.length === 0) return { released: 0, slugs: [] };

    const ids = misheld.map((row: { id: string }) => row.id);
    const slugs = misheld.map((row: { slug: string }) => row.slug);

    // Review tokens are intentionally preserved: auto-published articles keep
    // their admin edit/unpublish links (see the generate route's comment).
    const result = await (prisma.aIInsight as any).updateMany({
      where: { id: { in: ids } },
      data: { status: 'published' },
    });

    logger.warn('Released mis-held AI insights (passed fact-check but were stored as pending_review)', {
      released: result.count,
      slugs,
    });

    return { released: result.count, slugs };
  } catch (error) {
    // Never let reconciliation break a generation run.
    logger.error('Failed to reconcile mis-held AI insights', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { released: 0, slugs: [] };
  }
}
