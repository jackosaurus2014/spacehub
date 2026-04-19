// ─── Space Tycoon: Faction System ───────────────────────────────────────────
// 6 NPC factions with per-player reputation (-100 to +100).
// MVP scope: view standings, use Diplomatic Envoy to raise reputation with spend.
// Later: faction-themed contracts, rep shifts from in-game actions, alliance effects.

import type { GameState } from './types';

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

/** Apply a reputation change to a faction. Rivals lose half the amount when you gain with opponent. */
export function shiftReputation(state: GameState, id: FactionId, delta: number): GameState {
  const current = state.factionReputation || {};
  const faction = FACTION_MAP.get(id);
  const next = { ...current };
  next[id] = Math.max(-100, Math.min(100, (current[id] ?? 0) + delta));
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
