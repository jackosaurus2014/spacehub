// ─── Space Tycoon: Subsidiary System ────────────────────────────────────────
// Spin off specialized divisions to generate passive income and boost services.
// Each subsidiary has 3 upgrade tracks x 5 levels.
// Unlocks at Corporation tier (System 2). Max slots by corp tier.

import type { GameState, ServiceType } from './types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SubsidiaryType =
  | 'sub_launch'
  | 'sub_mining'
  | 'sub_telecom'
  | 'sub_tourism'
  | 'sub_fabrication'
  | 'sub_research';

export type UpgradeTrack = 'operations' | 'synergy' | 'efficiency';

export interface SubsidiaryDefinition {
  id: SubsidiaryType;
  name: string;
  description: string;
  icon: string;
  baseIncome: number;          // $/month base revenue
  setupCost: number;           // One-time creation cost
  targetServiceTypes: ServiceType[];  // Which service types get synergy bonuses
}

export interface SubsidiaryInstance {
  id: string;
  type: SubsidiaryType;
  createdAtMs: number;
  operations: number;   // 0-5 level
  synergy: number;      // 0-5 level
  efficiency: number;   // 0-5 level
}

// ─── Multiplier Tables ──────────────────────────────────────────────────────

/** Operations track: income multiplier at each level (0-5) */
const OPERATIONS_MULT: number[] = [1, 1.5, 2.2, 3.5, 5.5, 9];

/** Synergy track: service bonus fraction at each level (0-5) */
const SYNERGY_MULT: number[] = [0, 0.08, 0.18, 0.30, 0.45, 0.65];

/** Efficiency track: overhead reduction fraction at each level (0-5) */
const EFFICIENCY_MULT: number[] = [0, 0.10, 0.20, 0.32, 0.45, 0.60];

// ─── Upgrade Costs ──────────────────────────────────────────────────────────

/** Cost to upgrade each track to the next level. Index = target level (1-5). */
const UPGRADE_COSTS: Record<UpgradeTrack, number[]> = {
  operations: [0, 200_000_000, 800_000_000, 3_000_000_000, 12_000_000_000, 50_000_000_000],
  synergy:    [0, 150_000_000, 600_000_000, 2_500_000_000, 10_000_000_000, 40_000_000_000],
  efficiency: [0, 100_000_000, 400_000_000, 1_500_000_000, 6_000_000_000, 25_000_000_000],
};

// ─── Subsidiary Definitions ─────────────────────────────────────────────────

export const SUBSIDIARY_DEFS: SubsidiaryDefinition[] = [
  {
    id: 'sub_launch',
    name: 'Launch Services Corp',
    description: 'Dedicated launch subsidiary for commercial and government contracts.',
    icon: '🚀',
    baseIncome: 15_000_000,
    setupCost: 2_000_000_000,
    targetServiceTypes: ['launch_payload'],
  },
  {
    id: 'sub_mining',
    name: 'Stellar Mining Corp',
    description: 'Specialized resource extraction and processing division.',
    icon: '⛏️',
    baseIncome: 20_000_000,
    setupCost: 3_000_000_000,
    targetServiceTypes: ['mining_output'],
  },
  {
    id: 'sub_telecom',
    name: 'Orbital Comms Corp',
    description: 'Telecommunications and data relay subsidiary.',
    icon: '📡',
    baseIncome: 12_000_000,
    setupCost: 1_500_000_000,
    targetServiceTypes: ['telecom_service', 'sensor_service'],
  },
  {
    id: 'sub_tourism',
    name: 'Cosmic Tourism Corp',
    description: 'Premium space tourism and hospitality experiences.',
    icon: '🏖️',
    baseIncome: 18_000_000,
    setupCost: 2_500_000_000,
    targetServiceTypes: ['tourism'],
  },
  {
    id: 'sub_fabrication',
    name: 'Zero-G Manufacturing Corp',
    description: 'Orbital and surface manufacturing division.',
    icon: '🔧',
    baseIncome: 14_000_000,
    setupCost: 2_000_000_000,
    targetServiceTypes: ['fabrication_output'],
  },
  {
    id: 'sub_research',
    name: 'Advanced Research Institute',
    description: 'R&D arm generating tech licensing revenue.',
    icon: '🔬',
    baseIncome: 10_000_000,
    setupCost: 1_000_000_000,
    targetServiceTypes: ['ai_datacenter'],
  },
];

export const SUBSIDIARY_DEF_MAP = new Map(SUBSIDIARY_DEFS.map(d => [d.id, d]));

// ─── Slot Limits ────────────────────────────────────────────────────────────

/** Max subsidiary slots by corporation tier (tier 0-5+).
 *  System 2 corp tiers aren't implemented yet, so we infer tier from game progress. */
const MAX_SLOTS_BY_TIER: number[] = [0, 1, 2, 4, 6, 6];

/** Infer corporation tier from game state (simplified — until System 2 is implemented) */
export function inferCorpTier(state: GameState): number {
  const completedBuildings = state.buildings.filter(b => b.isComplete).length;
  const researchCount = state.completedResearch.length;
  const locationCount = state.unlockedLocations.length;

  if (state.totalEarned >= 500_000_000_000 && completedBuildings >= 50 && researchCount >= 50 && locationCount >= 11)
    return 5;
  if (state.totalEarned >= 100_000_000_000 && completedBuildings >= 30 && researchCount >= 30 && locationCount >= 8)
    return 4;
  if (state.totalEarned >= 10_000_000_000 && completedBuildings >= 15 && researchCount >= 15 && locationCount >= 5)
    return 3;
  if (state.totalEarned >= 1_000_000_000 && completedBuildings >= 5 && researchCount >= 5)
    return 2;
  return 1;
}

/** Get max subsidiary slots for current game state */
export function getMaxSubsidiarySlots(state: GameState): number {
  const tier = inferCorpTier(state);
  return MAX_SLOTS_BY_TIER[Math.min(tier, MAX_SLOTS_BY_TIER.length - 1)] || 0;
}

// ─── Income & Bonus Calculations ────────────────────────────────────────────

/** Calculate net income for a single subsidiary */
export function getSubsidiaryIncome(sub: SubsidiaryInstance, state: GameState): {
  grossIncome: number;
  overhead: number;
  netIncome: number;
} {
  const def = SUBSIDIARY_DEF_MAP.get(sub.type);
  if (!def) return { grossIncome: 0, overhead: 0, netIncome: 0 };

  const subsidiaries = state.subsidiaries || [];
  const subsidiaryCount = subsidiaries.length;

  // Gross income = base * operations multiplier
  const opsLevel = Math.min(sub.operations, 5);
  const grossIncome = Math.round(def.baseIncome * OPERATIONS_MULT[opsLevel]);

  // Overhead = ($5M + totalLevels * $500K) * (1 + (count-1)*0.15) * (1 - efficiencyReduction)
  const totalLevels = sub.operations + sub.synergy + sub.efficiency;
  const effLevel = Math.min(sub.efficiency, 5);
  const efficiencyReduction = EFFICIENCY_MULT[effLevel];
  const baseOverhead = 5_000_000 + totalLevels * 500_000;
  const scalingFactor = 1 + (subsidiaryCount - 1) * 0.15;
  const overhead = Math.round(baseOverhead * scalingFactor * (1 - efficiencyReduction));

  return {
    grossIncome,
    overhead,
    netIncome: grossIncome - overhead,
  };
}

/** Calculate total subsidiary service bonus for a given service type */
export function getSubsidiaryServiceBonus(
  subsidiaries: SubsidiaryInstance[],
  serviceType: ServiceType,
): number {
  let totalBonus = 0;
  for (const sub of subsidiaries) {
    const def = SUBSIDIARY_DEF_MAP.get(sub.type);
    if (!def) continue;
    if (!def.targetServiceTypes.includes(serviceType)) continue;
    const synLevel = Math.min(sub.synergy, 5);
    totalBonus += SYNERGY_MULT[synLevel];
  }
  return totalBonus;
}

/** Get total monthly income from all subsidiaries */
export function getTotalSubsidiaryIncome(state: GameState): number {
  const subsidiaries = state.subsidiaries || [];
  let total = 0;
  for (const sub of subsidiaries) {
    const { netIncome } = getSubsidiaryIncome(sub, state);
    total += netIncome;
  }
  return total;
}

// ─── Create & Upgrade ───────────────────────────────────────────────────────

/** Check if a subsidiary can be created */
export function canCreateSubsidiary(
  state: GameState,
  type: SubsidiaryType,
): { allowed: boolean; reason?: string } {
  const def = SUBSIDIARY_DEF_MAP.get(type);
  if (!def) return { allowed: false, reason: 'Unknown subsidiary type.' };

  const subsidiaries = state.subsidiaries || [];
  const maxSlots = getMaxSubsidiarySlots(state);

  if (subsidiaries.length >= maxSlots) {
    return { allowed: false, reason: `Max ${maxSlots} subsidiaries (upgrade corporation tier for more).` };
  }

  // Check if already owns this type
  if (subsidiaries.some(s => s.type === type)) {
    return { allowed: false, reason: 'Already own this subsidiary type.' };
  }

  if (state.money < def.setupCost) {
    return { allowed: false, reason: `Need ${formatCost(def.setupCost)} to establish.` };
  }

  return { allowed: true };
}

/** Create a new subsidiary. Returns updated state. */
export function createSubsidiary(
  state: GameState,
  type: SubsidiaryType,
): GameState {
  const def = SUBSIDIARY_DEF_MAP.get(type);
  if (!def) return state;

  const subsidiaries = [...(state.subsidiaries || [])];
  const instance: SubsidiaryInstance = {
    id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    createdAtMs: Date.now(),
    operations: 0,
    synergy: 0,
    efficiency: 0,
  };
  subsidiaries.push(instance);

  return {
    ...state,
    money: state.money - def.setupCost,
    totalSpent: state.totalSpent + def.setupCost,
    subsidiaries,
  };
}

/** Check if an upgrade can be purchased */
export function canUpgradeSubsidiary(
  state: GameState,
  subId: string,
  track: UpgradeTrack,
): { allowed: boolean; reason?: string; cost?: number } {
  const subsidiaries = state.subsidiaries || [];
  const sub = subsidiaries.find(s => s.id === subId);
  if (!sub) return { allowed: false, reason: 'Subsidiary not found.' };

  const currentLevel = sub[track];
  if (currentLevel >= 5) return { allowed: false, reason: 'Already at maximum level.' };

  const nextLevel = currentLevel + 1;
  const cost = UPGRADE_COSTS[track][nextLevel] || 0;

  if (state.money < cost) {
    return { allowed: false, reason: `Need ${formatCost(cost)}.`, cost };
  }

  return { allowed: true, cost };
}

/** Upgrade a subsidiary track. Returns updated state. */
export function upgradeSubsidiary(
  state: GameState,
  subId: string,
  track: UpgradeTrack,
): GameState {
  const subsidiaries = [...(state.subsidiaries || [])];
  const idx = subsidiaries.findIndex(s => s.id === subId);
  if (idx === -1) return state;

  const sub = { ...subsidiaries[idx] };
  const currentLevel = sub[track];
  if (currentLevel >= 5) return state;

  const nextLevel = currentLevel + 1;
  const cost = UPGRADE_COSTS[track][nextLevel] || 0;
  if (state.money < cost) return state;

  sub[track] = nextLevel;
  subsidiaries[idx] = sub;

  return {
    ...state,
    money: state.money - cost,
    totalSpent: state.totalSpent + cost,
    subsidiaries,
  };
}

/** Dissolve a subsidiary (no refund) */
export function dissolveSubsidiary(state: GameState, subId: string): GameState {
  const subsidiaries = (state.subsidiaries || []).filter(s => s.id !== subId);
  return { ...state, subsidiaries };
}

/** Get upgrade cost for display */
export function getUpgradeCost(track: UpgradeTrack, targetLevel: number): number {
  if (targetLevel < 1 || targetLevel > 5) return 0;
  return UPGRADE_COSTS[track][targetLevel] || 0;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCost(amount: number): string {
  if (amount >= 1_000_000_000_000) return `$${(amount / 1_000_000_000_000).toFixed(1)}T`;
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(0)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  return `$${amount.toLocaleString()}`;
}
