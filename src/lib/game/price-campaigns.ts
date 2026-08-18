// ─── Space Tycoon: Price Campaigns — targeted dumping (Wave M5, ─────────────
// docs/MEANINGFUL_2026-08.md §3.2 O2 / §M5). "Cut into other companies'
// profits": a corporation may declare a PUBLIC price campaign on one
// (resource) market. With M3's price-linked mining live, a crashed spot
// price genuinely compresses every producer's mining income at that
// resource — dumping finally has teeth.
//
// The campaign's mechanical effects (all server-side, all bounded):
//   1. Mean-reversion SKIPS the campaigned resource while the campaign is
//      active — the crash the campaigner engineers with real sell volume
//      sticks for the week instead of healing on the ~6.6h half-life
//      (market/mean-revert/route.ts consults active campaigns).
//   2. The NPC market maker halves its BID volume on the campaigned
//      resource (CAMPAIGN_NPC_BID_VOLUME_FACTOR) — the house won't absorb
//      the dump, so crashing the price requires selling to real players
//      below their (and your own) cost basis. NPC ask volume is untouched:
//      Frontier players' input purchases still fill at the maker's band
//      quote, never below band ([FRONTIER] — the shield is structural).
//   3. Everything else is the existing economy: order-book fills move
//      currentPrice, the anti-cornering band floor (base × 0.3) bounds the
//      damage, and mean reversion resumes the moment the campaign ends —
//      sustaining a crash is expensive by design.
//
// REAL COSTS: the declaration fee (burned — BALANCE.md money sink), the
// margin sacrifice on every unit sold below basis, and an inventory
// requirement (you must hold real ammunition to declare — no paper wars).
// COUNTERPLAY (documented in concepts.ts): buy the dumped goods cheap,
// mothball mining to ride it out (M2), out-wait the 7-day clock, or hedge.
// VISIBILITY: every active campaign is delivered to every synced player in
// the sync offense snapshot and lands in the Situation Log of anyone mining
// or holding the resource — "you are under economic attack at X".
//
// Pure/deterministic helpers only in this module; DB access lives in the
// API routes (market/campaign, mean-revert, market-orderbook), mirroring
// orbital-slot-auctions.ts's split.

// ─── Constants ──────────────────────────────────────────────────────────────

/** Campaign length — 7 real days (weekly loop per SESSION_DESIGN; matches
 *  the spec's "asks are exempt ... for 7 days" duration). */
export const PRICE_CAMPAIGN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** After a campaign ends (or is cancelled), the same corporation cannot
 *  re-declare on the SAME resource for 14 days — a crash cannot be made
 *  permanent by chaining campaigns back-to-back. */
export const PRICE_CAMPAIGN_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

/** Fee bounds. The fee is burned (never paid to any player).
 *  Balance Pass 9 (docs/BALANCE.md "Pass 9", Pass 8 H1): max raised
 *  $500M → $5B — the Pass-5 whale-end fix, so a mid-game campaign on a
 *  high-turnover market is never capped into cheapness. */
export const PRICE_CAMPAIGN_MIN_FEE = 25_000_000;
export const PRICE_CAMPAIGN_MAX_FEE = 5_000_000_000;

/** Fee reference volume for the LEGACY base-price fee formula
 *  (computeCampaignFee below). Superseded for actual charging by the
 *  market-keyed fee (Pass 9) — kept for display/reference math only. */
export const PRICE_CAMPAIGN_FEE_REFERENCE_UNITS = 5_000;

/** Balance Pass 9 (Pass 8 H1, sim-validated): the fee the declare route
 *  actually charges is keyed to the MARKET'S size, not the resource's unit
 *  price — fee = clamp(0.15 × trailing-7-real-day window turnover of the
 *  target resource, $25M, $5B). Pass 8 refuted the wealth-×-depth shape
 *  with data (damage/cost ratio is fee-invariant); the market-keyed family
 *  fires organically at relaunch scale with crush ratio 2.2-3.4:1 (passing
 *  band 0.10-0.25; 0.40 kills the tool again). Depth stays FULL (band
 *  floor 0.3×) — do NOT ship fee-scaled depth. */
export const PRICE_CAMPAIGN_FEE_TURNOVER_FRACTION = 0.15;

/** Ammunition requirement floor: the declarer must HOLD at least this many
 *  units of the resource at declaration time (server-synced inventory). A
 *  price war needs real shells — you can't talk a market down. Pass 9: the
 *  REAL requirement is max(this, 10% of the trailing-window production
 *  units) — see computeCampaignMinInventory. */
export const PRICE_CAMPAIGN_MIN_INVENTORY = 50;

/** Pass 9: fraction of the trailing-window server production units the
 *  declarer must hold as ammunition (genuine production presence — at
 *  Pass-8 era-A volumes ~300-450 units ≈ $15-22M, vs the old cosmetic
 *  50-unit ≈ $2.6M gate). */
export const PRICE_CAMPAIGN_MIN_INVENTORY_WINDOW_FRACTION = 0.10;

/** One campaign per corporation at a time — focus is the trade-off. */
export const MAX_ACTIVE_CAMPAIGNS_PER_PROFILE = 1;

/** While a campaign is active on a resource, the NPC maker's resting BID
 *  volume is multiplied by this (ask volume untouched — see header). */
export const CAMPAIGN_NPC_BID_VOLUME_FACTOR = 0.5;

/** Declaring requires graduating the on-ramp: same net-worth floor as
 *  espionage (economic offense is post-Frontier gameplay). */
export const PRICE_CAMPAIGN_MIN_NET_WORTH = 200_000_000;

// ─── Pure helpers ───────────────────────────────────────────────────────────

/** LEGACY burned declaration fee from base market price (pre-Pass-9). Kept
 *  for reference math (sim depth-scaling comparisons) — the declare route
 *  charges computeMarketKeyedCampaignFee instead. */
export function computeCampaignFee(baseMarketPrice: number): number {
  if (!Number.isFinite(baseMarketPrice) || baseMarketPrice <= 0) return PRICE_CAMPAIGN_MIN_FEE;
  const raw = Math.round(baseMarketPrice * PRICE_CAMPAIGN_FEE_REFERENCE_UNITS);
  return Math.max(PRICE_CAMPAIGN_MIN_FEE, Math.min(PRICE_CAMPAIGN_MAX_FEE, raw));
}

/**
 * Balance Pass 9 (Pass 8 H1 prescription — THE charged fee): burned
 * declaration fee keyed to the target market's trailing-7-real-day window
 * turnover (units × spot, server telemetry — see offense-server.ts
 * getCampaignMarketTelemetry).
 *
 * FAIL-SOFT (documented by design): when telemetry is empty or absent —
 * relaunch day one, a never-mined crafted resource, a schema-lagging
 * deploy — the fee falls back to the $25M floor. That is intentional: a
 * dead market has ~zero rival exposure to crush, so the floor fee is
 * correctly sized (Pass 8 measured exactly this — at relaunch volumes the
 * min-fee floor binds and the tool fires at crush 2.2:1).
 */
export function computeMarketKeyedCampaignFee(windowTurnover: number | null | undefined): number {
  if (typeof windowTurnover !== 'number' || !Number.isFinite(windowTurnover) || windowTurnover <= 0) {
    return PRICE_CAMPAIGN_MIN_FEE;
  }
  const raw = Math.round(PRICE_CAMPAIGN_FEE_TURNOVER_FRACTION * windowTurnover);
  return Math.max(PRICE_CAMPAIGN_MIN_FEE, Math.min(PRICE_CAMPAIGN_MAX_FEE, raw));
}

/** Pass 9: the REAL ammunition requirement — max(50, 10% of the
 *  trailing-window server production units of the resource). Fail-soft to
 *  the 50-unit floor when telemetry is empty/absent (same posture as the
 *  fee above). */
export function computeCampaignMinInventory(windowProductionUnits: number | null | undefined): number {
  if (typeof windowProductionUnits !== 'number' || !Number.isFinite(windowProductionUnits) || windowProductionUnits <= 0) {
    return PRICE_CAMPAIGN_MIN_INVENTORY;
  }
  return Math.max(
    PRICE_CAMPAIGN_MIN_INVENTORY,
    Math.round(windowProductionUnits * PRICE_CAMPAIGN_MIN_INVENTORY_WINDOW_FRACTION),
  );
}

export interface CampaignLite {
  resourceSlug: string;
  status: string;
  endsAtMs: number;
}

/** Is this campaign row currently live? */
export function isCampaignActive(c: CampaignLite, nowMs: number = Date.now()): boolean {
  return c.status === 'active' && c.endsAtMs > nowMs;
}

/** The set of resource slugs with a live campaign — the mean-revert skip
 *  list and the NPC-maker bid-halving predicate share this one reduction. */
export function activeCampaignSlugs(campaigns: CampaignLite[], nowMs: number = Date.now()): Set<string> {
  const out = new Set<string>();
  for (const c of campaigns) {
    if (isCampaignActive(c, nowMs)) out.add(c.resourceSlug);
  }
  return out;
}
