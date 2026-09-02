// ─── Space Tycoon: Corporation Tiers / Company Evolution ─────────────────────
// Your company evolves through 6 named tiers as you hit progression thresholds.
// Each tier unlocks new tabs, grants base slot increases, and applies bonuses.

import type { GameState, GameTab } from './types';
import { DEFAULT_LEGACY, getLegacyPower } from './legacy-system';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CorporationTierDef {
  tier: number;
  name: string;
  icon: string;
  color: string;
  /** Requirements to reach this tier (tier 1 is automatic) */
  requirements: {
    totalEarned?: number;
    completedBuildings?: number;
    completedResearch?: number;
    unlockedLocations?: number;
    activeServices?: number;
    builtShips?: number;
    completedContracts?: number;
    /** Wave F: replaces the deprecated prestige.level gate (prestige.ts deleted).
     *  Legacy Power (legacy-system.ts) is the permanent-progression score that
     *  now stands in for "has meaningfully progressed the endgame." */
    legacyPower?: number;
    /** Wave F: T7 gate also requires at least one completed megastructure
     *  phase-set, per the audit's "legacy displayTier + a megastructure"
     *  recommendation (D6) for a reachable endgame gate. */
    completedMegastructures?: number;
  };
  /** Base construction slots granted at this tier */
  constructionSlots: number;
  /** Base shipyard slots granted at this tier */
  shipyardSlots: number;
  /** Passive bonuses */
  bonuses: {
    maintenanceReduction: number; // 0-1 fraction
    revenueBonus: number;        // 0+ fraction
    miningBonus: number;         // 0+ fraction
  };
  /** Tabs unlocked at this tier */
  unlockedTabs: GameTab[];
}

// ─── Tier Definitions ────────────────────────────────────────────────────────

export const CORPORATION_TIERS: CorporationTierDef[] = [
  {
    tier: 1, name: 'Startup', icon: '🚀', color: '#94a3b8',
    requirements: {},
    constructionSlots: 2,
    shipyardSlots: 1,
    bonuses: { maintenanceReduction: 0, revenueBonus: 0, miningBonus: 0 },
    unlockedTabs: ['dashboard', 'build', 'research', 'map', 'services', 'contracts', 'market'],
  },
  {
    tier: 2, name: 'Venture', icon: '📈', color: '#22d3ee',
    requirements: {
      totalEarned: 500_000_000,
      completedBuildings: 5,
      completedResearch: 3,
      unlockedLocations: 3,
    },
    constructionSlots: 3,
    shipyardSlots: 1,
    bonuses: { maintenanceReduction: 0.03, revenueBonus: 0.03, miningBonus: 0 },
    // Wave F: 'spatial' folded into 'map' (already tier-1), 'diplomacy'
    // folded into 'contracts' (already tier-1), 'economy' folded into
    // 'market' (already tier-1) — see FOLDED_FEATURE_TIERS for their
    // subtab-level gating, which still activates at tier 2 as before.
    // Prediction Exchange (weekly real-world prediction market): gated to
    // tier 2 alongside the rest of the Venture unlocks — a solo tier-1
    // startup is still learning the basics; by tier 2 players have market
    // fluency and can reason about stakes.
    unlockedTabs: ['fleet', 'reports', 'modules', 'discoveries', 'specialization', 'predictions'],
  },
  {
    tier: 3, name: 'Enterprise', icon: '🏢', color: '#a78bfa',
    requirements: {
      totalEarned: 5_000_000_000,
      completedBuildings: 12,
      completedResearch: 8,
      unlockedLocations: 5,
      activeServices: 6,
    },
    constructionSlots: 4,
    shipyardSlots: 2,
    bonuses: { maintenanceReduction: 0.05, revenueBonus: 0.05, miningBonus: 0.05 },
    // Wave F: 'intelligence'/'futures' folded into 'market' (subtabs gate at
    // tier 3 via FOLDED_FEATURE_TIERS).
    // 'science' (4X Wave W6): flagship scientific missions open at Enterprise
    // scale — monthly/quarterly-loop content whose research prerequisites
    // (T2-T4 techs) stage the individual programs beyond the tab unlock.
    unlockedTabs: ['crafting', 'workforce', 'commanders', 'science'],
  },
  {
    tier: 4, name: 'Corporation', icon: '🏛️', color: '#fbbf24',
    requirements: {
      totalEarned: 50_000_000_000,
      completedBuildings: 25,
      completedResearch: 15,
      unlockedLocations: 7,
      builtShips: 3,
    },
    constructionSlots: 5,
    shipyardSlots: 3,
    bonuses: { maintenanceReduction: 0.08, revenueBonus: 0.08, miningBonus: 0.10 },
    // Wave F: 'rivals' folded into 'leaderboard' (Standings hub — subtab
    // gates at tier 4 via FOLDED_FEATURE_TIERS).
    unlockedTabs: ['alliance', 'bounties', 'factions', 'subsidiaries', 'governance'],
  },
  {
    tier: 5, name: 'Conglomerate', icon: '👑', color: '#f97316',
    requirements: {
      totalEarned: 500_000_000_000,
      completedBuildings: 40,
      completedResearch: 25,
      unlockedLocations: 9,
      builtShips: 6,
      activeServices: 15,
      completedContracts: 10,
    },
    constructionSlots: 7,
    shipyardSlots: 4,
    bonuses: { maintenanceReduction: 0.10, revenueBonus: 0.12, miningBonus: 0.15 },
    // Wave F: 'leagues' folded into 'leaderboard' (Standings hub), 'bidding'
    // folded into 'contracts' (Contracts hub PVP subtab) — both gate their
    // subtab at tier 5 via FOLDED_FEATURE_TIERS.
    unlockedTabs: ['megaproject', 'megastructures', 'victory'],
  },
  {
    tier: 6, name: 'Megacorp', icon: '🌟', color: '#ef4444',
    requirements: {
      totalEarned: 5_000_000_000_000,
      completedBuildings: 60,
      completedResearch: 35,
      unlockedLocations: 11,
      builtShips: 10,
      activeServices: 25,
      // Wave F (A9): replaces the deprecated prestige.level >= 1 gate.
      // 300 Legacy Power is roughly "5 tier-2 milestones + some stretch
      // progress" — a meaningful but reachable bar for a tier this deep.
      legacyPower: 300,
    },
    constructionSlots: 10,
    shipyardSlots: 5,
    bonuses: { maintenanceReduction: 0.15, revenueBonus: 0.15, miningBonus: 0.20 },
    unlockedTabs: ['espionage', 'territory', 'speedruns', 'seasons'],
  },
  {
    tier: 7, name: 'Transcendent', icon: '💠', color: '#c084fc',
    requirements: {
      totalEarned: 50_000_000_000_000,
      completedBuildings: 100,
      completedResearch: 37,
      unlockedLocations: 11,
      builtShips: 20,
      activeServices: 30,
      completedContracts: 25,
      // Wave F (A9/D6): replaces the deprecated prestige.level >= 1 gate —
      // "legacy displayTier + a megastructure" per the audit's recommended
      // reachable endgame gate for the interstellar unlock.
      legacyPower: 600,
      completedMegastructures: 1,
    },
    constructionSlots: 14,
    shipyardSlots: 7,
    bonuses: { maintenanceReduction: 0.20, revenueBonus: 0.20, miningBonus: 0.25 },
    // 'megastructures' removed here — it's already unlocked at tier 5; listing
    // it again was a dedupe no-op (audit §2 "Tier gating observations").
    unlockedTabs: ['interstellar'],
  },
];

// ─── Folded-feature subtab gating (Wave F tab merges) ────────────────────────
// The six tabs merged into hub tabs (§B2-B5) each had their own tier gate.
// The hub tab itself now unlocks at the *earliest* of its merged tabs' tiers
// (usually tier 1, since 'contracts'/'market'/'map'/'leaderboard' were
// already unlocked there) — but the individual subtab/section inside the hub
// still respects its original unlock tier, so staged unlocks (CLAUDE.md
// "New-player on-ramp") are preserved exactly as before the merge.
export const FOLDED_FEATURE_TIERS = {
  diplomacy: 2,    // -> Contracts hub, PVE > Faction Deliveries subtab
  spatial: 2,      // -> Map HUD overlay toggle
  economy: 2,      // -> Markets hub, Economy subtab
  intelligence: 3, // -> Markets hub, Analytics subtab
  futures: 3,      // -> Markets hub, Futures subtab
  rivals: 4,       // -> Standings hub, Rivals subtab
  leagues: 5,      // -> Standings hub, Leagues subtab (default spine)
  bidding: 5,      // -> Contracts hub, PVP Bidding top-tab
} as const;

export type FoldedFeature = keyof typeof FOLDED_FEATURE_TIERS;

export function isFoldedFeatureUnlocked(tier: number, feature: FoldedFeature): boolean {
  return tier >= FOLDED_FEATURE_TIERS[feature];
}

export const TIER_MAP = new Map(CORPORATION_TIERS.map(t => [t.tier, t]));

// ─── Server-side tier from persisted profile scalars ─────────────────────────
// GAME_DESIGN_REVIEW_2026-09 row 9: server routes that pay tier-indexed
// rewards (daily bonus) must derive the tier from the PERSISTED GameProfile,
// never from a client-supplied number. GameProfile stores totalEarned,
// buildingCount, researchCount, locationsUnlocked and serviceCount as scalar
// columns, so those five requirements are checked; the requirements that
// only exist inside the save blob (builtShips, completedContracts,
// legacyPower, completedMegastructures) are NOT checked here — so this is an
// UPPER bound on the real tier, bounded by ledgered totalEarned, which is the
// number that actually indexes the payouts.

export interface ProfileTierScalars {
  totalEarned: number;
  buildingCount?: number;
  researchCount?: number;
  locationsUnlocked?: number;
  serviceCount?: number;
}

export function tierFromProfileScalars(p: ProfileTierScalars): number {
  const totalEarned = Number.isFinite(p.totalEarned) ? p.totalEarned : 0;
  for (let i = CORPORATION_TIERS.length - 1; i >= 0; i--) {
    const t = CORPORATION_TIERS[i];
    const req = t.requirements;
    const meets =
      (req.totalEarned === undefined || totalEarned >= req.totalEarned) &&
      (req.completedBuildings === undefined || p.buildingCount === undefined || p.buildingCount >= req.completedBuildings) &&
      (req.completedResearch === undefined || p.researchCount === undefined || p.researchCount >= req.completedResearch) &&
      (req.unlockedLocations === undefined || p.locationsUnlocked === undefined || p.locationsUnlocked >= req.unlockedLocations) &&
      (req.activeServices === undefined || p.serviceCount === undefined || p.serviceCount >= req.activeServices);
    if (meets) return t.tier;
  }
  return 1;
}

/** The totalEarned gate of a tier ($). Tier 1 has no gate → 0. */
export function getTierTotalEarnedThreshold(tier: number): number {
  return getTierDef(tier).requirements.totalEarned ?? 0;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Determine the highest corporation tier the player qualifies for.
 * Checks tiers from highest to lowest, returns the first one met.
 */
export function checkCorporationTier(state: GameState): number {
  const completedBuildings = state.buildings.filter(b => b.isComplete).length;
  const completedResearch = state.completedResearch.length;
  const unlockedLocations = state.unlockedLocations.length;
  const activeServices = state.activeServices.length;
  const builtShips = (state.ships || []).filter(s => s.isBuilt).length;
  const completedContracts = (state.completedContracts || []).length;
  const legacyPower = state.legacy?.legacyPower ?? getLegacyPower(state.legacy || DEFAULT_LEGACY);
  const completedMegastructures = (state.megastructures || []).filter(m => m.status === 'complete').length;

  // Check from highest tier down
  for (let i = CORPORATION_TIERS.length - 1; i >= 0; i--) {
    const tier = CORPORATION_TIERS[i];
    const req = tier.requirements;

    const meets =
      (req.totalEarned === undefined || state.totalEarned >= req.totalEarned) &&
      (req.completedBuildings === undefined || completedBuildings >= req.completedBuildings) &&
      (req.completedResearch === undefined || completedResearch >= req.completedResearch) &&
      (req.unlockedLocations === undefined || unlockedLocations >= req.unlockedLocations) &&
      (req.activeServices === undefined || activeServices >= req.activeServices) &&
      (req.builtShips === undefined || builtShips >= req.builtShips) &&
      (req.completedContracts === undefined || completedContracts >= req.completedContracts) &&
      (req.legacyPower === undefined || legacyPower >= req.legacyPower) &&
      (req.completedMegastructures === undefined || completedMegastructures >= req.completedMegastructures);

    if (meets) return tier.tier;
  }

  return 1; // Default to Startup
}

/**
 * Get the tier definition for a given tier number.
 */
export function getTierDef(tier: number): CorporationTierDef {
  return TIER_MAP.get(tier) || CORPORATION_TIERS[0];
}

/**
 * Get the base construction slots for a tier (replaces constant).
 */
export function getTierConstructionSlots(tier: number): number {
  return getTierDef(tier).constructionSlots;
}

/**
 * Get the base shipyard slots for a tier (replaces constant).
 */
export function getTierShipyardSlots(tier: number): number {
  return getTierDef(tier).shipyardSlots;
}

/**
 * Get tier bonuses (maintenance reduction, revenue bonus, mining bonus).
 */
export function getTierBonuses(tier: number): CorporationTierDef['bonuses'] {
  return getTierDef(tier).bonuses;
}

/**
 * Get all tabs unlocked up to and including a given tier.
 * Accumulates tabs from tier 1 through the given tier.
 */
export function getTierUnlockedTabs(tier: number): GameTab[] {
  const tabs = new Set<GameTab>();
  for (const tierDef of CORPORATION_TIERS) {
    if (tierDef.tier > tier) break;
    for (const tab of tierDef.unlockedTabs) {
      tabs.add(tab);
    }
  }
  // Leaderboard is always available
  tabs.add('leaderboard');
  return Array.from(tabs);
}

/**
 * Get the next tier the player hasn't reached yet (for progress display).
 * Returns null if player is at max tier.
 */
export function getNextTier(currentTier: number): CorporationTierDef | null {
  const next = CORPORATION_TIERS.find(t => t.tier === currentTier + 1);
  return next || null;
}

/**
 * Get progress toward next tier as an object of requirement -> { current, required, met }.
 */
export function getNextTierProgress(state: GameState, currentTier: number): {
  label: string;
  current: number;
  required: number;
  met: boolean;
}[] | null {
  const next = getNextTier(currentTier);
  if (!next) return null;

  const req = next.requirements;
  const progress: { label: string; current: number; required: number; met: boolean }[] = [];

  if (req.totalEarned !== undefined) {
    progress.push({ label: 'Total Earned', current: state.totalEarned, required: req.totalEarned, met: state.totalEarned >= req.totalEarned });
  }
  if (req.completedBuildings !== undefined) {
    const current = state.buildings.filter(b => b.isComplete).length;
    progress.push({ label: 'Buildings', current, required: req.completedBuildings, met: current >= req.completedBuildings });
  }
  if (req.completedResearch !== undefined) {
    const current = state.completedResearch.length;
    progress.push({ label: 'Research', current, required: req.completedResearch, met: current >= req.completedResearch });
  }
  if (req.unlockedLocations !== undefined) {
    const current = state.unlockedLocations.length;
    progress.push({ label: 'Locations', current, required: req.unlockedLocations, met: current >= req.unlockedLocations });
  }
  if (req.activeServices !== undefined) {
    const current = state.activeServices.length;
    progress.push({ label: 'Services', current, required: req.activeServices, met: current >= req.activeServices });
  }
  if (req.builtShips !== undefined) {
    const current = (state.ships || []).filter(s => s.isBuilt).length;
    progress.push({ label: 'Ships', current, required: req.builtShips, met: current >= req.builtShips });
  }
  if (req.completedContracts !== undefined) {
    const current = (state.completedContracts || []).length;
    progress.push({ label: 'Contracts', current, required: req.completedContracts, met: current >= req.completedContracts });
  }
  if (req.legacyPower !== undefined) {
    const current = state.legacy?.legacyPower ?? getLegacyPower(state.legacy || DEFAULT_LEGACY);
    progress.push({ label: 'Legacy Power', current, required: req.legacyPower, met: current >= req.legacyPower });
  }
  if (req.completedMegastructures !== undefined) {
    const current = (state.megastructures || []).filter(m => m.status === 'complete').length;
    progress.push({ label: 'Megastructures Completed', current, required: req.completedMegastructures, met: current >= req.completedMegastructures });
  }

  return progress;
}
