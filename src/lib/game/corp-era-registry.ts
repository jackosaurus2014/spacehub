// ─── Space Tycoon: Corporate Registry — Chronicle (era) shaping/sanitization ─
// Pure helpers used by POST/GET /api/space-tycoon/corp-era (the opt-in
// publish endpoint) and by the public pages that read published eras
// (/space-tycoon/chronicle, and the Chronicle section on
// /space-tycoon/corp/[id]). Mirrors corp-report-registry.ts's trust-boundary
// discipline exactly: the client sends its own locally-generated
// CompletedCorporateEra (corporate-eras.ts) verbatim; every string is run
// through sanitize-html before it is ever persisted or rendered on a public,
// crawlable page.

import sanitizeHtml from 'sanitize-html';
import type { EraCharterId, EraMedal } from './types';

const PLAIN_TEXT_SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

/** Strip HTML and clamp length. Non-string input becomes an empty string. */
export function sanitizePlainText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  const stripped = sanitizeHtml(input, PLAIN_TEXT_SANITIZE_CONFIG).trim();
  return stripped.slice(0, maxLen);
}

// ─── Types ───────────────────────────────────────────────────────────────────

const ERA_CHARTER_IDS: EraCharterId[] = [
  'expansion_era', 'research_renaissance', 'consolidation', 'belt_century',
  'science_age', 'logistics_empire', 'civic_era', 'interstellar_prelude',
];
const ERA_MEDALS: EraMedal[] = ['filed', 'bronze', 'silver', 'gold', 'platinum'];

export interface PublishableCorporateEra {
  eraIndex: number;
  charterId: EraCharterId;
  startedAtMs: number;
  endedAtMs: number;
  bracketAtStart: number;
  medal: EraMedal;
  goalScore: number;
  goalActual: number;
  goalTarget: number;
  headlineStats: { label: string; value: number }[];
  notableEvents: string[];
}

export interface StoredCorpEraPayload extends PublishableCorporateEra {
  publishedAt: number;
}

/** Deterministic, monotonic-per-corp DB key for @@unique([corpId, eraKey]) —
 *  mirrors quarterKey()'s "derive from an index, never a human label"
 *  convention (corp-report-registry.ts). */
export function eraKey(eraIndex: number): string {
  return `E${Math.max(0, Math.floor(Number.isFinite(eraIndex) ? eraIndex : 0))}`;
}

// ─── Shaping (write path) ───────────────────────────────────────────────────

function safeFiniteNumber(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

export function shapeCorpEraForStorage(
  era: PublishableCorporateEra,
  publishedAt: number = Date.now(),
): StoredCorpEraPayload {
  const charterId: EraCharterId = ERA_CHARTER_IDS.includes(era.charterId) ? era.charterId : 'expansion_era';
  const medal: EraMedal = ERA_MEDALS.includes(era.medal) ? era.medal : 'filed';

  const headlineStats = (Array.isArray(era.headlineStats) ? era.headlineStats : [])
    .slice(0, 10)
    .map((h) => ({ label: sanitizePlainText(h?.label, 80), value: safeFiniteNumber(h?.value) }))
    .filter((h) => h.label.length > 0);

  const notableEvents = (Array.isArray(era.notableEvents) ? era.notableEvents : [])
    .slice(0, 5)
    .map((e) => sanitizePlainText(e, 200))
    .filter((e) => e.length > 0);

  return {
    eraIndex: Math.max(0, Math.floor(safeFiniteNumber(era.eraIndex))),
    charterId,
    startedAtMs: Math.max(0, Math.floor(safeFiniteNumber(era.startedAtMs))),
    endedAtMs: Math.max(0, Math.floor(safeFiniteNumber(era.endedAtMs))),
    bracketAtStart: Math.min(8, Math.max(1, Math.floor(safeFiniteNumber(era.bracketAtStart, 1)))),
    medal,
    goalScore: safeFiniteNumber(era.goalScore),
    goalActual: safeFiniteNumber(era.goalActual),
    goalTarget: safeFiniteNumber(era.goalTarget),
    headlineStats,
    notableEvents,
    publishedAt,
  };
}

// ─── Parsing (read path) ─────────────────────────────────────────────────────

/** Defense-in-depth for public pages: recordJson was already sanitized at
 *  write time; SSR should never trust a raw JSON.parse of a DB text column
 *  blindly. Returns null on anything that doesn't look like a shaped era. */
export function parseStoredCorpEra(recordJson: string): StoredCorpEraPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(recordJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.eraIndex !== 'number' || typeof p.charterId !== 'string' || typeof p.medal !== 'string') {
    return null;
  }
  return shapeCorpEraForStorage(p as unknown as PublishableCorporateEra, safeFiniteNumber(p.publishedAt, Date.now()));
}

export const ERA_MEDAL_LABEL: Record<EraMedal, string> = {
  platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze', filed: 'Filed',
};

export const ERA_MEDAL_ICON: Record<EraMedal, string> = {
  platinum: '🏆', gold: '🥇', silver: '🥈', bronze: '🥉', filed: '📁',
};
