// ─── Space Tycoon: Live-Service Wave LS9 — The Realignment ─────────────────
// docs/LIVE_SERVICE_2026-08.md §LS9. Every ~90 REAL days (a real-world UTC
// calendar quarter — NOT accord-senate.ts's much-faster in-game quarter,
// see the note below) the political-economic map visibly changes:
//
//   1. Faction postures (contract generosity / tariff stance / procurement
//      focus) shift WITHIN PUBLISHED BANDS (±20%, POSTURE_BAND below),
//      derived deterministically from the epoch's aggregate Accord Senate
//      outcomes and economic-season telemetry.
//   2. NPC companies (npc-companies.ts) carry a faction alignment
//      (NPC_BACKDROP.md's "suggested next step") whose posture nudges their
//      market activity level within a TIGHTER bound than the player-facing
//      contract band — NPCs stay a floor, never a ceiling.
//   3. An Epoch Address — a deterministic, template-assembled, lore-voiced
//      recap (no AI calls, no randomness beyond the same world-shared seeds
//      everything else in this file uses) — publishes at each boundary,
//      doubling as the public roadmap/world-state surface.
//
// EVERYTHING in this module is a PURE function of (a) the wall clock and
// (b) other already-deterministic, world-shared modules (accord-senate.ts's
// docket/odds/baseline-vote math, economic-seasons.ts's super-cycle themes).
// No DB read, no DB write, no save-state mutation needed to know "what is
// this epoch's posture" — exactly like economic-seasons.ts's super-cycle
// theme or seasonal-events.ts's season schedule, every player computes the
// identical answer from the identical clock, with zero synchronization
// risk and zero server dependency. (GameState still gains ONE small field,
// `lastSeenRealignmentEpoch` — see types.ts V28 — purely so the engine can
// fire the "a new epoch has begun" event/banner exactly once per epoch per
// save, not to store the epoch's content itself.)
//
// TWO-CLOCK NOTE (appendix defect #2 in the LS spec, already flagged as a
// live watch-item): accord-senate.ts's "quarter" is an IN-GAME quarter (3
// game-months = 18 real hours at the current 6-real-hours/game-month rate)
// — a totally different cadence from this module's REAL-calendar quarter
// (~90 real days). A single Realignment epoch spans roughly 120 accord
// quarters. getSenateAggregateScore below walks that whole range (bounded
// defensively by MAX_SENATE_SAMPLES) rather than picking one representative
// quarter, so "the epoch's aggregate senate outcomes" means what it says.
//
// DEVIATION FROM THE LS9 SPEC (documented per the wave brief's own escape
// hatch — "chapter results (LS8)... else use senate+seasons and note it"):
// LS8's chapter/narrative-chain outcomes are NOT folded into the aggregate
// here. LS8 owns narrative-events.ts and the chapter modules and was still
// in flight at the time this wave shipped; wiring a live dependency on its
// surface risked either touching LS8-owned files or reading data that
// doesn't exist yet. The aggregate below uses ONLY the Accord Senate
// baseline outcomes (accord-senate.ts) and economic-season super-cycle
// telemetry (economic-seasons.ts) — both fully shipped, fully deterministic,
// and explicitly sanctioned as the fallback. A follow-up wave can fold in
// chapter outcomes once LS8 exposes a stable read-only aggregate export.

import { FACTIONS, FACTION_MAP, type FactionId } from './factions';
import { getGlobalGameDate } from './server-time';
import { pickDocketMeasures, previewBaselineMeasureOutcome } from './accord-senate';
import { getSuperCycleForSeason, type ResourceCategory } from './economic-seasons';
import { getCurrentSeasonNumber } from './seasonal-events';
import { mulberry32, hashStringToSeed } from './formulas';

// ─── Real-calendar quarter epoch math ───────────────────────────────────────
// "Epoch" = one real-world UTC calendar quarter (Jan-Mar, Apr-Jun, Jul-Sep,
// Oct-Dec). Epoch 0 is 2026 Q1 — the same real year server-time.ts's
// SERVER_EPOCH_MS (2026-03-22) falls in, so the game's very first
// Realignment lands inside the launch quarter, not years before it.

export const REALIGNMENT_BASE_YEAR = 2026;

export interface RealignmentEpochWindow {
  epochIndex: number;
  year: number;
  /** 1-4, calendar quarter (Q1 = Jan-Mar). */
  quarter: 1 | 2 | 3 | 4;
  startMs: number;
  /** Exclusive — the instant the NEXT epoch begins. */
  endMs: number;
}

/** Pure: the epoch a given real quarter-count (since REALIGNMENT_BASE_YEAR
 *  Q1) maps to. Negative epochIndex resolves to quarters before the base
 *  year — never called by getCurrentRealignmentEpoch in practice (the base
 *  year predates the earliest server clock), but kept total/defensive so
 *  the function never throws on an out-of-range input. */
export function getEpochWindow(epochIndex: number): RealignmentEpochWindow {
  const n = Math.trunc(epochIndex);
  const year = REALIGNMENT_BASE_YEAR + Math.floor(n / 4);
  const qZero = ((n % 4) + 4) % 4; // 0-3
  const startMs = Date.UTC(year, qZero * 3, 1, 0, 0, 0, 0);
  const nextYear = qZero === 3 ? year + 1 : year;
  const nextMonth = qZero === 3 ? 0 : (qZero + 1) * 3;
  const endMs = Date.UTC(nextYear, nextMonth, 1, 0, 0, 0, 0);
  return { epochIndex: n, year, quarter: (qZero + 1) as 1 | 2 | 3 | 4, startMs, endMs };
}

/** Which Realignment epoch is live right now — pure function of the clock. */
export function getCurrentRealignmentEpoch(nowMs: number = Date.now()): number {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3); // 0-3
  return (y - REALIGNMENT_BASE_YEAR) * 4 + q;
}

/** Wall-clock instant of the NEXT Realignment (the current epoch's end —
 *  identical to getEpochWindow(current).endMs, exposed separately so
 *  world-calendar.ts's deriver doesn't need to know the epoch-window shape). */
export function getNextRealignmentDate(nowMs: number = Date.now()): number {
  return getEpochWindow(getCurrentRealignmentEpoch(nowMs) + 1).startMs;
}

// ─── Published bands ────────────────────────────────────────────────────────
// LS9 spec: "BALANCE table becomes dynamic ±0.2." Both posture axes below
// share this one published band — forecastable (players can see the
// possible range before the epoch resolves) and bounded (no build
// invalidation, matching every other LS-wave band in this codebase).

export const POSTURE_BAND_MIN = 0.8;
export const POSTURE_BAND_MAX = 1.2;

/** NPC market-activity bias band — deliberately TIGHTER than the
 *  player-facing posture band (NPC_BACKDROP.md: "changes bounded", NPCs
 *  remain a floor, never a ceiling). */
export const NPC_BIAS_MIN = 0.85;
export const NPC_BIAS_MAX = 1.15;

export type FactionTrend = 'ascendant' | 'retreating' | 'stable';

export interface FactionPosture {
  factionId: FactionId;
  epochIndex: number;
  /** 0..1 rank-normalized aggregate score this epoch (0.5 = perfectly
   *  average/tied — see computeFactionPostures). Not player-facing; exposed
   *  for tests and for deriving the NPC bias multiplier. */
  score: number;
  trend: FactionTrend;
  /** Delivery-contract payment multiplier for this faction this epoch.
   *  Always within [POSTURE_BAND_MIN, POSTURE_BAND_MAX]. */
  contractGenerosityMultiplier: number;
  /** Cost/friction multiplier for this faction's trade this epoch (higher =
   *  stricter). Always within [POSTURE_BAND_MIN, POSTURE_BAND_MAX].
   *  Informational this wave — see FactionPanel's posture badge; a licensing-
   *  cost consumer is a natural follow-up (left unwired to avoid a new
   *  import cycle between factions.ts and the senate/narrative chain — see
   *  the module header). */
  tariffStanceMultiplier: number;
  /** Which resource category this faction is emphasizing THIS epoch, drawn
   *  from its fixed lore-aligned affinity pool (FACTION_CATEGORY_AFFINITY).
   *  Nudges delivery-contract resource selection toward this category. */
  procurementFocus: ResourceCategory;
}

// ─── Faction ↔ resource-category affinity (lore-aligned, fixed pool) ───────
// Deliberately NOT imported from delivery-contracts.ts's FACTION_FLAVOR —
// that would create an import cycle (delivery-contracts.ts imports THIS
// module for the posture multiplier/focus category it applies at contract
// generation time). A short, self-contained affinity list is enough for
// "which category is this faction leaning into this epoch" and stays
// consistent with FACTION_FLAVOR's preferredResources categories by intent.
export const FACTION_CATEGORY_AFFINITY: Record<FactionId, ResourceCategory[]> = {
  'the-dominion': ['metal', 'rare_earth'],
  'the-syndicate': ['precious', 'exotic'],
  'void-corsairs': ['hydrocarbon', 'metal'],
  'hive-collective': ['exotic', 'water'],
  'nebula-reavers': ['hydrocarbon', 'exotic'],
  'echo-remnants': ['rare_earth', 'exotic'],
};

function emptyFactionRecord(): Record<FactionId, number> {
  return Object.fromEntries(FACTIONS.map(f => [f.id, 0])) as Record<FactionId, number>;
}

/** Rank-normalize a raw score record to 0..1 per faction (min→0, max→1).
 *  A perfectly flat/tied input (range 0) maps every faction to 0.5 —
 *  neither ascendant nor retreating, matching computeFactionPostures'
 *  own degenerate-tie guard. */
function normalizeScores(raw: Record<FactionId, number>): Record<FactionId, number> {
  const values = FACTIONS.map(f => raw[f.id] ?? 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  const out = emptyFactionRecord();
  for (const f of FACTIONS) {
    out[f.id] = range === 0 ? 0.5 : ((raw[f.id] ?? 0) - min) / range;
  }
  return out;
}

// ─── Aggregate senate outcomes for an epoch ─────────────────────────────────

/** Defensive bound on how many accord quarters a single epoch walk samples.
 *  Today's clock (6 real hours/game-month, 3-game-month accord quarters, a
 *  ~90-real-day Realignment epoch) yields ~120 — this is headroom, not a
 *  truncation any current epoch actually hits. */
const MAX_SENATE_SAMPLES = 400;

/** Sum of every world-shared BASELINE (pre-lobbying) measure outcome's
 *  factionRep effect across every accord-senate quarter boundary that falls
 *  inside the given Realignment epoch's real-time window. Pure/deterministic
 *  — see previewBaselineMeasureOutcome's header for why this is a faithful
 *  stand-in for "the real senate outcome" without cross-player aggregation. */
export function getSenateAggregateScore(epochIndex: number): Record<FactionId, number> {
  const window = getEpochWindow(epochIndex);
  const startMonth = getGlobalGameDate(window.startMs).totalMonths;
  const endMonth = getGlobalGameDate(window.endMs).totalMonths;
  const alignedStart = startMonth - (startMonth % 3);
  const score = emptyFactionRecord();

  let samples = 0;
  for (let m = alignedStart; m < endMonth && samples < MAX_SENATE_SAMPLES; m += 3, samples++) {
    const measureIds = pickDocketMeasures(m);
    for (const measureId of measureIds) {
      const outcome = previewBaselineMeasureOutcome(measureId, m);
      if (!outcome) continue;
      const effect = outcome.passed ? outcome.def.onPass : outcome.def.onFail;
      if (!effect.factionRep) continue;
      for (const [fid, delta] of Object.entries(effect.factionRep)) {
        if (fid in score) score[fid as FactionId] += delta as number;
      }
    }
  }
  return score;
}

/** Sum of this epoch's economic-season super-cycle category biases, scored
 *  per faction via FACTION_CATEGORY_AFFINITY. Pure/deterministic
 *  (economic-seasons.ts's theme lookup is itself pure). */
export function getSeasonAggregateScore(epochIndex: number): Record<FactionId, number> {
  const window = getEpochWindow(epochIndex);
  const startSeason = getCurrentSeasonNumber(new Date(window.startMs));
  const endSeason = Math.max(startSeason, getCurrentSeasonNumber(new Date(window.endMs - 1)));
  const score = emptyFactionRecord();

  for (let n = startSeason; n <= endSeason; n++) {
    const theme = getSuperCycleForSeason(n);
    for (const f of FACTIONS) {
      let bias = 0;
      for (const cat of FACTION_CATEGORY_AFFINITY[f.id]) bias += theme.categoryBias[cat] || 0;
      score[f.id] += bias;
    }
  }
  return score;
}

function pickProcurementFocus(factionId: FactionId, epochIndex: number): ResourceCategory {
  const pool = FACTION_CATEGORY_AFFINITY[factionId];
  if (pool.length === 0) return 'metal';
  const rng = mulberry32(hashStringToSeed(`stw-realignment:focus:${factionId}:${epochIndex}`));
  return pool[Math.floor(rng() * pool.length) % pool.length];
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/** The full, band-bounded posture for every faction this epoch. Pure —
 *  recomputing it for the same epochIndex always yields the same six
 *  postures (same-epoch idempotence is what makes this safe to call once
 *  per tick with no cached/persisted state). */
export function computeFactionPostures(epochIndex: number): FactionPosture[] {
  const senateNorm = normalizeScores(getSenateAggregateScore(epochIndex));
  const seasonNorm = normalizeScores(getSeasonAggregateScore(epochIndex));
  const combined = emptyFactionRecord();
  for (const f of FACTIONS) combined[f.id] = 0.5 * senateNorm[f.id] + 0.5 * seasonNorm[f.id];

  const ranked = [...FACTIONS].sort((a, b) => combined[b.id] - combined[a.id]);
  const spread = combined[ranked[0].id] - combined[ranked[ranked.length - 1].id];
  // A genuine tie across all six factions (spread ~0) declares no
  // ascendant/retreating faction — "one faction ascendant, one retreating"
  // should never be asserted from a coin-flip-flat aggregate.
  const hasSpread = spread > 1e-9;
  const ascendantId = hasSpread ? ranked[0].id : null;
  const retreatingId = hasSpread ? ranked[ranked.length - 1].id : null;

  return FACTIONS.map(f => {
    const c = Math.max(0, Math.min(1, combined[f.id]));
    const trend: FactionTrend = f.id === ascendantId ? 'ascendant' : f.id === retreatingId ? 'retreating' : 'stable';
    return {
      factionId: f.id,
      epochIndex,
      score: c,
      trend,
      contractGenerosityMultiplier: round4(POSTURE_BAND_MIN + c * (POSTURE_BAND_MAX - POSTURE_BAND_MIN)),
      // Inverse of contract generosity, same band: an ascendant faction (high
      // c) relaxes its tariff friction (it doesn't need to squeeze while
      // winning); a retreating faction tightens terms to compensate.
      tariffStanceMultiplier: round4(POSTURE_BAND_MIN + (1 - c) * (POSTURE_BAND_MAX - POSTURE_BAND_MIN)),
      procurementFocus: pickProcurementFocus(f.id, epochIndex),
    };
  });
}

export function getFactionPosture(factionId: FactionId, epochIndex: number): FactionPosture {
  const posture = computeFactionPostures(epochIndex).find(p => p.factionId === factionId);
  // Defensive fallback — every FactionId is always present in FACTIONS, so
  // this branch is unreachable in practice; keeps the return type total.
  return posture || {
    factionId, epochIndex, score: 0.5, trend: 'stable',
    contractGenerosityMultiplier: 1, tariffStanceMultiplier: 1,
    procurementFocus: FACTION_CATEGORY_AFFINITY[factionId]?.[0] || 'metal',
  };
}

/** Convenience single-faction lookup for delivery-contracts.ts's contract
 *  generation (the concrete, spec-highlighted mechanic: "delivery-contract
 *  multipliers within published bands"). Prefer computeFactionPostures for
 *  batch use (one pass for all six factions) over calling this per-faction
 *  in a loop. */
export function getContractGenerosityMultiplier(factionId: FactionId, epochIndex: number): number {
  return getFactionPosture(factionId, epochIndex).contractGenerosityMultiplier;
}

/** NPC market-activity bias (NPC_BACKDROP.md's faction-alignment
 *  recommendation, finally wired) — a continuous, tightly-bounded
 *  [NPC_BIAS_MIN, NPC_BIAS_MAX] multiplier keyed off the SAME 0..1 score
 *  driving the player-facing posture, just mapped into a narrower range so
 *  NPC behavior colors gently rather than swinging as hard as player
 *  economics. */
export function getNpcFactionBiasMultiplier(factionId: FactionId, epochIndex: number): number {
  const posture = getFactionPosture(factionId, epochIndex);
  return round4(NPC_BIAS_MIN + posture.score * (NPC_BIAS_MAX - NPC_BIAS_MIN));
}

// ─── Epoch feature spotlight ─────────────────────────────────────────────────
// LS9 spec: "opening one new epoch feature flag (content the team ships that
// quarter) — the visible roadmap made mechanical." Authoring NEW gameplay
// content/flags is a human roadmap decision, not something this wave can
// invent honestly at template-assembly time. What ships here is the
// MECHANISM: a deterministic rotation through a small catalog citing REAL,
// already-live systems as "this epoch's spotlight" — the Epoch Address's
// roadmap slot has a stable home a future wave can point at real upcoming
// content (swap SPOTLIGHT_CATALOG entries) without touching the assembly
// logic. This is a documented scoping decision, not an oversight.

export interface EpochSpotlight {
  id: string;
  name: string;
  description: string;
}

const SPOTLIGHT_CATALOG: EpochSpotlight[] = [
  { id: 'cargo_logistics', name: 'Cargo Logistics Network', description: 'Per-location freight lanes are live system-wide — Δv-priced hauls move real inventory between Sol’s outposts.' },
  { id: 'corporate_eras', name: 'Chartered Corporate Eras', description: '90-day corporate mandates are open to Tier 3+ corporations, with medals recorded to the public Chronicle.' },
  { id: 'economic_seasons', name: 'Economic Super-Cycles', description: 'Each 28-day season carries an announced commodity super-cycle — position inventory ahead of the shift.' },
  { id: 'accord_senate', name: 'Accord Council Senate', description: 'The quarterly docket is open for lobbying — measures carry real tariff, subsidy, and licensing effects.' },
];

export function getEpochSpotlight(epochIndex: number): EpochSpotlight {
  const idx = ((epochIndex % SPOTLIGHT_CATALOG.length) + SPOTLIGHT_CATALOG.length) % SPOTLIGHT_CATALOG.length;
  return SPOTLIGHT_CATALOG[idx];
}

// ─── Epoch Address ──────────────────────────────────────────────────────────

export interface EpochAddress {
  epochIndex: number;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  title: string;
  publishedAtMs: number;
  postures: FactionPosture[];
  ascendantFactionId: FactionId | null;
  retreatingFactionId: FactionId | null;
  lines: string[];
  spotlight: EpochSpotlight;
  bandPreview: { min: number; max: number };
}

/** Deterministic template assembly — NO AI calls, NO randomness beyond the
 *  same world-shared seeds every other function in this module uses. Every
 *  named outcome (ascendant/retreating faction, spotlight) is a real
 *  aggregate computed above, not invented copy. Safe to call every render;
 *  identical input always produces identical output. */
export function assembleEpochAddress(epochIndex: number): EpochAddress {
  const window = getEpochWindow(epochIndex);
  const postures = computeFactionPostures(epochIndex);
  const ascendant = postures.find(p => p.trend === 'ascendant') || null;
  const retreating = postures.find(p => p.trend === 'retreating') || null;
  const spotlight = getEpochSpotlight(epochIndex);

  const lines: string[] = [];
  if (ascendant && retreating) {
    const ascendantDef = FACTION_MAP.get(ascendant.factionId)!;
    const retreatingDef = FACTION_MAP.get(retreating.factionId)!;
    lines.push(
      `Epoch ${window.year} Q${window.quarter} opens with ${ascendantDef.name} ascendant across the Accord's lanes — “${ascendantDef.tagline}” reads truer than ever this quarter.`,
      `${retreatingDef.name} recedes from the frontier, its reach narrowing as rivals press the advantage.`,
    );
  } else {
    lines.push(`Epoch ${window.year} Q${window.quarter} opens with the six powers holding an even balance — no faction broke from the pack this time.`);
  }
  lines.push(
    'Aggregate Accord Senate outcomes and this epoch’s economic seasons drove every shift; each faction’s posture moved within its published band, never beyond it.',
    `System spotlight: ${spotlight.name} — ${spotlight.description}`,
  );

  return {
    epochIndex,
    year: window.year,
    quarter: window.quarter,
    title: `Epoch ${window.year} Q${window.quarter} — The Realignment`,
    publishedAtMs: window.startMs,
    postures,
    ascendantFactionId: ascendant?.factionId ?? null,
    retreatingFactionId: retreating?.factionId ?? null,
    lines,
    spotlight,
    bandPreview: { min: POSTURE_BAND_MIN, max: POSTURE_BAND_MAX },
  };
}
