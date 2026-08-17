import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  RADAR_CATEGORIES,
  RADAR_CATEGORY_LABELS,
  type RadarCategory,
} from '@/lib/regulatory-categorizer';
import {
  isPassageLevelAction,
  whatHappenedLine,
  whyItMattersLine,
} from '@/lib/export-control-watch';
import { normalizeTier } from '@/lib/subscription';
import type { RadarEntry } from '@/lib/regulatory-radar';

/**
 * Regulatory Wave C — per-user regulatory alerts (Pro feature).
 *
 * Users pick radar categories to watch and receive one batched email when
 * something significant lands. The significance bar generalizes the Export
 * Control Watch qualifier (src/lib/export-control-watch.ts) per-category
 * rather than inventing a new bar:
 *
 *   - 'enforcement' category: ALWAYS qualifies (an enforcement action is the
 *     signal an enforcement watcher subscribed for).
 *   - Federal Register (all other categories): final rules qualify, interim
 *     final rules qualify, anything flagged significant qualifies, proposed
 *     rules qualify ONLY when significant, plain notices NEVER qualify.
 *   - Congress: passage-level actions only (passed a chamber, cleared
 *     conference, presented/signed) — introductions and referrals never.
 *   - Agency filing feeds (faa/fcc/itu/sec): routine filings never; only
 *     rows flagged significant qualify.
 *
 * This file is the pure/query layer; the send pipeline lives in
 * src/lib/alerts/regulatory-alert-processor.ts (mirrors the watchlist
 * alert processor architecture).
 */

export type RegulatoryAlertFrequency = 'immediate' | 'daily';

export const REGULATORY_ALERT_FREQUENCIES: readonly RegulatoryAlertFrequency[] = [
  'immediate',
  'daily',
] as const;

/** Max items per alert email — overflow points at the full Radar. */
export const REGULATORY_ALERT_MAX_ITEMS = 10;

// ─── Availability probe (same pattern as regulatory-radar.ts) ────────────────

const PROBE_TTL_MS = 5 * 60 * 1000;
let prefsTableAvailable: boolean | null = null;
let lastProbeAt = 0;

/**
 * Whether the RegulatoryAlertPreference table exists. Cached; re-probed every
 * 5 minutes while unavailable (flips on shortly after `prisma db push`) and
 * never re-probed once available.
 */
export async function isRegulatoryAlertPrefsAvailable(): Promise<boolean> {
  if (prefsTableAvailable === true) return true;
  const now = Date.now();
  if (prefsTableAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.regulatoryAlertPreference.count({ take: 1 });
    prefsTableAvailable = true;
  } catch {
    prefsTableAvailable = false;
    logger.warn('RegulatoryAlertPreference table unavailable — regulatory alerts skipped (run prisma db push)');
  }
  return prefsTableAvailable;
}

/** Test helper — reset the cached probe. */
export function __resetRegulatoryAlertPrefsAvailability(): void {
  prefsTableAvailable = null;
  lastProbeAt = 0;
}

// ─── Pro-status helper (server-side enforcement) ─────────────────────────────

export interface TierFields {
  subscriptionTier: string | null;
  trialTier: string | null;
  trialEndDate: Date | null;
}

/**
 * Server-side effective-Pro check, mirroring the canonical gate in
 * src/app/api/alerts/route.ts (normalizeTier + active-trial override).
 * Legacy 'enterprise' rows count as Pro via normalizeTier.
 */
export function isEffectivelyPro(user: TierFields, now = new Date()): boolean {
  let tier = normalizeTier(user.subscriptionTier);
  if (user.trialTier && user.trialEndDate && now < user.trialEndDate) {
    tier = normalizeTier(user.trialTier);
  }
  return tier !== 'free';
}

// ─── Watched-categories JSON helpers ─────────────────────────────────────────

/** Parse the watchedCategories JSON column into a validated category list. */
export function parseWatchedCategories(raw: string | null | undefined): RadarCategory[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = new Set<string>(RADAR_CATEGORIES);
    return Array.from(new Set(parsed.filter((c): c is RadarCategory => typeof c === 'string' && valid.has(c))));
  } catch {
    return [];
  }
}

// ─── Generalized significance qualifier (pure) ───────────────────────────────

export type QualifierInput = Pick<
  RadarEntry,
  'source' | 'category' | 'documentType' | 'actionText' | 'significant'
>;

/**
 * The generalized per-category significance bar for user alerts. Pure,
 * exported for tests. See module docblock for the full rules.
 *
 * Difference vs qualifiesForExportControlWatch: no BIS/DDTC agency filter —
 * the category scoping already restricts what an export-controls watcher
 * sees, and other categories have no equivalent two-agency home.
 */
export function qualifiesForRegulatoryAlert(entry: QualifierInput): boolean {
  // Enforcement actions always qualify for the enforcement category — "who
  // got fined" is exactly what an enforcement watcher subscribed for.
  if (entry.category === 'enforcement') return true;

  if (entry.source === 'federal-register') {
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

  // Agency filing feeds (faa / fcc / itu / sec): routine filings are the
  // overwhelming majority — only rows flagged significant qualify.
  return entry.significant === true;
}

// ─── Templated copy (pure — no AI, no fabricated impact claims) ──────────────

const CATEGORY_WHY_IT_MATTERS: Record<RadarCategory, string> = {
  enforcement:
    'Enforcement actions show how regulators are applying the rules in practice — and what penalties similar conduct can draw.',
  'export-controls': '', // handled by whyItMattersLine (agency-keyed EAR/ITAR copy)
  'launch-licensing':
    'Launch and reentry licensing changes affect mission timelines, costs, and compliance obligations for launch operators and spaceports.',
  spectrum:
    'Spectrum and orbital-slot decisions determine what satellite operators can fly, where, and on which frequencies.',
  'remote-sensing':
    'Remote-sensing licensing changes affect what commercial Earth-observation systems can collect, process, and sell.',
  'procurement-policy':
    'Procurement and policy shifts change how government agencies buy space services and where budgets flow.',
  'space-traffic':
    'Space traffic and debris rules affect satellite disposal obligations, conjunction procedures, and constellation operations.',
  other: 'This action may change regulatory obligations for space companies.',
};

/**
 * Why-it-matters line for an alert item. Reuses the Export Control Watch's
 * agency-keyed copy for export-controls; other categories use a fixed
 * templated line keyed on category.
 */
export function whyItMattersForAlert(
  entry: Pick<RadarEntry, 'source' | 'agency' | 'category'>
): string {
  if (entry.category === 'export-controls') {
    return whyItMattersLine(entry);
  }
  return CATEGORY_WHY_IT_MATTERS[entry.category] || CATEGORY_WHY_IT_MATTERS.other;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** A fully-templated alert email item. */
export interface RegulatoryAlertItem {
  id: string;
  category: RadarCategory;
  categoryLabel: string;
  title: string;
  whatHappened: string;
  whyItMatters: string;
  dateLine: string;
  /** Official government source URL. */
  url: string;
  agency: string | null;
}

/** Build the templated email item for a qualifying RegulatoryAction. */
export function buildAlertItem(entry: RadarEntry): RegulatoryAlertItem {
  let dateLine: string;
  if (entry.commentCloseDate) {
    dateLine = `Comments close ${fmtDate(entry.commentCloseDate)}`;
  } else {
    dateLine = `Published ${fmtDate(entry.actionDate)}`;
  }
  return {
    id: entry.id,
    category: entry.category,
    categoryLabel: RADAR_CATEGORY_LABELS[entry.category] || entry.category,
    title: entry.title,
    whatHappened: whatHappenedLine(entry),
    whyItMatters: whyItMattersForAlert(entry),
    dateLine,
    url: entry.url,
    agency: entry.agency,
  };
}

// ─── Subject line (pure) ─────────────────────────────────────────────────────

// Short, subject-friendly per-category nouns ("2 export-control actions").
const SUBJECT_CATEGORY_NOUNS: Record<RadarCategory, string> = {
  enforcement: 'enforcement',
  'export-controls': 'export-control',
  'launch-licensing': 'launch-licensing',
  spectrum: 'spectrum',
  'remote-sensing': 'remote-sensing',
  'procurement-policy': 'procurement-policy',
  'space-traffic': 'space-traffic',
  other: 'regulatory',
};

/** "Regulatory alert: 2 export-control actions" / "…: 5 actions across 3 categories". */
export function buildAlertSubject(items: Array<Pick<RegulatoryAlertItem, 'category'>>): string {
  const n = items.length;
  const categories = Array.from(new Set(items.map((i) => i.category)));
  if (categories.length === 1) {
    const noun = SUBJECT_CATEGORY_NOUNS[categories[0]] || 'regulatory';
    return `Regulatory alert: ${n} ${noun} action${n === 1 ? '' : 's'}`;
  }
  return `Regulatory alert: ${n} actions across ${categories.length} categories`;
}
