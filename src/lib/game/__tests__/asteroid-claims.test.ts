// ─── Mining Phase B — asteroid claims (2026-09-13) ──────────────────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §3 "Claims"; founder ruling 3
// (3 game-months unworked); docs/POLICY.md "Asteroid claims".

import {
  ASTEROID_FIELD_MAP,
  CLAIM_EXPIRY_GAME_MONTHS,
  LOCAL_INTEL_SALT,
  generateFieldRocks,
  rollAsteroidIntel,
} from '../asteroids';
import {
  CLAIM_CAP_BY_TIER,
  CLAIM_EXPIRY_MS,
  CLAIM_FEE_MIN,
  CLAIM_FEE_VALUE_SHARE,
  CLAIM_UPKEEP_SHARE,
  adoptServerMining,
  advanceAsteroidClaims,
  checkStakeClaim,
  claimCapForTier,
  claimExpiresAt,
  claimStakeFee,
  claimUpkeepPerMonth,
  isClaimExpiringSoon,
  markClaimWorked,
  releaseAsteroidClaimLocal,
  stakeAsteroidClaimLocal,
  toPublicClaimView,
  type AsteroidClaimRecord,
  type ServerMiningBlock,
} from '../asteroid-claims';
import { buildOrderQueue } from '../order-queue';
import { RESOURCE_MAP } from '../resources';
import { getNewGameState } from '../save-load';
import { REAL_MS_PER_GAME_MONTH } from '../server-time';
import type { GameState } from '../types';

const nearEarth = ASTEROID_FIELD_MAP.get('field_near_earth')!;
const rocksNE = generateFieldRocks(nearEarth, 2);
const rockC = rocksNE.find(r => r.class === 'C')!;
const rockS = rocksNE.find(r => r.class === 'S')!;
const intelC = rollAsteroidIntel(rockC, LOCAL_INTEL_SALT);
const NOW = 1_800_000_000_000;

function surveyedState(extra: Partial<GameState> = {}): GameState {
  const s = getNewGameState();
  return {
    ...s,
    money: 1_000_000_000,
    asteroidIntel: { [rockC.id]: { ...intelC, surveyedAtMs: NOW, via: 'probe' } },
    ...extra,
  };
}

describe('claim constants and fee', () => {
  it('expiry is the founder ruling: 3 game-months', () => {
    expect(CLAIM_EXPIRY_GAME_MONTHS).toBe(3);
    expect(CLAIM_EXPIRY_MS).toBe(3 * REAL_MS_PER_GAME_MONTH);
    expect(claimExpiresAt(NOW)).toBe(NOW + 3 * REAL_MS_PER_GAME_MONTH);
  });

  it('fee scales with grade × reserve × ore price, floored', () => {
    const price = RESOURCE_MAP.get('ore_carbonaceous')!.baseMarketPrice;
    const expected = Math.max(CLAIM_FEE_MIN, Math.round(intelC.grade * intelC.reserve * price * CLAIM_FEE_VALUE_SHARE));
    expect(claimStakeFee(rockC, intelC)).toBe(expected);
    expect(claimStakeFee(rockC, { grade: 0.3, reserve: 10 })).toBe(CLAIM_FEE_MIN);
    expect(claimUpkeepPerMonth(10_000_000)).toBe(Math.round(10_000_000 * CLAIM_UPKEEP_SHARE));
  });

  it('cap grows with corporation tier and clamps', () => {
    expect(claimCapForTier(1)).toBe(CLAIM_CAP_BY_TIER[1]);
    expect(claimCapForTier(7)).toBe(CLAIM_CAP_BY_TIER[7]);
    expect(claimCapForTier(0)).toBe(CLAIM_CAP_BY_TIER[1]);
    expect(claimCapForTier(99)).toBe(CLAIM_CAP_BY_TIER[7]);
    expect(claimCapForTier(3)).toBeGreaterThan(claimCapForTier(2));
  });
});

describe('checkStakeClaim refusal ladder', () => {
  const base = { rock: rockC, intel: intelC, claimedByOther: false, mine: false, tier: 2, myClaimCount: 0, money: 1e9 };
  it('accepts a surveyed open rock with cash and headroom', () => {
    const r = checkStakeClaim(base);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.fee).toBe(claimStakeFee(rockC, intelC)); expect(r.cap).toBe(claimCapForTier(2)); }
  });
  it('refuses unknown, unsurveyed, exhausted, other-held, own, capped, broke', () => {
    expect(checkStakeClaim({ ...base, rock: null })).toEqual({ ok: false, error: 'unknown_rock' });
    expect(checkStakeClaim({ ...base, intel: null })).toEqual({ ok: false, error: 'not_surveyed' });
    expect(checkStakeClaim({ ...base, intel: { ...intelC, reserve: 0 } })).toEqual({ ok: false, error: 'rock_exhausted' });
    expect(checkStakeClaim({ ...base, claimedByOther: true })).toEqual({ ok: false, error: 'claimed_by_other' });
    expect(checkStakeClaim({ ...base, mine: true })).toEqual({ ok: false, error: 'already_yours' });
    expect(checkStakeClaim({ ...base, tier: 1, myClaimCount: 1 })).toEqual({ ok: false, error: 'claim_cap' });
    expect(checkStakeClaim({ ...base, money: 0 })).toEqual({ ok: false, error: 'insufficient_funds' });
  });
});

describe('local claim lifecycle', () => {
  it('stake pays the fee, records the claim, refuses a second stake', () => {
    const s0 = surveyedState();
    const { state: s1, result } = stakeAsteroidClaimLocal(s0, rockC.id, 2, NOW);
    expect(result.ok).toBe(true);
    const claim = s1.asteroidClaims![rockC.id];
    expect(claim).toBeDefined();
    expect(claim.expiresAtMs).toBe(NOW + CLAIM_EXPIRY_MS);
    expect(s0.money - s1.money).toBe(claim.fee);
    expect(s1.eventLog[0].title).toContain('Claim staked');
    const again = stakeAsteroidClaimLocal(s1, rockC.id, 2, NOW);
    expect(again.result).toEqual({ ok: false, error: 'already_yours' });
    expect(again.state).toBe(s1);
  });

  it('refuses an unsurveyed rock and the tier cap', () => {
    const s0 = surveyedState();
    expect(stakeAsteroidClaimLocal(s0, rockS.id, 2, NOW).result).toEqual({ ok: false, error: 'not_surveyed' });
    const s1 = stakeAsteroidClaimLocal(s0, rockC.id, 1, NOW).state;
    const s2 = { ...s1, asteroidIntel: { ...s1.asteroidIntel, [rockS.id]: { ...rollAsteroidIntel(rockS, LOCAL_INTEL_SALT), surveyedAtMs: NOW, via: 'probe' as const } } };
    expect(stakeAsteroidClaimLocal(s2, rockS.id, 1, NOW).result).toEqual({ ok: false, error: 'claim_cap' });
  });

  it('adopts the server row instead of rolling its own', () => {
    const server: AsteroidClaimRecord = { id: 'srv-1', asteroidId: rockC.id, fieldId: rockC.fieldId, stakedAtMs: NOW - 5, lastWorkedAtMs: NOW - 5, expiresAtMs: NOW + 99, fee: 1234, upkeepPerMonth: 12 };
    const s1 = stakeAsteroidClaimLocal(surveyedState(), rockC.id, 2, NOW, server).state;
    expect(s1.asteroidClaims![rockC.id]).toEqual(server);
  });

  it('working the rock advances lastWorkedAt and the expiry', () => {
    const s1 = stakeAsteroidClaimLocal(surveyedState(), rockC.id, 2, NOW).state;
    const later = NOW + REAL_MS_PER_GAME_MONTH;
    const s2 = markClaimWorked(s1, rockC.id, later);
    expect(s2.asteroidClaims![rockC.id].lastWorkedAtMs).toBe(later);
    expect(s2.asteroidClaims![rockC.id].expiresAtMs).toBe(later + CLAIM_EXPIRY_MS);
    // Earlier work never rewinds.
    expect(markClaimWorked(s2, rockC.id, NOW)).toBe(s2);
    expect(markClaimWorked(s2, 'nope', later)).toBe(s2);
  });

  it('release drops the claim with no refund', () => {
    const s1 = stakeAsteroidClaimLocal(surveyedState(), rockC.id, 2, NOW).state;
    const s2 = releaseAsteroidClaimLocal(s1, rockC.id);
    expect(s2.asteroidClaims![rockC.id]).toBeUndefined();
    expect(s2.money).toBe(s1.money);
    expect(releaseAsteroidClaimLocal(s2, rockC.id)).toBe(s2);
  });

  it('expires after 3 unworked game-months and posts one mail line', () => {
    const s1 = stakeAsteroidClaimLocal(surveyedState(), rockC.id, 2, NOW).state;
    const before = advanceAsteroidClaims(s1, NOW + CLAIM_EXPIRY_MS - 1, false);
    expect(before.asteroidClaims![rockC.id]).toBeDefined();
    const after = advanceAsteroidClaims(s1, NOW + CLAIM_EXPIRY_MS, false);
    expect(after.asteroidClaims![rockC.id]).toBeUndefined();
    expect(after.reports!.some(r => r.id === `claim-expired-${s1.asteroidClaims![rockC.id].id}`)).toBe(true);
    const again = advanceAsteroidClaims(after, NOW + CLAIM_EXPIRY_MS + 1, false);
    expect(again.reports!.filter(r => r.id.startsWith('claim-expired-')).length).toBe(1);
  });

  it('local-only play charges monthly upkeep and lapses an unpayable claim', () => {
    const s1 = stakeAsteroidClaimLocal(surveyedState(), rockC.id, 2, NOW).state;
    const claim = s1.asteroidClaims![rockC.id];
    const paid = advanceAsteroidClaims(s1, NOW + REAL_MS_PER_GAME_MONTH, true);
    expect(s1.money - paid.money).toBe(claim.upkeepPerMonth);
    expect(paid.asteroidClaims![rockC.id]).toBeDefined();
    const broke = advanceAsteroidClaims({ ...s1, money: 0 }, NOW + REAL_MS_PER_GAME_MONTH, true);
    expect(broke.asteroidClaims![rockC.id]).toBeUndefined();
    expect(broke.reports!.some(r => r.id === `claim-lapsed-${claim.id}`)).toBe(true);
    // A synced profile never pays here (the server ledger does).
    const synced = advanceAsteroidClaims(s1, NOW + REAL_MS_PER_GAME_MONTH, false);
    expect(synced.money).toBe(s1.money);
  });

  it('flags a claim lapsing within one game-month and the Outliner shows it', () => {
    const s1 = stakeAsteroidClaimLocal(surveyedState(), rockC.id, 2, NOW).state;
    const claim = s1.asteroidClaims![rockC.id];
    expect(isClaimExpiringSoon(claim, NOW)).toBe(false);
    expect(isClaimExpiringSoon(claim, claim.expiresAtMs - REAL_MS_PER_GAME_MONTH + 1)).toBe(true);
    expect(isClaimExpiringSoon(claim, claim.expiresAtMs + 1)).toBe(false);
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(claim.expiresAtMs - REAL_MS_PER_GAME_MONTH / 2);
    try {
      const rows = buildOrderQueue(s1);
      const row = rows.find(r => r.id === `claim-expiring-${claim.id}`);
      expect(row).toBeDefined();
      expect(row!.tab).toBe('mining');
      expect(row!.target).toEqual({ kind: 'location', id: nearEarth.parentLocationId });
      expect(row!.etaSeconds).toBeCloseTo(REAL_MS_PER_GAME_MONTH / 2 / 1000, 0);
    } finally {
      nowSpy.mockRestore();
    }
    const quiet = jest.spyOn(Date, 'now').mockReturnValue(NOW);
    try {
      expect(buildOrderQueue(s1).some(r => r.id.startsWith('claim-expiring-'))).toBe(false);
    } finally {
      quiet.mockRestore();
    }
  });
});

describe('public claim feed projection', () => {
  it('carries the corporation NAME and never the profile id, fee or upkeep', () => {
    const view = toPublicClaimView({ asteroidId: rockC.id, fieldId: rockC.fieldId, stakedAt: new Date(NOW), lastWorkedAt: NOW, expiresAt: new Date(NOW + CLAIM_EXPIRY_MS), holderName: 'Ceres Metals' });
    expect(view).toEqual({ asteroidId: rockC.id, rockName: rockC.name, fieldId: rockC.fieldId, holderName: 'Ceres Metals', stakedAtMs: NOW, lastWorkedAtMs: NOW, expiresAtMs: NOW + CLAIM_EXPIRY_MS });
    expect(Object.keys(view)).not.toContain('profileId');
    expect(Object.keys(view)).not.toContain('fee');
    expect(toPublicClaimView({ asteroidId: rockC.id, fieldId: rockC.fieldId, stakedAt: NOW, lastWorkedAt: NOW, expiresAt: NOW, holderName: null }).holderName).toBe('A corporation');
  });
});

describe('adoptServerMining', () => {
  const claim: AsteroidClaimRecord = { id: 'c1', asteroidId: rockC.id, fieldId: rockC.fieldId, stakedAtMs: NOW, lastWorkedAtMs: NOW, expiresAtMs: NOW + CLAIM_EXPIRY_MS, fee: 5, upkeepPerMonth: 1 };

  it('server claims win, intel merges per rock, notices post once', () => {
    const s0 = surveyedState({ asteroidClaims: { [rockS.id]: { ...claim, id: 'stale', asteroidId: rockS.id } } });
    const block: ServerMiningBlock = {
      claims: [claim],
      intel: { [rockC.id]: { ...intelC, reserve: intelC.reserve - 100, surveyedAtMs: NOW, via: 'probe', spinUpUntilMs: NOW + 1000 } },
      notices: [{ id: 'shakedown-o1', kind: 'shakedown', atMs: NOW, asteroidId: rockC.id, fieldId: rockC.fieldId, locationId: 'asteroid_belt', title: 'Shakedown', body: 'lost 50', unitsLost: 50 }],
    };
    const s1 = adoptServerMining(s0, block, NOW);
    expect(Object.keys(s1.asteroidClaims!)).toEqual([rockC.id]);
    expect(s1.asteroidIntel![rockC.id].reserve).toBe(intelC.reserve - 100);
    expect(s1.asteroidIntel![rockC.id].spinUpUntilMs).toBe(NOW + 1000);
    expect(s1.reports!.some(r => r.id === 'shakedown-o1')).toBe(true);
    expect(s1.recentHazards![0]).toMatchObject({ id: 'shakedown-o1', type: 'pirate_raid', severity: 'major', locationId: 'asteroid_belt' });
    expect(s1.miningNoticesSeen).toContain('shakedown-o1');
    // Same block again: nothing new is posted, state is unchanged.
    const s2 = adoptServerMining(s1, block, NOW);
    expect(s2).toBe(s1);
  });

  it('a respawn notice drops the stale survey; garbage is ignored', () => {
    const s0 = surveyedState();
    const s1 = adoptServerMining(s0, { claims: [], intel: {}, notices: [{ id: 'respawn-x', kind: 'rock_respawned', atMs: NOW, asteroidId: rockC.id, fieldId: rockC.fieldId, locationId: 'lunar_orbit', title: 'Re-charted', body: '' }] }, NOW);
    expect(s1.asteroidIntel![rockC.id]).toBeUndefined();
    expect(adoptServerMining(s0, null, NOW)).toBe(s0);
    expect(adoptServerMining(s0, { claims: [], intel: {}, notices: [] }, NOW)).toBe(s0);
  });
});
