/**
 * GAME_DESIGN_REVIEW_2026-09 §2 row 15 — competitive contracts: the decision
 * was to WIRE a client (CompetitiveRacesPanel under the Contracts hub's PVP
 * tab) rather than fold the race mechanic into sealed-bid bidding. This
 * pins the pure client gate and the pool fields the panel renders.
 */
import { raceStatusFor, COMPETITIVE_CONTRACT_POOL, getActiveCompetitiveContracts } from '../competitive-contracts';
import { CONTRACT_TYPES } from '../contract-bidding';

describe('raceStatusFor — the Claim gate', () => {
  const race = { maxWinners: 2, winners: [{ companyName: 'Nova Aerospace' }] };
  it('open while slots remain and I have not claimed', () => {
    expect(raceStatusFor(race, 'Test Corp')).toBe('open');
    expect(raceStatusFor(race, null)).toBe('open');
  });
  it('claimed_by_me when my company is a winner (even if the race is full)', () => {
    expect(raceStatusFor(race, 'Nova Aerospace')).toBe('claimed_by_me');
    expect(raceStatusFor({ maxWinners: 1, winners: [{ companyName: 'Me' }] }, 'Me')).toBe('claimed_by_me');
  });
  it('full when every slot is taken by others', () => {
    expect(raceStatusFor({ maxWinners: 1, winners: [{ companyName: 'Nova Aerospace' }] }, 'Test Corp')).toBe('full');
  });
});

describe('the race pool carries everything the panel renders', () => {
  it('every race has title/client/icon/description/requirement.label/reward.money/maxWinners/tier', () => {
    for (const c of COMPETITIVE_CONTRACT_POOL) {
      expect(typeof c.title).toBe('string');
      expect(typeof c.client).toBe('string');
      expect(typeof c.icon).toBe('string');
      expect(typeof c.description).toBe('string');
      expect(typeof c.requirement.label).toBe('string');
      expect(c.reward.money).toBeGreaterThan(0);
      expect(c.maxWinners).toBeGreaterThanOrEqual(1);
      expect(c.tier).toBeGreaterThanOrEqual(1);
    }
  });

  it('early races are game-month gated, not tier gated — so the panel must render below the T5 bidding gate', () => {
    const monthOne = getActiveCompetitiveContracts(1);
    expect(monthOne.length).toBeGreaterThan(0);
    expect(monthOne.every(c => c.tier <= 2)).toBe(true);
  });

  it('races and bidding are distinct mechanisms (the fold-vs-wire justification)', () => {
    // Bidding: auction fields; races: first-N-to-complete fields. No overlap
    // in the core verb — bidding has bidDirection, races have maxWinners.
    for (const t of Object.values(CONTRACT_TYPES)) expect(['reverse', 'forward']).toContain(t.bidDirection);
    for (const c of COMPETITIVE_CONTRACT_POOL) expect('bidDirection' in c).toBe(false);
  });
});
