/**
 * Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O2) — price campaigns (dumping).
 * Cost math, duration/cooldown bounds, and the active-slug reduction the
 * mean-revert skip + NPC bid-halving both key off.
 */
import {
  computeCampaignFee, computeMarketKeyedCampaignFee, computeCampaignMinInventory,
  isCampaignActive, activeCampaignSlugs,
  PRICE_CAMPAIGN_MIN_FEE, PRICE_CAMPAIGN_MAX_FEE, PRICE_CAMPAIGN_FEE_REFERENCE_UNITS,
  PRICE_CAMPAIGN_FEE_TURNOVER_FRACTION, PRICE_CAMPAIGN_MIN_INVENTORY_WINDOW_FRACTION,
  PRICE_CAMPAIGN_DURATION_MS, PRICE_CAMPAIGN_COOLDOWN_MS,
  PRICE_CAMPAIGN_MIN_INVENTORY, MAX_ACTIVE_CAMPAIGNS_PER_PROFILE,
  CAMPAIGN_NPC_BID_VOLUME_FACTOR, PRICE_CAMPAIGN_MIN_NET_WORTH,
} from '../price-campaigns';
import { RESOURCE_MAP } from '../resources';

describe('M5 O2 — campaign fee math', () => {
  it('scales with base price: cheap commodities hit the floor, exotic ones the ceiling', () => {
    // iron base ≈ $5K → 5K × 5,000 = $25M (the floor)
    const iron = RESOURCE_MAP.get('iron')!;
    expect(computeCampaignFee(iron.baseMarketPrice)).toBe(PRICE_CAMPAIGN_MIN_FEE);
    // helium3 base ≈ $5M → 5M × 5,000 = $25B → clamped to the ceiling
    const he3 = RESOURCE_MAP.get('helium3')!;
    expect(computeCampaignFee(he3.baseMarketPrice)).toBe(PRICE_CAMPAIGN_MAX_FEE);
  });

  it('mid-tier resources land strictly between the bounds', () => {
    const titanium = RESOURCE_MAP.get('titanium')!;
    const fee = computeCampaignFee(titanium.baseMarketPrice);
    expect(fee).toBe(Math.min(PRICE_CAMPAIGN_MAX_FEE, Math.max(
      PRICE_CAMPAIGN_MIN_FEE,
      Math.round(titanium.baseMarketPrice * PRICE_CAMPAIGN_FEE_REFERENCE_UNITS),
    )));
    expect(fee).toBeGreaterThanOrEqual(PRICE_CAMPAIGN_MIN_FEE);
    expect(fee).toBeLessThanOrEqual(PRICE_CAMPAIGN_MAX_FEE);
  });

  it('degenerate inputs fall back to the minimum fee (never free, never NaN)', () => {
    expect(computeCampaignFee(0)).toBe(PRICE_CAMPAIGN_MIN_FEE);
    expect(computeCampaignFee(-5)).toBe(PRICE_CAMPAIGN_MIN_FEE);
    expect(computeCampaignFee(NaN)).toBe(PRICE_CAMPAIGN_MIN_FEE);
  });
});

// ─── Balance Pass 9 (Pass 8 H1 prescription — sim-validated bands) ─────────
describe('Pass 9 — market-keyed campaign fee (the CHARGED fee)', () => {
  it('ships the exact Pass-8 prescription constants: fraction 0.15, floor $25M, cap $5B', () => {
    expect(PRICE_CAMPAIGN_FEE_TURNOVER_FRACTION).toBe(0.15);
    expect(PRICE_CAMPAIGN_MIN_FEE).toBe(25_000_000);
    expect(PRICE_CAMPAIGN_MAX_FEE).toBe(5_000_000_000);
  });

  it('fee = 15% of window turnover between the bounds', () => {
    expect(computeMarketKeyedCampaignFee(1_000_000_000)).toBe(150_000_000);
    expect(computeMarketKeyedCampaignFee(2_000_000_000)).toBe(300_000_000);
  });

  it('clamps to the $25M floor and the $5B cap', () => {
    expect(computeMarketKeyedCampaignFee(1_000_000)).toBe(PRICE_CAMPAIGN_MIN_FEE);
    expect(computeMarketKeyedCampaignFee(1e15)).toBe(PRICE_CAMPAIGN_MAX_FEE);
  });

  it('fail-soft: empty/absent telemetry falls back to the $25M floor (documented relaunch-day-one posture)', () => {
    expect(computeMarketKeyedCampaignFee(0)).toBe(PRICE_CAMPAIGN_MIN_FEE);
    expect(computeMarketKeyedCampaignFee(null)).toBe(PRICE_CAMPAIGN_MIN_FEE);
    expect(computeMarketKeyedCampaignFee(undefined)).toBe(PRICE_CAMPAIGN_MIN_FEE);
    expect(computeMarketKeyedCampaignFee(NaN)).toBe(PRICE_CAMPAIGN_MIN_FEE);
    expect(computeMarketKeyedCampaignFee(-100)).toBe(PRICE_CAMPAIGN_MIN_FEE);
  });
});

describe('Pass 9 — scaled campaign min inventory', () => {
  it('max(50, 10% of window production units)', () => {
    expect(PRICE_CAMPAIGN_MIN_INVENTORY_WINDOW_FRACTION).toBe(0.10);
    expect(computeCampaignMinInventory(10_000)).toBe(1_000);
    expect(computeCampaignMinInventory(3_500)).toBe(350);
    // Below the floor: 100 units → 10 < 50 → floor.
    expect(computeCampaignMinInventory(100)).toBe(PRICE_CAMPAIGN_MIN_INVENTORY);
  });

  it('fail-soft to the 50-unit floor on empty/absent telemetry', () => {
    expect(computeCampaignMinInventory(0)).toBe(PRICE_CAMPAIGN_MIN_INVENTORY);
    expect(computeCampaignMinInventory(null)).toBe(PRICE_CAMPAIGN_MIN_INVENTORY);
    expect(computeCampaignMinInventory(undefined)).toBe(PRICE_CAMPAIGN_MIN_INVENTORY);
    expect(computeCampaignMinInventory(NaN)).toBe(PRICE_CAMPAIGN_MIN_INVENTORY);
  });
});

describe('M5 O2 — bounds the spec requires', () => {
  it('campaign runs 7 real days (weekly loop) with a 14-day per-market cooldown', () => {
    expect(PRICE_CAMPAIGN_DURATION_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(PRICE_CAMPAIGN_COOLDOWN_MS).toBe(14 * 24 * 60 * 60 * 1000);
    // Cooldown ≥ duration: crashes cannot be chained back-to-back.
    expect(PRICE_CAMPAIGN_COOLDOWN_MS).toBeGreaterThanOrEqual(PRICE_CAMPAIGN_DURATION_MS);
  });

  it('declaring requires real ammunition, focus, and post-Frontier scale', () => {
    expect(PRICE_CAMPAIGN_MIN_INVENTORY).toBeGreaterThan(0);
    expect(MAX_ACTIVE_CAMPAIGNS_PER_PROFILE).toBe(1);
    expect(PRICE_CAMPAIGN_MIN_NET_WORTH).toBeGreaterThan(0);
  });

  it('the NPC maker halves bids but never stops asking (Frontier supply is structural)', () => {
    expect(CAMPAIGN_NPC_BID_VOLUME_FACTOR).toBe(0.5);
    expect(CAMPAIGN_NPC_BID_VOLUME_FACTOR).toBeGreaterThan(0); // never zero — bids thin, don't vanish
  });
});

describe('M5 O2 — active-campaign reduction (mean-revert skip / NPC bid predicate)', () => {
  const now = 1_000_000;

  it('isCampaignActive: active + unexpired only', () => {
    expect(isCampaignActive({ resourceSlug: 'iron', status: 'active', endsAtMs: now + 1 }, now)).toBe(true);
    expect(isCampaignActive({ resourceSlug: 'iron', status: 'active', endsAtMs: now }, now)).toBe(false);
    expect(isCampaignActive({ resourceSlug: 'iron', status: 'cancelled', endsAtMs: now + 1 }, now)).toBe(false);
    expect(isCampaignActive({ resourceSlug: 'iron', status: 'completed', endsAtMs: now + 1 }, now)).toBe(false);
  });

  it('activeCampaignSlugs dedupes and drops expired/cancelled rows', () => {
    const slugs = activeCampaignSlugs([
      { resourceSlug: 'iron', status: 'active', endsAtMs: now + 100 },
      { resourceSlug: 'iron', status: 'active', endsAtMs: now + 200 },
      { resourceSlug: 'titanium', status: 'cancelled', endsAtMs: now + 100 },
      { resourceSlug: 'gold', status: 'active', endsAtMs: now - 1 },
    ], now);
    expect(Array.from(slugs).sort()).toEqual(['iron']);
  });
});
