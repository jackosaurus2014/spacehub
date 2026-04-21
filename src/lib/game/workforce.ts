// ─── Space Tycoon: Workforce Management ─────────────────────────────────────
// Buildings need crew to operate efficiently. Workers cost salary but boost output.

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
  /** Global crew morale 0-1. Default 0.8. Modifies all outputs. */
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
  morale: 0.8,
  fatigue: 0,
  trainingLevel: 0.5,
  trainingBudgetPerCrew: 0,
};

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

  const morale = workforce.morale ?? 0.8;
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
    moraleMultiplier: Math.max(0.5, Math.min(1.2, morale)),  // morale boost/penalty on outputs
  };
}

/** Cost to hire one worker */
export function getHireCost(type: WorkerType): number {
  const def = WORKER_MAP.get(type);
  if (!def) return 0;
  return def.salary * 6; // 6 months salary as signing bonus
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
