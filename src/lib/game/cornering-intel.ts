// ─── Space Tycoon: Cornering Intelligence (Wave M5, docs/MEANINGFUL_2026-08 ──
// §3.2 O3 / §M5). Cornering a market is already legitimate-but-expensive
// (anti-cornering price band base×0.3..×3.0, Earth-import parity, NPC maker
// restock). This module adds the two missing READS:
//
//   OFFENSE — the standing-order demand report (market_microstructure tech
//   + a burned per-report fee): aggregate rival standing/manual buy-order
//   demand per resource, so a corner can be AIMED at what rivals actually
//   need (satellite buses vs a datacenter corp; life-support vs a station
//   corp). Never free (tech + fee), never perfect (aggregates only — no
//   per-corp attribution without espionage).
//
//   DEFENSE — cornering alerts: when a single buyer's open buy-side
//   interest on a resource exceeds 40% of its trailing 7-day traded volume
//   (the same 40%-of-volume line the anti-cornering design draws), every
//   synced player who consumes that resource sees a Situation Log warning —
//   victims SEE the squeeze forming and can switch supply policy to local
//   production (E3 toggle), buy through Earth import (×2.5 premium — pain,
//   not death), or stockpile early. The denial premium decays via NPC
//   restock; Frontier players' recipe inputs always fill at the NPC maker's
//   band quote ([FRONTIER] — structural, nothing to gate).
//
// Pure aggregation only — DB reads live in the callers (sync route +
// market/standing-demand route), mirroring market-share.ts's layout.

export const NPC_PROFILE_ID = '__NPC_MARKET_MAKER__';

/** A single open buyer crossing this share of trailing 7-day volume trips
 *  the defensive alert. */
export const CORNERING_ALERT_SHARE = 0.40;
/** Trailing volume window for the alert denominator. */
export const CORNERING_WINDOW_DAYS = 7;
/** Ignore dust: no alert unless the top buyer's open interest is at least
 *  this many units (a 4-unit "corner" on a dead market is noise). */
export const CORNERING_MIN_OPEN_QTY = 20;

/** Burned fee per standing-order demand report pull (the tech unlock is the
 *  capex; the fee is the recurring cost — "never free"). */
export const STANDING_DEMAND_REPORT_FEE = 5_000_000;
/** Research id gating the offensive read (added this wave). */
export const MARKET_MICROSTRUCTURE_TECH_ID = 'market_microstructure';

// ─── Pure types ─────────────────────────────────────────────────────────────

export interface OpenBuyOrderLite {
  profileId: string;
  resourceSlug: string;
  quantity: number;
  filledQty: number;
  pricePerUnit: number;
  /** 'standing' = E3 auto-procurement (a building's real input shortfall);
   *  'manual' = a player's own bid. Both are demand. */
  source?: string;
}

export interface StandingDemandEntry {
  resourceSlug: string;
  /** Total unfilled buy-side units resting on the book (all rivals). */
  openQty: number;
  /** Escrow value of that demand at each order's own limit price. */
  escrowValue: number;
  /** Distinct non-NPC buyers behind it. */
  buyerCount: number;
  /** Units from E3 standing procurement orders specifically — the "what
   *  rivals' BUILDINGS need" signal, the O3 targeting data. */
  standingQty: number;
}

export interface CorneringAlertEntry {
  resourceSlug: string;
  /** Top single buyer's open buy interest as a fraction of 7d volume. */
  topBuyerShare: number;
  topBuyerOpenQty: number;
  volume7d: number;
}

// ─── Pure aggregation ───────────────────────────────────────────────────────

function remaining(o: OpenBuyOrderLite): number {
  const r = (o.quantity || 0) - (o.filledQty || 0);
  return Number.isFinite(r) && r > 0 ? r : 0;
}

/**
 * The offensive read: rival standing-order demand per resource. Excludes
 * the requester's own orders (you know your own book) and the NPC maker
 * (backstop liquidity is not a rival's supply need).
 */
export function aggregateStandingDemand(
  orders: OpenBuyOrderLite[],
  excludeProfileId?: string,
): StandingDemandEntry[] {
  const bySlug = new Map<string, StandingDemandEntry & { buyers: Set<string> }>();
  for (const o of orders) {
    if (o.profileId === NPC_PROFILE_ID) continue;
    if (excludeProfileId && o.profileId === excludeProfileId) continue;
    const qty = remaining(o);
    if (qty <= 0) continue;
    let row = bySlug.get(o.resourceSlug);
    if (!row) {
      row = { resourceSlug: o.resourceSlug, openQty: 0, escrowValue: 0, buyerCount: 0, standingQty: 0, buyers: new Set() };
      bySlug.set(o.resourceSlug, row);
    }
    row.openQty += qty;
    row.escrowValue += qty * (Number.isFinite(o.pricePerUnit) ? o.pricePerUnit : 0);
    row.buyers.add(o.profileId);
    if (o.source === 'standing') row.standingQty += qty;
  }
  return Array.from(bySlug.values())
    .map(({ buyers, ...rest }) => ({ ...rest, buyerCount: buyers.size, escrowValue: Math.round(rest.escrowValue) }))
    .sort((a, b) => b.escrowValue - a.escrowValue);
}

/**
 * The defensive read: per resource, is one non-NPC buyer's open buy-side
 * interest above CORNERING_ALERT_SHARE of the trailing traded volume?
 * Anonymous by design — the alert says a corner is FORMING, not who
 * (attribution is espionage's job, "never free, never perfect").
 */
export function detectCorneringAlerts(
  orders: OpenBuyOrderLite[],
  volume7dBySlug: Record<string, number>,
  nowVolumeFloor: number = CORNERING_MIN_OPEN_QTY,
): CorneringAlertEntry[] {
  // slug -> profileId -> open qty
  const perBuyer = new Map<string, Map<string, number>>();
  for (const o of orders) {
    if (o.profileId === NPC_PROFILE_ID) continue;
    const qty = remaining(o);
    if (qty <= 0) continue;
    let m = perBuyer.get(o.resourceSlug);
    if (!m) { m = new Map(); perBuyer.set(o.resourceSlug, m); }
    m.set(o.profileId, (m.get(o.profileId) || 0) + qty);
  }
  const alerts: CorneringAlertEntry[] = [];
  for (const [slug, buyers] of Array.from(perBuyer.entries())) {
    let topQty = 0;
    for (const q of Array.from(buyers.values())) topQty = Math.max(topQty, q);
    if (topQty < nowVolumeFloor) continue;
    const vol = Math.max(1, volume7dBySlug[slug] || 0);
    const share = topQty / vol;
    if (share >= CORNERING_ALERT_SHARE) {
      alerts.push({
        resourceSlug: slug,
        topBuyerShare: Math.round(share * 100) / 100,
        topBuyerOpenQty: topQty,
        volume7d: Math.round(vol),
      });
    }
  }
  return alerts.sort((a, b) => b.topBuyerShare - a.topBuyerShare);
}
