/**
 * @jest-environment node
 */
import { serviceSaturationMultiplier } from '../formulas';

describe('serviceSaturationMultiplier — diminishing returns curve', () => {
  it('first instance earns full revenue', () => {
    expect(serviceSaturationMultiplier(0)).toBe(1.0);
  });

  it('second instance earns roughly 95%', () => {
    expect(serviceSaturationMultiplier(1)).toBeGreaterThan(0.9);
    expect(serviceSaturationMultiplier(1)).toBeLessThan(1.0);
  });

  it('is monotonically non-increasing', () => {
    let prev = serviceSaturationMultiplier(0);
    for (let i = 1; i <= 100; i++) {
      const next = serviceSaturationMultiplier(i);
      expect(next).toBeLessThanOrEqual(prev);
      prev = next;
    }
  });

  it('floors at ~0.35', () => {
    // As position grows, multiplier asymptotes to 0.35
    expect(serviceSaturationMultiplier(1000)).toBeCloseTo(0.35, 2);
  });

  it('at 10th instance earns roughly 70%', () => {
    const m = serviceSaturationMultiplier(9);
    expect(m).toBeGreaterThan(0.60);
    expect(m).toBeLessThan(0.75);
  });

  it('at 20th instance earns roughly 48-58%', () => {
    const m = serviceSaturationMultiplier(19);
    expect(m).toBeGreaterThan(0.45);
    expect(m).toBeLessThan(0.58);
  });

  it('at 50th instance earns less than half', () => {
    expect(serviceSaturationMultiplier(49)).toBeLessThan(0.5);
  });

  it('treats negative positions as position 0', () => {
    expect(serviceSaturationMultiplier(-5)).toBe(1.0);
  });
});
