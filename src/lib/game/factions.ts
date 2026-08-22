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

// ─── AAA Round 1 E1 — Fracture standing shifts ──────────────────────────────
// Defined HERE, not in accord-chair.ts, deliberately: these are faction
// standing rules, and accord-chair.ts already imports FACTION_MAP from this
// file — putting them there and importing back would be a module cycle.
// accord-chair.ts re-exports both for its routes and panel.

/**
 * Standing consequences of filing Articles of Fracture (LORE.md, the Treaty
 * Fracture of 2143 — "Void Corsairs, Syndicate, and Hive Collective formally
 * step outside Accord oversight").
 *
 * Expressed as a modifier over stored reputation rather than as a new
 * economic channel, so every effect a fractured corporation feels flows
 * through systems that already exist and are already balanced:
 * STANDING_BROKER_MODIFIER, isEmbargoed, FACTION_LICENSES.minStanding,
 * getEnvoyCost, and delivery-contracts' faction flavour. Fracture adds no
 * multiplier the game did not already have.
 *
 * The signs are canon. The Dominion's -40 is the sharpest because the
 * Dominion IS Accord enforcement: a fractured corporation sitting at neutral
 * drops a full two tiers to Unfriendly with it, and one already cool with the
 * enforcer lands Hostile and is embargoed out of Dominion licences entirely
 * (isEmbargoed). Meanwhile the Syndicate's +25 can carry a merely-Friendly
 * relationship all the way to Allied — the trade is real in both directions.
 */
export const FRACTURE_REP_SHIFTS: Record<FactionId, number> = {
  'the-dominion': -40,
  'echo-remnants': -25,
  'nebula-reavers': -15,
  'the-syndicate': 25,
  'void-corsairs': 25,
  'hive-collective': 15,
};

/** Pure: effective standing for a (possibly fractured) corporation. Shared by
 *  the client (getFactionRep below) and the server (market/trade's broker
 *  fee), so the two can never disagree. */
export function applyFractureRepModifier(baseRep: number, factionId: FactionId, fractured: boolean): number {
  const base = Number.isFinite(baseRep) ? baseRep : 0;
  if (!fractured) return Math.max(-100, Math.min(100, base));
  return Math.max(-100, Math.min(100, base + (FRACTURE_REP_SHIFTS[factionId] ?? 0)));
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

/** RAW stored standing — the number shiftReputation writes. Used where the
 *  base value itself must be read or written (envoy shifts, lobbying favor
 *  spend); everywhere that asks "how does this faction treat me right now"
 *  should call getFactionRep instead. */
export function getRawFactionRep(state: GameState, id: FactionId): number {
  return state.factionReputation?.[id] ?? 0;
}

/**
 * EFFECTIVE standing — the number every economic consumer reads.
 *
 * AAA Round 1 E1 (the Accord Chair): a corporation that has filed Articles
 * of Fracture is outside Accord jurisdiction, and the six factions react to
 * that per LORE.md's 2143 alignment. The reaction is applied here as a
 * DERIVED modifier over the stored value rather than as a one-time
 * reputation mutation, for three reasons: it needs no save migration, it
 * reverses exactly on re-accession, and it cannot double-apply if a snapshot
 * arrives twice. Every downstream consumer — broker fee bands, licence
 * eligibility, embargo, envoy pricing, delivery-contract flavour — reads
 * this one function and therefore picks the modifier up for free.
 *
 * The identical pure helper (accord-chair.ts::applyFractureRepModifier) runs
 * on the server for the market/trade broker fee, so client and server can
 * never disagree about what a fractured corporation pays.
 */
export function getFactionRep(state: GameState, id: FactionId): number {
  return applyFractureRepModifier(
    state.factionReputation?.[id] ?? 0,
    id,
    !!state.accordChair?.fractured,
  );
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
//
// Pay-once, standing-gated deals. The purchase was always real (money spent,
// standing required, hostile factions refuse to deal) — but for four waves
// the `grants` flags were read by NOTHING except an "OWNED" badge, while the
// licence descriptions made concrete mechanical promises ("escorted lanes",
// "raids redirect to rivals", "short-cut shipping lanes"). Six money sinks
// that lied.
//
// AAA Round 1 E3.6 fixes that. `grants` is now a closed union, every member
// has a numeric channel in `getFactionLicenseBonuses`, and every channel has
// a named consumer (asserted structurally by
// __tests__/faction-license-grants.test.ts). Where a promise could not be
// honoured inside this wave's scope, the licence copy was changed to tell the
// truth rather than left aspirational — see LICENSE_EFFECT_SUMMARY.

export type FactionLicenseGrant =
  | 'priority_routing'
  | 'blackmarket_access'
  | 'safe_passage'
  | 'biomaterial_supply'
  | 'route_charts'
  | 'precursor_access';

export interface FactionLicenseDefinition {
  id: string;
  factionId: FactionId;
  name: string;
  description: string;
  cost: number;
  /** Minimum standing (rep points) required to be offered this deal. */
  minStanding: number;
  /** Mechanical effect this deal confers — see getFactionLicenseBonuses. */
  grants: FactionLicenseGrant;
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

// ─── E3.6: what a licence actually does ─────────────────────────────────────

/**
 * Numeric effect channels conferred by owned licences. Every field has a
 * named consumer; `FACTION_LICENSE_CONSUMERS` records where, and the
 * structural test asserts those references still exist.
 *
 * Magnitudes are deliberately small and all sit inside caps that already
 * existed before this wave (hazard MITIGATION_CAP 0.90, the freight fuel
 * discount stack, the broker-fee 0.85 total-cut ceiling). Nothing here can
 * push a system past a bound the balance passes already validated, which is
 * why this repair does not reprice anything: it fills authored, paid-for
 * slots with the smallest honest number.
 */
export interface FactionLicenseBonuses {
  /** Fraction off freight fuel cost (cargo-logistics.ts::getFreightFuelCost). */
  freightFuelDiscount: number;
  /** Additive pirate_raid mitigation (hazards.ts, under MITIGATION_CAP). */
  pirateMitigation: number;
  /** Fraction off the market broker fee (market-engine.ts::getEffectiveBrokerFeeRate). */
  brokerFeeDiscount: number;
  /** Units of xenogenic_biomatter delivered per game-month (game-engine.ts §0d). */
  biomaterialPerMonth: number;
}

export const EMPTY_LICENSE_BONUSES: Readonly<FactionLicenseBonuses> = Object.freeze({
  freightFuelDiscount: 0,
  pirateMitigation: 0,
  brokerFeeDiscount: 0,
  biomaterialPerMonth: 0,
});

/** Per-grant effect table. One row per FactionLicenseGrant — the compiler
 *  enforces completeness, so a future licence cannot ship inert again. */
const LICENSE_GRANT_EFFECTS: Record<FactionLicenseGrant, Partial<FactionLicenseBonuses> & { summary: string }> = {
  // "Enforcement-escorted shipping lanes through Dominion-patrolled
  // inner-system space" — escorts make hauling cheaper and raids rarer.
  priority_routing: {
    freightFuelDiscount: 0.08,
    pirateMitigation: 0.05,
    summary: '-8% freight fuel cost; +5 percentage points of pirate-raid mitigation.',
  },
  // "Discreet logistics and gray-market contract access" — the Syndicate
  // moves your goods around the official broker.
  blackmarket_access: {
    brokerFeeDiscount: 0.20,
    summary: '-20% market broker fee on every trade.',
  },
  // "A standing tribute agreement — Corsair raids redirect to rivals."
  // Implemented as mitigation, not as a probability edit: hazard rolls are
  // deliberately identical for every player (shared-world weather, see
  // hazards.ts) and only the per-player mitigation channel may vary.
  safe_passage: {
    pirateMitigation: 0.20,
    summary: '+20 percentage points of pirate-raid mitigation (capped with your other shielding at 90%).',
  },
  // "Ongoing exotic bio-material trade" — the ONLY source of
  // xenogenic_biomatter that does not require an interstellar colony.
  biomaterial_supply: {
    biomaterialPerMonth: 2,
    summary: '2 units of xenogenic biomatter delivered per month — the only non-interstellar source in the game.',
  },
  // "Coordinates to resource-rich anomalies and short-cut shipping lanes."
  route_charts: {
    freightFuelDiscount: 0.05,
    summary: '-5% freight fuel cost from charted short-cuts.',
  },
  // "Guarded access to precursor-technology research otherwise unreachable."
  // Applied once, at purchase, through the existing rare-tech unlock channel
  // (unlockedRareTechIds) rather than as a per-tick multiplier.
  precursor_access: {
    summary: 'Unlocks the rare tech "Precursor Studies" for research (otherwise reachable only via the Triton Archive chain).',
  },
};

/** Rare research ids a licence unlocks on purchase. Uses the SAME channel
 *  narrative-events.ts and exploration.ts already write to. */
export const LICENSE_RARE_TECH_UNLOCKS: Partial<Record<FactionLicenseGrant, string[]>> = {
  precursor_access: ['precursor_studies'],
};

/** One-line player-facing effect copy per licence id — rendered by
 *  FactionPanel so the card states what it does, not just what it costs. */
export const LICENSE_EFFECT_SUMMARY: Record<string, string> = Object.fromEntries(
  FACTION_LICENSES.map(l => [l.id, LICENSE_GRANT_EFFECTS[l.grants].summary]),
);

/** Where each channel is consumed. Asserted structurally by
 *  __tests__/faction-license-grants.test.ts — a renamed or deleted consumer
 *  fails CI instead of quietly making a paid licence inert again. */
export const FACTION_LICENSE_CONSUMERS: Record<keyof FactionLicenseBonuses | 'rareTechUnlock', { module: string; symbol: string }> = {
  freightFuelDiscount: { module: 'src/lib/game/cargo-logistics.ts', symbol: 'freightFuelDiscount' },
  pirateMitigation: { module: 'src/lib/game/hazards.ts', symbol: 'pirateMitigation' },
  brokerFeeDiscount: { module: 'src/lib/game/market-engine.ts', symbol: 'licenseDiscount' },
  biomaterialPerMonth: { module: 'src/lib/game/game-engine.ts', symbol: 'biomaterialPerMonth' },
  rareTechUnlock: { module: 'src/lib/game/factions.ts', symbol: 'LICENSE_RARE_TECH_UNLOCKS' },
};

/** Caps applied after summing, so stacking every licence stays bounded. */
const LICENSE_BONUS_CAPS: FactionLicenseBonuses = {
  freightFuelDiscount: 0.12,
  pirateMitigation: 0.25,
  brokerFeeDiscount: 0.20,
  biomaterialPerMonth: 4,
};

/**
 * Aggregate the effects of every owned licence. Pure; safe to call every
 * tick (the owned list is at most six strings).
 *
 * Accepts either a GameState or a bare id list so the server-side trade
 * route — which only has the synced id array — can share this one table.
 */
export function getFactionLicenseBonuses(
  source: GameState | string[] | undefined | null,
): FactionLicenseBonuses {
  const owned = Array.isArray(source) ? source : (source?.factionLicenses || []);
  if (!owned || owned.length === 0) return { ...EMPTY_LICENSE_BONUSES };
  const out: FactionLicenseBonuses = { ...EMPTY_LICENSE_BONUSES };
  for (const id of owned) {
    const def = FACTION_LICENSE_MAP.get(id);
    if (!def) continue;
    const eff = LICENSE_GRANT_EFFECTS[def.grants];
    if (!eff) continue;
    out.freightFuelDiscount += eff.freightFuelDiscount || 0;
    out.pirateMitigation += eff.pirateMitigation || 0;
    out.brokerFeeDiscount += eff.brokerFeeDiscount || 0;
    out.biomaterialPerMonth += eff.biomaterialPerMonth || 0;
  }
  out.freightFuelDiscount = Math.min(LICENSE_BONUS_CAPS.freightFuelDiscount, out.freightFuelDiscount);
  out.pirateMitigation = Math.min(LICENSE_BONUS_CAPS.pirateMitigation, out.pirateMitigation);
  out.brokerFeeDiscount = Math.min(LICENSE_BONUS_CAPS.brokerFeeDiscount, out.brokerFeeDiscount);
  out.biomaterialPerMonth = Math.min(LICENSE_BONUS_CAPS.biomaterialPerMonth, out.biomaterialPerMonth);
  return out;
}

/** Purchase a faction license: pay money → gain the deal's mechanical
 *  effects (see getFactionLicenseBonuses; one-shot unlocks are applied here).
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

  // E3.6: one-shot rare-tech unlocks ride the SAME `unlockedRareTechIds`
  // channel narrative-events.ts::applyChainConsequence and exploration.ts
  // already write — the Echo Remnants licence is a purchasable second route
  // to the Triton Archive precursor research, not a parallel mechanism.
  const rareUnlocks = LICENSE_RARE_TECH_UNLOCKS[def.grants] || [];
  let unlockedRareTechIds = state.unlockedRareTechIds;
  for (const techId of rareUnlocks) {
    const known = unlockedRareTechIds || [];
    if (!known.includes(techId)) unlockedRareTechIds = [...known, techId];
  }

  return {
    ...state,
    money: state.money - def.cost,
    totalSpent: state.totalSpent + def.cost,
    factionLicenses: [...owned, licenseId],
    unlockedRareTechIds,
  };
}
