// ─── Space Tycoon: Exploration & Discovery v1 ────────────────────────────────
// Per STATS_DESIGN.md Phase VII. Survey ships discover anomalies; players
// claim stakes on them; discoveries populate a per-corporation database.
//
// Builds on the existing rollSurveyDiscovery() in ships.ts — Phase VII
// extends the discovery type system with five new classes, adds claim
// stakes, and adds a discovery database so players accumulate knowledge
// over time.

import type { GameState } from './types';
import { generateId, formatMoney } from './formulas';

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

/**
 * Roll discovery of an anomaly by a survey ship on expedition.
 * Called from the ship survey completion hook. Returns null if no anomaly
 * found (most expeditions return mundane results).
 */
export function rollAnomalyDiscovery(locationId: string, shipId: string, now: number = Date.now()): Anomaly | null {
  // ~30% chance any given survey finds something notable
  if (Math.random() >= 0.30) return null;

  const roll = Math.random();
  let kind: AnomalyKind;
  if      (roll < 0.30) kind = 'rich_deposit';
  else if (roll < 0.50) kind = 'uncharted_asteroid';
  else if (roll < 0.65) kind = 'hazard_zone';
  else if (roll < 0.78) kind = 'derelict_ship';
  else if (roll < 0.88) kind = 'alien_signal';
  else if (roll < 0.96) kind = 'ancient_artifact';
  else                  kind = 'gravitational_lens';

  const base = KIND_TITLES[kind];
  const anomaly: Anomaly = {
    id: generateId(),
    kind,
    locationId,
    discoveredByShipId: shipId,
    discoveredAtMs: now,
    fadesAtMs: now + 30 * 24 * 60 * 60 * 1000,  // 30-day window to claim
    claimed: false,
    title: base.title,
    summary: base.summary,
    rewards: buildRewards(kind, locationId),
  };
  return anomaly;
}

function buildRewards(kind: AnomalyKind, locationId: string): Anomaly['rewards'] {
  switch (kind) {
    case 'rich_deposit':
      return {
        miningBonus: {
          resourceId: locationId.startsWith('lunar') ? 'lunar_water' : 'iron',
          bonusPct: 15 + Math.floor(Math.random() * 20),
          durationMonths: 6,
        },
      };
    case 'uncharted_asteroid':
      return { money: 5_000_000 + Math.floor(Math.random() * 20_000_000) };
    case 'hazard_zone':
      return {};  // informational; no rewards, just avoid
    case 'derelict_ship':
      return {
        money: 15_000_000 + Math.floor(Math.random() * 40_000_000),
        moduleId: Math.random() < 0.3 ? 'mod_stealth_coating' : undefined,
      };
    case 'alien_signal':
      return { money: 8_000_000 + Math.floor(Math.random() * 15_000_000) };
    case 'ancient_artifact':
      return {
        money: 30_000_000,
        unlocksResearchId: 'precursor_studies',
      };
    case 'gravitational_lens':
      return { money: 10_000_000 };  // plus a claim-specific research bonus
  }
}

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
  // unlocksResearchId / moduleId are displayed to the player; the actual
  // unlocking requires an additional action ("visit the Echo Remnants to
  // exchange the artifact" etc.) that we'll wire in the multiplayer wave.

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
