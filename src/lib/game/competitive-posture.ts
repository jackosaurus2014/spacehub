// ─── Space Tycoon: Competitive Discoverability (pre-relaunch pass, 2026-08) ─
//
// THE PROBLEM THIS MODULE EXISTS TO SOLVE (production telemetry, 2026-08-21):
// nine balance passes made the economic-warfare layer real — market-keyed
// price campaigns, wage-indexed talent poaching, lane tolls, orbital-slot
// auctions, cornering intel, espionage products — and every one of them has
// been used ZERO times across the entire life of the world. The mechanics are
// not broken; they are INVISIBLE. They live in sub-tabs a player has no
// reason to open, and nothing ever tells them the tools exist or when one
// becomes worth using.
//
// This module INVENTS NO MECHANICS. It is a pure lens over GameState that
// answers three questions the player never currently gets answered:
//
//   1. "These tools exist."      → deriveAvailableTools / reconcileToolAnnouncements
//   2. "Here is where I use them." → each COMPETITIVE_TOOLS entry carries the
//                                    tab + sub-view token its verb lives at
//   3. "Right now is a moment."   → deriveCompetitiveSignals
//
// ── THE HONESTY RULE (non-negotiable) ──────────────────────────────────────
// Every signal traces to REAL state a synced client already holds, and says
// only what that state supports. No invented urgency, no fake scarcity, no
// "3 rivals are watching you". Specifically REJECTED as not-honestly-
// derivable and therefore NOT implemented:
//
//   • "A rival is running lean crew, poach them" — a client cannot see any
//     other corporation's headcount. Only aggregate wage indexes sync
//     (labor-market.ts). The implemented labor signal states the aggregate
//     fact and the real per-head prices on BOTH options, and stops there.
//   • "Rival X is targeting your market" — demand-pool topShares are
//     ANONYMISED fractions by design (demand-pools.ts: "aggregate is free;
//     named deep detail stays earned via espionage/paid intel"). The
//     implemented signal reports concentration, never an identity.
//   • "You have enough ammunition to declare a campaign" — the real
//     ammunition requirement is max(50, 10% of the trailing-window SERVER
//     production units), which only the declare route can quote
//     (price-campaigns.ts computeCampaignMinInventory). The implemented
//     signal reports the inventory the player actually holds and says the
//     real requirement is server-quoted.
//   • "This campaign is costing you $N/month" — attributing a revenue delta
//     to a specific campaign would require a counterfactual the client
//     cannot compute. The victim alert states the mechanism and the measured
//     counterplay instead.
//
// ── NOT A NAG ──────────────────────────────────────────────────────────────
//   • Announcements fire ONCE per tool, ever, persisted in the optional
//     GameState.seenCompetitiveTools field (see reconcileToolAnnouncements —
//     an ABSENT field baselines silently, so no existing save is ever spammed
//     with a backlog).
//   • Signals are capped (MAX_COMPETITIVE_SIGNALS), never 'critical', and
//     never fire for a player who cannot act on them.
//   • NEWCOMER SAFETY: nothing here fires while the FTUE objective chain is
//     running (isOnboardingActive) or while the player is inside the
//     Protected Frontier (isInFrontier) — a shielded player cannot be
//     attacked and cannot use the tools, so pressuring them would be a lie.
//
// ── ACCESSIBILITY ──────────────────────────────────────────────────────────
// Every record here carries its meaning as WORDS (statusLabel / severity /
// detail), never as a colour the renderer picks. Renderers add colour on top;
// greyscale and screen readers lose nothing.

import type { GameState, GameTab } from './types';
import type { IconName } from './icons';
import { BUILDING_MAP } from './buildings';
import { LOCATION_MAP } from './solar-system';
import { MINING_PRODUCTION } from './resources';
import { RESOURCE_MAP, type ResourceId } from './resources';
import { isInFrontier, computeBookNetWorth } from './frontier';
import { isOnboardingActive } from './onboarding';
import {
  getTierUnlockedTabs,
  isFoldedFeatureUnlocked,
  FOLDED_FEATURE_TIERS,
} from './corporation-tiers';
import { CATEGORY_LABELS, getServiceCategory, demandPoolKey } from './demand-pools';
import { WORKER_MAP, WORKER_TYPES, type WorkerType } from './workforce';
import { getWageIndex } from './labor-market';
import { getSpotPrice, spotDeviation } from './spot-price';
import {
  PRICE_CAMPAIGN_MIN_NET_WORTH,
  PRICE_CAMPAIGN_MIN_INVENTORY,
} from './price-campaigns';
import {
  POACH_MIN_NET_WORTH,
  POACH_SIGNING_BONUS_MONTHS,
  POACH_BONUS_PREMIUM,
  POACH_MAX_FRACTION,
  POACH_MIN_TARGET_HEADCOUNT,
  computePoachActionFee,
  GUILD_ARBITRATION_TECH_ID,
} from './talent-poaching';
import { getFeeIndexFactor } from './fee-index';
import { MARKET_MICROSTRUCTURE_TECH_ID } from './cornering-intel';
import {
  ORBITAL_SLOT_MAP,
  hasActiveSlotLease,
} from './spatial-strategy';
import {
  SLOT_IDLE_FEE_FRACTION, SLOT_IDLE_AUTO_RELEASE_MS, SLOT_IDLE_FEE_INTERVAL_MS,
  SLOT_AUCTION_RELATIVE_THRESHOLD_PCT,
} from './orbital-slot-auctions';
import { DEMAND_POOL_STALE_MS } from './demand-pools';
import { LABOR_MARKET_STALE_MS } from './labor-market';

// ─── Sub-view tokens ────────────────────────────────────────────────────────
// The competitive verbs all live in SUB-tabs (Markets → Analytics, Map HUD →
// Spatial Strategy, Crew → poach inbox). These tokens are consumed by
// sub-view.ts's request bus so an entry point can land the player ON the verb
// instead of on the hub's default view. Reuses setTab + a token; no fork of
// navigation.

export type CompetitiveSubView =
  | 'market:analytics'
  | 'market:spot'
  | 'map:slots'
  /** The OUTGOING poach launcher (offense). */
  | 'workforce:poach'
  /** The INCOMING poach inbox (defence). Distinct from the launcher on
   *  purpose: a victim being sent to respond must not have an attack form
   *  spring open in front of them. */
  | 'workforce:poach-defend'
  | 'contracts:bidding';

// ─── Tool catalogue ─────────────────────────────────────────────────────────

export type CompetitiveToolId =
  | 'market_intelligence'
  | 'price_campaign'
  | 'talent_poaching'
  | 'guild_arbitration'
  | 'cornering_intel'
  | 'slot_auctions'
  | 'lane_tolls'
  | 'bid_insurance'
  | 'espionage';

export interface CompetitiveToolDef {
  id: CompetitiveToolId;
  name: string;
  icon: IconName;
  /** 'offense' | 'defense' | 'intel' — rendered as a literal word, never as
   *  a colour alone. */
  posture: 'Offense' | 'Defense' | 'Intelligence';
  /** One sentence: what the tool DOES. */
  what: string;
  /** One sentence: what it COSTS. Numbers must match the engine constants —
   *  see the citation comment on each entry. */
  cost: string;
  /** One sentence: when it is RATIONAL (from docs/BALANCE.md Pass 3/8/9). */
  whenRational: string;
  /** One sentence: the documented counterplay the other side has. */
  counterplay: string;
  /** Where the verb lives. */
  tab: GameTab;
  subView?: CompetitiveSubView;
  /** HoloTip glossary concept id (concepts.ts) for the deep explanation. */
  conceptId?: string;
  /** Pure availability predicate over GameState. */
  isAvailable: (state: GameState, nowMs: number) => boolean;
}

function tabUnlocked(state: GameState, tab: GameTab): boolean {
  return getTierUnlockedTabs(state.corporationTier || 1).includes(tab);
}

/** The two offense tools share one gate: out of the Frontier (the shield cuts
 *  BOTH ways — talent-poaching.ts isServerFrontierProtected, price-campaigns
 *  §FRONTIER) and past the $200M offense net-worth floor. Book net worth
 *  (M1/F4) is the same metric the server brackets on. */
function offenseQualified(state: GameState, nowMs: number, floor: number): boolean {
  if (isInFrontier(state, nowMs)) return false;
  return computeBookNetWorth(state) >= floor;
}

export const COMPETITIVE_TOOLS: CompetitiveToolDef[] = [
  {
    id: 'market_intelligence',
    name: 'Market Intelligence',
    icon: 'activity',
    posture: 'Intelligence',
    what: 'Price history, order-book depth, the demand map, and the public register of every live price campaign.',
    // corporation-tiers.ts FOLDED_FEATURE_TIERS.intelligence = 3
    cost: 'Free — it unlocked with Corporation Tier 3.',
    whenRational: 'Before every expansion decision: the demand map shows which service pools are already crowded and which are underserved.',
    counterplay: 'Everyone sees the same aggregates. Named, per-corporation detail stays earned — espionage or paid reports, never free.',
    tab: 'market',
    subView: 'market:analytics',
    conceptId: 'order-book-depth',
    isAvailable: (state) =>
      tabUnlocked(state, 'market') && isFoldedFeatureUnlocked(state.corporationTier || 1, 'intelligence'),
  },
  {
    id: 'price_campaign',
    name: 'Price Campaigns',
    icon: 'trending-down',
    posture: 'Offense',
    // price-campaigns.ts: PRICE_CAMPAIGN_DURATION_MS 7d,
    // PRICE_CAMPAIGN_FEE_TURNOVER_FRACTION 0.15, MIN_FEE $25M, MAX_FEE $5B,
    // CAMPAIGN_NPC_BID_VOLUME_FACTOR 0.5, PRICE_CAMPAIGN_COOLDOWN_MS 14d.
    what: 'Declare a public, 7-day dumping campaign on one commodity: that market stops mean-reverting and the NPC maker halves its buying, so real sell volume can pin the price down — and price-linked mining income follows spot for every producer.',
    cost: 'A burned fee of 15% of that market\'s weekly turnover ($25M floor, $5B cap, quoted by the server), plus the margin you sacrifice on every unit sold below basis. You must hold real inventory to declare, one campaign at a time, 14-day per-market cooldown.',
    whenRational: 'When a rival\'s income is concentrated in one commodity you also produce and can afford to sell below basis for a week. Balance Pass 8 measured the aggressor down $265M over the full run — this is a denial weapon, not a profit engine.',
    counterplay: 'Buy the dumped goods cheap, spread into another market, or out-wait the 7-day clock. Pass 8 measured mothballing as a −19% net-worth trap for a small miner; spreading was best everywhere.',
    tab: 'market',
    subView: 'market:analytics',
    conceptId: 'price-campaign',
    isAvailable: (state, nowMs) =>
      tabUnlocked(state, 'market')
      && isFoldedFeatureUnlocked(state.corporationTier || 1, 'intelligence')
      && offenseQualified(state, nowMs, PRICE_CAMPAIGN_MIN_NET_WORTH),
  },
  {
    id: 'talent_poaching',
    name: 'Talent Poaching',
    icon: 'workforce',
    posture: 'Offense',
    // talent-poaching.ts: bonus = 6 months salary x wage index x 1.5,
    // POACH_MAX_FRACTION 0.10, window 48h, match 75%, fee $10M x fee index,
    // 30-day per-target cooldown, +0.02 index per poached head.
    what: 'Aim escrowed signing-bonus offers at up to 10% of one named crew type inside a rival corporation. They get 48 hours to counteroffer.',
    cost: '6 months\' salary × the live wage index × 1.5 per head (escrowed, refunded if they counter) plus a burned action fee. Every successful poach pushes the global wage index up +0.02 per head — including your own payroll.',
    whenRational: 'When the crew market is tight and headcount is the binding constraint. You are paying a 50% premium over open-market hiring for DENIAL, not for headcount.',
    counterplay: 'The defender matches 75% of the bonus to retain, or lets them walk and keeps the cash. Guild Arbitration research grants one free retention per season. Frontier corporations are immune in both directions.',
    tab: 'workforce',
    subView: 'workforce:poach',
    conceptId: 'talent-poaching',
    isAvailable: (state, nowMs) =>
      tabUnlocked(state, 'workforce') && offenseQualified(state, nowMs, POACH_MIN_NET_WORTH),
  },
  {
    id: 'guild_arbitration',
    name: 'Guild Arbitration',
    icon: 'shield',
    posture: 'Defense',
    // talent-poaching.ts GUILD_ARBITRATION_TECH_ID / 28-day window.
    what: 'A standing compact with the crew guilds: when a rival poaches your crew, the guild matches the offer once per 28-day season at no cost to you.',
    cost: 'Already paid — the research is complete. The free retention refreshes every 28 days.',
    whenRational: 'Spend it on the largest raid you see in a season; pay cash for the small ones.',
    counterplay: 'It is one retention per season, not immunity. Training pipelines and crew quarters are the structural defence.',
    tab: 'workforce',
    subView: 'workforce:poach',
    conceptId: 'talent-poaching',
    isAvailable: (state) => (state.completedResearch || []).includes(GUILD_ARBITRATION_TECH_ID),
  },
  {
    id: 'cornering_intel',
    name: 'Standing-Order Demand Report',
    icon: 'market',
    posture: 'Intelligence',
    // cornering-intel.ts: STANDING_DEMAND_REPORT_FEE $5M x fee index,
    // CORNERING_ALERT_SHARE 0.40, CORNERING_WINDOW_DAYS 7.
    what: 'Aggregate order-flow intelligence: which inputs rival corporations\' buildings are actually short of, and where a supply squeeze would bite.',
    cost: 'A burned fee per pull, scaled by the quarterly fee index.',
    whenRational: 'Before committing capital to a squeeze — buying out supply nobody needs is just an expensive warehouse.',
    counterplay: 'Aggregates only, never per-corporation attribution. And when one buyer\'s open bids pass 40% of a week\'s volume, every consumer of that input is warned automatically.',
    tab: 'market',
    subView: 'market:analytics',
    conceptId: 'cornering',
    isAvailable: (state) => (state.completedResearch || []).includes(MARKET_MICROSTRUCTURE_TECH_ID),
  },
  {
    id: 'slot_auctions',
    name: 'Orbital Slot Auctions',
    icon: 'territory',
    posture: 'Offense',
    // spatial-strategy.ts SATURATED_OCCUPANCY_PCT 85 (absolute) and the D6
    // relative trigger in orbital-slot-auctions.ts
    // (computeSlotAuctionEligibility: ≥8 occupied and ≥ max(40%, P80));
    // LEASE_TERM_MS 90d, AUCTION_WINDOW_MS 7d, SLOT_IDLE_FEE_FRACTION
    // 0.10 / 30d, SLOT_IDLE_AUTO_RELEASE_MS 90d.
    what: 'Premium orbits are finite. Once a pool is contested — the most crowded pool server-wide once it passes 40% occupancy, or any pool past 85% — new construction there requires winning a sealed-bid slot lease, and a lease you hold is a slot a rival cannot use.',
    cost: 'Your sealed bid (10% of the winning bid goes to the zone governor, the rest is burned). Holding a lease you never build on costs 10% of the winning bid every 30 days and auto-releases after 90 days unbuilt.',
    whenRational: 'When the location is genuinely scarce and you either want to build there or want to keep a rival out of a chokepoint.',
    counterplay: 'Sealed bids, deterministic resolution, and the idle fee — denial is legitimate but taxed, and a denied rival can buy the lease outright at a market-clearing price.',
    tab: 'map',
    subView: 'map:slots',
    conceptId: 'orbital-slot',
    isAvailable: (state) => isFoldedFeatureUnlocked(state.corporationTier || 1, 'spatial'),
  },
  {
    id: 'lane_tolls',
    name: 'Zone Freight Tolls',
    icon: 'fleet',
    posture: 'Offense',
    // offense.ts FREIGHT_TOLL_MIN 0.005 / MAX 0.02, per-dispatch cap
    // $2M x fee index; zone-influence governorship.
    what: 'As a zone governor you may levy a public toll of 0.5–2% of cargo value on rival freight crossing your zone. It settles to you through the ledger.',
    cost: 'Nothing to levy — but it is public, it invites a governorship challenge, and alliance trade treaties reduce what your rivals actually pay.',
    whenRational: 'When your zone sits on a route rivals cannot cheaply avoid. It is a squeeze, not a wall — the per-dispatch charge is capped.',
    counterplay: 'Rivals route around the zone at real Δv cost, sign a trade treaty, or contest the governorship. Frontier corporations never pay.',
    tab: 'territory',
    conceptId: 'lane-toll',
    isAvailable: (state) => (state.zoneStandings || []).some(z => z.isGovernor),
  },
  {
    id: 'bid_insurance',
    name: 'Bid Insurance',
    icon: 'contracts',
    posture: 'Intelligence',
    // concepts.ts 'bid-insurance': 5% of collateral, burned.
    what: 'On a sealed contract bid you may pay 5% of the collateral to learn exactly how far your price was from the winner\'s if you lose.',
    cost: '5% of the collateral, burned, win or lose.',
    whenRational: 'Early in a contract series you intend to keep bidding on — it is paid calibration for the next bid, not a peek at live offers.',
    counterplay: 'Sealed bids stay sealed before award. Everyone can buy the same calibration.',
    tab: 'contracts',
    subView: 'contracts:bidding',
    conceptId: 'bid-insurance',
    isAvailable: (state) => isFoldedFeatureUnlocked(state.corporationTier || 1, 'bidding'),
  },
  {
    id: 'espionage',
    name: 'Corporate Espionage',
    icon: 'espionage',
    posture: 'Intelligence',
    what: 'Paid operations against a named rival inside your net-worth bracket: technology probes, workforce rosters, supply-chain analysis, contract snipes.',
    cost: 'A per-action fee scaled by your bracket and the quarterly fee index, plus a real detection risk that costs public reputation.',
    whenRational: 'When a specific rival\'s pipeline decides your next capital commitment — espionage buys certainty about one corporation, not about the market.',
    counterplay: 'The target\'s security level raises detection; Protected Frontier corporations cannot be targeted at all.',
    tab: 'espionage',
    conceptId: 'cornering',
    isAvailable: (state) => tabUnlocked(state, 'espionage'),
  },
];

export const COMPETITIVE_TOOL_MAP = new Map(COMPETITIVE_TOOLS.map(t => [t.id, t]));

// ─── "These tools exist" — once-only announcements ──────────────────────────

/** Tool ids currently AVAILABLE to this save. Pure. */
export function deriveAvailableTools(state: GameState, nowMs: number = Date.now()): CompetitiveToolId[] {
  const out: CompetitiveToolId[] = [];
  for (const tool of COMPETITIVE_TOOLS) {
    let ok = false;
    try {
      ok = tool.isAvailable(state, nowMs);
    } catch {
      ok = false; // a malformed save must never crash the announcer
    }
    if (ok) out.push(tool.id);
  }
  return out;
}

export interface ToolAnnouncementResult {
  /** The value to persist back into GameState.seenCompetitiveTools. */
  nextSeen: CompetitiveToolId[];
  /** Tools to announce RIGHT NOW, in catalogue order. Empty on the baseline
   *  pass and whenever nothing new became available. */
  announce: CompetitiveToolDef[];
  /** True when this call performed the silent baseline (the field was absent
   *  — an existing save being read for the first time by this system). */
  baselined: boolean;
}

/**
 * The once-only announcement engine.
 *
 * PERSISTENCE DESIGN (the requirement: "announcement-fired flags must
 * persist", with NO save migration):
 *
 *   • `GameState.seenCompetitiveTools` is a NEW OPTIONAL field. Absent is a
 *     legal, expected value — it means "this save has never been read by this
 *     system".
 *   • On an ABSENT field we BASELINE: every currently-available tool is
 *     recorded as already-seen and NOTHING is announced. A veteran who has
 *     had six of these tools for weeks does not get a backlog of six toasts
 *     the first time they load a build containing this pass — which is the
 *     exact failure mode the FTUE audit fixed once already.
 *     (Mirrors the "baseline the loaded save" rule the leader-moment and
 *     cinematic watchers in page.tsx already use.)
 *   • A fresh save (getNewGameState leaves the field undefined) baselines to
 *     the empty set, because a Tier-1 corporation inside the Protected
 *     Frontier qualifies for none of these tools — so every unlock after
 *     that announces exactly once, at the moment it happens.
 *   • Once written the array is ordinary save data and rides the normal
 *     localStorage/sync save path. Re-announcement is impossible because the
 *     id is in `seen` before the toast is even rendered.
 *
 * NEWCOMER SAFETY: returns an empty announce list while the FTUE chain is
 * running, WITHOUT recording the tools as seen — so anything that became
 * available mid-tutorial announces the moment the chain finishes, rather than
 * being silently swallowed.
 */
export function reconcileToolAnnouncements(
  state: GameState,
  nowMs: number = Date.now(),
): ToolAnnouncementResult {
  const available = deriveAvailableTools(state, nowMs);
  const stored = state.seenCompetitiveTools;

  if (!Array.isArray(stored)) {
    return { nextSeen: available, announce: [], baselined: true };
  }

  const seen = new Set(stored);
  // Never announce during the guided chain — but do not consume it either.
  if (isOnboardingActive(state)) {
    return { nextSeen: stored as CompetitiveToolId[], announce: [], baselined: false };
  }

  const announce: CompetitiveToolDef[] = [];
  for (const tool of COMPETITIVE_TOOLS) {
    if (!available.includes(tool.id)) continue;
    if (seen.has(tool.id)) continue;
    announce.push(tool);
  }
  if (announce.length === 0) {
    return { nextSeen: stored as CompetitiveToolId[], announce: [], baselined: false };
  }
  // Availability is monotone in practice but not guaranteed (net worth can
  // fall back below the offense floor), so `seen` is a UNION with the stored
  // set — a tool that lapses and returns is still never re-announced.
  const next = new Set<CompetitiveToolId>(stored as CompetitiveToolId[]);
  for (const t of announce) next.add(t.id);
  return { nextSeen: Array.from(next), announce, baselined: false };
}

// ─── "Right now is a moment to use one" — honest opportunity signals ────────

export type CompetitiveSignalId =
  | 'rival_concentration'
  | 'labor_squeeze'
  | 'slot_contested'
  | 'slot_idle_lease'
  | 'spot_dislocation';

export interface CompetitiveSignal {
  /** Stable, deterministic — safe as a React key and as a dismissal key. */
  id: string;
  kind: CompetitiveSignalId;
  icon: IconName;
  /** Headline. States a FACT, never an instruction. */
  label: string;
  /** The decision this fact opens, with the real numbers behind it. */
  detail: string;
  /** A literal word so meaning survives greyscale/screen readers. Signals
   *  are never 'critical' — an opportunity is not an emergency. */
  statusLabel: 'Opportunity' | 'Watch';
  /** Where the decision gets made. */
  tab: GameTab;
  subView?: CompetitiveSubView;
  /** Ranking weight — higher sorts first. Derived from the magnitude of the
   *  underlying real quantity, never from a designer's preference. */
  weight: number;
}

/** Hard cap on how much of this a player ever sees at once. An opportunity
 *  list longer than this is a nag, not intelligence. */
export const MAX_COMPETITIVE_SIGNALS = 3;

/** A demand pool counts as concentrated when one anonymised supplier holds at
 *  least this share. Chosen to sit above the 1/3 point where three even
 *  suppliers would each sit — below it, "concentration" is just arithmetic. */
export const CONCENTRATION_SHARE_THRESHOLD = 0.35;
/** …and only when that share meaningfully exceeds the player's own. */
export const CONCENTRATION_LEAD_MARGIN = 0.05;

/** Wage index at which the crew market is demonstrably tight. Below the
 *  existing Situation Log wage_spike threshold (1.4) on purpose: this signal
 *  is about a DECISION (hire / train / poach), not about an alarm. */
export const LABOR_TIGHT_INDEX = 1.25;

/** Minimum absolute spot deviation from base before a dislocation is worth a
 *  player's attention (the band itself runs 0.3×–3× base). */
export const SPOT_DISLOCATION_THRESHOLD = 0.35;
/** …and the position must be materially sized. */
export const SPOT_DISLOCATION_MIN_VALUE = 5_000_000;

export interface CompetitiveSignalOptions {
  nowMs?: number;
  /** Test seam — defaults to the real staleness windows. */
  demandStaleMs?: number;
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function money(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

/**
 * The player is eligible to be shown competitive opportunity signals at all.
 *
 * Three gates, each a hard requirement from the brief:
 *   • not mid-FTUE  — the guided chain owns minute one, exclusively.
 *   • not in the Protected Frontier — a shielded player cannot be attacked
 *     and cannot attack; telling them "now is the moment" would be false.
 *   • the market/analytics surface exists for them — otherwise every signal
 *     would point at a locked tab.
 */
export function isCompetitiveSurfaceEligible(state: GameState, nowMs: number = Date.now()): boolean {
  if (isOnboardingActive(state)) return false;
  if (isInFrontier(state, nowMs)) return false;
  if (state.frontierStatus === 'active') return false;
  return tabUnlocked(state, 'market');
}

/**
 * Every honest competitive opportunity this save's REAL state supports,
 * highest-magnitude first, capped at MAX_COMPETITIVE_SIGNALS.
 *
 * Pure and deterministic: identical state + identical `nowMs` ⇒ identical
 * output. Cheap enough to call per render (memoize at the call site, same
 * discipline as situation-log.ts).
 */
export function deriveCompetitiveSignals(
  state: GameState,
  opts: CompetitiveSignalOptions = {},
): CompetitiveSignal[] {
  const nowMs = opts.nowMs ?? Date.now();
  if (!isCompetitiveSurfaceEligible(state, nowMs)) return [];

  const signals: CompetitiveSignal[] = [];
  const demandStaleMs = opts.demandStaleMs ?? DEMAND_POOL_STALE_MS;

  // ── S1 · Rival concentration in a demand pool you actually supply ────────
  // Selector: state.demandPools (demand-pools.ts DemandPoolEntry — server
  // snapshot; topShares are ANONYMISED fractions by design). Only pools this
  // player supplies via an active service are considered: a crowded pool
  // somewhere they don't operate is not their problem.
  {
    const snap = state.demandPools;
    if (snap?.pools && typeof snap.asOf === 'number' && nowMs - snap.asOf <= demandStaleMs) {
      const suppliedKeys = new Set<string>();
      for (const svc of state.activeServices || []) {
        const cat = getServiceCategory(svc.definitionId);
        if (cat) suppliedKeys.add(demandPoolKey(svc.locationId, cat));
      }
      for (const [key, entry] of Object.entries(snap.pools)) {
        if (!suppliedKeys.has(key)) continue;
        if (!Array.isArray(entry.topShares) || entry.topShares.length === 0) continue;
        if ((entry.supplierCount ?? 0) < 2) continue;
        const topShare = Math.max(...entry.topShares.filter(s => typeof s === 'number' && Number.isFinite(s)));
        if (!Number.isFinite(topShare)) continue;
        const mine = typeof entry.playerShare === 'number' ? entry.playerShare : 0;
        if (topShare < CONCENTRATION_SHARE_THRESHOLD) continue;
        if (topShare <= mine + CONCENTRATION_LEAD_MARGIN) continue;
        const locName = LOCATION_MAP.get(entry.locationId)?.name || entry.locationId;
        const catLabel = CATEGORY_LABELS[entry.category] || entry.category;
        signals.push({
          id: `cs-concentration-${key}`,
          kind: 'rival_concentration',
          icon: 'market',
          label: `One supplier holds ${pct(topShare)} of ${catLabel.toLowerCase()} at ${locName}`,
          detail: `You hold ${pct(mine)} of ${entry.supplierCount} suppliers, and the pool currently pays ${pct(entry.mult)} of list. Shares are aggregate — the market never names who. Your options are the honest three: add capacity here and take share, redeploy to an underserved pool, or price-campaign a commodity the leader depends on. The demand map ranks every pool.`,
          statusLabel: 'Opportunity',
          tab: 'market',
          subView: 'market:analytics',
          // Magnitude = how far ahead the leader is. A 60/10 split matters
          // more than a 36/33 one.
          weight: 100 * (topShare - mine),
        });
      }
    }
  }

  // ── S2 · The crew market is tight — hire, train, or poach ────────────────
  // Selector: state.laborMarket (labor-market.ts, weekly server cron) +
  // WORKER_MAP salaries + talent-poaching.ts's own bonus formula + the
  // quarterly fee index. Note the deliberate honesty: this reports the price
  // of BOTH options and says outright that poaching is the more expensive
  // one. It cannot and does not claim anything about a rival's headcount.
  {
    const labor = state.laborMarket;
    const fresh = labor?.index && typeof labor.asOf === 'number' && nowMs - labor.asOf <= LABOR_MARKET_STALE_MS;
    const poachQualified = offenseQualified(state, nowMs, POACH_MIN_NET_WORTH)
      && tabUnlocked(state, 'workforce');
    if (fresh && poachQualified) {
      const feeFactor = getFeeIndexFactor(state, nowMs);
      const actionFee = computePoachActionFee(feeFactor);
      for (const wDef of WORKER_TYPES) {
        const type: WorkerType = wDef.type;
        const held = state.workforce
          ? ((state.workforce[`${type}s` as keyof typeof state.workforce] as number | undefined) || 0)
          : 0;
        if (held < POACH_MIN_TARGET_HEADCOUNT) continue; // you are not a credible raider of a type you barely staff
        const index = getWageIndex(labor, type, nowMs);
        if (!Number.isFinite(index) || index < LABOR_TIGHT_INDEX) continue;
        const def = WORKER_MAP.get(type);
        if (!def) continue;
        // Open-market hire = 6 months' salary × index (workforce.getHireCost
        // × labor-market.getHireWageIndex). Poach = the same six months ×
        // index × the 1.5 premium (talent-poaching.computeSigningBonus).
        const hirePerHead = Math.round(def.salary * POACH_SIGNING_BONUS_MONTHS * index);
        const poachPerHead = Math.round(hirePerHead * POACH_BONUS_PREMIUM);
        signals.push({
          id: `cs-labor-${type}`,
          kind: 'labor_squeeze',
          icon: 'workforce',
          label: `${def.name} market is tight at ${index.toFixed(2)}× wages`,
          detail: `Every corporation is bidding for the same pool. Hiring one costs ${money(hirePerHead)}; poaching one from a rival costs ${money(poachPerHead)} escrowed (the 1.5× premium) plus a ${money(actionFee)} burned fee, and returns your escrow if they counteroffer inside 48 hours. You are paying that premium for denial, not headcount — and each successful head pushes the global index up 0.02, your own payroll included. Building crew quarters grows the pool instead.`,
          statusLabel: 'Watch',
          tab: 'workforce',
          subView: 'workforce:poach',
          weight: 60 * (index - LABOR_TIGHT_INDEX) + 10,
        });
      }
    }
  }

  // ── S3 · A slot pool you operate at is contested ─────────────────────────
  // Selector: state.orbitalSlotOccupancy (E7 sync snapshot) +
  // spatial-strategy.ORBITAL_SLOT_MAP + hasActiveSlotLease. Only pools the
  // player has actually unlocked; only when they do NOT already hold a lease.
  // D6: keys off the stored bucket ('saturated' = lease-gated, written by
  // the resolve cron for absolute OR relative contest) — the same signal
  // checkOrbitalSlotGate enforces — not a client-side 85% recomputation.
  {
    const occ = state.orbitalSlotOccupancy;
    const spatialUnlocked = isFoldedFeatureUnlocked(state.corporationTier || 1, 'spatial');
    if (occ && spatialUnlocked) {
      for (const [locationId, row] of Object.entries(occ)) {
        const pool = ORBITAL_SLOT_MAP.get(locationId);
        if (!pool) continue;
        if (!(state.unlockedLocations || []).includes(locationId)) continue;
        const total = pool.totalSlots;
        const occupied = typeof row?.occupiedCount === 'number' ? row.occupiedCount : 0;
        if (!Number.isFinite(total) || total <= 0) continue;
        const occupancyPct = (occupied / total) * 100;
        if (row?.bucket !== 'saturated') continue;
        if (hasActiveSlotLease(state, locationId, nowMs)) continue;
        const locName = LOCATION_MAP.get(locationId)?.name || locationId;
        signals.push({
          id: `cs-slot-${locationId}`,
          kind: 'slot_contested',
          icon: 'territory',
          label: `${locName} is at ${occupied}/${total} orbital slots`,
          detail: `This location is contested — it stops accepting new construction unless you hold a slot lease. Leases are sold by sealed-bid auction — 10% of the winning bid goes to the zone governor and the rest is burned. A lease you win is also a slot a rival cannot use, but an unbuilt one is taxed.`,
          statusLabel: 'Opportunity',
          tab: 'map',
          subView: 'map:slots',
          weight: 30 + Math.max(0, Math.round(occupancyPct - SLOT_AUCTION_RELATIVE_THRESHOLD_PCT)),
        });
      }
    }
  }

  // ── S4 · You hold a slot lease you have not built on ─────────────────────
  // Selector: state.orbitalSlotLeases (Balance Pass 4 sync field) vs
  // state.buildings. The fee AMOUNT is not derivable client-side (the
  // winning-bid figure never syncs), so this states the RULE, not a number —
  // the honesty rule in this module's header.
  {
    for (const lease of state.orbitalSlotLeases || []) {
      if (!lease || typeof lease.locationId !== 'string') continue;
      if (typeof lease.expiresAtMs === 'number' && lease.expiresAtMs <= nowMs) continue;
      const built = (state.buildings || []).some(
        b => b.locationId === lease.locationId && b.isComplete,
      );
      if (built) continue;
      const locName = LOCATION_MAP.get(lease.locationId)?.name || lease.locationId;
      const days = Math.round(SLOT_IDLE_AUTO_RELEASE_MS / (24 * 60 * 60 * 1000));
      const feeDays = Math.round(SLOT_IDLE_FEE_INTERVAL_MS / (24 * 60 * 60 * 1000));
      signals.push({
        id: `cs-slot-idle-${lease.locationId}`,
        kind: 'slot_idle_lease',
        icon: 'territory',
        label: `Unbuilt slot lease at ${locName}`,
        detail: `Holding a slot to deny it is legitimate, but taxed: an unbuilt lease pays ${pct(SLOT_IDLE_FEE_FRACTION)} of the winning bid every ${feeDays} days and auto-releases back to the pool after ${days} days. Build on it, or accept the carry as the price of denial.`,
        statusLabel: 'Watch',
        tab: 'map',
        subView: 'map:slots',
        weight: 25,
      });
    }
  }

  // ── S5 · Spot is dislocated on a commodity you are exposed to ────────────
  // Selector: state.marketSnapshot (spot-price.ts — the one price truth) vs
  // its own `base` reference, intersected with THIS player's real exposure:
  // inventory held, resources their mining services produce, resources their
  // completed buildings consume. Cheap: one pass over the held/produced/
  // consumed union, never over all 35 market resources.
  {
    const snap = state.marketSnapshot;
    if (snap?.prices) {
      const produced = new Set<string>();
      for (const svc of state.activeServices || []) {
        const production = MINING_PRODUCTION[svc.definitionId];
        if (!production) continue;
        for (const { resource } of production) produced.add(resource);
      }
      const consumed = new Set<string>();
      for (const b of state.buildings || []) {
        if (!b.isComplete) continue;
        const def = BUILDING_MAP.get(b.definitionId);
        for (const resId of Object.keys(def?.consumesPerMonth || {})) consumed.add(resId);
      }
      const held = state.resources || {};
      const candidates = new Set<string>(
        Object.keys(held).filter(k => (held as Record<string, number>)[k] > 0),
      );
      for (const r of Array.from(produced)) candidates.add(r);
      for (const r of Array.from(consumed)) candidates.add(r);

      const campaignQualified = offenseQualified(state, nowMs, PRICE_CAMPAIGN_MIN_NET_WORTH)
        && isFoldedFeatureUnlocked(state.corporationTier || 1, 'intelligence');

      for (const slug of Array.from(candidates)) {
        const def = RESOURCE_MAP.get(slug as ResourceId);
        if (!def) continue;
        const spot = getSpotPrice(snap, slug, null);
        if (spot === null) continue;
        const base = snap.base?.[slug] ?? def.baseMarketPrice;
        if (!Number.isFinite(base) || base <= 0) continue;
        const dev = spotDeviation(spot, base);
        if (Math.abs(dev) < SPOT_DISLOCATION_THRESHOLD) continue;

        const qty = (held as Record<string, number>)[slug] || 0;
        const positionValue = qty * spot;
        const isProducer = produced.has(slug);
        const isConsumer = consumed.has(slug);
        // Materiality: either a real position, or a real production/
        // consumption exposure. A 40%-dislocated resource you neither hold,
        // mine, nor consume is not your business.
        if (positionValue < SPOT_DISLOCATION_MIN_VALUE && !isProducer && !isConsumer) continue;

        const resName = def.name || slug.replace(/_/g, ' ');
        let label: string;
        let detail: string;
        if (dev > 0) {
          label = `${resName} spot is ${pct(dev)} above base`;
          const parts: string[] = [];
          if (positionValue > 0) parts.push(`You hold ${Math.floor(qty).toLocaleString()} units (${money(positionValue)} at spot).`);
          if (isProducer) parts.push('Price-linked mining income follows spot, so your extraction revenue here is running hot.');
          if (isConsumer) parts.push('Your buildings consume this input — an elevated spot raises their monthly bill, and Earth import is the priced ceiling, never denial.');
          if (campaignQualified && isProducer && qty >= PRICE_CAMPAIGN_MIN_INVENTORY) {
            parts.push(`You also hold enough of it to be carrying campaign ammunition; the real requirement scales with the market's weekly production and is quoted by the server when you open the declare form.`);
          }
          detail = parts.join(' ');
        } else {
          label = `${resName} spot is ${pct(Math.abs(dev))} below base`;
          const parts: string[] = [];
          if (isProducer) parts.push('Price-linked mining income follows spot, so extraction revenue here is compressed.');
          if (isConsumer) parts.push('Your buildings consume this input — stocking up now is cheap.');
          if (positionValue > 0) parts.push(`Your ${Math.floor(qty).toLocaleString()} units are marked at ${money(positionValue)}.`);
          parts.push('Idle prices mean-revert toward base over time unless a live price campaign is pinning this market — the Analytics view lists every active campaign.');
          detail = parts.join(' ');
        }

        signals.push({
          id: `cs-spot-${slug}`,
          kind: 'spot_dislocation',
          icon: dev > 0 ? 'trending-up' : 'trending-down',
          label,
          detail,
          statusLabel: dev > 0 ? 'Opportunity' : 'Watch',
          tab: 'market',
          subView: 'market:analytics',
          // Magnitude in real money where there is a position, otherwise by
          // how dislocated the price is.
          weight: positionValue > 0
            ? Math.min(80, 20 + positionValue / 5_000_000)
            : 15 + 20 * Math.abs(dev),
        });
      }
    }
  }

  signals.sort((a, b) => (b.weight - a.weight) || a.id.localeCompare(b.id));
  return signals.slice(0, MAX_COMPETITIVE_SIGNALS);
}

// ─── "Someone is doing it to me" — the incoming-attack lens ─────────────────
// The mechanics and the Situation Log entries for these already exist
// (offense.ts + situation-log.ts). What did NOT exist is a way for any
// surface to ask "am I under attack right now, and how badly" without
// re-deriving the whole Situation Log. This is that question, and only that.

export interface IncomingAttack {
  id: string;
  kind: 'poach' | 'price_campaign' | 'cornering' | 'toll';
  /** Public attacker name when the game knows it, else null. Never guessed. */
  byName: string | null;
  label: string;
  detail: string;
  /** Poach offers have a hard 48h clock; the others do not. */
  respondByMs?: number;
  tab: GameTab;
  subView?: CompetitiveSubView;
  /** 'act' = a decision window is running and doing nothing IS a decision. */
  urgency: 'act' | 'aware';
}

/**
 * Attacks in progress against this save, derived purely from the
 * sync-delivered offense snapshot (offense.ts) intersected with what this
 * player is actually exposed to. Returns [] for Frontier-protected saves —
 * they cannot be targeted, so an alert would be a lie.
 *
 * Counterplay copy is the MEASURED one (docs/BALANCE.md Pass 8 Q3/Q5), not
 * the intuitive one: mothballing was a −19% net-worth trap for a small
 * miner, spreading was best everywhere, and retaliating with the same tools
 * cost the defender more than the aggressor.
 */
export function deriveIncomingAttacks(state: GameState, nowMs: number = Date.now()): IncomingAttack[] {
  if (isInFrontier(state, nowMs)) return [];
  const snap = state.offense;
  if (!snap) return [];
  const out: IncomingAttack[] = [];

  for (const p of snap.poachIncoming || []) {
    if (typeof p.respondByMs !== 'number' || p.respondByMs <= nowMs) continue;
    const crew = WORKER_MAP.get(p.crewType)?.name || p.crewType;
    const plural = p.count === 1 ? '' : 's';
    out.push({
      id: `attack-poach-${p.id}`,
      kind: 'poach',
      byName: p.attackerName,
      label: `${p.attackerName || 'An unidentified corporation'} is bidding for ${p.count} of your ${crew.toLowerCase()}${plural}`,
      detail: `Match 75% of the signing bonus (${money(p.retentionCost)}, paid to the crew) to retain${p.freeRetentionAvailable ? ', spend your free Guild Arbitration retention,' : ''} or let them walk and keep the cash. Doing nothing is the same as letting them walk.`,
      respondByMs: p.respondByMs,
      tab: 'workforce',
      subView: 'workforce:poach-defend',
      urgency: 'act',
    });
  }

  // Price campaigns only count as an attack on THIS player if they mine or
  // hold the campaigned resource — a dump on a commodity you have no
  // exposure to is public news, not an attack.
  const exposed = new Set<string>();
  for (const [resId, qty] of Object.entries(state.resources || {})) {
    if (typeof qty === 'number' && qty > 0) exposed.add(resId);
  }
  for (const svc of state.activeServices || []) {
    const production = MINING_PRODUCTION[svc.definitionId];
    if (!production) continue;
    for (const { resource } of production) exposed.add(resource);
  }
  for (const c of snap.campaigns || []) {
    if (c.own) continue;
    if (typeof c.endsAtMs !== 'number' || c.endsAtMs <= nowMs) continue;
    if (!exposed.has(c.resourceSlug)) continue;
    const resName = RESOURCE_MAP.get(c.resourceSlug as ResourceId)?.name || c.resourceSlug.replace(/_/g, ' ');
    out.push({
      id: `attack-campaign-${c.resourceSlug}`,
      kind: 'price_campaign',
      byName: c.byCompanyName || null,
      label: `${c.byCompanyName || 'A rival corporation'} declared a price campaign on ${resName}`,
      detail: 'While it runs, that market stops mean-reverting and the NPC maker halves its buying, so the price stays pinned down and price-linked mining income follows it. Measured counterplay: spread into an uncrowded market (best result in every simulated era), buy the dumped goods cheap, or simply out-wait the seven-day clock. Mothballing tested as a 19% net-worth trap for a small miner, and retaliating with your own campaign cost the defender more than the aggressor.',
      respondByMs: c.endsAtMs,
      tab: 'market',
      subView: 'market:analytics',
      urgency: 'aware',
    });
  }

  return out;
}

// ─── Compact posture readout ────────────────────────────────────────────────

export interface CompetitivePosture {
  /** Tools this save can use right now. */
  availableTools: CompetitiveToolDef[];
  /** Honest opportunity signals, already capped and sorted. */
  signals: CompetitiveSignal[];
  /** Attacks in progress against this save. */
  incoming: IncomingAttack[];
  /** False while the player is mid-FTUE or Frontier-shielded — renderers use
   *  this to render nothing at all rather than an empty panel. */
  eligible: boolean;
  /** True when the player is in the open economy but has no signals and no
   *  incoming attacks — the honest "quiet" state, which the readout says
   *  outright instead of manufacturing something. */
  quiet: boolean;
}

export function deriveCompetitivePosture(
  state: GameState,
  opts: CompetitiveSignalOptions = {},
): CompetitivePosture {
  const nowMs = opts.nowMs ?? Date.now();
  const eligible = isCompetitiveSurfaceEligible(state, nowMs);
  const signals = eligible ? deriveCompetitiveSignals(state, opts) : [];
  const incoming = eligible ? deriveIncomingAttacks(state, nowMs) : [];
  const availableTools = eligible
    ? deriveAvailableTools(state, nowMs)
        .map(id => COMPETITIVE_TOOL_MAP.get(id))
        .filter((t): t is CompetitiveToolDef => !!t)
    : [];
  return {
    availableTools,
    signals,
    incoming,
    eligible,
    quiet: eligible && signals.length === 0 && incoming.length === 0,
  };
}
