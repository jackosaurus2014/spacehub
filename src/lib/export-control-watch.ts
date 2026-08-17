import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { isRegulatoryRadarAvailable, type RadarEntry } from '@/lib/regulatory-radar';

/**
 * Export Control Watch — selects the rare, genuinely significant
 * export-control actions worth putting in front of every newsletter digest
 * subscriber. Founder directive: "Include in our daily email any significant
 * regulatory actions in the export control space that would impact space
 * companies. This shouldn't happen too often." — so the qualification bar
 * is deliberately high:
 *
 *   Federal Register (BIS / State-DDTC, category 'export-controls'):
 *     - final rules (type 'Rule') qualify
 *     - interim final rules qualify (action line)
 *     - anything flagged significant:true qualifies
 *     - proposed rules qualify ONLY when significant:true
 *     - plain notices NEVER qualify
 *   Congress (category 'export-controls'):
 *     - only passage-level actions: passed a chamber, cleared conference,
 *       presented to the President, signed into law / became public law
 *     - introductions, referrals, hearings NEVER qualify
 *
 * Dedupe: RegulatoryAction.digestIncludedAt is stamped once an action ships
 * in a digest, so the same action can never appear in two digests.
 */

export interface ExportControlWatchItem {
  id: string;
  title: string;
  /** One line describing what happened ("Final rule", "Passed the Senate", ...). */
  whatHappened: string;
  /** Templated why-it-matters line keyed on agency/source — no AI, no fabricated claims. */
  whyItMatters: string;
  /** e.g. "Comments close 2026-09-12" or "Effective upon publication" — may be null. */
  dateLine: string | null;
  url: string;
  agency: string | null;
}

// ─── Qualification (pure) ───────────────────────────────────────────────────

const EXPORT_CONTROL_AGENCY_PATTERN = /industry and security|state department|department of state|ddtc|defense trade/i;

const PASSAGE_LEVEL_PATTERNS: RegExp[] = [
  /passed\s+(the\s+)?(house|senate)/i,
  /passed\s+congress/i,
  /agreed to (in|by) (the )?(house|senate)/i,
  /cleared for the president/i,
  /presented to (the )?president/i,
  /signed by (the )?president/i,
  /became public law/i,
  /public law no/i,
  /conference report agreed to/i,
  /resolving differences/i,
];

const DISQUALIFYING_ACTION_PATTERNS: RegExp[] = [
  /\bintroduced\b/i,
  /\breferred to\b/i,
  /\bhearings? held\b/i,
  /\bmarkup\b/i,
  /\bsponsor/i,
];

/** True for passage-level congressional action text only. Pure, exported for tests. */
export function isPassageLevelAction(actionText: string | null | undefined): boolean {
  if (!actionText) return false;
  if (DISQUALIFYING_ACTION_PATTERNS.some((p) => p.test(actionText))) return false;
  return PASSAGE_LEVEL_PATTERNS.some((p) => p.test(actionText));
}

/**
 * The high bar for the digest's Export Control Watch. Pure, exported for
 * tests. Expects a RegulatoryAction-shaped entry.
 */
export function qualifiesForExportControlWatch(entry: Pick<
  RadarEntry,
  'source' | 'category' | 'agency' | 'documentType' | 'actionText' | 'significant'
>): boolean {
  if (entry.category !== 'export-controls') return false;

  if (entry.source === 'federal-register') {
    if (!entry.agency || !EXPORT_CONTROL_AGENCY_PATTERN.test(entry.agency)) return false;
    const docType = (entry.documentType || '').toLowerCase();
    const action = (entry.actionText || '').toLowerCase();
    if (docType === 'notice') return false; // plain notices never qualify, even flagged significant
    if (docType === 'rule') return true; // final rule
    if (action.includes('interim final rule')) return true;
    if (docType === 'proposed rule') return entry.significant === true;
    return entry.significant === true;
  }

  if (entry.source === 'congress') {
    return isPassageLevelAction(entry.actionText);
  }

  return false;
}

// ─── Templated copy (pure) ──────────────────────────────────────────────────

/** Why-it-matters template, keyed on agency/source. No AI, no fabricated impact claims. */
export function whyItMattersLine(entry: Pick<RadarEntry, 'source' | 'agency'>): string {
  if (entry.source === 'congress') {
    return 'Export-control legislation moving toward enactment can change licensing obligations for space hardware, software, and technical data.';
  }
  const agency = entry.agency || '';
  if (/industry and security/i.test(agency)) {
    return 'Changes to the EAR/Commerce Control List affect licensing for commercial satellites, components, and related technology (including 9x515 items).';
  }
  if (/state|ddtc|defense trade/i.test(agency)) {
    return 'Changes to the ITAR/U.S. Munitions List affect licensing for launch vehicles, defense spacecraft, and related technical data.';
  }
  return 'Export-control rule changes can alter licensing requirements for space companies selling or collaborating internationally.';
}

/** One-line "what happened" from the document/action metadata. */
export function whatHappenedLine(entry: Pick<RadarEntry, 'source' | 'documentType' | 'actionText'>): string {
  if (entry.source === 'congress') {
    return entry.actionText || 'Congressional action';
  }
  if (entry.actionText && /interim final rule/i.test(entry.actionText)) return 'Interim final rule published';
  const docType = (entry.documentType || '').toLowerCase();
  if (docType === 'rule') return 'Final rule published';
  if (docType === 'proposed rule') return 'Significant proposed rule published';
  return entry.actionText || 'Regulatory action published';
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Effective/comment-close date line, when the data carries one. */
export function dateLineFor(entry: Pick<RadarEntry, 'commentCloseDate'> & { raw?: unknown }): string | null {
  if (entry.commentCloseDate) {
    return `Comments close ${fmtDate(entry.commentCloseDate)}`;
  }
  return null;
}

export function toWatchItem(entry: RadarEntry): ExportControlWatchItem {
  let dateLine = dateLineFor(entry);
  if (!dateLine) {
    // Federal Register entries carry effectiveDate inside the stored raw entry
    // only; fall back to the action date, which is always real.
    dateLine = `Published ${fmtDate(entry.actionDate)}`;
  }
  return {
    id: entry.id,
    title: entry.title,
    whatHappened: whatHappenedLine(entry),
    whyItMatters: whyItMattersLine(entry),
    dateLine,
    url: entry.url,
    agency: entry.agency,
  };
}

// ─── DB selection + dedupe cursor ───────────────────────────────────────────

export const WATCH_MAX_ITEMS = 3;
const WATCH_LOOKBACK_DAYS = 14;

export interface ExportControlWatchSelection {
  items: ExportControlWatchItem[];
  /** RegulatoryAction ids to stamp digestIncludedAt for once the digest is saved. */
  includedIds: string[];
  /** True when more actions qualified than the cap allowed. */
  overflow: boolean;
}

/**
 * Select qualifying, never-before-digested export-control actions from the
 * recent window. Fails soft to an empty selection (missing table, query
 * error) — the digest must never break because of the watch section.
 */
export async function selectExportControlWatchItems(now = new Date()): Promise<ExportControlWatchSelection> {
  const empty: ExportControlWatchSelection = { items: [], includedIds: [], overflow: false };
  if (!(await isRegulatoryRadarAvailable())) return empty;

  try {
    const since = new Date(now.getTime() - WATCH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const candidates = await prisma.regulatoryAction.findMany({
      where: {
        category: 'export-controls',
        digestIncludedAt: null,
        actionDate: { gte: since },
      },
      orderBy: [{ significant: 'desc' }, { actionDate: 'desc' }],
      take: 50,
    });

    const qualifying = candidates.filter((c) =>
      qualifiesForExportControlWatch({
        source: c.source as RadarEntry['source'],
        category: c.category as RadarEntry['category'],
        agency: c.agency,
        documentType: c.documentType,
        actionText: c.actionText,
        significant: c.significant,
      })
    );

    const selected = qualifying.slice(0, WATCH_MAX_ITEMS);
    return {
      items: selected.map((c) => toWatchItem(c as unknown as RadarEntry)),
      includedIds: selected.map((c) => c.id),
      overflow: qualifying.length > WATCH_MAX_ITEMS,
    };
  } catch (error) {
    logger.error('selectExportControlWatchItems failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return empty;
  }
}

/**
 * Stamp digestIncludedAt on the actions that shipped in a digest so they can
 * never appear in a second digest. Never throws.
 */
export async function markExportControlItemsIncluded(ids: string[], now = new Date()): Promise<void> {
  if (ids.length === 0) return;
  try {
    await prisma.regulatoryAction.updateMany({
      where: { id: { in: ids } },
      data: { digestIncludedAt: now },
    });
  } catch (error) {
    logger.error('markExportControlItemsIncluded failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
