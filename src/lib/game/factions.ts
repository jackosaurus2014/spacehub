// ─── Space Tycoon: Faction System ───────────────────────────────────────────
// 6 NPC factions with per-player reputation (-100 to +100).
// MVP scope: view standings, use Diplomatic Envoy to raise reputation with spend.
// Later: faction-themed contracts, rep shifts from in-game actions, alliance effects.

import type { GameState } from './types';
// Construction Purposes wave: diplomatic-post buildings amplify positive rep
// gains (diplomacy capability — see shiftReputation).
import { getGlobalCapabilityBonus } from './building-capabilities';

export type FactionId =
  | 'the-dominion'
  | 'the-syndicate'
  | 'void-corsairs'
  | 'hive-collective'
  | 'nebula-reavers'
  | 'echo-remnants';

export type FactionStanding = 'allied' | 'friendly' | 'neutral' | 'unfriendly' | 'hostile';

export interface FactionDefinition {
  id: FactionId;
  name: string;
  tagline: string;
  description: string;
  theme: {
    accent: string;      // text color class
    border: string;      // border color class
    bg: string;          // background tint class
  };
  /** Class of commander whose bonus the faction particularly values (future: cross-system discount) */
  alignedClass: 'diplomat' | 'commander' | 'magnate' | 'scientist' | 'logistician' | 'engineer';
  /** Opposed faction — friendly actions here shift opposite faction rep down */
  rivalId: FactionId;
}

export const FACTIONS: FactionDefinition[] = [
  {
    id: 'the-dominion',
    name: 'The Dominion',
    tagline: 'Order through unified command.',
    description: 'A militarized empire controlling inner-system shipping lanes. Values legitimate enterprise and taxation compliance. Allies receive priority routing and enforcement escorts.',
    theme: { accent: 'text-red-400', border: 'border-red-500/40', bg: 'bg-red-500/10' },
    alignedClass: 'commander',
    rivalId: 'void-corsairs',
  },
  {
    id: 'the-syndicate',
    name: 'The Syndicate',
    tagline: 'What the law won\'t deliver, we will.',
    description: 'A trans-system crime organization moving contraband, information, and favors. Allies gain access to gray-market contracts and discreet logistics. Dominion assets crack down on known associates.',
    theme: { accent: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-500/10' },
    alignedClass: 'magnate',
    rivalId: 'the-dominion',
  },
  {
    id: 'void-corsairs',
    name: 'Void Corsairs',
    tagline: 'We take what we want.',
    description: 'Fast-moving raider clans striking convoys in the Belt and beyond. Pay them off and they\'ll look elsewhere. Earn their respect and they\'ll target your rivals instead.',
    theme: { accent: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10' },
    alignedClass: 'logistician',
    rivalId: 'the-dominion',
  },
  {
    id: 'hive-collective',
    name: 'Hive Collective',
    tagline: 'We are one. You are many.',
    description: 'An alien networked consciousness whose motives remain opaque. Communicates only through trade in rare bio-materials. Allies gain exotic resources no other faction can provide.',
    theme: { accent: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' },
    alignedClass: 'scientist',
    rivalId: 'echo-remnants',
  },
  {
    id: 'nebula-reavers',
    name: 'Nebula Reavers',
    tagline: 'Borne of the deep dark.',
    description: 'Nomadic clans that haunt the outer gas giants. Trade in salvage, exotic fuels, and rumors. Allies learn the coordinates of resource-rich anomalies.',
    theme: { accent: 'text-sky-400', border: 'border-sky-500/40', bg: 'bg-sky-500/10' },
    alignedClass: 'logistician',
    rivalId: 'hive-collective',
  },
  {
    id: 'echo-remnants',
    name: 'Echo Remnants',
    tagline: 'We remember what was forgotten.',
    description: 'A scholar-enclave preserving precursor technologies. Guarded, methodical, paranoid. Allies unlock research breakthroughs otherwise unreachable.',
    theme: { accent: 'text-indigo-400', border: 'border-indigo-500/40', bg: 'bg-indigo-500/10' },
    alignedClass: 'scientist',
    rivalId: 'hive-collective',
  },
];

export const FACTION_MAP = new Map(FACTIONS.map(f => [f.id, f]));

export function getFactionArtUrl(id: FactionId): string {
  return `/game/faction-${id}.webp`;
}

export function getStanding(rep: number): FactionStanding {
  if (rep >= 50) return 'allied';
  if (rep >= 10) return 'friendly';
  if (rep > -10) return 'neutral';
  if (rep > -50) return 'unfriendly';
  return 'hostile';
}

export const STANDING_LABEL: Record<FactionStanding, string> = {
  allied: 'Allied',
  friendly: 'Friendly',
  neutral: 'Neutral',
  unfriendly: 'Unfriendly',
  hostile: 'Hostile',
};

export const STANDING_ACCENT: Record<FactionStanding, string> = {
  allied: 'text-emerald-300',
  friendly: 'text-sky-300',
  neutral: 'text-slate-300',
  unfriendly: 'text-amber-300',
  hostile: 'text-red-300',
};

export function getFactionRep(state: GameState, id: FactionId): number {
  return state.factionReputation?.[id] ?? 0;
}

/** Cost of a Diplomatic Envoy: escalates at higher standings to cap progression. */
export function getEnvoyCost(currentRep: number): number {
  if (currentRep >= 80) return 2_000_000_000;
  if (currentRep >= 50) return 500_000_000;
  if (currentRep >= 20) return 150_000_000;
  return 50_000_000;
}

/** Apply a reputation change to a faction. Rivals lose half the amount when you gain with opponent.
 *  Construction Purposes wave (docs/CONSTRUCTION_PURPOSES_2026-08.md):
 *  diplomatic infrastructure (crewed stations with the `diplomacy`
 *  capability, capped +25%) amplifies POSITIVE gains only — the rival's
 *  penalty stays keyed to the ORIGINAL delta (embassies win friends without
 *  making extra enemies), and losses are never softened (a broken contract
 *  hurts the same no matter how many summits you host). */
export function shiftReputation(state: GameState, id: FactionId, delta: number): GameState {
  const current = state.factionReputation || {};
  const faction = FACTION_MAP.get(id);
  const next = { ...current };
  const appliedDelta = delta > 0
    ? Math.round(delta * (1 + getGlobalCapabilityBonus(state, 'diplomacy')))
    : delta;
  next[id] = Math.max(-100, Math.min(100, (current[id] ?? 0) + appliedDelta));
  // If the delta is positive, rival loses half as much (bounded down at -100)
  if (faction && delta > 0) {
    const rivalDelta = -Math.floor(delta / 2);
    next[faction.rivalId] = Math.max(-100, Math.min(100, (current[faction.rivalId] ?? 0) + rivalDelta));
  }
  return { ...state, factionReputation: next };
}

/** Send an envoy to a faction: pay money → gain +10 rep with them (and the rival cost). */
export function sendEnvoy(state: GameState, id: FactionId): GameState {
  const rep = getFactionRep(state, id);
  const cost = getEnvoyCost(rep);
  if (state.money < cost) return state;
  if (rep >= 100) return state;
  const after = { ...state, money: state.money - cost, totalSpent: state.totalSpent + cost };
  return shiftReputation(after, id, 10);
}

// ─── 4X Wave W11 — Faction standing economic bite (STATS_DESIGN.md §12) ────
// "Standing tiers modify prices: Allied = 15% better prices at that
// faction's services; Hostile = 25% worse or unavailable." Reputation
// (-100..100, this file) is per-faction and already shifts both ways via
// shiftReputation — unlike the global XP-like score in reputation.ts, which
// is explicitly append-only. Standing is therefore the right lever for a
// spendable/losable economic relationship.

/**
 * Signed broker-fee modifier for the given standing, per STATS_DESIGN §12's
 * stated tier range. Fed into market-engine.getEffectiveBrokerFeeRate's
 * `factionStandingModifier` param — positive = discount, negative =
 * surcharge. Neutral is exactly 0 (today's behavior, unchanged for players
 * who never engage a faction's market).
 */
export const STANDING_BROKER_MODIFIER: Record<FactionStanding, number> = {
  allied: 0.15,
  friendly: 0.07,
  neutral: 0,
  unfriendly: -0.10,
  hostile: -0.25,
};

export function getFactionStandingBrokerModifier(rep: number): number {
  return STANDING_BROKER_MODIFIER[getStanding(rep)];
}

/** Hostile standing ("Hostile = ... unavailable" per STATS_DESIGN §12)
 *  embargoes that faction's exclusive offerings — gates
 *  purchaseFactionLicense below and is available for future waves to gate
 *  faction-exclusive services/contracts the same way. */
export function isEmbargoed(rep: number): boolean {
  return getStanding(rep) === 'hostile';
}

// ─── Faction licensing deals (STATS_DESIGN §12 "faction-locked content") ───
// Pay-once, standing-gated deals that unlock ongoing tech/route access.
// `grants` is a forward-compatible flag string (mirrors narrative-events.ts's
// unlockRareTechId pattern) — the license purchase itself is real (money
// spent, standing required, hostile factions refuse to deal), while the
// specific mechanical consumer of each `grants` flag is left for the wave
// that builds that content (route bonuses, tech gates, etc.) so nothing
// authored here is lost.

export interface FactionLicenseDefinition {
  id: string;
  factionId: FactionId;
  name: string;
  description: string;
  cost: number;
  /** Minimum standing (rep points) required to be offered this deal. */
  minStanding: number;
  /** Forward-compatible unlock flag, stored in state.factionLicenses. */
  grants: string;
}

export const FACTION_LICENSES: FactionLicenseDefinition[] = [
  {
    id: 'dominion_priority_routing',
    factionId: 'the-dominion',
    name: 'Dominion Priority Routing License',
    description: 'Enforcement-escorted shipping lanes through Dominion-patrolled inner-system space.',
    cost: 300_000_000,
    minStanding: 10,
    grants: 'priority_routing',
  },
  {
    id: 'syndicate_blackmarket_access',
    factionId: 'the-syndicate',
    name: 'Syndicate Gray-Market Access',
    description: 'Discreet logistics and gray-market contract access the Dominion suppresses.',
    cost: 250_000_000,
    minStanding: 10,
    grants: 'blackmarket_access',
  },
  {
    id: 'corsair_safe_passage',
    factionId: 'void-corsairs',
    name: 'Void Corsair Safe-Passage Tribute',
    description: 'A standing tribute agreement — Corsair raids redirect to rivals instead of you.',
    cost: 180_000_000,
    minStanding: 10,
    grants: 'safe_passage',
  },
  {
    id: 'hive_biomaterial_supply',
    factionId: 'hive-collective',
    name: 'Hive Biomaterial Supply Agreement',
    description: 'Ongoing exotic bio-material trade the Collective extends only to trusted partners.',
    cost: 400_000_000,
    minStanding: 20,
    grants: 'biomaterial_supply',
  },
  {
    id: 'reaver_route_charts',
    factionId: 'nebula-reavers',
    name: 'Nebula Reaver Route Charts',
    description: 'Coordinates to resource-rich anomalies and short-cut shipping lanes.',
    cost: 220_000_000,
    minStanding: 10,
    grants: 'route_charts',
  },
  {
    id: 'echo_precursor_access',
    factionId: 'echo-remnants',
    name: 'Echo Remnant Precursor Research Access',
    description: 'Guarded access to precursor-technology research otherwise unreachable.',
    cost: 500_000_000,
    minStanding: 25,
    grants: 'precursor_access',
  },
];

export const FACTION_LICENSE_MAP = new Map(FACTION_LICENSES.map(l => [l.id, l]));

/** Purchase a faction license: pay money → gain the deal's `grants` flag.
 *  No-op (returns the same reference) if: unknown id, already owned,
 *  standing below the deal's minimum, the faction is hostile (embargo), or
 *  the player can't afford it. */
export function purchaseFactionLicense(state: GameState, licenseId: string): GameState {
  const def = FACTION_LICENSE_MAP.get(licenseId);
  if (!def) return state;
  const owned = state.factionLicenses || [];
  if (owned.includes(licenseId)) return state;
  const rep = getFactionRep(state, def.factionId);
  if (isEmbargoed(rep)) return state;
  if (rep < def.minStanding) return state;
  if (state.money < def.cost) return state;
  return {
    ...state,
    money: state.money - def.cost,
    totalSpent: state.totalSpent + def.cost,
    factionLicenses: [...owned, licenseId],
  };
}
