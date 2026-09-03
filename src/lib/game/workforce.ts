// ─── Space Tycoon: Workforce Management ─────────────────────────────────────
// Buildings need crew to operate efficiently. Workers cost salary but boost output.
//
// Audit Wave B (A10): morale/fatigue/trainingLevel now have WRITERS
// (updateCrewWellbeing, called monthly by game-engine) instead of being
// orphan inputs pinned at a hidden -20% revenue tax. Baseline morale is 1.0
// and the multiplier band is 0.8–1.15 per the audit spec, so morale is a
// managed stat, not a stealth penalty.

import type { GameState, BuildingInstance } from './types';
import { BUILDING_MAP, getBuildingCrew } from './buildings';
import { SHIP_MAP, getShipCrew, type ShipInstance } from './ships';

export type WorkerType = 'engineer' | 'scientist' | 'miner' | 'operator'
  | 'pilot' | 'negotiator' | 'security' | 'medic';

export interface WorkerDefinition {
  type: WorkerType;
  name: string;
  icon: string;
  salary: number; // Monthly cost per worker
  description: string;
  bonus: {
    buildSpeed?: number;    // e.g., 0.1 = +10% faster construction
    researchSpeed?: number; // +% research speed
    miningOutput?: number;  // +% resource production
    serviceRevenue?: number;// +% service revenue
    contractPayBonus?: number; // +% contract payouts (negotiators)
    hazardMitigation?: number; // +% hazard damage absorbed (security, medics)
    crewSurvival?: number;     // reduces crew-loss on disasters (medics)
    shipEfficiency?: number;   // improves ship ops (pilots)
  };
}

export const WORKER_TYPES: WorkerDefinition[] = [
  {
    type: 'engineer', name: 'Engineer', icon: '👷', salary: 500_000,
    description: 'Reduces construction time and improves building efficiency.',
    bonus: { buildSpeed: 0.1, serviceRevenue: 0.05 },
  },
  {
    type: 'scientist', name: 'Scientist', icon: '🔬', salary: 500_000,
    description: 'Accelerates research and improves AI datacenter output.',
    bonus: { researchSpeed: 0.15, serviceRevenue: 0.05 },
  },
  {
    type: 'miner', name: 'Miner', icon: '⛏️', salary: 400_000,
    description: 'Boosts resource extraction from mining operations.',
    bonus: { miningOutput: 0.2 },
  },
  {
    type: 'operator', name: 'Operator', icon: '🎯', salary: 450_000,
    description: 'Improves service revenue from satellites and stations.',
    bonus: { serviceRevenue: 0.1 },
  },
  // ── Phase III additions ──────────────────────────────────────────
  {
    type: 'pilot', name: 'Pilot', icon: '🧑‍✈️', salary: 550_000,
    description: 'Ship operations specialist. Improves travel speed and cargo throughput.',
    bonus: { shipEfficiency: 0.08, serviceRevenue: 0.03 },
  },
  {
    type: 'negotiator', name: 'Negotiator', icon: '🤝', salary: 600_000,
    description: 'Secures better terms on contracts and faction dealings.',
    bonus: { contractPayBonus: 0.10, serviceRevenue: 0.04 },
  },
  {
    type: 'security', name: 'Security Officer', icon: '🛡️', salary: 450_000,
    description: 'Reduces damage from pirate raids and internal incidents.',
    bonus: { hazardMitigation: 0.08 },
  },
  {
    type: 'medic', name: 'Medic', icon: '🩺', salary: 500_000,
    description: 'Keeps crew healthy; reduces casualties in disasters.',
    bonus: { crewSurvival: 0.12, hazardMitigation: 0.04 },
  },
];

export const WORKER_MAP = new Map(WORKER_TYPES.map(w => [w.type, w]));

export interface WorkforceState {
  engineers: number;
  scientists: number;
  miners: number;
  operators: number;
  // Phase III additions (all optional — existing saves continue to work)
  pilots?: number;
  negotiators?: number;
  securitys?: number;   // pluralized for consistency with helper function that builds key as `${type}s`
  medics?: number;
  /** Global crew morale. Default 1.0 (audit A10 — the old 0.8 default was a
   *  hidden tax with no writer). Multiplier band clamps to 0.8-1.15. */
  morale?: number;
  /** Accumulated fatigue 0-1. Penalty when high. */
  fatigue?: number;
  /** Training level 0-1. Multiplies bonuses. Default 0.5 (meh). */
  trainingLevel?: number;
  /** Monthly training budget per crew member. More budget → faster training growth. */
  trainingBudgetPerCrew?: number;
}

export const DEFAULT_WORKFORCE: WorkforceState = {
  engineers: 0,
  scientists: 0,
  miners: 0,
  operators: 0,
  pilots: 0,
  negotiators: 0,
  securitys: 0,
  medics: 0,
  morale: 1.0, // audit A10: baseline 1.0, not the old hidden 0.8 tax
  fatigue: 0,
  trainingLevel: 0.5,
  trainingBudgetPerCrew: 0,
};

/** Total crew headcount across all worker types. */
export function getTotalCrew(workforce: WorkforceState): number {
  let total = 0;
  for (const wDef of WORKER_TYPES) {
    total += (workforce[`${wDef.type}s` as keyof WorkforceState] as number | undefined) || 0;
  }
  return total;
}

/** Calculate total monthly salary for all workers */
export function getMonthlyPayroll(workforce: WorkforceState): number {
  let total = 0;
  for (const wDef of WORKER_TYPES) {
    total += (workforce[`${wDef.type}s` as keyof WorkforceState] || 0) * wDef.salary;
  }
  return total;
}

/** Calculate aggregate bonuses from workforce. Morale and trainingLevel
 *  multiply per-worker bonuses (so a 0.5-training crew delivers half their
 *  paper output, and low-morale crew drops further). */
export function getWorkforceBonuses(workforce: WorkforceState): {
  buildSpeed: number;
  researchSpeed: number;
  miningOutput: number;
  serviceRevenue: number;
  contractPayBonus: number;
  hazardMitigation: number;
  crewSurvival: number;
  shipEfficiency: number;
  moraleMultiplier: number;     // universal multiplier applied elsewhere
} {
  let buildSpeed = 0, researchSpeed = 0, miningOutput = 0, serviceRevenue = 0;
  let contractPayBonus = 0, hazardMitigation = 0, crewSurvival = 0, shipEfficiency = 0;

  const morale = workforce.morale ?? 1.0; // audit A10: default 1.0
  const fatigue = workforce.fatigue ?? 0;
  const training = workforce.trainingLevel ?? 0.5;
  // Effective bonus scale: trained and morale-rich crew deliver more per head.
  const bonusScale = (0.5 + training) * (1 - fatigue * 0.5);

  for (const wDef of WORKER_TYPES) {
    const count = workforce[`${wDef.type}s` as keyof WorkforceState] as number | undefined;
    const n = typeof count === 'number' ? count : 0;
    if (wDef.bonus.buildSpeed)       buildSpeed       += wDef.bonus.buildSpeed       * n * bonusScale;
    if (wDef.bonus.researchSpeed)    researchSpeed    += wDef.bonus.researchSpeed    * n * bonusScale;
    if (wDef.bonus.miningOutput)     miningOutput     += wDef.bonus.miningOutput     * n * bonusScale;
    if (wDef.bonus.serviceRevenue)   serviceRevenue   += wDef.bonus.serviceRevenue   * n * bonusScale;
    if (wDef.bonus.contractPayBonus) contractPayBonus += wDef.bonus.contractPayBonus * n * bonusScale;
    if (wDef.bonus.hazardMitigation) hazardMitigation += wDef.bonus.hazardMitigation * n * bonusScale;
    if (wDef.bonus.crewSurvival)     crewSurvival     += wDef.bonus.crewSurvival     * n * bonusScale;
    if (wDef.bonus.shipEfficiency)   shipEfficiency   += wDef.bonus.shipEfficiency   * n * bonusScale;
  }

  return {
    buildSpeed: Math.min(buildSpeed, 0.5),
    researchSpeed: Math.min(researchSpeed, 0.5),
    miningOutput: Math.min(miningOutput, 1.0),
    serviceRevenue: Math.min(serviceRevenue, 0.5),
    contractPayBonus: Math.min(contractPayBonus, 0.5),
    hazardMitigation: Math.min(hazardMitigation, 0.8),
    crewSurvival: Math.min(crewSurvival, 0.9),
    shipEfficiency: Math.min(shipEfficiency, 0.5),
    // Audit A10: multiplier band 0.8-1.15 per spec — morale can now be a
    // small bonus (well-run crew) or a bounded penalty, never a stealth tax.
    moraleMultiplier: Math.max(0.8, Math.min(1.15, morale)),
  };
}

// ─── Row 6: per-building / per-hull crew requirements ───────────────────────
// docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 6. Labor demand used to cap near
// ~19 heads for ANY corporation (BALANCE.md H2): the bonus caps above are
// reached at 10 engineers / 5 miners / ~4 scientists, so a rational player
// hired the same crew at 3 buildings and at 34. Buildings and hulls now name
// the heads they need; the shortfall is priced as an efficiency multiplier on
// service revenue and mining output (game-engine.ts), and payroll charges the
// heads actually hired — so crewing up is a real, scaling money sink with a
// real benefit, and the wage index finally responds to fleet growth.

/** Required headcount by role. Only the roles a fleet actually demands appear. */
export type RequiredCrew = Partial<Record<WorkerType, number>>;

/** Roles that a fleet can demand (buildings: 4 operating roles; ships: pilots
 *  + engineers). Negotiators/security/medics are discretionary corporate
 *  staff with no requirement — hiring them is a pure choice. */
export const CREWED_ROLES: readonly WorkerType[] = ['engineer', 'operator', 'scientist', 'miner', 'pilot'];

/** Buildings count only when COMPLETE (a construction site has a contractor
 *  crew, not an operating one) and only while operational — a mothballed rig
 *  produces nothing and is therefore not staffed. Ships count once built. */
export function getRequiredCrew(
  buildings: ReadonlyArray<Pick<BuildingInstance, 'definitionId' | 'isComplete' | 'status'>> | undefined,
  ships: ReadonlyArray<Pick<ShipInstance, 'definitionId' | 'isBuilt'>> | undefined,
): RequiredCrew {
  const out: RequiredCrew = {};
  const add = (role: WorkerType, n: number | undefined) => {
    if (!n) return;
    out[role] = (out[role] || 0) + n;
  };
  for (const b of buildings || []) {
    if (b.isComplete === false) continue;
    if (b.status && b.status !== 'active') continue;   // mothballed / decommissioning
    const def = BUILDING_MAP.get(b.definitionId);
    if (!def) continue;
    const c = getBuildingCrew(def);
    add('engineer', c.engineers);
    add('operator', c.operators);
    add('scientist', c.scientists);
    add('miner', c.miners);
  }
  for (const sh of ships || []) {
    if (!sh.isBuilt) continue;
    const def = SHIP_MAP.get(sh.definitionId);
    if (!def) continue;
    const c = getShipCrew(def);
    add('pilot', c.pilots);
    add('engineer', c.engineers);
  }
  return out;
}

export function getRequiredCrewTotal(required: RequiredCrew): number {
  let t = 0;
  for (const role of CREWED_ROLES) t += required[role] || 0;
  return t;
}

/** Efficiency multiplier at zero staffing. A skeleton crew still keeps the
 *  lights on — an unstaffed corporation is halved, never zeroed (CLAUDE.md:
 *  hazards destroy things, understaffing is an economic decision). */
export const STAFFING_FLOOR = 0.5;
/** The Protected Frontier's floor: a new corporation is never punished for a
 *  crewing bill it has not learned about yet (matches the other Frontier
 *  shields — service-pricing's pool floor, mining's spot floor). */
export const STAFFING_FRONTIER_FLOOR = 0.7;

export interface StaffingReport {
  required: RequiredCrew;
  hired: Partial<Record<WorkerType, number>>;
  /** hired ÷ required per demanded role, clamped to 0..1. */
  ratioByRole: Partial<Record<WorkerType, number>>;
  /** The binding role — the one holding the multiplier down. */
  worstRole: WorkerType | null;
  /** min over demanded roles of ratioByRole (1 when nothing is demanded). */
  minRatio: number;
  /** The multiplier applied to service revenue and mining output. */
  efficiency: number;
  /** Open positions by role (required − hired, never negative). */
  shortfallByRole: Partial<Record<WorkerType, number>>;
  totalRequired: number;
  totalHired: number;
}

/**
 * Row 6 core: staffing ratio per role, the binding role, and the resulting
 * efficiency multiplier. Linear from STAFFING_FLOOR at zero staffing to 1.0
 * at full — never above 1.0 (no overstaffing bonus; surplus crew is pure
 * payroll, which is the point of the decision). `frontierFloor` raises the
 * floor to 0.7 for a Protected-Frontier corporation.
 */
export function getStaffingReport(
  workforce: WorkforceState | undefined,
  required: RequiredCrew,
  frontierProtected: boolean = false,
): StaffingReport {
  const hired: Partial<Record<WorkerType, number>> = {};
  for (const role of CREWED_ROLES) {
    const v = workforce ? (workforce[`${role}s` as keyof WorkforceState] as number | undefined) : 0;
    hired[role] = typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  const ratioByRole: Partial<Record<WorkerType, number>> = {};
  const shortfallByRole: Partial<Record<WorkerType, number>> = {};
  let minRatio = 1;
  let worstRole: WorkerType | null = null;
  let totalRequired = 0;
  let totalHired = 0;

  for (const role of CREWED_ROLES) {
    const need = Math.max(0, Math.round(required[role] || 0));
    const have = hired[role] || 0;
    totalHired += have;
    if (need <= 0) continue;
    totalRequired += need;
    const ratio = Math.max(0, Math.min(1, have / need));
    ratioByRole[role] = ratio;
    shortfallByRole[role] = Math.max(0, need - have);
    if (ratio < minRatio) { minRatio = ratio; worstRole = role; }
  }

  const floor = frontierProtected ? STAFFING_FRONTIER_FLOOR : STAFFING_FLOOR;
  const efficiency = totalRequired === 0
    ? 1
    : Math.min(1, Math.max(floor, floor + (1 - floor) * minRatio));

  return {
    required, hired, ratioByRole, worstRole,
    minRatio: totalRequired === 0 ? 1 : minRatio,
    efficiency,
    shortfallByRole, totalRequired, totalHired,
  };
}

/** Convenience: the multiplier alone, straight off a GameState. */
export function getStaffingEfficiency(
  state: Pick<GameState, 'workforce' | 'buildings' | 'ships'>,
  frontierProtected: boolean = false,
): number {
  return getStaffingReport(
    state.workforce,
    getRequiredCrew(state.buildings, state.ships),
    frontierProtected,
  ).efficiency;
}

// ─── Espionage headhunt voucher (audit A8) ──────────────────────────────────
// EspionageMission.reward 'headhunt_voucher' (employee_headhunt) is delivered
// via sync → server-effects → state.activeIntelPerks. Consumed here.

/** Returns the active headhunt voucher perk, if any. */
export function getActiveHeadhuntVoucher(
  state: Pick<GameState, 'activeIntelPerks'>,
  now: number = Date.now(),
): { discount: number; expiresAtMs: number } | null {
  const perk = (state.activeIntelPerks || []).find(
    p => p.type === 'headhunt_voucher' && p.expiresAtMs > now,
  );
  return perk ? { discount: perk.discount, expiresAtMs: perk.expiresAtMs } : null;
}

/** Remove one headhunt voucher (call after a discounted hire — one-time use). */
export function consumeHeadhuntVoucher(state: GameState, now: number = Date.now()): GameState {
  const perks = state.activeIntelPerks || [];
  const idx = perks.findIndex(p => p.type === 'headhunt_voucher' && p.expiresAtMs > now);
  if (idx === -1) return state;
  return {
    ...state,
    activeIntelPerks: [...perks.slice(0, idx), ...perks.slice(idx + 1)],
  };
}

/**
 * BASE cost to hire one worker (6-month signing bonus at base salary,
 * espionage headhunt voucher applied when `state` is passed).
 *
 * Balance Pass 4 (docs/BALANCE.md "Pass 4"): the REAL charged hire price is
 * this × the live wage index — labor-market.ts's getHireCostWithWageIndex
 * (Frontier corps capped at neutral 1.0). UI displays and hire handlers must
 * go through that wrapper; this function stays wage-index-free only because
 * labor-market.ts already depends on this module (importing it back here
 * would cycle).
 *
 * Audit A8: pass `state` to apply an active espionage headhunt voucher
 * (employee_headhunt reward — 50% off the next hire). Omitting `state`
 * returns the undiscounted cost (back-compat with existing call sites).
 */
export function getHireCost(type: WorkerType, state?: GameState, now: number = Date.now()): number {
  const def = WORKER_MAP.get(type);
  if (!def) return 0;
  const base = def.salary * 6; // 6 months salary as signing bonus
  if (state) {
    const voucher = getActiveHeadhuntVoucher(state, now);
    if (voucher) return Math.round(base * (1 - Math.min(0.9, Math.max(0, voucher.discount))));
  }
  return base;
}

// ─── Crew wellbeing writer (audit A10) ──────────────────────────────────────

export interface CrewWellbeingInputs {
  /** Crew headcount / crew capacity (0..N). High utilization builds fatigue. */
  utilization: number;
  /** Hostile hazards that struck in the last game-month. */
  recentHazardCount: number;
  /** True when the corporation is running a negative cash balance (missed payroll pressure). */
  cashNegative: boolean;
  /** W13 (Corporate Doctrine & Board Politics): additive morale contribution
   *  from workforce-constituency approval (corporate-doctrine.ts
   *  getConstituencyMoraleModifier) — board politics feeding this existing
   *  writer per docs/4X_BASELINE_2026-08.md §1.7, not a new stat. Optional
   *  and bounded (±0.05 by the caller); omitted/0 reproduces pre-W13
   *  behavior exactly. */
  constituencyMoraleDelta?: number;
}

/**
 * Monthly crew wellbeing update — the writer the audit found missing
 * ("morale/fatigue/trainingLevel/trainingBudgetPerCrew are read and rendered
 * but no writer exists", audit §1d-2). Called once per game-month from
 * game-engine.processTick. Pure & deterministic (no RNG).
 *
 * Balance (conservative, documented — audit gave the band but not rates):
 * - trainingLevel: +0.005 per $100K/crew/month budget, capped +0.05/mo;
 *   decays -0.005/mo with zero budget. Range 0-1.
 * - fatigue: rises with crew utilization (>90% capacity: +0.06/mo,
 *   >70%: +0.03), recovers when slack (<50%: -0.06, else -0.02). Medics
 *   reduce fatigue GROWTH by 10% each (max -50%). Range 0-1.
 * - morale: drifts +0.02/mo toward 1.0; hazards -0.05 each (max -0.10/mo);
 *   negative cash -0.10; fatigue >0.6 -0.03; any training budget +0.01;
 *   W13: constituency-approval deviation ±0.05 (corporate-doctrine.ts).
 *   Range 0.5-1.15 (multiplier band 0.8-1.15 in getWorkforceBonuses).
 */
export function updateCrewWellbeing(
  workforce: WorkforceState,
  inputs: CrewWellbeingInputs,
): WorkforceState {
  const budget = Math.max(0, workforce.trainingBudgetPerCrew ?? 0);
  const training = workforce.trainingLevel ?? 0.5;
  const fatigue = workforce.fatigue ?? 0;
  const morale = workforce.morale ?? 1.0;
  const medics = workforce.medics ?? 0;

  // Training
  const trainingGain = budget > 0
    ? Math.min(0.05, (budget / 100_000) * 0.005)
    : -0.005;
  const newTraining = Math.max(0, Math.min(1, training + trainingGain));

  // Fatigue
  const util = Math.max(0, inputs.utilization);
  let fatigueDelta: number;
  if (util > 0.9) fatigueDelta = 0.06;
  else if (util > 0.7) fatigueDelta = 0.03;
  else if (util < 0.5) fatigueDelta = -0.06;
  else fatigueDelta = -0.02;
  if (fatigueDelta > 0) {
    const medicRelief = Math.min(0.5, medics * 0.1);
    fatigueDelta *= (1 - medicRelief);
  }
  const newFatigue = Math.max(0, Math.min(1, fatigue + fatigueDelta));

  // Morale: drifts back toward the 1.0 baseline from below, and slowly decays
  // toward it from above unless actively maintained (training budget + a
  // rested crew are what push and hold morale in the 1.0-1.15 bonus band).
  let moraleDelta = morale < 1.0 ? Math.min(0.02, 1.0 - morale) : (morale > 1.0 ? -Math.min(0.01, morale - 1.0) : 0);
  moraleDelta -= Math.min(0.10, inputs.recentHazardCount * 0.05);
  if (inputs.cashNegative) moraleDelta -= 0.10;
  if (newFatigue > 0.6) moraleDelta -= 0.03;
  if (budget > 0) moraleDelta += 0.01;
  if (newFatigue < 0.2) moraleDelta += 0.01;
  // W13: board-politics constituency approval, additive and separately bounded.
  moraleDelta += inputs.constituencyMoraleDelta ?? 0;
  const newMorale = Math.max(0.5, Math.min(1.15, morale + moraleDelta));

  return {
    ...workforce,
    trainingLevel: Math.round(newTraining * 1000) / 1000,
    fatigue: Math.round(newFatigue * 1000) / 1000,
    morale: Math.round(newMorale * 1000) / 1000,
  };
}

/**
 * Calculate max crew capacity based on infrastructure.
 * Each completed building supports a certain number of crew.
 * Players can't spam workers beyond what their buildings can house.
 */
export function getCrewCapacity(
  completedBuildingCount: number,
  unlockedLocationCount: number,
  completedResearchCount: number,
  legacyBonusCrew: number = 0,
  /** Construction Purposes wave: summed crewQuarters capability from
   *  habitats/stations (building-capabilities.getCapabilityCrewQuarters). */
  capabilityCrewQuarters: number = 0,
): {
  total: number;
  perType: number;
  breakdown: { source: string; amount: number }[];
} {
  const breakdown: { source: string; amount: number }[] = [];

  // Base: 2 crew (enough for 1 of each starter type)
  const base = 2;
  breakdown.push({ source: 'Base capacity', amount: base });

  // +1 per completed building (each building has workstations)
  const buildingCap = completedBuildingCount;
  if (buildingCap > 0) breakdown.push({ source: `${completedBuildingCount} buildings`, amount: buildingCap });

  // +2 per unlocked location beyond Earth (colony housing)
  const locationCap = Math.max(0, unlockedLocationCount - 1) * 2;
  if (locationCap > 0) breakdown.push({ source: `${unlockedLocationCount - 1} off-world locations`, amount: locationCap });

  // +1 per 3 completed research (advanced crew quarters tech)
  const researchCap = Math.floor(completedResearchCount / 3);
  if (researchCap > 0) breakdown.push({ source: `${completedResearchCount} research`, amount: researchCap });

  // Legacy milestone bonus crew slots
  if (legacyBonusCrew > 0) {
    breakdown.push({ source: 'Legacy milestones', amount: legacyBonusCrew });
  }

  // Construction Purposes wave: dedicated crew housing (habitats, stations,
  // agri/life-support works with the crewQuarters capability).
  if (capabilityCrewQuarters > 0) {
    breakdown.push({ source: 'Habitat crew quarters', amount: capabilityCrewQuarters });
  }

  const total = base + buildingCap + locationCap + researchCap + legacyBonusCrew + capabilityCrewQuarters;
  // Per-type cap = total / 2 (can't put all eggs in one basket)
  const perType = Math.max(1, Math.ceil(total / 2));

  return { total, perType, breakdown };
}

/**
 * Check if a player can hire more of a specific worker type.
 */
export function canHireWorker(
  workforce: WorkforceState,
  type: WorkerType,
  completedBuildingCount: number,
  unlockedLocationCount: number,
  completedResearchCount: number,
  legacyBonusCrew: number = 0,
  capabilityCrewQuarters: number = 0,
): { allowed: boolean; reason?: string; capacity: ReturnType<typeof getCrewCapacity> } {
  const capacity = getCrewCapacity(completedBuildingCount, unlockedLocationCount, completedResearchCount, legacyBonusCrew, capabilityCrewQuarters);
  const currentTotal = workforce.engineers + workforce.scientists + workforce.miners + workforce.operators;
  const currentOfType = workforce[`${type}s` as keyof WorkforceState] || 0;

  if (currentTotal >= capacity.total) {
    return { allowed: false, reason: `Crew full (${currentTotal}/${capacity.total}). Build more to expand.`, capacity };
  }
  if (currentOfType >= capacity.perType) {
    return { allowed: false, reason: `Max ${capacity.perType} ${type}s. Diversify your crew or build more.`, capacity };
  }
  return { allowed: true, capacity };
}
