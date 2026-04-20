/**
 * @jest-environment node
 */
import { MARKET_BROKER_FEE_RATE } from '../market-engine';

describe('market broker fee — Wave 4 sell-side friction', () => {
  it('rate is a reasonable commodities-broker commission', () => {
    // Real-world commodity broker fees are 1-5%. 3% is in the middle.
    expect(MARKET_BROKER_FEE_RATE).toBeGreaterThan(0);
    expect(MARKET_BROKER_FEE_RATE).toBeLessThan(0.1);
  });

  it('3% is the documented rate', () => {
    expect(MARKET_BROKER_FEE_RATE).toBeCloseTo(0.03, 4);
  });

  it('sell of 100 @ $1000 nets $97K (3% fee)', () => {
    const gross = 100 * 1000;
    const fee = Math.round(gross * MARKET_BROKER_FEE_RATE);
    const net = gross - fee;
    expect(net).toBe(97_000);
  });

  it('is economically meaningful at scale — $100M sale pays $3M fee', () => {
    const gross = 100_000_000;
    const fee = Math.round(gross * MARKET_BROKER_FEE_RATE);
    expect(fee).toBe(3_000_000);
  });
});
