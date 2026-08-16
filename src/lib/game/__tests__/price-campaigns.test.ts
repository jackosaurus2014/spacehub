/**
 * Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O2) — price campaigns (dumping).
 * Cost math, duration/cooldown bounds, and the active-slug reduction the
 * mean-revert skip + NPC bid-halving both key off.
 */
import {
  computeCampaignFee, isCampaignActive, activeCampaignSlugs,
  PRICE_CAMPAIGN_MIN_FEE, PRICE_CAMPAIGN_MAX_FEE, PRICE_CAMPAIGN_FEE_REFERENCE_UNITS,
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
