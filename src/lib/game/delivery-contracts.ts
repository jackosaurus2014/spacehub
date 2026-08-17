// ─── Space Tycoon: Delivery Contracts ───────────────────────────────────────
// NPC-faction-issued binding contracts that require physical delivery of
// resources by a deadline. Ties Factions ↔ Contracts ↔ Reputation together.
//
// v1 scope: NPC-issued only. P2P player contracts will extend this system
// later — the UI and data shape are designed to support both from day one.

import type { GameState, DeliveryContractState } from './types';
import { FACTIONS, FACTION_MAP, getFactionRep, shiftReputation, type FactionId } from './factions';
import { RESOURCES, RESOURCE_MAP, type ResourceId } from './resources';
import { isInFrontier, FRONTIER_CONTRACT_PAYOUT_MULTIPLIER } from './frontier';
import { getReputationBonuses } from './reputation';
import { getWorkforceBonuses } from './workforce';
// Live-Service Wave LS9 (docs/LIVE_SERVICE_2026-08.md §LS9): quarterly
// Realignment posture — contract-generosity multiplier + procurement-focus
// category, both bounded within POSTURE_BAND. Pure/DB-free (see
// realignment.ts's header); one-directional import (realignment.ts never
// imports this module, so no cycle).
import { computeFactionPostures, getCurrentRealignmentEpoch, type FactionPosture } from './realignment';
import type { ResourceCategory } from './economic-seasons';
import { getSpotPrice } from './spot-price';
// Wave E7 (§E7 "zone-tagged contracts"): tag each generated contract with
// the zone it executes in (the issuing faction's territory, per
// zone-influence.ts's lore-anchored FACTION_TERRITORY). Flavor/display only
// for THIS client-simulated pool — the real, IP-affecting zone-tagged
// contract source is the server-authoritative BiddingContract.zoneSlug
// column (see contract-bidding.ts / zones/update/route.ts).
import { FACTION_TERRITORY } from './zone-influence';

/** Public type alias — the persisted DeliveryContractState is the contract. */
export type DeliveryContract = DeliveryContractState;
export type DeliveryStatus = DeliveryContractState['status'];

// ─── Template generation ──────────────────────────────────────────────────────
// Each faction has a preferred resource category and offers contracts
// consistent with its character. Mentioned in lore / flavor text.

export interface FactionFlavor {
  preferredResources: ResourceId[];
  avoidedResources: ResourceId[];
  paymentMultiplier: number;   // faction's pay vs baseline
  deadlineHoursRange: [number, number];
  reputationOnComplete: number;
  reputationOnDefault: number;
  quantityMultiplier: number;  // faction's typical request size
  titleTemplates: string[];
}

// Exported (Wave E7, docs/ECONOMY_PVP_2026-08.md §E7): npc-procurement-
// drives.ts reuses `preferredResources` for faction-biased NPC buys, and
// market/trade/route.ts reverse-looks-up a resource's "governing faction"
// (the faction whose preferredResources includes it) for tariff wiring —
// one shared table instead of a second copy drifting out of sync.
export const FACTION_FLAVOR: Record<FactionId, FactionFlavor> = {
  'the-dominion': {
    preferredResources: ['iron', 'aluminum', 'titanium', 'rare_earth'],
    avoidedResources: [],
    paymentMultiplier: 1.0,
    deadlineHoursRange: [12, 72],
    reputationOnComplete: 6,
    reputationOnDefault: -10,
    quantityMultiplier: 1.2,
    titleTemplates: [
      'Strategic Reserve: {qty} {res}',
      'Fleet Refit Contract: {qty} {res}',
      'Infrastructure Appropriation: {qty} {res}',
      'Official Procurement #{{n}}: {qty} {res}',
    ],
  },
  'the-syndicate': {
    preferredResources: ['platinum_group', 'gold', 'rare_earth', 'exotic_materials'],
    avoidedResources: [],
    paymentMultiplier: 1.3,   // pays more but can be a reputation trap
    deadlineHoursRange: [6, 48],
    reputationOnComplete: 8,
    reputationOnDefault: -12,  // stiff default penalty
    quantityMultiplier: 0.8,
    titleTemplates: [
      'Discreet Handover: {qty} {res}',
      'Off-the-Books Shipment: {qty} {res}',
      'Pallas-4 Priority: {qty} {res}',
      'Gray-Market Exchange: {qty} {res}',
    ],
  },
  'void-corsairs': {
    preferredResources: ['methane', 'ethane', 'aluminum', 'iron'],
    avoidedResources: ['rare_earth', 'platinum_group'],
    paymentMultiplier: 0.9,   // pays less but low rep gate
    deadlineHoursRange: [8, 36],
    reputationOnComplete: 5,
    reputationOnDefault: -4,
    quantityMultiplier: 1.0,
    titleTemplates: [
      'Tribute Shipment: {qty} {res}',
      'Clan Supplies: {qty} {res}',
      'Convoy Fee: {qty} {res}',
    ],
  },
  'hive-collective': {
    preferredResources: ['exotic_materials', 'helium3', 'lunar_water', 'mars_water'],
    avoidedResources: [],
    paymentMultiplier: 1.5,   // best pay; rarest asks
    deadlineHoursRange: [24, 120],
    reputationOnComplete: 10,
    reputationOnDefault: -6,
    quantityMultiplier: 0.5,
    titleTemplates: [
      'Pattern Exchange: {qty} {res}',
      'Collective Provisioning: {qty} {res}',
      'Resonance Trade: {qty} {res}',
    ],
  },
  'nebula-reavers': {
    preferredResources: ['methane', 'helium3', 'ethane', 'exotic_materials'],
    avoidedResources: ['iron', 'aluminum'],
    paymentMultiplier: 1.1,
    deadlineHoursRange: [18, 96],
    reputationOnComplete: 7,
    reputationOnDefault: -8,
    quantityMultiplier: 0.9,
    titleTemplates: [
      'Drift Cache: {qty} {res}',
      'Convocation Dispatch: {qty} {res}',
      'Deep Run: {qty} {res}',
    ],
  },
  'echo-remnants': {
    preferredResources: ['exotic_materials', 'rare_earth', 'titanium', 'platinum_group'],
    avoidedResources: [],
    paymentMultiplier: 1.4,
    deadlineHoursRange: [24, 168],  // scholarly patience
    reputationOnComplete: 9,
    reputationOnDefault: -6,
    quantityMultiplier: 0.7,
    titleTemplates: [
      'Archive Acquisition: {qty} {res}',
      'Preservation Order: {qty} {res}',
      'Order Requisition: {qty} {res}',
    ],
  },
};

/** Wave E7 (§5 item 7 "tariffStanceMultiplier applies as a fee/premium on
 *  trades... crossing that faction's space"): the trade route has no
 *  location context, so tariff wiring resolves a resource's "governing
 *  faction" as the faction whose FACTION_FLAVOR.preferredResources includes
 *  it (first match, deterministic order) — a resource "belongs" to whichever
 *  faction's economy it's canonically part of (Dominion metals, Hive
 *  exotics...). Resources with no faction preference return null (no tariff
 *  applies). Pure/deterministic — safe to call from either client or server. */
export function getGoverningFactionForResource(resourceId: string): FactionId | null {
  for (const faction of FACTIONS) {
    if (FACTION_FLAVOR[faction.id].preferredResources.includes(resourceId as ResourceId)) {
      return faction.id;
    }
  }
  return null;
}

/** Bound applied to the tariff fee rate — matches realignment.ts's
 *  POSTURE_BAND_MIN/MAX (0.8-1.2) reduced to a ±20% fee-on-gross. Exported
 *  so tests assert against the same constant the function enforces. */
export const TARIFF_FEE_RATE_BOUND = 0.2;

/**
 * E7 (§5 item 7 "Realignment postures bite"): tariffStanceMultiplier — the
 * WORLD-SHARED (not player-specific; that's STANDING_BROKER_MODIFIER/
 * getFactionStandingBrokerModifier in factions.ts) posture premium/discount
 * a faction is currently charging on trade of the resources it governs
 * (getGoverningFactionForResource). Symmetric: intended to apply to both
 * buy and sell — a tariff taxes the border crossing regardless of
 * direction. Pure/deterministic (computeFactionPostures/
 * getCurrentRealignmentEpoch are both DB-free — see realignment.ts header),
 * so this is callable from either a server route (market/trade) or the
 * client tick with zero new plumbing. Resources with no governing faction
 * return rate 0 (no tariff).
 */
export function computeTariffFeeRate(
  resourceId: string,
  nowMs: number = Date.now(),
): { rate: number; factionId: FactionId | null } {
  const governingFaction = getGoverningFactionForResource(resourceId);
  if (!governingFaction) return { rate: 0, factionId: null };
  const epochIndex = getCurrentRealignmentEpoch(nowMs);
  const posture = computeFactionPostures(epochIndex).find(p => p.factionId === governingFaction);
  if (!posture) return { rate: 0, factionId: governingFaction };
  const rate = Math.max(-TARIFF_FEE_RATE_BOUND, Math.min(TARIFF_FEE_RATE_BOUND, posture.tariffStanceMultiplier - 1));
  return { rate, factionId: governingFaction };
}

export const POOL_SIZE = 8;
const POOL_TARGET_SIZE = POOL_SIZE;
const POOL_REFRESH_MS = 4 * 60 * 60 * 1000; // 4 hours

// Wave E2 (docs/ECONOMY_PVP_2026-08.md §2.3 / §2.5 "one price truth"):
// SUPERSEDES the E1 stopgap. E1 could only apply a flat 15% haircut
// (DELIVERY_ARBITRAGE_SPREAD) to shrink the static-price arbitrage margin,
// because delivery contracts are 100% client-simulated and there was no spot
// pipe to price against. E2 builds that pipe — the server delivers a
// band-clamped `marketSnapshot` every sync (spot-price.ts) — so delivery
// contracts now price at LIVE SPOT AT ACCEPTANCE (§2.3): the payout is
// rescaled from its base-price preview to the spot the client last saw when
// the contract is accepted, and that price is locked onto the contract as a
// genuine forward (lock today's spot, deliver in 72h — free hedging
// gameplay). This closes the flip WITHOUT a flat haircut: crash the market
// and the contract you accept now pays the crashed spot, so there is no
// static-vs-live gap to arbitrage. The flat spread is therefore removed;
// contracts pay full (the no-fee channel BALANCE.md intends) with the
// arbitrage closed by the spot lock instead of by friction. Solo /
// never-synced players (no snapshot) keep base pricing — they never touch
// the shared book, so there is nothing to arbitrage. Real per-delivery money
// remains bounded by the sync-route plausibility clamp (§E1 #5).

export function getDeliveryPool(state: GameState): DeliveryContract[] {
  return state.availableDeliveries || [];
}

export function getActiveDeliveries(state: GameState): DeliveryContract[] {
  return state.activeDeliveries || [];
}

export function getCompletedDeliveries(state: GameState): DeliveryContract[] {
  return state.completedDeliveries || [];
}

/** Compute a deterministic hash for stable pool seeding. */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pickWeighted<T>(rng: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  const target = rng() * total;
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (target <= cumulative) return items[i];
  }
  return items[items.length - 1];
}

/** Generate a single contract for the given faction.
 *
 *  LS9 posture params (both optional, default to "no change" so every
 *  existing caller/test keeps producing identical contracts):
 *  `postureMultiplier` — this epoch's band-bounded contract-generosity
 *  multiplier for `factionId` (realignment.ts getContractGenerosityMultiplier),
 *  layered on TOP of the faction's static FACTION_FLAVOR.paymentMultiplier,
 *  never replacing it. `focusCategory` — this epoch's procurement-focus
 *  category for `factionId`; resources in that category get a modest
 *  weight bump in the pick below (still bounded — avoidedResources are
 *  never included regardless of focus). */
export function generateContract(
  factionId: FactionId,
  rngSeed: number,
  now: number = Date.now(),
  postureMultiplier: number = 1,
  focusCategory?: ResourceCategory,
): DeliveryContract {
  const rng = mulberry32(rngSeed);
  const flavor = FACTION_FLAVOR[factionId];
  const faction = FACTION_MAP.get(factionId)!;

  // Pick a resource — weight preferred higher, avoid avoided. This epoch's
  // procurement focus (LS9) nudges the weight further when it lands on a
  // still-eligible resource — never overrides avoidedResources.
  const candidates = RESOURCES.filter(r => !flavor.avoidedResources.includes(r.id));
  const weights = candidates.map(r => {
    let w = flavor.preferredResources.includes(r.id) ? 5 : 1;
    if (focusCategory && r.category === focusCategory) w *= 1.6;
    return w;
  });
  const resource = pickWeighted(rng, candidates, weights);

  // Quantity: scales to flavor multiplier. Base range 20-200.
  const baseQty = Math.round(20 + rng() * 180);
  const quantity = Math.max(5, Math.round(baseQty * flavor.quantityMultiplier));

  // Payment: baseline market price × quantity × multiplier, with some noise.
  // LS9: postureMultiplier is this epoch's band-bounded (±20%) generosity
  // shift for this faction — a real, forecastable, world-shared variance on
  // top of the faction's fixed baseline, matching "BALANCE table becomes
  // dynamic ±0.2" per the LS9 spec.
  const basePrice = resource.baseMarketPrice;
  const payment = Math.round(basePrice * quantity * flavor.paymentMultiplier * postureMultiplier * (0.9 + rng() * 0.2));

  // Deadline: from flavor range, measured in real-time hours.
  const deadlineHours = randRange(rng, flavor.deadlineHoursRange[0], flavor.deadlineHoursRange[1]);
  const deadlineAtMs = now + deadlineHours * 60 * 60 * 1000;

  // Title from a template.
  const template = flavor.titleTemplates[Math.floor(rng() * flavor.titleTemplates.length)];
  const n = Math.floor(rng() * 9000) + 1000;
  const title = template
    .replace('{qty}', quantity.toLocaleString())
    .replace('{res}', resource.name)
    .replace('{{n}}', n.toString());

  // E7: zone-tagged, display-only (see import comment above) — a faction
  // with no mapped territory (Hive Collective, Nebula Reavers — nomadic by
  // lore) simply has no zoneSlug.
  const territory = FACTION_TERRITORY[factionId];
  const zoneSlug = territory && territory.length > 0
    ? territory[Math.floor(rng() * territory.length)]
    : undefined;

  return {
    id: `dlv-${factionId}-${rngSeed.toString(36)}-${Math.floor(rng() * 1e9).toString(36)}`,
    issuerKind: 'faction',
    issuerFactionId: factionId,
    title,
    resourceId: resource.id,
    quantity,
    paymentMoney: payment,
    deadlineAtMs,
    reputationOnComplete: flavor.reputationOnComplete,
    reputationOnDefault: flavor.reputationOnDefault,
    status: 'open',
    offeredAtMs: now,
    zoneSlug,
  };
}

/** Ensure the contract pool is fresh. Refreshes on a bucketed schedule so all
 *  clients converge without server persistence. */
export function ensureFreshDeliveryPool(state: GameState, now: number = Date.now()): GameState {
  const existing = state.availableDeliveries || [];
  // Remove expired open contracts
  const stillValid = existing.filter(c => c.status === 'open' && c.deadlineAtMs > now);

  // Refresh every POOL_REFRESH_MS
  const lastRefresh = state.deliveryPoolRefreshedAtMs || 0;
  const shouldRefresh = now - lastRefresh >= POOL_REFRESH_MS || stillValid.length < POOL_TARGET_SIZE / 2;

  if (!shouldRefresh) {
    return { ...state, availableDeliveries: stillValid };
  }

  // Generate new contracts across factions, weighted by player standing.
  // Allied factions offer more contracts; hostile factions offer fewer.
  const factionWeights: Record<FactionId, number> = FACTIONS.reduce((acc, f) => {
    const rep = getFactionRep(state, f.id);
    // Standing modifier: 0 rep = 1.0, +100 = 1.5, -100 = 0.3
    const mod = rep >= 0 ? 1 + (rep / 100) * 0.5 : Math.max(0.3, 1 + (rep / 100) * 0.7);
    acc[f.id] = mod;
    return acc;
  }, {} as Record<FactionId, number>);

  // LS9: this epoch's faction postures, computed ONCE per pool refresh (not
  // per contract) — computeFactionPostures is a bounded but non-trivial walk
  // (see realignment.ts), and refreshes only happen every POOL_REFRESH_MS or
  // when the pool runs low, so this stays cheap in practice.
  const epochIndex = getCurrentRealignmentEpoch(now);
  const postureByFaction = new Map<FactionId, FactionPosture>(
    computeFactionPostures(epochIndex).map(p => [p.factionId, p]),
  );

  const bucket = Math.floor(now / POOL_REFRESH_MS);
  const fresh: DeliveryContract[] = [];
  for (let i = 0; i < POOL_TARGET_SIZE; i++) {
    const fId = pickWeighted(mulberry32(bucket * 1000 + i), FACTIONS.map(f => f.id), FACTIONS.map(f => factionWeights[f.id]));
    const posture = postureByFaction.get(fId);
    fresh.push(generateContract(
      fId, bucket * 1000 + i * 37, now,
      posture?.contractGenerosityMultiplier ?? 1,
      posture?.procurementFocus,
    ));
  }

  return {
    ...state,
    availableDeliveries: fresh,
    deliveryPoolRefreshedAtMs: now,
  };
}

// ─── Daily completion cap (founder directive, 2026-08) ─────────────────────
// "whenever I finish the open market contracts it immediately refreshes the
// contracts. We should only allow X number of contracts to be completed
// every 24 hours." Full derivation of the numbers below lives in
// docs/BALANCE.md ("Delivery contract daily completion cap"). Short version:
// contracts are the no-fee channel (Wave 4, BALANCE.md) and now pay full
// live-spot value (E2) — with no completion limit a player grinding
// contracts could out-earn a diversified same-tier corporation. The cap
// keeps contracts a strong supplement (~30-40% of a diversified player's
// daily income), never the dominant printer.
//
// Rolling 24h window, computed from data ALREADY persisted on the save —
// completedDeliveries entries carry `completedAtMs` and are capped to the
// most recent 100 (see deliverContract below), which comfortably outlives
// the cap window at these magnitudes. No new state field / save migration
// is needed: the "timestamps array" the window is computed from already
// exists as a side effect of the existing history log.
export const DELIVERY_CAP_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Base completions allowed per rolling 24h window. */
export const DELIVERY_CAP_BASE = 4;
/** Space Logistics Network (research-tree.ts id 'space_logistics' — "Regular
 *  cargo delivery routes") grants +1. Reused directly by id rather than
 *  routed through the generic ResearchEffectType system: that system sums
 *  fractional (0-1) magnitudes onto continuous multipliers, but this is a
 *  flat +1 integer slot — same shape mismatch that COMMAND_QUEUE_AUTOMATION_
 *  RESEARCH_ID (constants.ts) already solves with a direct
 *  completedResearch.includes() check, so this mirrors that established
 *  pattern instead of inventing a new effect type for one consumer. */
export const DELIVERY_CAP_RESEARCH_BONUS_ID = 'space_logistics';
export const DELIVERY_CAP_RESEARCH_BONUS = 1;
/** Corporation Tier 5 "Conglomerate" grants +1 — mirrors
 *  COMMAND_QUEUE_TIER5_BONUS's threshold/shape (constants.ts): at this scale
 *  a corporation runs enough parallel logistics across locations to
 *  realistically service more simultaneous delivery contracts. */
export const DELIVERY_CAP_TIER_THRESHOLD = 5;
export const DELIVERY_CAP_TIER_BONUS = 1;

/** Total delivery-contract completions allowed per rolling 24h window.
 *  Never purchasable — earned only via research or corporation tier. */
export function getDailyDeliveryCap(state: GameState): number {
  let cap = DELIVERY_CAP_BASE;
  if ((state.completedResearch || []).includes(DELIVERY_CAP_RESEARCH_BONUS_ID)) cap += DELIVERY_CAP_RESEARCH_BONUS;
  if ((state.corporationTier || 1) >= DELIVERY_CAP_TIER_THRESHOLD) cap += DELIVERY_CAP_TIER_BONUS;
  return cap;
}

/** Completed (not defaulted) deliveries within the rolling 24h window. */
export function getRecentDeliveryCompletions(state: GameState, now: number = Date.now()): DeliveryContract[] {
  return (state.completedDeliveries || []).filter(
    c => c.status === 'completed' && typeof c.completedAtMs === 'number' && now - c.completedAtMs < DELIVERY_CAP_WINDOW_MS,
  );
}

export interface DeliveryCapStatus {
  /** Completions counted within the current rolling 24h window. */
  completed: number;
  /** Total allowed this window (base + research + tier). */
  cap: number;
  atCap: boolean;
  /** ms until the oldest counted completion rolls off the window and frees a
   *  slot. 0 when not at cap. */
  resetInMs: number;
}

export function getDeliveryCapStatus(state: GameState, now: number = Date.now()): DeliveryCapStatus {
  const recentDeliveries = getRecentDeliveryCompletions(state, now);
  // Founder follow-up (2026-08-16): the daily budget is SHARED across both
  // contract systems — faction delivery contracts AND the legacy
  // CONTRACT_POOL contracts (ContractsPanel), whose auto-completions were
  // originally uncapped and made contract income feel unlimited. Legacy
  // completions are stamped into state.legacyContractCompletionsAt (V40).
  const legacyRecent = (state.legacyContractCompletionsAt || []).filter(
    (t) => now - t < DELIVERY_CAP_WINDOW_MS
  );
  const completedCount = recentDeliveries.length + legacyRecent.length;
  const cap = getDailyDeliveryCap(state);
  const atCap = completedCount >= cap;
  let resetInMs = 0;
  if (atCap && completedCount > 0) {
    // The oldest completion still inside the window is the one that must
    // roll off before a new completion is allowed again.
    const stamps = [
      ...recentDeliveries.map((c) => c.completedAtMs!),
      ...legacyRecent,
    ];
    const oldest = stamps.reduce((min, t) => (t < min ? t : min), stamps[0]);
    resetInMs = Math.max(0, oldest + DELIVERY_CAP_WINDOW_MS - now);
  }
  return { completed: completedCount, cap, atCap, resetInMs };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/** Max simultaneously-accepted (undelivered) delivery contracts — the same
 *  number as the daily completion cap, so a player can hold at most one
 *  day's worth of queued work. Founder follow-up 8/17: acceptance was
 *  unlimited, which let players hoover the whole pool into an infinite
 *  drip-fed backlog even with completions capped. */
export function getActiveDeliveryLimit(state: GameState): number {
  return getDailyDeliveryCap(state);
}

export function getActiveDeliveryCount(state: GameState): number {
  return (state.activeDeliveries || []).filter(c => c.status === 'accepted').length;
}

export function acceptDelivery(state: GameState, contractId: string, now: number = Date.now()): GameState {
  const pool = state.availableDeliveries || [];
  const contract = pool.find(c => c.id === contractId);
  if (!contract || contract.status !== 'open') return state;
  // Active-slot cap (authoritative regardless of UI state)
  if (getActiveDeliveryCount(state) >= getActiveDeliveryLimit(state)) return state;

  // E2 (§2.3): lock the LIVE SPOT AT ACCEPTANCE. The generated paymentMoney is
  // a base-price preview (basePrice × qty × faction × posture × noise); we
  // rescale it by spot/base so faction/posture/noise are preserved exactly
  // while the resource is valued at the price the client last saw. Absent a
  // snapshot (solo / never-synced), the base-priced preview stands.
  let paymentMoney = contract.paymentMoney;
  let spotUnitAtAcceptance: number | undefined;
  const spot = getSpotPrice(state.marketSnapshot, contract.resourceId);
  const base = RESOURCE_MAP.get(contract.resourceId as ResourceId)?.baseMarketPrice;
  if (spot && spot > 0 && base && base > 0) {
    paymentMoney = Math.round(contract.paymentMoney * (spot / base));
    spotUnitAtAcceptance = spot;
  }

  const accepted: DeliveryContract = {
    ...contract,
    status: 'accepted',
    acceptedAtMs: now,
    paymentMoney,
    spotUnitAtAcceptance,
  };

  return {
    ...state,
    availableDeliveries: pool.filter(c => c.id !== contractId),
    activeDeliveries: [...(state.activeDeliveries || []), accepted],
  };
}

export function canDeliver(state: GameState, contractId: string): boolean {
  const contract = (state.activeDeliveries || []).find(c => c.id === contractId);
  if (!contract || contract.status !== 'accepted') return false;
  const have = state.resources[contract.resourceId] || 0;
  return have >= contract.quantity;
}

export function deliverContract(state: GameState, contractId: string, now: number = Date.now()): GameState {
  const active = state.activeDeliveries || [];
  const contract = active.find(c => c.id === contractId);
  if (!contract || contract.status !== 'accepted') return state;
  if (!canDeliver(state, contractId)) return state;
  // Founder-directive daily cap (see block above / docs/BALANCE.md). Quiet
  // no-op, matching this function's existing early-return shape — the UI is
  // expected to check getDeliveryCapStatus() first and disable the action
  // with a clear reason (DiplomacyPanel's ContractCard), but this guard is
  // authoritative regardless of what the UI does: even a hand-crafted
  // dispatch cannot complete more than the cap allows, since the check reads
  // straight off persisted completedDeliveries state, not client-trusted
  // input.
  if (getDeliveryCapStatus(state, now).atCap) return state;

  // Deduct resources, pay money, record completion, shift reputation.
  // Frontier-protected players earn the FRONTIER_CONTRACT_PAYOUT_MULTIPLIER bonus.
  const resources = { ...state.resources };
  resources[contract.resourceId] = (resources[contract.resourceId] || 0) - contract.quantity;

  const frontierBonus = isInFrontier(state, now) ? FRONTIER_CONTRACT_PAYOUT_MULTIPLIER : 1;
  // Audit Wave B (§1c): reputation contractRewardMultiplier (up to +60%) and
  // negotiator contractPayBonus were dead outputs — they now scale delivery
  // payouts, same as static contract rewards (contracts.applyContractReward).
  const repBonuses = getReputationBonuses(state.reputation || 0);
  const wfBonuses = getWorkforceBonuses(state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 });
  // E2: no arbitrage haircut — contract.paymentMoney was already locked at
  // live spot on acceptance (§2.3), which closes the static-price flip. Full
  // payout (the no-fee channel, BALANCE.md), scaled only by the earned
  // frontier / reputation / workforce multipliers.
  const payment = Math.round(
    contract.paymentMoney
    * frontierBonus
    * repBonuses.contractRewardMultiplier
    * (1 + wfBonuses.contractPayBonus)
  );

  const completed: DeliveryContract = {
    ...contract,
    status: 'completed',
    completedAtMs: now,
    paymentMoney: payment,
  };

  let next: GameState = {
    ...state,
    resources,
    money: state.money + payment,
    totalEarned: state.totalEarned + payment,
    activeDeliveries: active.filter(c => c.id !== contractId),
    completedDeliveries: [completed, ...(state.completedDeliveries || [])].slice(0, 100),
  };

  if (contract.issuerKind === 'faction' && contract.issuerFactionId) {
    next = shiftReputation(next, contract.issuerFactionId as FactionId, contract.reputationOnComplete);
  }

  return next;
}

/** Automatically move any overdue accepted contracts to defaulted status and
 *  apply reputation penalties. Called from the game tick. */
export function processContractDeadlines(state: GameState, now: number = Date.now()): GameState {
  const active = state.activeDeliveries || [];
  const overdue = active.filter(c => c.deadlineAtMs <= now && c.status === 'accepted');
  if (overdue.length === 0) return state;

  let next: GameState = {
    ...state,
    activeDeliveries: active.filter(c => c.deadlineAtMs > now || c.status !== 'accepted'),
    completedDeliveries: [
      ...overdue.map(c => ({ ...c, status: 'defaulted' as const, defaultedAtMs: now })),
      ...(state.completedDeliveries || []),
    ].slice(0, 100),
  };

  for (const c of overdue) {
    if (c.issuerKind === 'faction' && c.issuerFactionId) {
      next = shiftReputation(next, c.issuerFactionId as FactionId, c.reputationOnDefault);
    }
  }

  return next;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function formatDeadline(deadlineAtMs: number, now: number = Date.now()): string {
  const delta = deadlineAtMs - now;
  if (delta <= 0) return 'OVERDUE';
  const mins = Math.floor(delta / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}
