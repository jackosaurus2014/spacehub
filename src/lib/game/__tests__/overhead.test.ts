/**
 * @jest-environment node
 */
import { corporateOverheadMonthly } from '../formulas';

describe('corporateOverheadMonthly — money sink curve', () => {
  it('zero buildings → zero overhead', () => {
    expect(corporateOverheadMonthly(0)).toBe(0);
    expect(corporateOverheadMonthly(-1)).toBe(0);
  });

  it('small operations pay a trivial tax', () => {
    expect(corporateOverheadMonthly(1)).toBeLessThan(200_000);  // ~$100K
  });

  it('mid-size operations pay a notable tax', () => {
    const m10 = corporateOverheadMonthly(10);
    expect(m10).toBeGreaterThan(1_000_000);  // > $1M
    expect(m10).toBeLessThan(5_000_000);
  });

  it('large operations pay serious overhead', () => {
    const m50 = corporateOverheadMonthly(50);
    expect(m50).toBeGreaterThan(10_000_000);  // > $10M
  });

  it('mega-operations pay tens of millions', () => {
    const m100 = corporateOverheadMonthly(100);
    expect(m100).toBeGreaterThan(30_000_000);  // > $30M
  });

  it('is strictly monotonically increasing', () => {
    let prev = corporateOverheadMonthly(0);
    for (let i = 1; i <= 200; i++) {
      const next = corporateOverheadMonthly(i);
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
  });

  it('scales superlinearly — doubling buildings more than doubles overhead', () => {
    const m10 = corporateOverheadMonthly(10);
    const m20 = corporateOverheadMonthly(20);
    // 20^1.4 / 10^1.4 ≈ 2.64, so m20 should be > 2.5 × m10
    expect(m20).toBeGreaterThan(m10 * 2.5);
  });
});
