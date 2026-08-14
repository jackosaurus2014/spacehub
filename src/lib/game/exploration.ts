// ─── Space Tycoon: Unified Discovery Framework ───────────────────────────────
// 4X Wave W3 (docs/4X_BASELINE_2026-08.md): merges the two previously
// parallel, unmerged discovery systems flagged in the doc's 1.1 baseline:
//   - ships.ts:210 rollSurveyDiscovery — ~25 hand-authored, location-flavored
//     "guaranteed find" entries, applied immediately on survey completion.
//   - This module's rollAnomalyDiscovery — 7 generic kind-weighted anomalies,
//     30-day fade, claim-stake gated. Before this wave it was ONLY reachable
//     via the AnomaliesPanel "Dev tools" manual-roll button (see the removed
//     copy: "until survey-probe expeditions are wired to this system
//     automatically") — a real dead end, not just an unmerged schema.
//
// This wave:
//  1. Moves both content tables + both roll functions into one module and
//     one deterministic entry point (rollDiscovery) driven by a single
//     seeded RNG stream — consistent with W6's DiscoveryDef/discoveryTable
//     pattern (science-missions.ts) and the codebase-wide
//     mulberry32(hashStringToSeed(...)) convention (hazards.ts,
//     narrative-events.ts). No more Math.random() in either roll path.
//  2. Preserves every existing content entry and probability UNCHANGED —
//     this is a refactor, not a balance change. The guaranteed per-location
//     table is still a uniform pick across that location's entries; the
//     anomaly gate is still 30%, and the kind weights are still
//     30/20/15/13/10/8/4%.
//  3. Wires survey completion (game-engine.ts) to roll BOTH tables from one
//     call, so anomalies are finally discoverable through real gameplay —
//     not just the dev-tool button (which still works, for manual testing).
//  4. Wires the exploration.ts:210-212 dead ends (defect ledger #2):
//     unlocksResearchId/moduleId used to be displayed
//     (formatAnomalyRewards) but never applied. W10 built the rare-tech
//     gate (state.unlockedRareTechIds / research-tree.ts
//     isRareTechVisible) and modules.ts always had state.moduleInventory —
//     both now have real consumers, so stakeClaim() applies them directly.
//     Staking IS the "additional action" the old comment promised.
//
// Per STATS_DESIGN.md Phase VII: survey ships discover things; players claim
// stakes on anomalies; discoveries populate a per-corporation database.

import type { GameState } from './types';
import { generateId, formatMoney, mulberry32, hashStringToSeed } from './formulas';
import { grantModule } from './modules';

// ─── Guaranteed location-flavored finds (moved from ships.ts) ───────────────
// Applied immediately on survey completion — unchanged since before this
// wave (100% hit rate: every surveyed location has a non-empty table).

export interface SurveyDiscovery {
  type: 'resource_deposit' | 'anomaly' | 'cache' | 'signal';
  title: string;
  description: string;
  rewards: {
    money?: number;
    resources?: Record<string, number>;
    miningBonus?: { locationId: string; resourceId: string; bonusPct: number; durationMonths: number };
  };
}

// Discovery tables by location tier — content byte-for-byte unchanged from
// the former ships.ts SURVEY_DISCOVERIES (no balance change, refactor only).
export const SURVEY_DISCOVERIES: Record<string, SurveyDiscovery[]> = {
  // Tier 1: Near-Earth
  leo: [
    { type: 'cache', title: 'Decommissioned Satellite', description: 'Salvaged rare electronics from defunct hardware.', rewards: { resources: { rare_earth: 5, aluminum: 20 } } },
    { type: 'anomaly', title: 'Orbital Debris Field', description: 'Mapped recyclable materials worth recovering.', rewards: { money: 10_000_000, resources: { iron: 50 } } },
    { type: 'signal', title: 'Survey Data Package', description: 'Sold orbital mapping data to commercial operators.', rewards: { money: 25_000_000 } },
  ],
  geo: [
    { type: 'cache', title: 'Abandoned Relay Station', description: 'Found intact communications hardware.', rewards: { money: 15_000_000, resources: { rare_earth: 8 } } },
    { type: 'resource_deposit', title: 'Solar Wind Collection Point', description: 'Identified optimal helium-3 collection orbit.', rewards: { resources: { helium3: 1 }, miningBonus: { locationId: 'geo', resourceId: 'helium3', bonusPct: 15, durationMonths: 24 } } },
  ],

  // Tier 2: Moon
  lunar_orbit: [
    { type: 'anomaly', title: 'Mascon Anomaly', description: 'Mapped a mass concentration useful for orbital mechanics.', rewards: { money: 30_000_000 } },
    { type: 'resource_deposit', title: 'Ice-Rich Crater', description: 'Discovered a permanently shadowed crater with deep ice.', rewards: { resources: { lunar_water: 100 }, miningBonus: { locationId: 'lunar_surface', resourceId: 'lunar_water', bonusPct: 25, durationMonths: 36 } } },
  ],
  lunar_surface: [
    { type: 'resource_deposit', title: 'Rare Earth Vein', description: 'High-concentration rare earth deposit on the far side.', rewards: { resources: { rare_earth: 30 }, miningBonus: { locationId: 'lunar_surface', resourceId: 'rare_earth', bonusPct: 20, durationMonths: 24 } } },
    { type: 'cache', title: 'Apollo-era Artifacts', description: 'Located preserved artifacts. Enormous historical value.', rewards: { money: 100_000_000 } },
    { type: 'resource_deposit', title: 'Helium-3 Hotspot', description: 'Found regolith exceptionally rich in He-3.', rewards: { resources: { helium3: 3 }, miningBonus: { locationId: 'lunar_surface', resourceId: 'helium3', bonusPct: 30, durationMonths: 24 } } },
  ],

  // Tier 3: Mars & Asteroids
  mars_orbit: [
    { type: 'anomaly', title: 'Phobos Cavern', description: 'Discovered a large subsurface cavity in Phobos.', rewards: { money: 50_000_000, resources: { titanium: 40, iron: 100 } } },
    { type: 'signal', title: 'Martian Atmospheric Data', description: 'Sold atmospheric models to terraforming researchers.', rewards: { money: 75_000_000 } },
  ],
  mars_surface: [
    { type: 'resource_deposit', title: 'Subsurface Aquifer', description: 'Massive underground water reservoir beneath Valles Marineris.', rewards: { resources: { mars_water: 200 }, miningBonus: { locationId: 'mars_surface', resourceId: 'mars_water', bonusPct: 30, durationMonths: 36 } } },
    { type: 'resource_deposit', title: 'Iron Oxide Megadeposit', description: 'Pure iron oxide formation spanning 200 km.', rewards: { resources: { iron: 500 }, miningBonus: { locationId: 'mars_surface', resourceId: 'iron', bonusPct: 25, durationMonths: 24 } } },
    { type: 'cache', title: 'Meteorite Impact Zone', description: 'Platinum-rich meteorite fragments scattered across a crater.', rewards: { resources: { platinum_group: 8, gold: 12 } } },
  ],
  asteroid_belt: [
    { type: 'resource_deposit', title: 'Platinum-Core Asteroid', description: 'A 500m metallic asteroid with platinum core.', rewards: { resources: { platinum_group: 20, titanium: 50 }, miningBonus: { locationId: 'asteroid_belt', resourceId: 'platinum_group', bonusPct: 35, durationMonths: 36 } } },
    { type: 'resource_deposit', title: 'Gold Cluster', description: 'Three nearby asteroids rich in gold deposits.', rewards: { resources: { gold: 30 }, miningBonus: { locationId: 'asteroid_belt', resourceId: 'gold', bonusPct: 25, durationMonths: 24 } } },
    { type: 'anomaly', title: 'Ancient Collision Site', description: 'Rare mineral formations from a prehistoric impact.', rewards: { resources: { rare_earth: 40, exotic_materials: 2 } } },
  ],

  // Tier 4: Outer System
  jupiter_system: [
    { type: 'resource_deposit', title: 'Europa Ice Shelf', description: 'Mapped ideal drilling location through Europa\'s ice crust.', rewards: { resources: { exotic_materials: 5 }, miningBonus: { locationId: 'jupiter_system', resourceId: 'exotic_materials', bonusPct: 40, durationMonths: 48 } } },
    { type: 'signal', title: 'Io Volcanic Data', description: 'Unique geological data from Io\'s active volcanoes.', rewards: { money: 200_000_000, resources: { exotic_materials: 3 } } },
    { type: 'anomaly', title: 'Jovian Magnetic Anomaly', description: 'Discovered concentrated He-3 in Jupiter\'s magnetosphere.', rewards: { resources: { helium3: 5 }, miningBonus: { locationId: 'jupiter_system', resourceId: 'helium3', bonusPct: 30, durationMonths: 36 } } },
  ],
  saturn_system: [
    { type: 'resource_deposit', title: 'Titan Methane Lake', description: 'Identified an easily accessible methane reservoir.', rewards: { resources: { methane: 500, ethane: 200 }, miningBonus: { locationId: 'saturn_system', resourceId: 'methane', bonusPct: 35, durationMonths: 36 } } },
    { type: 'anomaly', title: 'Ring Particle Analysis', description: 'Discovered pure water ice in Saturn\'s rings.', rewards: { resources: { lunar_water: 300 } } },
    { type: 'cache', title: 'Enceladus Geyser Sample', description: 'Captured exotic compounds from ocean plumes.', rewards: { resources: { exotic_materials: 8, helium3: 2 } } },
  ],
  outer_system: [
    { type: 'signal', title: 'Interstellar Object', description: 'Tracked a passing interstellar object. Data sold for billions.', rewards: { money: 1_000_000_000 } },
    { type: 'resource_deposit', title: 'Kuiper Belt Deposit', description: 'Found a trans-Neptunian body rich in exotic materials.', rewards: { resources: { exotic_materials: 15, helium3: 8 }, miningBonus: { locationId: 'outer_system', resourceId: 'exotic_materials', bonusPct: 50, durationMonths: 60 } } },
    { type: 'anomaly', title: 'Gravitational Anomaly', description: 'Unexplained mass concentration. Research value immeasurable.', rewards: { money: 500_000_000, resources: { exotic_materials: 10 } } },
  ],
};

// ─── Claimable anomalies (unchanged content/probabilities) ─────────────────

export type AnomalyKind =
  | 'rich_deposit'         // +% mining yield for N months at a location
  | 'ancient_artifact'     // unlocks a precursor research branch
  | 'derelict_ship'        // claimable salvage (modules + money)
  | 'uncharted_asteroid'   // finite-resource claim
  | 'hazard_zone'          // avoid or pay shielding
  | 'alien_signal'         // leads to faction-adjacent content
  | 'gravitational_lens';  // unique research-speed boost if claimed

export interface Anomaly {
  id: string;
  kind: AnomalyKind;
  locationId: string;
  /** Discovered by which ship. */
  discoveredByShipId?: string;
  discoveredAtMs: number;
  /** Expires (anomaly fades; claim lost if not staked) in N ms. */
  fadesAtMs: number;
  /** Claim state. */
  claimed: boolean;
  claimedByCorp?: string;        // corp id / player identifier
  claimedAtMs?: number;
  title: string;
  summary: string;
  /** kind-specific rewards on successful claim. */
  rewards: {
    money?: number;
    miningBonus?: { resourceId: string; bonusPct: number; durationMonths: number };
    unlocksResearchId?: string;
    moduleId?: string;
  };
}

const KIND_TITLES: Record<AnomalyKind, { title: string; summary: string }> = {
  rich_deposit: {
    title: 'Rich Ore Deposit',
    summary: 'Your probe found an unusually concentrated mineral vein. Claim it to boost your mining yield at this location for several months.',
  },
  ancient_artifact: {
    title: 'Precursor Artifact',
    summary: 'A non-human technology fragment embedded in the regolith. Echo Remnants will pay a premium — or you can keep it and unlock a research branch.',
  },
  derelict_ship: {
    title: 'Derelict Vessel',
    summary: 'A dead ship adrift. Salvageable for money and possibly a rare module. Claim before a rival corporation finds it.',
  },
  uncharted_asteroid: {
    title: 'Uncharted Asteroid',
    summary: 'A rock no one has registered. File a claim to lock in mining rights for a year before the claim opens.',
  },
  hazard_zone: {
    title: 'Hazard Zone Detected',
    summary: 'Radiation / orbital-debris / gravitational-shear warning. Your probe returns with hazard coordinates — avoid this area or ship high-shielded vessels through.',
  },
  alien_signal: {
    title: 'Unexplained Signal',
    summary: 'A structured radio signature. Hive Collective investigators will pay for the coordinates. The signal source may be worth tracing.',
  },
  gravitational_lens: {
    title: 'Gravitational Lens Alignment',
    summary: 'A rare spacetime curvature alignment lets telescopes peer deeper. Claim to run research through this lens for a unique science boost.',
  },
};

function buildRewards(kind: AnomalyKind, locationId: string, rng: () => number): Anomaly['rewards'] {
  switch (kind) {
    case 'rich_deposit':
      return {
        miningBonus: {
          resourceId: locationId.startsWith('lunar') ? 'lunar_water' : 'iron',
          bonusPct: 15 + Math.floor(rng() * 20),
          durationMonths: 6,
        },
      };
    case 'uncharted_asteroid':
      return { money: 5_000_000 + Math.floor(rng() * 20_000_000) };
    case 'hazard_zone':
      return {};  // informational; no rewards, just avoid
    case 'derelict_ship':
      return {
        money: 15_000_000 + Math.floor(rng() * 40_000_000),
        moduleId: rng() < 0.3 ? 'mod_stealth_coating' : undefined,
      };
    case 'alien_signal':
      return { money: 8_000_000 + Math.floor(rng() * 15_000_000) };
    case 'ancient_artifact':
      return {
        money: 30_000_000,
        unlocksResearchId: 'precursor_studies',
      };
    case 'gravitational_lens':
      return { money: 10_000_000 };  // plus a claim-specific research bonus
  }
}

// ─── Deterministic roll — the unified framework ─────────────────────────────
// mulberry32(hashStringToSeed(...)) — same convention as hazards.ts,
// narrative-events.ts, science-missions.ts. Never Math.random(): the same
// ship + location + expedition-start always yields the same discovery,
// including under offline catch-up replay in game-engine.ts.

function discoveryRng(shipId: string, locationId: string, anchorMs: number): () => number {
  return mulberry32(hashStringToSeed(`stw-discovery:${shipId}:${locationId}:${anchorMs}`));
}

/** Anomaly roll body, parameterized on an already-seeded RNG so it can be
 *  driven either by the unified rollDiscovery() (real survey completions) or
 *  standalone rollAnomalyDiscovery() (AnomaliesPanel dev-tool). Probabilities
 *  unchanged: 30% gate, then 30/20/15/13/10/8/4% kind weights. */
function rollAnomalyFromRng(locationId: string, shipId: string, rng: () => number, now: number): Anomaly | null {
  if (rng() >= 0.30) return null;

  const roll = rng();
  let kind: AnomalyKind;
  if      (roll < 0.30) kind = 'rich_deposit';
  else if (roll < 0.50) kind = 'uncharted_asteroid';
  else if (roll < 0.65) kind = 'hazard_zone';
  else if (roll < 0.78) kind = 'derelict_ship';
  else if (roll < 0.88) kind = 'alien_signal';
  else if (roll < 0.96) kind = 'ancient_artifact';
  else                  kind = 'gravitational_lens';

  const base = KIND_TITLES[kind];
  return {
    id: generateId(),
    kind,
    locationId,
    discoveredByShipId: shipId,
    discoveredAtMs: now,
    fadesAtMs: now + 30 * 24 * 60 * 60 * 1000,  // 30-day window to claim
    claimed: false,
    title: base.title,
    summary: base.summary,
    rewards: buildRewards(kind, locationId, rng),
  };
}

/**
 * Roll discovery of an anomaly, standalone. Kept for the AnomaliesPanel
 * "Dev tools" manual-roll button and any other ad-hoc caller — seeded off
 * (locationId, shipId, now), so repeat calls in the same tick are
 * reproducible while real clicks (different `now`) naturally vary.
 * Real survey completions no longer depend on this path alone — see
 * rollDiscovery() below, which is what game-engine.ts calls.
 */
export function rollAnomalyDiscovery(locationId: string, shipId: string, now: number = Date.now()): Anomaly | null {
  const rng = discoveryRng(shipId, locationId, now);
  return rollAnomalyFromRng(locationId, shipId, rng, now);
}

export interface DiscoveryResult {
  /** Guaranteed location-flavored find — unchanged 100%-hit-rate behavior
   *  from the old ships.ts rollSurveyDiscovery. */
  survey: SurveyDiscovery | null;
  /** Possible claimable anomaly — unchanged 30% kind-weighted roll, now
   *  actually reachable from real survey completions (game-engine.ts)
   *  instead of only the AnomaliesPanel dev-tool. */
  anomaly: Anomaly | null;
}

/**
 * The unified discovery entry point (4X Wave W3). One seeded RNG stream
 * drives BOTH content tables — the guaranteed per-location find and the
 * kind-weighted anomaly — so a single deterministic call replaces the two
 * separate Math.random()-driven systems that used to exist in ships.ts and
 * this module. Called from game-engine.ts on survey-expedition completion.
 */
export function rollDiscovery(
  locationId: string,
  shipId: string,
  anchorMs: number = Date.now(),
  now: number = Date.now(),
): DiscoveryResult {
  const rng = discoveryRng(shipId, locationId, anchorMs);

  const table = SURVEY_DISCOVERIES[locationId];
  const survey = table && table.length > 0
    ? table[Math.floor(rng() * table.length)]
    : null;

  const anomaly = rollAnomalyFromRng(locationId, shipId, rng, now);

  return { survey, anomaly };
}

// ─── Claim stakes ────────────────────────────────────────────────────────────

export interface ClaimStake {
  id: string;
  anomalyId: string;
  stakedAtMs: number;
  /** Lifetime in ms. Defaults to 1 in-game year. */
  expiresAtMs: number;
  /** Claim holder — player corp id. */
  holderProfileId?: string;
}

const CLAIM_DEFAULT_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000; // 1 real year

// ─── Database management ────────────────────────────────────────────────────

/** Add a newly-discovered anomaly to the corporation's knowledge database. */
export function recordDiscovery(state: GameState, anomaly: Anomaly): GameState {
  const known = state.knownAnomalies || [];
  if (known.some(a => a.id === anomaly.id)) return state;
  return {
    ...state,
    knownAnomalies: [anomaly, ...known].slice(0, 200),
  };
}

/** Stake a claim on a discovered anomaly. Applies rewards to the player. */
export function stakeClaim(state: GameState, anomalyId: string, now: number = Date.now()): GameState {
  const known = state.knownAnomalies || [];
  const idx = known.findIndex(a => a.id === anomalyId);
  if (idx < 0) return state;
  const anomaly = known[idx];
  if (anomaly.claimed) return state;
  if (anomaly.fadesAtMs < now) return state;

  const claim: ClaimStake = {
    id: generateId(),
    anomalyId,
    stakedAtMs: now,
    expiresAtMs: now + CLAIM_DEFAULT_LIFETIME_MS,
  };

  // Apply rewards to state.
  let out: GameState = { ...state };
  const updated = { ...anomaly, claimed: true, claimedAtMs: now };
  const newKnown = [...known];
  newKnown[idx] = updated;
  out.knownAnomalies = newKnown;
  out.claimStakes = [claim, ...(state.claimStakes || [])].slice(0, 100);

  if (anomaly.rewards.money) {
    out = {
      ...out,
      money: out.money + anomaly.rewards.money,
      totalEarned: out.totalEarned + anomaly.rewards.money,
    };
  }
  if (anomaly.rewards.miningBonus) {
    const currentMonth = out.gameDate.year * 12 + out.gameDate.month;
    const bonus = {
      locationId: anomaly.locationId,
      resourceId: anomaly.rewards.miningBonus.resourceId,
      bonusPct: anomaly.rewards.miningBonus.bonusPct,
      expiresAtMonth: currentMonth + anomaly.rewards.miningBonus.durationMonths,
    };
    out.miningBonuses = [...(out.miningBonuses || []), bonus];
  }
  // W3 dead-end wiring (4X_BASELINE defect ledger #2): unlocksResearchId /
  // moduleId used to be displayed only (formatAnomalyRewards) — the old
  // comment here promised a future "additional action" wave that never
  // landed. W10 built the rare-tech gate (state.unlockedRareTechIds,
  // consumed by research-tree.ts isRareTechVisible) and modules.ts's
  // state.moduleInventory has always had real consumers (fitModule).
  // Staking the claim IS that additional action now.
  if (anomaly.rewards.unlocksResearchId) {
    const knownRare = out.unlockedRareTechIds || [];
    if (!knownRare.includes(anomaly.rewards.unlocksResearchId)) {
      out = { ...out, unlockedRareTechIds: [...knownRare, anomaly.rewards.unlocksResearchId] };
    }
  }
  if (anomaly.rewards.moduleId) {
    out = grantModule(out, anomaly.rewards.moduleId, now);
  }

  return out;
}

/** Return anomalies that are still active and unclaimed for a location. */
export function getUnclaimedAnomaliesAt(state: GameState, locationId: string, now: number = Date.now()): Anomaly[] {
  return (state.knownAnomalies || []).filter(a =>
    a.locationId === locationId && !a.claimed && a.fadesAtMs > now,
  );
}

/** Summarize rewards for UI display. */
export function formatAnomalyRewards(anomaly: Anomaly): string {
  const parts: string[] = [];
  if (anomaly.rewards.money)            parts.push(formatMoney(anomaly.rewards.money));
  if (anomaly.rewards.miningBonus)      parts.push(`+${anomaly.rewards.miningBonus.bonusPct}% ${anomaly.rewards.miningBonus.resourceId.replace(/_/g, ' ')} for ${anomaly.rewards.miningBonus.durationMonths} mo`);
  if (anomaly.rewards.unlocksResearchId) parts.push(`unlocks research: ${anomaly.rewards.unlocksResearchId.replace(/_/g, ' ')}`);
  if (anomaly.rewards.moduleId)         parts.push(`module: ${anomaly.rewards.moduleId.replace(/^mod_/, '').replace(/_/g, ' ')}`);
  return parts.length > 0 ? parts.join(' · ') : 'informational';
}
