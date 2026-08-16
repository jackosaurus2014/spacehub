/**
 * Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O3) — cornering intelligence:
 * the offensive standing-demand aggregation (tech-gated, fee-priced) and
 * the defensive 40%-of-7-day-volume squeeze alert.
 */
import {
  aggregateStandingDemand, detectCorneringAlerts,
  CORNERING_ALERT_SHARE, CORNERING_MIN_OPEN_QTY, STANDING_DEMAND_REPORT_FEE,
  NPC_PROFILE_ID, type OpenBuyOrderLite,
} from '../cornering-intel';

const order = (o: Partial<OpenBuyOrderLite>): OpenBuyOrderLite => ({
  profileId: 'p1', resourceSlug: 'iron', quantity: 100, filledQty: 0, pricePerUnit: 5_000, ...o,
});

describe('M5 O3 — standing-demand aggregation (the offensive read)', () => {
  it('groups open buy interest by resource, counting distinct buyers', () => {
    const rows = aggregateStandingDemand([
      order({ profileId: 'a', resourceSlug: 'iron', quantity: 100, filledQty: 40 }),
      order({ profileId: 'b', resourceSlug: 'iron', quantity: 50 }),
      order({ profileId: 'a', resourceSlug: 'titanium', quantity: 10, pricePerUnit: 25_000 }),
    ]);
    const iron = rows.find(r => r.resourceSlug === 'iron')!;
    expect(iron.openQty).toBe(60 + 50);
    expect(iron.buyerCount).toBe(2);
    expect(iron.escrowValue).toBe(110 * 5_000);
  });

  it('excludes the requester\'s own orders and the NPC maker', () => {
    const rows = aggregateStandingDemand([
      order({ profileId: 'me', quantity: 500 }),
      order({ profileId: NPC_PROFILE_ID, quantity: 500 }),
      order({ profileId: 'rival', quantity: 30 }),
    ], 'me');
    expect(rows).toHaveLength(1);
    expect(rows[0].openQty).toBe(30);
  });

  it('separates E3 standing procurement (building shortfalls) from manual bids', () => {
    const rows = aggregateStandingDemand([
      order({ profileId: 'a', quantity: 40, source: 'standing' }),
      order({ profileId: 'b', quantity: 60, source: 'manual' }),
    ]);
    expect(rows[0].openQty).toBe(100);
    expect(rows[0].standingQty).toBe(40);
  });

  it('fully-filled and degenerate orders contribute nothing', () => {
    const rows = aggregateStandingDemand([
      order({ quantity: 10, filledQty: 10 }),
      order({ quantity: 10, filledQty: 15 }),
    ]);
    expect(rows).toHaveLength(0);
  });

  it('the report is never free', () => {
    expect(STANDING_DEMAND_REPORT_FEE).toBeGreaterThan(0);
  });
});

describe('M5 O3 — cornering alerts (the defensive read, victims SEE it)', () => {
  it('fires when one buyer\'s open interest crosses 40% of 7-day volume', () => {
    const alerts = detectCorneringAlerts(
      [order({ profileId: 'whale', quantity: 50 })],
      { iron: 100 },
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].resourceSlug).toBe('iron');
    expect(alerts[0].topBuyerShare).toBeGreaterThanOrEqual(CORNERING_ALERT_SHARE);
    expect(alerts[0].topBuyerOpenQty).toBe(50);
  });

  it('many small buyers summing past 40% do NOT trip it — concentration, not demand, is the signal', () => {
    const alerts = detectCorneringAlerts(
      [
        order({ profileId: 'a', quantity: 25 }),
        order({ profileId: 'b', quantity: 25 }),
        order({ profileId: 'c', quantity: 25 }),
      ],
      { iron: 200 },
    );
    expect(alerts).toHaveLength(0);
  });

  it('ignores the NPC maker and dust-sized positions', () => {
    expect(detectCorneringAlerts(
      [order({ profileId: NPC_PROFILE_ID, quantity: 10_000 })],
      { iron: 100 },
    )).toHaveLength(0);
    expect(detectCorneringAlerts(
      [order({ profileId: 'a', quantity: CORNERING_MIN_OPEN_QTY - 1 })],
      { iron: 1 },
    )).toHaveLength(0);
  });

  it('a dead market (no volume) still alerts on a real position — denominator floors at 1', () => {
    const alerts = detectCorneringAlerts(
      [order({ profileId: 'a', quantity: CORNERING_MIN_OPEN_QTY })],
      {},
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].volume7d).toBe(1);
  });

  it('sorts by severity (share) descending', () => {
    const alerts = detectCorneringAlerts(
      [
        order({ profileId: 'a', resourceSlug: 'iron', quantity: 50 }),
        order({ profileId: 'b', resourceSlug: 'titanium', quantity: 90 }),
      ],
      { iron: 100, titanium: 100 },
    );
    expect(alerts.map(a => a.resourceSlug)).toEqual(['titanium', 'iron']);
  });
});
