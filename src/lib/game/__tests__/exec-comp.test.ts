/**
 * @jest-environment node
 */
import { executiveCompensationMonthly } from '../formulas';

describe('executiveCompensationMonthly — wealth tax curve', () => {
  it('charges nothing below the $100M threshold', () => {
    expect(executiveCompensationMonthly(0)).toBe(0);
    expect(executiveCompensationMonthly(50_000_000)).toBe(0);
    expect(executiveCompensationMonthly(100_000_000)).toBe(0);
  });

  it('handles negative net worth gracefully', () => {
    expect(executiveCompensationMonthly(-1_000_000)).toBe(0);
  });

  it('charges trivial amounts at early-mid game wealth', () => {
    const m1B = executiveCompensationMonthly(1_000_000_000);
    expect(m1B).toBeGreaterThan(200_000);
    expect(m1B).toBeLessThan(500_000);
  });

  it('charges meaningful amounts at mid-game', () => {
    const m10B = executiveCompensationMonthly(10_000_000_000);
    expect(m10B).toBeGreaterThan(2_500_000);
    expect(m10B).toBeLessThan(3_500_000);
  });

  it('charges significant amounts in late-game', () => {
    const m100B = executiveCompensationMonthly(100_000_000_000);
    expect(m100B).toBeGreaterThan(25_000_000);
  });

  it('charges substantial amounts in end-game', () => {
    const m1T = executiveCompensationMonthly(1_000_000_000_000);
    expect(m1T).toBeGreaterThan(275_000_000);
  });

  it('is strictly monotonically increasing above threshold', () => {
    let prev = executiveCompensationMonthly(100_000_000);
    for (let worth = 200_000_000; worth <= 100_000_000_000; worth *= 2) {
      const next = executiveCompensationMonthly(worth);
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
  });

  it('annual drag is about 0.36% of above-threshold wealth', () => {
    const annual = executiveCompensationMonthly(1_000_000_000) * 12;
    const taxable = 1_000_000_000 - 100_000_000;
    expect(annual / taxable).toBeCloseTo(0.0036, 3);
  });
});
