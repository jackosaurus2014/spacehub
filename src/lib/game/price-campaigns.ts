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

/** Fee bounds. The fee is burned (never paid to any player). */
export const PRICE_CAMPAIGN_MIN_FEE = 25_000_000;
export const PRICE_CAMPAIGN_MAX_FEE = 500_000_000;

/** Fee reference volume: declaring costs ~this many units' worth of the
 *  resource at base price (clamped to the min/max above) — crashing a
 *  high-value market costs proportionally more. */
export const PRICE_CAMPAIGN_FEE_REFERENCE_UNITS = 5_000;

/** Ammunition requirement: the declarer must HOLD at least this many units
 *  of the resource at declaration time (server-synced inventory). A price
 *  war needs real shells — you can't talk a market down. */
export const PRICE_CAMPAIGN_MIN_INVENTORY = 50;

/** One campaign per corporation at a time — focus is the trade-off. */
export const MAX_ACTIVE_CAMPAIGNS_PER_PROFILE = 1;

/** While a campaign is active on a resource, the NPC maker's resting BID
 *  volume is multiplied by this (ask volume untouched — see header). */
export const CAMPAIGN_NPC_BID_VOLUME_FACTOR = 0.5;

/** Declaring requires graduating the on-ramp: same net-worth floor as
 *  espionage (economic offense is post-Frontier gameplay). */
export const PRICE_CAMPAIGN_MIN_NET_WORTH = 200_000_000;

// ─── Pure helpers ───────────────────────────────────────────────────────────

/** Burned declaration fee for a resource, from its base market price. */
export function computeCampaignFee(baseMarketPrice: number): number {
  if (!Number.isFinite(baseMarketPrice) || baseMarketPrice <= 0) return PRICE_CAMPAIGN_MIN_FEE;
  const raw = Math.round(baseMarketPrice * PRICE_CAMPAIGN_FEE_REFERENCE_UNITS);
  return Math.max(PRICE_CAMPAIGN_MIN_FEE, Math.min(PRICE_CAMPAIGN_MAX_FEE, raw));
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
