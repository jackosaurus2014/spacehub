// ─── Space Tycoon: Workforce Management ─────────────────────────────────────
// Buildings need crew to operate efficiently. Workers cost salary but boost output.
//
// Audit Wave B (A10): morale/fatigue/trainingLevel now have WRITERS
// (updateCrewWellbeing, called monthly by game-engine) instead of being
// orphan inputs pinned at a hidden -20% revenue tax. Baseline morale is 1.0
// and the multiplier band is 0.8–1.15 per the audit spec, so morale is a
// managed stat, not a stealth penalty.

import type { GameState } from './types';

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
 * Cost to hire one worker.
 * Audit A8: pass `state` to apply an active espionage headhunt voucher
 * (employee_headhunt reward — 50% off the next hire). Omitting `state`
 * returns the undiscounted cost (back-compat with existing call sites;
 * page.tsx:1767 should pass `state` — flagged for the UI wave).
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
 *   negative cash -0.10; fatigue >0.6 -0.03; any training budget +0.01.
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

  const total = base + buildingCap + locationCap + researchCap + legacyBonusCrew;
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
): { allowed: boolean; reason?: string; capacity: ReturnType<typeof getCrewCapacity> } {
  const capacity = getCrewCapacity(completedBuildingCount, unlockedLocationCount, completedResearchCount, legacyBonusCrew);
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
