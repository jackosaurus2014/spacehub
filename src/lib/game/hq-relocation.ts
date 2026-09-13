// ─── Space Tycoon: HQ relocation — the PURE half (CC-2) ─────────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2-3, §8. Everything here is
// deterministic and prisma-free so the client (Bridge chip, Relocate
// console, the tick's local completion, the Outliner row), the server route
// (/api/space-tycoon/hq/relocate) and the sim harness share ONE definition
// of: what a stage requires, what a move costs and how long it takes, how a
// seat pool prices itself, and how a project starts / completes / is shown.
// The numbers live in headquarters.ts; the server I/O (HqSeat / HqRelocation
// rows) lives in hq-relocation-server.ts.
//
// Time loop: the relocation project is a CAMPAIGN-loop decision (12-24 real
// hours), the seat lease is a WEEKLY beat (6-game-month term), the upkeep is
// the DAILY sink (docs/SESSION_DESIGN.md).

import { BUILDING_MAP } from './buildings';
import { checkCorporationTier, getTierDef } from './corporation-tiers';
import { REAL_MS_PER_GAME_MONTH } from './server-time';
import {
  DEFAULT_HQ_STAGE,
  HQ_RELOCATION,
  HQ_RETURN_COST_FRACTION,
  HQ_SEAT_BASE_PRICE,
  HQ_SEAT_COUNTS,
  HQ_SEAT_TERM_MONTHS,
  HQ_STAGES,
  HQ_UPKEEP_MONTHLY,
  getHeadquarters,
  getHqStage,
  hqSeatLabel,
  isHqStageId,
  isValidHqProject,
  type HqStageDef,
  type HqStageId,
} from './headquarters';
import type { GameReport, GameState, HeadquartersState } from './types';

// ─── Requirements (design §3 table) ─────────────────────────────────────────

export interface HqBuildingRequirement {
  /** buildings.ts category the corporation must have COMPLETE… */
  category: 'space_station';
  /** …at any of these solar-system.ts locations. */
  locations: readonly string[];
  /** Player-facing name of the requirement. */
  label: string;
}

/** Per-stage requirement beyond the tier gate. Earth needs nothing. The
 *  seat requirement is implicit: HQ_SEAT_COUNTS[stage] > 0. */
export const HQ_STAGE_REQUIREMENTS: Readonly<Record<HqStageId, { building: HqBuildingRequirement | null }>> = {
  earth_ops: { building: null },
  orbital_deck: { building: { category: 'space_station', locations: ['leo'], label: 'Orbital Outpost in LEO' } },
  lunar_hq: { building: { category: 'space_station', locations: ['lunar_orbit', 'lunar_surface'], label: 'Lunar Gateway or Lunar Habitat' } },
  mars_hq: { building: { category: 'space_station', locations: ['mars_orbit', 'mars_surface'], label: 'Mars Orbital Station or Mars Habitat' } },
  jovian_hq: { building: { category: 'space_station', locations: ['jupiter_system'], label: 'Jovian Station' } },
  saturnian_hq: { building: { category: 'space_station', locations: ['saturn_system'], label: 'Kronos Station' } },
  deep_space_hq: { building: { category: 'space_station', locations: ['outer_system'], label: 'Deep Space Outpost' } },
  interstellar_hq: { building: null },
};

/** The minimum a requirement check needs to know — built from GameState on
 *  the client (hqRequirementViewFromState) and from the persisted profile +
 *  ServerAsset registry on the server (never from the client's claims). */
export interface HqRequirementView {
  tier: number;
  buildings: ReadonlyArray<{ definitionId: string; locationId: string; isComplete: boolean }>;
}

export interface HqRequirementCheck {
  stage: HqStageId;
  /** Not `comingSoon`. */
  reachable: boolean;
  tier: { need: number; have: number; met: boolean };
  building: { label: string; met: boolean } | null;
  /** A seat in a finite pool must be held or claimed (server fact). */
  seatNeeded: boolean;
  /** tier ∧ building ∧ reachable — seat availability is checked live. */
  met: boolean;
}

export function hqRequirementViewFromState(state: GameState): HqRequirementView {
  return {
    tier: checkCorporationTier(state),
    buildings: (state.buildings || []).map(b => ({ definitionId: b.definitionId, locationId: b.locationId, isComplete: !!b.isComplete })),
  };
}

export function hasHqRequiredBuilding(view: HqRequirementView, req: HqBuildingRequirement | null): boolean {
  if (!req) return true;
  return view.buildings.some(b => b.isComplete && req.locations.includes(b.locationId)
    && BUILDING_MAP.get(b.definitionId)?.category === req.category);
}

export function evaluateHqRequirementsFrom(view: HqRequirementView, stageId: HqStageId): HqRequirementCheck {
  const stage = getHqStage(stageId);
  const req = HQ_STAGE_REQUIREMENTS[stageId];
  const tierMet = view.tier >= stage.tier;
  const buildingMet = hasHqRequiredBuilding(view, req.building);
  const reachable = !stage.comingSoon;
  return {
    stage: stageId,
    reachable,
    tier: { need: stage.tier, have: view.tier, met: tierMet },
    building: req.building ? { label: req.building.label, met: buildingMet } : null,
    seatNeeded: HQ_SEAT_COUNTS[stageId] > 0,
    met: reachable && tierMet && buildingMet,
  };
}

export function evaluateHqRequirements(state: GameState, stageId: HqStageId): HqRequirementCheck {
  return evaluateHqRequirementsFrom(hqRequirementViewFromState(state), stageId);
}

// ─── Seat pool math ──────────────────────────────────────────────────────────

/** Posted price = base × (1 + MARKUP · (occupied/total)^EXP). Rises with
 *  occupancy so the last seats in a pool clear near 3× the first — the
 *  scarcity rule of design §2 without an auction round-trip (CC-3 adds the
 *  auction for Mars+). Rounded to $0.1M. */
export const HQ_SEAT_PRICE_OCCUPANCY_MARKUP = 2;
export const HQ_SEAT_PRICE_OCCUPANCY_EXP = 1.5;

export function postedSeatPrice(stage: HqStageId, occupied: number, total: number = HQ_SEAT_COUNTS[stage]): number {
  const base = HQ_SEAT_BASE_PRICE[stage] || 0;
  if (base <= 0 || total <= 0) return 0;
  const occ = Math.max(0, Math.min(total, Math.floor(occupied)));
  const frac = occ / total;
  const price = base * (1 + HQ_SEAT_PRICE_OCCUPANCY_MARKUP * Math.pow(frac, HQ_SEAT_PRICE_OCCUPANCY_EXP));
  return Math.round(price / 100_000) * 100_000;
}

/** Seat lease term in real ms (6 game-months × 6 h). */
export const HQ_SEAT_TERM_MS = HQ_SEAT_TERM_MONTHS * REAL_MS_PER_GAME_MONTH;

// ─── Quotes ──────────────────────────────────────────────────────────────────

export interface HqRelocationQuote {
  fromStage: HqStageId;
  toStage: HqStageId;
  /** Relocation project money (seat price is quoted separately, live). */
  cost: number;
  months: number;
  durationMs: number;
  /** Moving back to Earth: reduced cost, one month. */
  isReturn: boolean;
  seatNeeded: boolean;
}

export function quoteHqRelocation(fromStage: HqStageId, toStage: HqStageId): HqRelocationQuote {
  const isReturn = toStage === DEFAULT_HQ_STAGE;
  const spec = HQ_RELOCATION[toStage];
  const cost = isReturn
    ? Math.round(HQ_RELOCATION[fromStage].cost * HQ_RETURN_COST_FRACTION)
    : spec.cost;
  const months = spec.months;
  return { fromStage, toStage, cost, months, durationMs: months * REAL_MS_PER_GAME_MONTH, isReturn, seatNeeded: HQ_SEAT_COUNTS[toStage] > 0 };
}

// ─── Request validation (shared by the client console and the route) ────────

export type HqRelocateError = 'unknown_stage' | 'coming_soon' | 'same_stage' | 'in_progress' | 'tier' | 'building';

export const HQ_RELOCATE_ERROR_TEXT: Readonly<Record<HqRelocateError, string>> = {
  unknown_stage: 'That is not a registered headquarters stage.',
  coming_soon: 'That stage is not open yet — it arrives in a later update.',
  same_stage: 'The headquarters is already seated there.',
  in_progress: 'A relocation is already under way — one project at a time, one headquarters per corporation.',
  tier: 'The corporation has not reached the tier this seat requires.',
  building: 'The required station at the destination is not complete.',
};

export type HqRelocationRequestCheck =
  | { ok: true; quote: HqRelocationQuote; check: HqRequirementCheck }
  | { ok: false; error: HqRelocateError; message: string; check?: HqRequirementCheck };

export function checkHqRelocationRequest(current: HeadquartersState, view: HqRequirementView, toStage: unknown): HqRelocationRequestCheck {
  if (!isHqStageId(toStage)) return { ok: false, error: 'unknown_stage', message: HQ_RELOCATE_ERROR_TEXT.unknown_stage };
  const from = isHqStageId(current.stage) ? current.stage : DEFAULT_HQ_STAGE;
  if (current.project) return { ok: false, error: 'in_progress', message: HQ_RELOCATE_ERROR_TEXT.in_progress };
  if (toStage === from) return { ok: false, error: 'same_stage', message: HQ_RELOCATE_ERROR_TEXT.same_stage };
  const check = evaluateHqRequirementsFrom(view, toStage);
  if (!check.reachable) return { ok: false, error: 'coming_soon', message: HQ_RELOCATE_ERROR_TEXT.coming_soon, check };
  if (!check.tier.met) return { ok: false, error: 'tier', message: `${HQ_RELOCATE_ERROR_TEXT.tier} (needs tier ${check.tier.need} ${getTierDef(check.tier.need).name}, you are tier ${check.tier.have}).`, check };
  if (check.building && !check.building.met) return { ok: false, error: 'building', message: `${HQ_RELOCATE_ERROR_TEXT.building} (${check.building.label}).`, check };
  return { ok: true, quote: quoteHqRelocation(from, toStage), check };
}

// ─── Project transitions (pure) ──────────────────────────────────────────────

export function startHqProject(
  hq: HeadquartersState,
  toStage: HqStageId,
  nowMs: number,
  opts: { seatIndex?: number; relocationId?: string; durationMs?: number } = {},
): HeadquartersState {
  const from = isHqStageId(hq.stage) ? hq.stage : DEFAULT_HQ_STAGE;
  const quote = quoteHqRelocation(from, toStage);
  const durationMs = typeof opts.durationMs === 'number' && Number.isFinite(opts.durationMs) && opts.durationMs >= 0 ? opts.durationMs : quote.durationMs;
  return {
    ...hq,
    project: {
      targetStage: toStage,
      startedAtMs: nowMs,
      completesAtMs: nowMs + durationMs,
      ...(typeof opts.seatIndex === 'number' ? { seatIndex: opts.seatIndex } : {}),
      ...(opts.relocationId ? { relocationId: opts.relocationId } : {}),
    },
  };
}

/** Flip a due project into the new seat. Not due / no project → same object. */
export function completeHqProject(hq: HeadquartersState, nowMs: number): HeadquartersState {
  const p = hq.project;
  if (!isValidHqProject(p) || p.completesAtMs > nowMs) return hq;
  const stage = getHqStage(p.targetStage as HqStageId);
  const next: HeadquartersState = { stage: stage.id, locationId: stage.locationId, movedAtMs: p.completesAtMs };
  if (HQ_SEAT_COUNTS[stage.id] > 0 && typeof p.seatIndex === 'number') next.seatIndex = p.seatIndex;
  return next;
}

export function hqProjectProgress(project: NonNullable<HeadquartersState['project']>, nowMs: number): { pct: number; etaSeconds: number } {
  const total = Math.max(1, project.completesAtMs - project.startedAtMs);
  const elapsed = Math.max(0, nowMs - project.startedAtMs);
  return {
    pct: Math.max(0, Math.min(100, (elapsed / total) * 100)),
    etaSeconds: Math.max(0, (project.completesAtMs - nowMs) / 1000),
  };
}

// ─── Mail (design §5: a named NPC regulator approves each charter) ──────────

const CHARTER_LINES: Readonly<Record<HqStageId, string>> = {
  earth_ops: 'The Accord Council\'s licensing office countersigns the return charter. Secretary-General Anatole Priest: "Welcome home. The pad is where you left it."',
  orbital_deck: 'The Syndicate-run station registry stamps the anchorage lease without ceremony. A note in the margin: "Sunrise every ninety minutes. Rent is due regardless."',
  lunar_hq: 'The Accord Council, seated on Luna, approves the charter under the Belt Rush infrastructure statutes. Speaker Iron Mara of the Belt Miners\' Guild adds: "Closer to the rocks. Closer to us."',
  mars_hq: 'The Meridian relay authority logs the charter. Dust season is noted in the margin.',
  jovian_hq: 'Outer Rim Insurance Mutual re-rates the corporation on the Jovian charter. Void Corsair traffic is noted.',
  saturnian_hq: 'Outer Rim Insurance Mutual re-rates the corporation on the Saturnian charter. "The quietest seat in the system."',
  deep_space_hq: 'The charter is filed with the Accord Council by relay. Reply lag: eleven hours.',
  interstellar_hq: 'No authority countersigns this charter. The corporation writes its own chapter.',
};

export function hqRelocationReportId(stage: HqStageId, completedAtMs: number): string {
  return `hq-move-${stage}-${Math.round(completedAtMs)}`;
}

export function hqRelocationReport(stage: HqStageId, completedAtMs: number, seatIndex?: number | null): GameReport {
  const def = getHqStage(stage);
  const seat = hqSeatLabel(stage, seatIndex);
  return {
    id: hqRelocationReportId(stage, completedAtMs),
    type: 'milestone',
    title: `Headquarters relocated — ${def.label}`,
    body: `The corporation is now seated at the ${def.label}${seat ? ` (${seat})` : ''}. ${CHARTER_LINES[stage]} ${def.lore}`,
    createdAt: completedAtMs,
    read: false,
    locationId: def.locationId,
  };
}

/** Client tick hook (game-engine.ts processFullTick): when the project's
 *  clock has run out, move in and post the charter mail. The server's own
 *  completion pass writes the same outcome; adoptServerHeadquarters below
 *  reconciles the two without a second mail. */
export function applyDueHqProject(state: GameState, nowMs: number = Date.now()): GameState {
  const hq = getHeadquarters(state);
  if (!hq.project || hq.project.completesAtMs > nowMs) return state;
  const moved = completeHqProject(hq, nowMs);
  const report = hqRelocationReport(moved.stage as HqStageId, moved.movedAtMs, moved.seatIndex);
  const reports = state.reports || [];
  return {
    ...state,
    headquarters: moved,
    reports: reports.some(r => r.id === report.id) ? reports : [...reports, report],
  };
}

// ─── Adopting the server's headquarters block (sync response) ───────────────

export interface ServerHeadquartersBlock {
  stage: string;
  locationId: string;
  seatIndex?: number | null;
  movedAtMs?: number | null;
  project?: { targetStage: string; startedAtMs: number; completesAtMs: number; seatIndex?: number | null; relocationId?: string | null } | null;
}

/** The server is authoritative for the seat (GameProfile.hqLocationId is
 *  written only by the completion pass). A valid block replaces the
 *  client's stage / seat / project; a completed move the client had not
 *  yet flipped gets its charter mail here (deduped by report id). Garbage
 *  leaves the state untouched. */
export function adoptServerHeadquarters(state: GameState, block: ServerHeadquartersBlock | null | undefined, nowMs: number = Date.now()): GameState {
  if (!block || typeof block !== 'object' || !isHqStageId(block.stage)) return state;
  const stage = getHqStage(block.stage);
  if (block.locationId !== stage.locationId) return state;
  const current = getHeadquarters(state);
  const next: HeadquartersState = {
    stage: stage.id,
    locationId: stage.locationId,
    movedAtMs: typeof block.movedAtMs === 'number' && Number.isFinite(block.movedAtMs) && block.movedAtMs >= 0
      ? block.movedAtMs
      : (current.stage === stage.id ? current.movedAtMs : nowMs),
  };
  if (typeof block.seatIndex === 'number' && Number.isFinite(block.seatIndex) && block.seatIndex >= 1) next.seatIndex = block.seatIndex;
  if (block.project && isValidHqProject({ ...block.project, seatIndex: block.project.seatIndex ?? undefined })) {
    next.project = {
      targetStage: block.project.targetStage,
      startedAtMs: block.project.startedAtMs,
      completesAtMs: block.project.completesAtMs,
      ...(typeof block.project.seatIndex === 'number' ? { seatIndex: block.project.seatIndex } : {}),
      ...(block.project.relocationId ? { relocationId: block.project.relocationId } : {}),
    };
  }
  const unchanged = current.stage === next.stage && current.seatIndex === next.seatIndex
    && current.movedAtMs === next.movedAtMs
    && (current.project?.completesAtMs ?? null) === (next.project?.completesAtMs ?? null)
    && (current.project?.targetStage ?? null) === (next.project?.targetStage ?? null);
  if (unchanged) return state;
  let reports = state.reports || [];
  // A move the server completed that this client had not flipped yet. The
  // server stamps movedAtMs with the project's scheduled completesAt (not
  // the cron's wall time), so a client that already flipped locally holds
  // the same report id and no second mail is posted.
  if (current.stage !== next.stage && !next.project) {
    const report = hqRelocationReport(next.stage as HqStageId, next.movedAtMs, next.seatIndex);
    if (!reports.some(r => r.id === report.id)) reports = [...reports, report];
  }
  return { ...state, headquarters: next, reports };
}

// ─── Upkeep + ladder helpers ────────────────────────────────────────────────

/** Monthly HQ upkeep for the seated stage ($ per game-month). */
export function hqUpkeepMonthly(state: Pick<GameState, 'headquarters' | 'createdAt'>): number {
  const stage = getHeadquarters(state).stage;
  return isHqStageId(stage) ? HQ_UPKEEP_MONTHLY[stage] : 0;
}

export interface HqLadderRow {
  stage: HqStageDef;
  check: HqRequirementCheck;
  quote: HqRelocationQuote | null;
  current: boolean;
  /** The in-flight project targets this stage. */
  inbound: boolean;
}

/** The ladder as the Bridge chip and the console show it, from client state
 *  alone (seat availability and live prices come from GET /hq). */
export function buildHqLadder(state: GameState): HqLadderRow[] {
  const hq = getHeadquarters(state);
  const view = hqRequirementViewFromState(state);
  const from = isHqStageId(hq.stage) ? hq.stage : DEFAULT_HQ_STAGE;
  return HQ_STAGES.map(stage => ({
    stage,
    check: evaluateHqRequirementsFrom(view, stage.id),
    quote: stage.id === from ? null : quoteHqRelocation(from, stage.id),
    current: stage.id === from,
    inbound: hq.project?.targetStage === stage.id,
  }));
}
