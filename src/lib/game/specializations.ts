// ─── Space Tycoon: Specialization Trees ─────────────────────────────────────
// 6 specialization paths with 5 tiers each. Players choose one primary
// (full 5 tiers) and one secondary (up to tier 3 at 75% effectiveness).
// Tier 5 capstone unlocks an exclusive building.

import type { GameState } from './types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SpecializationPath =
  | 'launch_magnate'
  | 'mining_baron'
  | 'data_overlord'
  | 'tourism_mogul'
  | 'fleet_commander'
  | 'fabrication_savant';

export interface SpecTier {
  tier: number;
  name: string;
  description: string;
  costMoney: number;
  costResources: Record<string, number>;
  bonusType: BonusType;
  bonusValue: number;
}

export type BonusType =
  | 'launch_revenue'
  | 'mining_output'
  | 'data_revenue'
  | 'tourism_revenue'
  | 'fleet_speed'
  | 'fabrication_output'
  | 'build_speed'
  | 'research_speed'
  | 'maintenance_reduction'
  | 'all_revenue';

export interface SpecCapstoneBuilding {
  id: string;
  name: string;
  description: string;
  cost: number;
  resourceCost: Record<string, number>;
  revenuePerMonth: number;
  maintenancePerMonth: number;
  requiredLocation: string;
}

export interface SpecializationDefinition {
  id: SpecializationPath;
  name: string;
  description: string;
  icon: string;
  tiers: SpecTier[];
  capstone: SpecCapstoneBuilding;
}

export interface SpecializationState {
  primary: { path: SpecializationPath; tier: number } | null;
  secondary: { path: SpecializationPath; tier: number } | null;
  respecCount: number;
}

export interface SpecializationBonuses {
  launchRevenue: number;     // multiplier
  miningOutput: number;      // multiplier
  dataRevenue: number;       // multiplier
  tourismRevenue: number;    // multiplier
  fleetSpeed: number;        // multiplier
  fabricationOutput: number; // multiplier
  buildSpeed: number;        // multiplier
  researchSpeed: number;     // multiplier
  maintenanceReduction: number; // 0-1 fraction reduction
  allRevenue: number;        // multiplier
}

// ─── Specialization Definitions ─────────────────────────────────────────────

export const SPECIALIZATIONS: SpecializationDefinition[] = [
  {
    id: 'launch_magnate',
    name: 'Launch Magnate',
    description: 'Master of rocket launches and payload delivery. Maximize launch revenue and reduce costs.',
    icon: '🚀',
    tiers: [
      { tier: 1, name: 'Launch Apprentice', description: '+10% launch service revenue', costMoney: 500_000_000, costResources: {}, bonusType: 'launch_revenue', bonusValue: 0.10 },
      { tier: 2, name: 'Launch Specialist', description: '+15% launch service revenue', costMoney: 2_000_000_000, costResources: { iron: 100, aluminum: 50 }, bonusType: 'launch_revenue', bonusValue: 0.15 },
      { tier: 3, name: 'Launch Expert', description: '+20% launch service revenue, -5% maintenance', costMoney: 10_000_000_000, costResources: { titanium: 50, iron: 200 }, bonusType: 'launch_revenue', bonusValue: 0.20 },
      { tier: 4, name: 'Launch Master', description: '+10% build speed', costMoney: 50_000_000_000, costResources: { titanium: 100, rare_earth: 30 }, bonusType: 'build_speed', bonusValue: 0.10 },
      { tier: 5, name: 'Launch Magnate', description: '+5% all revenue, unlocks Interplanetary Express Terminal', costMoney: 200_000_000_000, costResources: { titanium: 200, platinum_group: 20, exotic_materials: 5 }, bonusType: 'all_revenue', bonusValue: 0.05 },
    ],
    capstone: {
      id: 'capstone_interplanetary_express',
      name: 'Interplanetary Express Terminal',
      description: 'A hyper-efficient launch and transport hub that generates massive launch revenue.',
      cost: 100_000_000_000,
      resourceCost: { titanium: 300, platinum_group: 40, exotic_materials: 10 },
      revenuePerMonth: 200_000_000,
      maintenancePerMonth: 30_000_000,
      requiredLocation: 'earth_surface',
    },
  },
  {
    id: 'mining_baron',
    name: 'Mining Baron',
    description: 'Dominate resource extraction across the solar system. More output, better yields.',
    icon: '⛏️',
    tiers: [
      { tier: 1, name: 'Prospector', description: '+10% mining output', costMoney: 500_000_000, costResources: {}, bonusType: 'mining_output', bonusValue: 0.10 },
      { tier: 2, name: 'Mine Foreman', description: '+15% mining output', costMoney: 2_000_000_000, costResources: { iron: 150 }, bonusType: 'mining_output', bonusValue: 0.15 },
      { tier: 3, name: 'Mining Director', description: '+20% mining output', costMoney: 10_000_000_000, costResources: { titanium: 60, rare_earth: 20 }, bonusType: 'mining_output', bonusValue: 0.20 },
      { tier: 4, name: 'Mining Magnate', description: '+10% research speed', costMoney: 50_000_000_000, costResources: { titanium: 100, platinum_group: 15 }, bonusType: 'research_speed', bonusValue: 0.10 },
      { tier: 5, name: 'Mining Baron', description: '+5% all revenue, unlocks Autonomous Mining Swarm', costMoney: 200_000_000_000, costResources: { platinum_group: 30, exotic_materials: 8, helium3: 3 }, bonusType: 'all_revenue', bonusValue: 0.05 },
    ],
    capstone: {
      id: 'capstone_mining_swarm',
      name: 'Autonomous Mining Swarm',
      description: 'Self-replicating mining drones that extract resources from multiple locations simultaneously.',
      cost: 120_000_000_000,
      resourceCost: { titanium: 400, platinum_group: 50, exotic_materials: 15 },
      revenuePerMonth: 250_000_000,
      maintenancePerMonth: 40_000_000,
      requiredLocation: 'asteroid_belt',
    },
  },
  {
    id: 'data_overlord',
    name: 'Data Overlord',
    description: 'Control the flow of information across the solar system. Data is the new gold.',
    icon: '🖥️',
    tiers: [
      { tier: 1, name: 'Data Analyst', description: '+10% data center revenue', costMoney: 500_000_000, costResources: {}, bonusType: 'data_revenue', bonusValue: 0.10 },
      { tier: 2, name: 'Data Architect', description: '+15% data center revenue', costMoney: 2_000_000_000, costResources: { rare_earth: 15 }, bonusType: 'data_revenue', bonusValue: 0.15 },
      { tier: 3, name: 'Data Director', description: '+20% data center revenue, +5% research speed', costMoney: 10_000_000_000, costResources: { rare_earth: 40, titanium: 30 }, bonusType: 'data_revenue', bonusValue: 0.20 },
      { tier: 4, name: 'Data Commander', description: '+10% research speed', costMoney: 50_000_000_000, costResources: { rare_earth: 60, platinum_group: 10 }, bonusType: 'research_speed', bonusValue: 0.10 },
      { tier: 5, name: 'Data Overlord', description: '+5% all revenue, unlocks Quantum Data Nexus', costMoney: 200_000_000_000, costResources: { rare_earth: 100, platinum_group: 25, exotic_materials: 5 }, bonusType: 'all_revenue', bonusValue: 0.05 },
    ],
    capstone: {
      id: 'capstone_quantum_nexus',
      name: 'Quantum Data Nexus',
      description: 'A quantum-entangled data processing network spanning the solar system.',
      cost: 90_000_000_000,
      resourceCost: { rare_earth: 200, platinum_group: 35, exotic_materials: 8 },
      revenuePerMonth: 180_000_000,
      maintenancePerMonth: 25_000_000,
      requiredLocation: 'leo',
    },
  },
  {
    id: 'tourism_mogul',
    name: 'Tourism Mogul',
    description: 'Build the ultimate space tourism empire. Premium experiences, premium prices.',
    icon: '🏖️',
    tiers: [
      { tier: 1, name: 'Tour Guide', description: '+10% tourism revenue', costMoney: 500_000_000, costResources: {}, bonusType: 'tourism_revenue', bonusValue: 0.10 },
      { tier: 2, name: 'Tourism Manager', description: '+15% tourism revenue', costMoney: 2_000_000_000, costResources: { aluminum: 50, titanium: 20 }, bonusType: 'tourism_revenue', bonusValue: 0.15 },
      { tier: 3, name: 'Tourism Director', description: '+20% tourism revenue', costMoney: 10_000_000_000, costResources: { titanium: 40, rare_earth: 15 }, bonusType: 'tourism_revenue', bonusValue: 0.20 },
      { tier: 4, name: 'Tourism Baron', description: '-10% maintenance costs', costMoney: 50_000_000_000, costResources: { titanium: 80, platinum_group: 10 }, bonusType: 'maintenance_reduction', bonusValue: 0.10 },
      { tier: 5, name: 'Tourism Mogul', description: '+5% all revenue, unlocks Interplanetary Cruise Line', costMoney: 200_000_000_000, costResources: { titanium: 150, platinum_group: 20, exotic_materials: 5 }, bonusType: 'all_revenue', bonusValue: 0.05 },
    ],
    capstone: {
      id: 'capstone_cruise_line',
      name: 'Interplanetary Cruise Line',
      description: 'Luxury cruise ships offering multi-destination solar system tours.',
      cost: 80_000_000_000,
      resourceCost: { titanium: 250, platinum_group: 30, exotic_materials: 8 },
      revenuePerMonth: 300_000_000,
      maintenancePerMonth: 50_000_000,
      requiredLocation: 'leo',
    },
  },
  {
    id: 'fleet_commander',
    name: 'Fleet Commander',
    description: 'Command the largest fleet in the solar system. Faster ships, better logistics.',
    icon: '⚓',
    tiers: [
      { tier: 1, name: 'Ensign', description: '+10% fleet speed', costMoney: 500_000_000, costResources: {}, bonusType: 'fleet_speed', bonusValue: 0.10 },
      { tier: 2, name: 'Lieutenant', description: '+15% fleet speed', costMoney: 2_000_000_000, costResources: { iron: 100, titanium: 20 }, bonusType: 'fleet_speed', bonusValue: 0.15 },
      { tier: 3, name: 'Commander', description: '+20% fleet speed, +10% mining output', costMoney: 10_000_000_000, costResources: { titanium: 50, rare_earth: 20 }, bonusType: 'fleet_speed', bonusValue: 0.20 },
      { tier: 4, name: 'Captain', description: '+10% mining output', costMoney: 50_000_000_000, costResources: { titanium: 100, platinum_group: 15 }, bonusType: 'mining_output', bonusValue: 0.10 },
      { tier: 5, name: 'Fleet Commander', description: '+5% all revenue, unlocks Mobile Command Carrier', costMoney: 200_000_000_000, costResources: { titanium: 200, platinum_group: 25, exotic_materials: 5 }, bonusType: 'all_revenue', bonusValue: 0.05 },
    ],
    capstone: {
      id: 'capstone_command_carrier',
      name: 'Mobile Command Carrier',
      description: 'A massive capital ship serving as a mobile base of operations.',
      cost: 150_000_000_000,
      resourceCost: { titanium: 500, platinum_group: 60, exotic_materials: 20 },
      revenuePerMonth: 220_000_000,
      maintenancePerMonth: 35_000_000,
      requiredLocation: 'asteroid_belt',
    },
  },
  {
    id: 'fabrication_savant',
    name: 'Fabrication Savant',
    description: 'Master of manufacturing and crafting. More output, lower costs, better products.',
    icon: '🔧',
    tiers: [
      { tier: 1, name: 'Technician', description: '+10% fabrication output', costMoney: 500_000_000, costResources: {}, bonusType: 'fabrication_output', bonusValue: 0.10 },
      { tier: 2, name: 'Engineer', description: '+15% fabrication output', costMoney: 2_000_000_000, costResources: { iron: 80, aluminum: 40 }, bonusType: 'fabrication_output', bonusValue: 0.15 },
      { tier: 3, name: 'Master Engineer', description: '+20% fabrication output, +5% build speed', costMoney: 10_000_000_000, costResources: { titanium: 40, rare_earth: 20 }, bonusType: 'fabrication_output', bonusValue: 0.20 },
      { tier: 4, name: 'Chief Engineer', description: '+10% build speed', costMoney: 50_000_000_000, costResources: { titanium: 80, platinum_group: 10 }, bonusType: 'build_speed', bonusValue: 0.10 },
      { tier: 5, name: 'Fabrication Savant', description: '+5% all revenue, unlocks Nanofabrication Complex', costMoney: 200_000_000_000, costResources: { platinum_group: 30, exotic_materials: 10, rare_earth: 80 }, bonusType: 'all_revenue', bonusValue: 0.05 },
    ],
    capstone: {
      id: 'capstone_nanofab',
      name: 'Nanofabrication Complex',
      description: 'Molecular-scale manufacturing producing the most advanced components in the solar system.',
      cost: 100_000_000_000,
      resourceCost: { titanium: 350, platinum_group: 45, exotic_materials: 12 },
      revenuePerMonth: 200_000_000,
      maintenancePerMonth: 30_000_000,
      requiredLocation: 'lunar_surface',
    },
  },
];

export const SPECIALIZATION_MAP = new Map(SPECIALIZATIONS.map(s => [s.id, s]));

// ─── Bonus Aggregation ──────────────────────────────────────────────────────

const SECONDARY_EFFECTIVENESS = 0.75;
const MAX_SECONDARY_TIER = 3;

/** Aggregate all bonuses from current specialization state */
export function getSpecializationBonuses(spec: SpecializationState): SpecializationBonuses {
  const bonuses: SpecializationBonuses = {
    launchRevenue: 0,
    miningOutput: 0,
    dataRevenue: 0,
    tourismRevenue: 0,
    fleetSpeed: 0,
    fabricationOutput: 0,
    buildSpeed: 0,
    researchSpeed: 0,
    maintenanceReduction: 0,
    allRevenue: 0,
  };

  const applyTierBonus = (path: SpecializationPath, tier: number, effectiveness: number) => {
    const def = SPECIALIZATION_MAP.get(path);
    if (!def) return;
    for (let t = 0; t < tier; t++) {
      const tierDef = def.tiers[t];
      if (!tierDef) continue;
      const value = tierDef.bonusValue * effectiveness;
      switch (tierDef.bonusType) {
        case 'launch_revenue': bonuses.launchRevenue += value; break;
        case 'mining_output': bonuses.miningOutput += value; break;
        case 'data_revenue': bonuses.dataRevenue += value; break;
        case 'tourism_revenue': bonuses.tourismRevenue += value; break;
        case 'fleet_speed': bonuses.fleetSpeed += value; break;
        case 'fabrication_output': bonuses.fabricationOutput += value; break;
        case 'build_speed': bonuses.buildSpeed += value; break;
        case 'research_speed': bonuses.researchSpeed += value; break;
        case 'maintenance_reduction': bonuses.maintenanceReduction += value; break;
        case 'all_revenue': bonuses.allRevenue += value; break;
      }
    }
  };

  if (spec.primary) {
    applyTierBonus(spec.primary.path, spec.primary.tier, 1.0);
  }
  if (spec.secondary) {
    const effectiveTier = Math.min(spec.secondary.tier, MAX_SECONDARY_TIER);
    applyTierBonus(spec.secondary.path, effectiveTier, SECONDARY_EFFECTIVENESS);
  }

  return bonuses;
}

// ─── Purchase / Respec ──────────────────────────────────────────────────────

export interface PurchaseCheck {
  allowed: boolean;
  reason?: string;
}

/** Check if player can purchase the next tier of a specialization path */
export function canPurchaseTier(
  state: GameState,
  path: SpecializationPath,
  isPrimary: boolean,
): PurchaseCheck {
  const spec = state.specialization || { primary: null, secondary: null, respecCount: 0 };
  const def = SPECIALIZATION_MAP.get(path);
  if (!def) return { allowed: false, reason: 'Unknown specialization path.' };

  const current = isPrimary ? spec.primary : spec.secondary;
  const currentTier = current && current.path === path ? current.tier : 0;
  const nextTier = currentTier + 1;

  // Validate tier limits
  if (isPrimary && nextTier > 5) return { allowed: false, reason: 'Already at maximum tier.' };
  if (!isPrimary && nextTier > MAX_SECONDARY_TIER) return { allowed: false, reason: 'Secondary specialization maxes at tier 3.' };

  // Can't pick the same path as both primary and secondary
  if (isPrimary && spec.secondary?.path === path) return { allowed: false, reason: 'Already your secondary specialization.' };
  if (!isPrimary && spec.primary?.path === path) return { allowed: false, reason: 'Already your primary specialization.' };

  // Must have primary before secondary
  if (!isPrimary && !spec.primary) return { allowed: false, reason: 'Choose a primary specialization first.' };

  const tierDef = def.tiers[nextTier - 1];
  if (!tierDef) return { allowed: false, reason: 'Tier data not found.' };

  // Check money
  if (state.money < tierDef.costMoney) {
    return { allowed: false, reason: `Need ${formatCost(tierDef.costMoney)} cash.` };
  }

  // Check resources
  for (const [resId, qty] of Object.entries(tierDef.costResources)) {
    if ((state.resources?.[resId] || 0) < qty) {
      return { allowed: false, reason: `Need ${qty} ${resId.replace(/_/g, ' ')}.` };
    }
  }

  return { allowed: true };
}

/** Purchase the next tier. Returns updated state. Caller must validate first. */
export function purchaseTier(
  state: GameState,
  path: SpecializationPath,
  isPrimary: boolean,
): GameState {
  const spec = { ...(state.specialization || { primary: null, secondary: null, respecCount: 0 }) };
  const def = SPECIALIZATION_MAP.get(path);
  if (!def) return state;

  const current = isPrimary ? spec.primary : spec.secondary;
  const currentTier = current && current.path === path ? current.tier : 0;
  const nextTier = currentTier + 1;
  const tierDef = def.tiers[nextTier - 1];
  if (!tierDef) return state;

  // Deduct costs
  const money = state.money - tierDef.costMoney;
  const resources = { ...(state.resources || {}) };
  for (const [resId, qty] of Object.entries(tierDef.costResources)) {
    resources[resId] = (resources[resId] || 0) - qty;
  }

  // Update specialization
  if (isPrimary) {
    spec.primary = { path, tier: nextTier };
  } else {
    spec.secondary = { path, tier: Math.min(nextTier, MAX_SECONDARY_TIER) };
  }

  return {
    ...state,
    money,
    totalSpent: state.totalSpent + tierDef.costMoney,
    resources,
    specialization: spec,
  };
}

/** Reset a specialization (primary or secondary). Returns updated state. */
export function respecSpecialization(
  state: GameState,
  which: 'primary' | 'secondary',
): GameState {
  const spec = { ...(state.specialization || { primary: null, secondary: null, respecCount: 0 }) };

  // Respec cost: $1B * 2^respecCount, capped at $50B
  const respecCost = Math.min(50_000_000_000, 1_000_000_000 * Math.pow(2, spec.respecCount));
  if (state.money < respecCost) return state;

  if (which === 'primary') {
    spec.primary = null;
    // If primary is removed, secondary must also go
    spec.secondary = null;
  } else {
    spec.secondary = null;
  }
  spec.respecCount += 1;

  return {
    ...state,
    money: state.money - respecCost,
    totalSpent: state.totalSpent + respecCost,
    specialization: spec,
  };
}

/** Get respec cost for display */
export function getRespecCost(state: GameState): number {
  const respecCount = state.specialization?.respecCount || 0;
  return Math.min(50_000_000_000, 1_000_000_000 * Math.pow(2, respecCount));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCost(amount: number): string {
  if (amount >= 1_000_000_000_000) return `$${(amount / 1_000_000_000_000).toFixed(1)}T`;
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(0)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  return `$${amount.toLocaleString()}`;
}
