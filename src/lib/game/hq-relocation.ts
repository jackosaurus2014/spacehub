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
import { SHIP_MAP } from './ships';
import { REAL_MS_PER_GAME_MONTH } from './server-time';
import {
  DEFAULT_HQ_STAGE,
  HQ_RELOCATION,
  HQ_RETURN_COST_FRACTION,
  HQ_SEAT_BASE_PRICE,
  HQ_SEAT_COUNTS,
  HQ_SEAT_TERM_MONTHS,
  HQ_SEAT_UPKEEP_GRACE_MONTHS,
  HQ_STAGES,
  HQ_UPKEEP_MONTHLY,
  getHeadquarters,
  hqSeatIsAuctioned,
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

/** CC-3: a research gate — every id must be COMPLETE (ServerAsset research
 *  rows on the server, state.completedResearch on the client). */
export interface HqResearchRequirement {
  researchIds: readonly string[];
  label: string;
}

/** CC-3: a hull gate — the corporation must own (built or building) at
 *  least one ship of any listed definition. */
export interface HqShipRequirement {
  definitionIds: readonly string[];
  label: string;
}

/** CC-4: an EXPEDITION gate — the corporation must have brought at least
 *  `minCompleted` interstellar expeditions to a terminal success (returned
 *  to Sol with its survey, or committed its ark to founding a colony). The
 *  count is a SERVER fact: prisma Expedition rows created by
 *  /api/space-tycoon/expeditions and advanced by the assets-complete cron
 *  (server-expeditions.ts). The client's own count stands in only while
 *  signed out — the relocate route never reads it. */
export interface HqExpeditionRequirement {
  minCompleted: number;
  label: string;
}

export interface HqStageRequirement {
  building: HqBuildingRequirement | null;
  research?: HqResearchRequirement;
  ship?: HqShipRequirement;
  expedition?: HqExpeditionRequirement;
}

/**
 * Per-stage requirement beyond the tier gate (design §3). The seat
 * requirement is implicit: HQ_SEAT_COUNTS[stage] > 0, and for an auction
 * stage the seat must have been WON before the project may start.
 *
 * CC-3 note on the two rungs whose design words name a system that has no
 * server-verifiable completion signal yet:
 *  - Deep space, "Mothership-class flagship docked": there is no mothership
 *    hull in ships.ts. The nearest REAL signal is an interstellar-capable
 *    hull — the Starfarer-Class Explorer or the Colony Ark are the only two
 *    ships that can leave the heliosphere, they cost $25B/$80B, and a
 *    ServerAsset `ship` row proves ownership. That is the gate.
 *  - Interstellar, "completed interstellar expedition + colony charter":
 *    CC-3 had to stand this on a PROXY — expeditions lived only in the
 *    client save, so a completion signal would have been the client's word
 *    for it, and the gate settled for the charter half alone (the
 *    `interstellar_colonization` research plus a Colony Ark hull).
 *    CC-4 retired that proxy. Expeditions now carry a server record
 *    (prisma Expedition, created by /api/space-tycoon/expeditions and
 *    advanced on the clock by the assets-complete cron), so the gate is the
 *    design's actual sentence: a genuinely COMPLETED interstellar
 *    expedition AND the colony charter. Both halves are server facts; a
 *    client that invents an expedition gains nothing, because the row it
 *    would have to forge is created and clocked by the server.
 */
export const HQ_STAGE_REQUIREMENTS: Readonly<Record<HqStageId, HqStageRequirement>> = {
  earth_ops: { building: null },
  orbital_deck: { building: { category: 'space_station', locations: ['leo'], label: 'Orbital Outpost in LEO' } },
  lunar_hq: { building: { category: 'space_station', locations: ['lunar_orbit', 'lunar_surface'], label: 'Lunar Gateway or Lunar Habitat' } },
  mars_hq: { building: { category: 'space_station', locations: ['mars_orbit', 'mars_surface'], label: 'Mars Orbital Station or Mars Habitat' } },
  jovian_hq: { building: { category: 'space_station', locations: ['jupiter_system'], label: 'Jovian Station' } },
  saturnian_hq: { building: { category: 'space_station', locations: ['saturn_system'], label: 'Kronos Station' } },
  deep_space_hq: {
    building: { category: 'space_station', locations: ['outer_system'], label: 'Deep Space Outpost' },
    ship: { definitionIds: ['starfarer_explorer', 'colony_ark'], label: 'An interstellar-capable hull docked' },
  },
  interstellar_hq: {
    building: { category: 'space_station', locations: ['outer_system'], label: 'Deep Space Outpost' },
    research: { researchIds: ['interstellar_colonization'], label: 'Interstellar Colonization charted' },
    ship: { definitionIds: ['colony_ark'], label: 'A Colony Ark built (the colony charter)' },
    expedition: { minCompleted: 1, label: 'An interstellar expedition completed (returned or colonized)' },
  },
};

/** The minimum a requirement check needs to know — built from GameState on
 *  the client (hqRequirementViewFromState) and from the persisted profile +
 *  ServerAsset registry on the server (never from the client's claims). */
export interface HqRequirementView {
  tier: number;
  buildings: ReadonlyArray<{ definitionId: string; locationId: string; isComplete: boolean }>;
  /** CC-3: completed research ids. */
  research?: readonly string[];
  /** CC-3: ship definition ids the corporation owns (built or building). */
  ships?: readonly string[];
  /** CC-4: interstellar expeditions this corporation has brought to a
   *  terminal SUCCESS. Server-counted (Expedition rows with a terminal
   *  status); the client's own tally stands in offline. */
  expeditionsCompleted?: number;
}

/** One named gate on the ladder row, in the player's words. */
export interface HqRequirementLine { label: string; met: boolean }

export interface HqRequirementCheck {
  stage: HqStageId;
  /** Not `comingSoon`. */
  reachable: boolean;
  tier: { need: number; have: number; met: boolean };
  building: HqRequirementLine | null;
  /** CC-3 gates (null when the stage has none). */
  research: HqRequirementLine | null;
  ship: HqRequirementLine | null;
  /** CC-4: the completed-expedition gate (interstellar only today). */
  expedition: HqRequirementLine | null;
  /** A seat in a finite pool must be held or claimed (server fact). */
  seatNeeded: boolean;
  /** CC-3: that seat must be WON at auction rather than claimed. */
  seatAuctioned: boolean;
  /** tier ∧ building ∧ research ∧ ship ∧ expedition ∧ reachable — seat
   *  availability is checked live against the pool, never here. */
  met: boolean;
}

/** CC-4: the client-side tally of terminally SUCCESSFUL expeditions —
 *  returned to Sol ('completed') or committed to a colony ('colonizing').
 *  A lost expedition never counts. Offline stand-in only: the server counts
 *  its own Expedition rows. */
export function countCompletedExpeditionsInState(state: Pick<GameState, 'expeditions'>): number {
  return (state.expeditions || []).filter(e => e && (e.phase === 'completed' || e.phase === 'colonizing')).length;
}

export function hqRequirementViewFromState(state: GameState): HqRequirementView {
  return {
    tier: checkCorporationTier(state),
    buildings: (state.buildings || []).map(b => ({ definitionId: b.definitionId, locationId: b.locationId, isComplete: !!b.isComplete })),
    research: state.completedResearch || [],
    ships: (state.ships || []).map(s => s.definitionId),
    expeditionsCompleted: countCompletedExpeditionsInState(state),
  };
}

export function hasHqRequiredBuilding(view: HqRequirementView, req: HqBuildingRequirement | null): boolean {
  if (!req) return true;
  return view.buildings.some(b => b.isComplete && req.locations.includes(b.locationId)
    && BUILDING_MAP.get(b.definitionId)?.category === req.category);
}

export function hasHqRequiredResearch(view: HqRequirementView, req: HqResearchRequirement | undefined): boolean {
  if (!req) return true;
  const done = new Set(view.research || []);
  return req.researchIds.every(id => done.has(id));
}

export function hasHqRequiredShip(view: HqRequirementView, req: HqShipRequirement | undefined): boolean {
  if (!req) return true;
  const owned = new Set(view.ships || []);
  return req.definitionIds.some(id => owned.has(id));
}

export function hasHqRequiredExpeditions(view: HqRequirementView, req: HqExpeditionRequirement | undefined): boolean {
  if (!req) return true;
  const have = typeof view.expeditionsCompleted === 'number' && Number.isFinite(view.expeditionsCompleted)
    ? Math.floor(view.expeditionsCompleted) : 0;
  return have >= req.minCompleted;
}

/** The player-facing name of a hull gate's cheapest satisfying hull — used
 *  when a requirement label needs to name the ship rather than the class. */
export function hqShipRequirementNames(req: HqShipRequirement | undefined): string {
  if (!req) return '';
  return req.definitionIds.map(id => SHIP_MAP.get(id)?.name || id).join(' or ');
}

export function evaluateHqRequirementsFrom(view: HqRequirementView, stageId: HqStageId): HqRequirementCheck {
  const stage = getHqStage(stageId);
  const req = HQ_STAGE_REQUIREMENTS[stageId];
  const tierMet = view.tier >= stage.tier;
  const buildingMet = hasHqRequiredBuilding(view, req.building);
  const researchMet = hasHqRequiredResearch(view, req.research);
  const shipMet = hasHqRequiredShip(view, req.ship);
  const expeditionMet = hasHqRequiredExpeditions(view, req.expedition);
  const reachable = !stage.comingSoon;
  return {
    stage: stageId,
    reachable,
    tier: { need: stage.tier, have: view.tier, met: tierMet },
    building: req.building ? { label: req.building.label, met: buildingMet } : null,
    research: req.research ? { label: req.research.label, met: researchMet } : null,
    ship: req.ship ? { label: req.ship.label, met: shipMet } : null,
    expedition: req.expedition ? { label: req.expedition.label, met: expeditionMet } : null,
    seatNeeded: HQ_SEAT_COUNTS[stageId] > 0,
    seatAuctioned: hqSeatIsAuctioned(stageId),
    met: reachable && tierMet && buildingMet && researchMet && shipMet && expeditionMet,
  };
}

export function evaluateHqRequirements(state: GameState, stageId: HqStageId): HqRequirementCheck {
  return evaluateHqRequirementsFrom(hqRequirementViewFromState(state), stageId);
}

/** Every named gate on a row, in ladder order — what the console and the
 *  Bridge chip render. The tier gate is always first. */
export function hqRequirementLines(check: HqRequirementCheck): HqRequirementLine[] {
  const out: HqRequirementLine[] = [{ label: `tier ${check.tier.need}`, met: check.tier.met }];
  if (check.building) out.push(check.building);
  if (check.research) out.push(check.research);
  if (check.ship) out.push(check.ship);
  if (check.expedition) out.push(check.expedition);
  return out;
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

export type HqRelocateError =
  | 'unknown_stage' | 'coming_soon' | 'same_stage' | 'in_progress'
  | 'tier' | 'building' | 'research' | 'ship' | 'expedition' | 'seat_auction';

export const HQ_RELOCATE_ERROR_TEXT: Readonly<Record<HqRelocateError, string>> = {
  unknown_stage: 'That is not a registered headquarters stage.',
  coming_soon: 'That stage is not open yet — it arrives in a later update.',
  same_stage: 'The headquarters is already seated there.',
  in_progress: 'A relocation is already under way — one project at a time, one headquarters per corporation.',
  tier: 'The corporation has not reached the tier this seat requires.',
  building: 'The required station at the destination is not complete.',
  research: 'The research this seat requires is not complete.',
  ship: 'The hull this seat requires is not in the fleet.',
  expedition: 'No interstellar expedition has come home yet — the seat at another star is earned by going there first.',
  seat_auction: 'Seats at this stage are sold at auction — win one before filing the relocation charter.',
};

export type HqRelocationRequestCheck =
  | { ok: true; quote: HqRelocationQuote; check: HqRequirementCheck }
  | { ok: false; error: HqRelocateError; message: string; check?: HqRequirementCheck };

export interface HqRelocationRequestOpts {
  /** CC-3: the corporation already holds a seat at the TARGET stage (a
   *  server fact — an auction win, or a lease it never gave up). Auction
   *  stages refuse the project without one. */
  heldSeatAtTarget?: boolean;
}

export function checkHqRelocationRequest(
  current: HeadquartersState,
  view: HqRequirementView,
  toStage: unknown,
  opts: HqRelocationRequestOpts = {},
): HqRelocationRequestCheck {
  if (!isHqStageId(toStage)) return { ok: false, error: 'unknown_stage', message: HQ_RELOCATE_ERROR_TEXT.unknown_stage };
  const from = isHqStageId(current.stage) ? current.stage : DEFAULT_HQ_STAGE;
  if (current.project) return { ok: false, error: 'in_progress', message: HQ_RELOCATE_ERROR_TEXT.in_progress };
  if (toStage === from) return { ok: false, error: 'same_stage', message: HQ_RELOCATE_ERROR_TEXT.same_stage };
  const check = evaluateHqRequirementsFrom(view, toStage);
  if (!check.reachable) return { ok: false, error: 'coming_soon', message: HQ_RELOCATE_ERROR_TEXT.coming_soon, check };
  if (!check.tier.met) return { ok: false, error: 'tier', message: `${HQ_RELOCATE_ERROR_TEXT.tier} (needs tier ${check.tier.need} ${getTierDef(check.tier.need).name}, you are tier ${check.tier.have}).`, check };
  if (check.building && !check.building.met) return { ok: false, error: 'building', message: `${HQ_RELOCATE_ERROR_TEXT.building} (${check.building.label}).`, check };
  if (check.research && !check.research.met) return { ok: false, error: 'research', message: `${HQ_RELOCATE_ERROR_TEXT.research} (${check.research.label}).`, check };
  if (check.ship && !check.ship.met) return { ok: false, error: 'ship', message: `${HQ_RELOCATE_ERROR_TEXT.ship} (${check.ship.label}).`, check };
  if (check.expedition && !check.expedition.met) return { ok: false, error: 'expedition', message: `${HQ_RELOCATE_ERROR_TEXT.expedition} (${check.expedition.label}).`, check };
  if (check.seatAuctioned && !opts.heldSeatAtTarget) {
    return { ok: false, error: 'seat_auction', message: `${HQ_RELOCATE_ERROR_TEXT.seat_auction} (${getHqStage(toStage).shortLabel})`, check };
  }
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

// ─── CC-3: server-side upkeep (pure half) ───────────────────────────────────
// The seat carries its own rent cursor: `upkeepPaidThrough` is the instant
// the seat is paid up to, and `missedMonths` counts consecutive unpayable
// charges. The cron (hq-relocation-server.ts chargeHqSeatUpkeep) charges ONE
// game-month per pass and advances the cursor, so a server that was asleep
// catches up rather than billing a lump.

export interface HqUpkeepRow {
  stage: HqStageId | string;
  upkeepPaidThroughMs: number | null;
  missedMonths: number;
  /** Lease start — the cursor's seed when the seat has never been charged. */
  seatSinceMs: number;
}

export interface HqUpkeepStatus {
  monthly: number;
  /** Months owed right now (0 when the cursor is in the future). */
  monthsDue: number;
  amountDue: number;
  paidThroughMs: number;
  missedMonths: number;
  graceMonths: number;
  /** Consecutive unpaid months remaining before the seat lapses. */
  graceRemaining: number;
  lapsed: boolean;
}

export function hqUpkeepStatus(row: HqUpkeepRow, nowMs: number): HqUpkeepStatus {
  const monthly = isHqStageId(row.stage) ? HQ_UPKEEP_MONTHLY[row.stage] : 0;
  const paidThroughMs = typeof row.upkeepPaidThroughMs === 'number' && Number.isFinite(row.upkeepPaidThroughMs)
    ? row.upkeepPaidThroughMs
    : (Number.isFinite(row.seatSinceMs) ? row.seatSinceMs : nowMs);
  const elapsed = Math.max(0, nowMs - paidThroughMs);
  const monthsDue = Math.floor(elapsed / REAL_MS_PER_GAME_MONTH);
  const missedMonths = Math.max(0, Math.floor(row.missedMonths || 0));
  return {
    monthly,
    monthsDue,
    amountDue: monthsDue * monthly,
    paidThroughMs,
    missedMonths,
    graceMonths: HQ_SEAT_UPKEEP_GRACE_MONTHS,
    graceRemaining: Math.max(0, HQ_SEAT_UPKEEP_GRACE_MONTHS - missedMonths),
    lapsed: missedMonths >= HQ_SEAT_UPKEEP_GRACE_MONTHS,
  };
}

/** After one unpayable charge: the new missed count, and whether the seat
 *  lapses now. Pure so the cron and the tests share one rule. */
export function hqUpkeepAfterMissedMonth(missedMonths: number): { missedMonths: number; lapsed: boolean } {
  const next = Math.max(0, Math.floor(missedMonths || 0)) + 1;
  return { missedMonths: next, lapsed: next >= HQ_SEAT_UPKEEP_GRACE_MONTHS };
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
