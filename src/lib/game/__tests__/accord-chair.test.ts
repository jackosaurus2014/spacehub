/**
 * @jest-environment node
 *
 * AAA Round 1 wave E1 — the Accord Chair.
 * docs/AAA_PROGRAM_2026-08.md "E1 implementation".
 *
 * Covers the four things the wave brief names explicitly (vote-weight
 * derivation, the dormancy gate, NPC vote coherence, the Fracture path) plus
 * the two invariants the economic-inertness argument rests on: the writ
 * substitution never changes docket size and never produces a docket the
 * un-amended shuffle could not have produced, and the DEFAULT
 * pickDocketMeasures path is byte-identical to its pre-E1 behaviour (which is
 * what keeps realignment.ts — and therefore every sim runner — unmoved).
 */
import type { GameState } from '../types';
import {
  CHAIR_BASE_YEAR,
  CHAIR_MIN_ELECTORATE,
  CHAIR_ELECTORATE_LOOKBACK_MS,
  CHAIR_SCALE_ANCHOR,
  CHAIR_SCALE_VOTE_CAP,
  CHAIR_RECORD_VOTE_CAP,
  CHAIR_PERFORMANCE_VOTE_CAP,
  CHAIR_CHARTER_VOTES,
  CHAIR_MAX_VOTE_SHARE,
  CHAIR_CANDIDACY_MIN_WEIGHT,
  CHAIR_WRITS_PER_TERM,
  CHAIR_CAMPAIGN_WINDOW_MS,
  CHAIR_NOMINATION_LEAD_MS,
  NPC_BLOC_MAX_SHARE,
  ACCORD_SIGNATORY_FACTIONS,
  FRACTURE_REP_SHIFTS,
  FRACTURE_MIN_TERMS,
  getChairTermWindow,
  getCurrentChairTermIndex,
  getChairPhase,
  getChairGateStatus,
  computeChairVoteWeight,
  applyConcentrationCap,
  chairFilingFee,
  fractureReaccessionBond,
  checkCandidacyEligibility,
  checkReaccession,
  isAccordSignatory,
  getNpcBlocRoster,
  scaleNpcBloc,
  factionMeasureInterest,
  scoreCandidatesForNpc,
  decideNpcBloc,
  resolveChairElection,
  applyChairWritToDocket,
  nextAmendableQuarterIndex,
  applyFractureRepModifier,
  clampChairSnapshot,
  type ChairVoterRecord,
  type ChairSnapshot,
} from '../accord-chair';
import {
  MEASURE_CATALOG,
  MEASURE_MAP,
  DOCKET_SIZE,
  pickDocketMeasures,
  shuffleMeasurePool,
  commitLobbying,
  advanceAccordSenate,
} from '../accord-senate';
import { getFactionRep, getRawFactionRep, FACTION_MAP, getStanding } from '../factions';
import { NPC_SEEDS } from '../npc-companies';

const NOW = Date.UTC(2026, 8, 20, 12, 0, 0); // 2026-09-20T12:00Z

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1, createdAt: 0, lastTickAt: 0,
    money: 10_000_000_000, totalEarned: 10_000_000_000, totalSpent: 0,
    gameDate: { year: 2150, month: 1 }, tickSpeed: 1,
    buildings: [], completedResearch: [], activeResearch: null, activeServices: [],
    unlockedLocations: ['earth_surface'], resources: {}, eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    ...overrides,
  } as GameState;
}

function record(overrides: Partial<ChairVoterRecord> = {}): ChairVoterRecord {
  return {
    netWorth: CHAIR_SCALE_ANCHOR,
    growthRatePct: 0,
    consecutiveQuarters: 1,
    latestPublishedAtMs: NOW - 1000,
    ...overrides,
  };
}

// ─── Term calendar ──────────────────────────────────────────────────────────

describe('accord-chair — the monthly term calendar', () => {
  it('term 0 is January of the base year and terms tile the calendar exactly', () => {
    const t0 = getChairTermWindow(0);
    expect(t0.year).toBe(CHAIR_BASE_YEAR);
    expect(t0.month).toBe(1);
    expect(t0.startMs).toBe(Date.UTC(CHAIR_BASE_YEAR, 0, 1));
    for (let i = 0; i < 30; i++) {
      expect(getChairTermWindow(i).endMs).toBe(getChairTermWindow(i + 1).startMs);
    }
  });

  it('rolls the year correctly across December', () => {
    const dec = getChairTermWindow(11);
    expect(dec.month).toBe(12);
    expect(getChairTermWindow(12).year).toBe(CHAIR_BASE_YEAR + 1);
    expect(getChairTermWindow(12).month).toBe(1);
  });

  it('getCurrentChairTermIndex agrees with getChairTermWindow at every boundary', () => {
    for (let i = 0; i < 24; i++) {
      const w = getChairTermWindow(i);
      expect(getCurrentChairTermIndex(w.startMs)).toBe(i);
      expect(getCurrentChairTermIndex(w.endMs - 1)).toBe(i);
    }
  });

  it('campaign opens 7 days out, nominations close 3 days out, ballot closes at the term start', () => {
    const w = getChairTermWindow(20);
    expect(w.startMs - w.campaignOpensMs).toBe(CHAIR_CAMPAIGN_WINDOW_MS);
    expect(w.startMs - w.nominationsCloseMs).toBe(CHAIR_NOMINATION_LEAD_MS);
    expect(w.ballotClosesMs).toBe(w.startMs);
  });

  it('phases move recess → nominations → ballot and never skip', () => {
    const next = getChairTermWindow(getCurrentChairTermIndex(NOW) + 1);
    expect(getChairPhase(next.campaignOpensMs - 1).phase).toBe('recess');
    expect(getChairPhase(next.campaignOpensMs).phase).toBe('nominations');
    expect(getChairPhase(next.nominationsCloseMs - 1).phase).toBe('nominations');
    expect(getChairPhase(next.nominationsCloseMs).phase).toBe('ballot');
    expect(getChairPhase(next.ballotClosesMs - 1).phase).toBe('ballot');
    // The instant the ballot closes, the contested term becomes the seated one.
    expect(getChairPhase(next.ballotClosesMs).seatedTermIndex).toBe(next.termIndex);
  });

  it('the contested term is always exactly one after the seated term', () => {
    for (const t of [NOW, NOW + 86_400_000 * 9, NOW - 86_400_000 * 40]) {
      const p = getChairPhase(t);
      expect(p.contestedTermIndex).toBe(p.seatedTermIndex + 1);
    }
  });
});

// ─── The dormancy gate ──────────────────────────────────────────────────────

describe('accord-chair — the population gate (share-registry precedent)', () => {
  it('is dormant below the electorate threshold and reports the honest reason', () => {
    const g = getChairGateStatus(CHAIR_MIN_ELECTORATE - 1, {});
    expect(g.enabled).toBe(false);
    expect(g.reason).toBe('awaiting_electorate');
    expect(g.requiredElectorate).toBe(CHAIR_MIN_ELECTORATE);
    expect(g.electorate).toBe(CHAIR_MIN_ELECTORATE - 1);
  });

  it('opens exactly at the threshold', () => {
    expect(getChairGateStatus(CHAIR_MIN_ELECTORATE, {}).enabled).toBe(true);
    expect(getChairGateStatus(CHAIR_MIN_ELECTORATE, {}).reason).toBe('ok');
  });

  it('TYCOON_CHAIR_ENABLED=false force-disables regardless of population', () => {
    const g = getChairGateStatus(9999, { TYCOON_CHAIR_ENABLED: 'false' });
    expect(g.enabled).toBe(false);
    expect(g.reason).toBe('disabled_by_flag');
  });

  it('TYCOON_CHAIR_FORCE=true force-enables below the threshold, but the kill switch wins', () => {
    expect(getChairGateStatus(0, { TYCOON_CHAIR_FORCE: 'true' }).enabled).toBe(true);
    const both = getChairGateStatus(9999, { TYCOON_CHAIR_ENABLED: 'false', TYCOON_CHAIR_FORCE: 'true' });
    expect(both.enabled).toBe(false);
    expect(both.reason).toBe('disabled_by_flag');
  });

  it('ships dormant at today\'s scale — the threshold is above a handful of publishers', () => {
    // The wave's stated intent: real code waiting for a real population.
    expect(CHAIR_MIN_ELECTORATE).toBeGreaterThanOrEqual(10);
    expect(getChairGateStatus(4, {}).enabled).toBe(false);
  });
});

// ─── Vote-weight derivation ─────────────────────────────────────────────────

describe('accord-chair — vote weight derives from PUBLISHED quarterlies', () => {
  it('a corporation that never published has no franchise at all', () => {
    const w = computeChairVoteWeight(null, NOW);
    expect(w.raw).toBe(0);
    expect(w.charterVotes).toBe(0);
    expect(w.lines.join(' ')).toMatch(/no seat in the chamber/i);
  });

  it('a filing older than the lookback window loses the franchise entirely', () => {
    const stale = record({ latestPublishedAtMs: NOW - CHAIR_ELECTORATE_LOOKBACK_MS - 1 });
    const w = computeChairVoteWeight(stale, NOW);
    expect(w.raw).toBe(0);
    expect(w.lines.join(' ')).toMatch(/older than the 90-day eligibility window/i);
  });

  it('every publisher gets the charter seat, however small', () => {
    const w = computeChairVoteWeight(record({ netWorth: 1, growthRatePct: -50 }), NOW);
    expect(w.charterVotes).toBe(CHAIR_CHARTER_VOTES);
    expect(w.scaleVotes).toBe(0);
    expect(w.performanceVotes).toBe(0);
    expect(w.raw).toBeGreaterThanOrEqual(CHAIR_CHARTER_VOTES);
  });

  it('scale votes are LOG-scaled in book net worth, so a whale cannot own the chamber', () => {
    const at = (n: number) => computeChairVoteWeight(record({ netWorth: n }), NOW).scaleVotes;
    expect(at(CHAIR_SCALE_ANCHOR)).toBe(0);
    expect(at(CHAIR_SCALE_ANCHOR * 10)).toBe(4);
    expect(at(CHAIR_SCALE_ANCHOR * 100)).toBe(8);
    expect(at(CHAIR_SCALE_ANCHOR * 1_000)).toBe(12);
    // 10,000x the anchor is worth 4x the scale votes of 10x — not 1,000x.
    expect(at(CHAIR_SCALE_ANCHOR * 10_000)).toBe(16);
    expect(at(CHAIR_SCALE_ANCHOR * 1e9)).toBe(CHAIR_SCALE_VOTE_CAP);
  });

  it('CASH ON HAND is not an input — the record carries no such field', () => {
    // Structural: the franchise reads only fields of a published report.
    const keys = Object.keys(record());
    expect(keys.sort()).toEqual(
      ['consecutiveQuarters', 'growthRatePct', 'latestPublishedAtMs', 'netWorth'],
    );
  });

  it('record votes reward CONSECUTIVE publishing and cap out', () => {
    const at = (q: number) => computeChairVoteWeight(record({ consecutiveQuarters: q }), NOW).recordVotes;
    expect(at(1)).toBe(1);
    expect(at(3)).toBe(3);
    expect(at(CHAIR_RECORD_VOTE_CAP)).toBe(CHAIR_RECORD_VOTE_CAP);
    expect(at(CHAIR_RECORD_VOTE_CAP + 50)).toBe(CHAIR_RECORD_VOTE_CAP);
  });

  it('performance votes follow the published growth bands, and a contraction earns none', () => {
    const at = (g: number | null) => computeChairVoteWeight(record({ growthRatePct: g }), NOW).performanceVotes;
    expect(at(-1)).toBe(0);
    expect(at(0)).toBe(1);
    expect(at(9.99)).toBe(1);
    expect(at(10)).toBe(2);
    expect(at(25)).toBe(3);
    expect(at(60)).toBe(CHAIR_PERFORMANCE_VOTE_CAP);
    expect(at(null)).toBe(0); // first published quarter — no growth rate on file
  });

  it('raw weight is exactly the sum of its four published components', () => {
    const w = computeChairVoteWeight(
      record({ netWorth: CHAIR_SCALE_ANCHOR * 100, growthRatePct: 30, consecutiveQuarters: 4 }),
      NOW,
    );
    expect(w.raw).toBe(w.charterVotes + w.scaleVotes + w.recordVotes + w.performanceVotes);
    expect(w.raw).toBe(1 + 8 + 4 + 3);
  });

  it('itemises its own derivation so the player can see what publishing buys', () => {
    const w = computeChairVoteWeight(record({ consecutiveQuarters: 2 }), NOW);
    expect(w.lines).toHaveLength(4);
    expect(w.lines.some(l => /Charter seat/.test(l))).toBe(true);
    expect(w.lines.some(l => /Published scale/.test(l))).toBe(true);
    expect(w.lines.some(l => /Filing record/.test(l))).toBe(true);
    expect(w.lines.some(l => /Performance/.test(l))).toBe(true);
  });
});

describe('accord-chair — the chamber concentration cap', () => {
  it('caps any single corporation at its published share of the chamber', () => {
    const capped = applyConcentrationCap([100, 5, 5, 5, 5]);
    const total = 120;
    expect(capped[0]).toBe(Math.floor(CHAIR_MAX_VOTE_SHARE * total));
    expect(capped.slice(1)).toEqual([5, 5, 5, 5]);
  });

  it('never strips a corporation of its charter seat', () => {
    expect(applyConcentrationCap([1, 1, 1])).toEqual([1, 1, 1]);
    expect(applyConcentrationCap([3])).toEqual([1]);
  });

  it('is slack when the chamber is balanced', () => {
    const even = [8, 8, 8, 8, 8, 8, 8, 8];
    expect(applyConcentrationCap(even)).toEqual(even);
  });

  it('an empty or all-zero chamber produces zeros, not NaN', () => {
    expect(applyConcentrationCap([])).toEqual([]);
    expect(applyConcentrationCap([0, 0])).toEqual([0, 0]);
  });
});

// ─── Candidacy ──────────────────────────────────────────────────────────────

describe('accord-chair — candidacy eligibility', () => {
  const platform = { measureId: MEASURE_CATALOG[0].id, mode: 'seat' as const, patronFactionId: 'the-dominion' as const };
  const eligibleWeight = computeChairVoteWeight(
    record({ netWorth: CHAIR_SCALE_ANCHOR * 100, consecutiveQuarters: 3 }), NOW,
  );

  const base = {
    weight: eligibleWeight,
    platform,
    patronStanding: 25,
    fractured: false,
    fractureProbationTermIndex: null as number | null,
    contestedTermIndex: 10,
    phase: 'nominations' as const,
    money: 10_000_000_000,
    publishedNetWorth: CHAIR_SCALE_ANCHOR * 100,
  };

  it('accepts a qualified filing during nominations', () => {
    expect(checkCandidacyEligibility(base).ok).toBe(true);
  });

  it('refuses outside the nomination window', () => {
    expect(checkCandidacyEligibility({ ...base, phase: 'ballot' }).ok).toBe(false);
    expect(checkCandidacyEligibility({ ...base, phase: 'recess' }).ok).toBe(false);
  });

  it('refuses a fractured corporation — it is outside Accord jurisdiction', () => {
    const r = checkCandidacyEligibility({ ...base, fractured: true });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/outside Accord jurisdiction/i);
  });

  it('refuses during re-accession probation, and allows the term after', () => {
    expect(checkCandidacyEligibility({ ...base, fractureProbationTermIndex: 10 }).ok).toBe(false);
    expect(checkCandidacyEligibility({ ...base, fractureProbationTermIndex: 9 }).ok).toBe(true);
  });

  it('requires a real published record to stand, not merely to vote', () => {
    const thin = computeChairVoteWeight(record({ netWorth: 1 }), NOW);
    expect(thin.raw).toBeLessThan(CHAIR_CANDIDACY_MIN_WEIGHT);
    expect(checkCandidacyEligibility({ ...base, weight: thin }).ok).toBe(false);
  });

  it('requires Friendly standing with the declared patron faction', () => {
    expect(checkCandidacyEligibility({ ...base, patronStanding: 9 }).ok).toBe(false);
    expect(checkCandidacyEligibility({ ...base, patronStanding: 10 }).ok).toBe(true);
  });

  it('rejects a platform measure that is not on the Accord catalogue', () => {
    const r = checkCandidacyEligibility({ ...base, platform: { ...platform, measureId: 'not_a_measure' } });
    expect(r.ok).toBe(false);
  });

  it('the filing fee scales with PUBLISHED book value and is banded', () => {
    expect(chairFilingFee(0)).toBe(50_000_000);
    expect(chairFilingFee(1_000_000_000_000)).toBe(2_000_000_000); // clamped at the ceiling
    expect(chairFilingFee(20_000_000_000)).toBe(100_000_000);
    expect(chairFilingFee(100_000_000_000)).toBe(500_000_000);
    // Monotone: a bigger corporation never pays less.
    expect(chairFilingFee(1e10)).toBeGreaterThanOrEqual(chairFilingFee(1e9));
  });
});

// ─── NPC coherence ──────────────────────────────────────────────────────────

describe('accord-chair — the NPC bloc is coherent, never random', () => {
  it('only ACCORD SIGNATORY factions hold seats (LORE.md: three left in 2143)', () => {
    expect(ACCORD_SIGNATORY_FACTIONS.sort()).toEqual(
      ['echo-remnants', 'nebula-reavers', 'the-dominion'],
    );
    expect(isAccordSignatory('the-syndicate')).toBe(false);
    expect(isAccordSignatory('void-corsairs')).toBe(false);
    expect(isAccordSignatory('hive-collective')).toBe(false);
    for (const seat of getNpcBlocRoster()) {
      expect(isAccordSignatory(seat.factionId)).toBe(true);
    }
  });

  it('the roster is derived from authored NPC seed data, not a hand-picked table', () => {
    const roster = getNpcBlocRoster();
    const expected = NPC_SEEDS.filter(n => isAccordSignatory(n.factionId));
    expect(roster.map(r => r.npcId).sort()).toEqual(expected.map(n => n.id).sort());
    for (const r of roster) {
      const seed = NPC_SEEDS.find(n => n.id === r.npcId)!;
      expect(r.seats).toBe(Math.max(1, Math.round(seed.progressionSpeed * 20)));
      expect(r.seats).toBeGreaterThan(0);
    }
  });

  it('is deterministic — identical for every observer on every shard', () => {
    expect(getNpcBlocRoster()).toEqual(getNpcBlocRoster());
  });

  it('faction interest is read straight off a measure\'s own authored consequences', () => {
    const crackdown = MEASURE_MAP.get('graymarket_crackdown')!;
    // onPass: Dominion +6, Syndicate -10. onFail: Dominion -4, Syndicate +6.
    expect(factionMeasureInterest(crackdown, 'the-dominion')).toBe(10);
    expect(factionMeasureInterest(crackdown, 'the-syndicate')).toBe(-16);
    // A faction the measure never names is indifferent — not randomly biased.
    expect(factionMeasureInterest(crackdown, 'nebula-reavers')).toBe(0);
  });

  it('a `table` platform inverts the sign of the interest term', () => {
    const cands = [
      { candidacyId: 'a', platform: { measureId: 'graymarket_crackdown', mode: 'seat' as const, patronFactionId: 'echo-remnants' as const } },
      { candidacyId: 'b', platform: { measureId: 'graymarket_crackdown', mode: 'table' as const, patronFactionId: 'echo-remnants' as const } },
    ];
    const scored = scoreCandidatesForNpc('the-dominion', cands);
    expect(scored[0].interestTerm).toBe(10);
    expect(scored[1].interestTerm).toBe(-10);
  });

  it('backs a candidate flying its own banner and penalises its declared rival\'s', () => {
    const dominionRival = FACTION_MAP.get('the-dominion')!.rivalId; // void-corsairs
    const cands = [
      { candidacyId: 'own', platform: { measureId: MEASURE_CATALOG[0].id, mode: 'seat' as const, patronFactionId: 'the-dominion' as const } },
      { candidacyId: 'rival', platform: { measureId: MEASURE_CATALOG[0].id, mode: 'seat' as const, patronFactionId: dominionRival } },
    ];
    const scored = scoreCandidatesForNpc('the-dominion', cands);
    expect(scored.find(s => s.candidacyId === 'own')!.patronTerm).toBeGreaterThan(0);
    expect(scored.find(s => s.candidacyId === 'rival')!.patronTerm).toBeLessThan(0);
  });

  it('ABSTAINS rather than rolling a die when no candidate advances its interest', () => {
    // A Dominion NPC facing a lone candidate who runs under the Corsair banner
    // pledging to TABLE the crackdown the Dominion wants passed.
    const cands = [{
      candidacyId: 'hostile',
      corpName: 'Hostile Holdings',
      platform: { measureId: 'graymarket_crackdown', mode: 'table' as const, patronFactionId: 'void-corsairs' as const },
    }];
    const decisions = decideNpcBloc(
      getNpcBlocRoster().filter(s => s.factionId === 'the-dominion'),
      cands,
    );
    expect(decisions.length).toBeGreaterThan(0);
    for (const d of decisions) {
      expect(d.candidacyId).toBeNull();
      expect(d.rationale).toMatch(/abstain/i);
    }
  });

  it('abstains when nobody stands at all', () => {
    for (const d of decideNpcBloc(getNpcBlocRoster(), [])) {
      expect(d.candidacyId).toBeNull();
    }
  });

  it('is fully deterministic across repeated runs and breaks ties without RNG', () => {
    const cands = [
      { candidacyId: 'bbb', corpName: 'B Corp', platform: { measureId: 'graymarket_crackdown', mode: 'seat' as const, patronFactionId: 'echo-remnants' as const } },
      { candidacyId: 'aaa', corpName: 'A Corp', platform: { measureId: 'graymarket_crackdown', mode: 'seat' as const, patronFactionId: 'echo-remnants' as const } },
    ];
    const first = decideNpcBloc(getNpcBlocRoster(), cands);
    for (let i = 0; i < 5; i++) expect(decideNpcBloc(getNpcBlocRoster(), cands)).toEqual(first);
    // Identical scores → the lower candidacy id wins, every time.
    const dominion = first.filter(d => d.factionId === 'the-dominion');
    for (const d of dominion) expect(d.candidacyId).toBe('aaa');
  });

  it('gives every decision a stated rationale — no unexplained votes', () => {
    const cands = [{
      candidacyId: 'x', corpName: 'X Corp',
      platform: { measureId: 'graymarket_crackdown', mode: 'seat' as const, patronFactionId: 'the-dominion' as const },
    }];
    for (const d of decideNpcBloc(getNpcBlocRoster(), cands)) {
      expect(d.rationale.length).toBeGreaterThan(10);
    }
  });
});

describe('accord-chair — the NPC bloc is a floor, never a ceiling', () => {
  it('holds full strength on an empty shard so the chamber still feels alive', () => {
    const roster = getNpcBlocRoster();
    expect(scaleNpcBloc(roster, 0)).toEqual(roster);
  });

  it('recedes to at most its published share as player weight grows', () => {
    const roster = getNpcBlocRoster();
    const rawTotal = roster.reduce((a, s) => a + s.seats, 0);
    for (const players of [1, 5, 10, 25, 100, 1000]) {
      const scaled = scaleNpcBloc(roster, players);
      const total = scaled.reduce((a, s) => a + s.seats, 0);
      expect(total).toBeLessThanOrEqual(rawTotal);
      expect(total / (total + players)).toBeLessThanOrEqual(NPC_BLOC_MAX_SHARE + 1e-9);
    }
  });

  it('the bloc share falls monotonically as the player chamber grows', () => {
    const roster = getNpcBlocRoster();
    let prevShare = 1;
    for (const players of [10, 50, 200, 1000, 10_000]) {
      const total = scaleNpcBloc(roster, players).reduce((a, s) => a + s.seats, 0);
      const share = total / (total + players);
      expect(share).toBeLessThanOrEqual(prevShare + 1e-9);
      prevShare = share;
    }
  });

  it('apportions the reduction fairly rather than truncating the smallest NPC away', () => {
    const scaled = scaleNpcBloc(getNpcBlocRoster(), 4);
    // Largest-remainder keeps the ordering sane and never produces negatives.
    for (const s of scaled) expect(s.seats).toBeGreaterThanOrEqual(0);
    expect(scaled).toHaveLength(getNpcBlocRoster().length);
  });
});

// ─── Resolution ─────────────────────────────────────────────────────────────

describe('accord-chair — resolution is deterministic and never fabricates a winner', () => {
  const platform = (measureId: string, patron: 'the-dominion' | 'the-syndicate' = 'the-dominion') =>
    ({ measureId, mode: 'seat' as const, patronFactionId: patron });

  it('seats a VACANCY when nobody stands', () => {
    const r = resolveChairElection(5, [], [], getNpcBlocRoster(), 40);
    expect(r.winner).toBeNull();
    expect(r.vacancyReason).toMatch(/No corporation stood/i);
  });

  it('seats a VACANCY when everyone abstains — no default appointment', () => {
    // A candidate the NPC bloc will not back and no player voted for.
    const cands = [{
      candidacyId: 'a', profileId: 'p1', corpName: 'A Corp', filedAtMs: 1,
      platform: { measureId: 'graymarket_crackdown', mode: 'table' as const, patronFactionId: 'void-corsairs' as const },
    }];
    const r = resolveChairElection(5, cands, [], getNpcBlocRoster(), 40);
    expect(r.winner).toBeNull();
    expect(r.vacancyReason).toMatch(/No vote was cast/i);
  });

  it('counts player ballot weight and NPC seats into one tally', () => {
    const cands = [
      { candidacyId: 'a', profileId: 'p1', corpName: 'A Corp', filedAtMs: 1, platform: platform(MEASURE_CATALOG[0].id) },
      { candidacyId: 'b', profileId: 'p2', corpName: 'B Corp', filedAtMs: 2, platform: platform(MEASURE_CATALOG[1].id) },
    ];
    const r = resolveChairElection(5, cands, [
      { voterProfileId: 'v1', candidacyId: 'a', weight: 9 },
      { voterProfileId: 'v2', candidacyId: 'b', weight: 4 },
    ], getNpcBlocRoster(), 40);
    const a = r.tallies.find(t => t.candidacyId === 'a')!;
    expect(a.playerVotes).toBe(9);
    expect(a.playerBallots).toBe(1);
    expect(a.totalVotes).toBe(a.playerVotes + a.npcVotes);
    expect(r.totalPlayerVotes).toBe(13);
  });

  it('breaks a tie on PLAYER votes first — the NPC bloc never decides against the chamber', () => {
    const cands = [
      { candidacyId: 'npcbacked', profileId: 'p1', corpName: 'NPC Darling', filedAtMs: 1, platform: platform(MEASURE_CATALOG[0].id) },
      { candidacyId: 'playerbacked', profileId: 'p2', corpName: 'Player Choice', filedAtMs: 2, platform: platform(MEASURE_CATALOG[1].id) },
    ];
    // Force an exact total tie by giving the bloc zero seats.
    const r = resolveChairElection(5, cands, [
      { voterProfileId: 'v1', candidacyId: 'npcbacked', weight: 5 },
      { voterProfileId: 'v2', candidacyId: 'playerbacked', weight: 5 },
    ], [], 40);
    expect(r.winner).not.toBeNull();
    // Perfect tie on both → earliest filing wins, deterministically.
    expect(r.winner!.candidacyId).toBe('npcbacked');
  });

  it('is byte-identical across repeated runs (no RNG anywhere)', () => {
    const cands = [
      { candidacyId: 'a', profileId: 'p1', corpName: 'A Corp', filedAtMs: 1, platform: platform('graymarket_crackdown') },
      { candidacyId: 'b', profileId: 'p2', corpName: 'B Corp', filedAtMs: 2, platform: platform('research_subsidy_act', 'the-syndicate') },
    ];
    const ballots = [{ voterProfileId: 'v1', candidacyId: 'b', weight: 7 }];
    const first = resolveChairElection(5, cands, ballots, getNpcBlocRoster(), 40);
    for (let i = 0; i < 5; i++) {
      expect(resolveChairElection(5, cands, ballots, getNpcBlocRoster(), 40)).toEqual(first);
    }
  });

  it('a ballot for an unknown candidacy is discarded, not silently credited elsewhere', () => {
    const cands = [{ candidacyId: 'a', profileId: 'p1', corpName: 'A Corp', filedAtMs: 1, platform: platform(MEASURE_CATALOG[0].id) }];
    const r = resolveChairElection(5, cands, [{ voterProfileId: 'v1', candidacyId: 'ghost', weight: 99 }], [], 40);
    expect(r.totalPlayerVotes).toBe(0);
    expect(r.winner).toBeNull();
  });
});

// ─── The verb: agenda writs ─────────────────────────────────────────────────

describe('accord-chair — the agenda writ is the Chair\'s verb, and it is bounded', () => {
  const QI = 300;
  const pool = shuffleMeasurePool(QI);
  const base = pickDocketMeasures(QI);

  it('a `seat` writ SUBSTITUTES — the docket length never changes', () => {
    const target = MEASURE_CATALOG.find(m => !base.includes(m.id))!.id;
    const out = applyChairWritToDocket(base, pool, [{ measureId: target, mode: 'seat' }]);
    expect(out).toHaveLength(base.length);
    expect(out).toHaveLength(DOCKET_SIZE);
    expect(out).toContain(target);
    expect(new Set(out).size).toBe(out.length);
  });

  it('a `table` writ replaces from the SAME shuffle — never invents a measure', () => {
    const out = applyChairWritToDocket(base, pool, [{ measureId: base[0], mode: 'table' }]);
    expect(out).toHaveLength(base.length);
    expect(out).not.toContain(base[0]);
    for (const id of out) expect(pool).toContain(id);
    // The replacement is the next id the un-amended shuffle would have used.
    expect(out).toContain(pool[DOCKET_SIZE]);
  });

  it('every amended docket is one the un-amended game could already produce', () => {
    // The economic-envelope argument: the writ changes WHICH of the twelve
    // authored measures are debated, never what any of them is worth.
    for (const m of MEASURE_CATALOG) {
      for (const mode of ['seat', 'table'] as const) {
        const out = applyChairWritToDocket(base, pool, [{ measureId: m.id, mode }]);
        expect(out).toHaveLength(DOCKET_SIZE);
        expect(new Set(out).size).toBe(DOCKET_SIZE);
        for (const id of out) expect(MEASURE_MAP.has(id)).toBe(true);
      }
    }
  });

  it('is a no-op for an unknown measure, an already-seated seat, or an absent table', () => {
    expect(applyChairWritToDocket(base, pool, [{ measureId: 'nope', mode: 'seat' }])).toEqual(base);
    expect(applyChairWritToDocket(base, pool, [{ measureId: base[0], mode: 'seat' }])).toEqual(base);
    const absent = MEASURE_CATALOG.find(m => !base.includes(m.id))!.id;
    expect(applyChairWritToDocket(base, pool, [{ measureId: absent, mode: 'table' }])).toEqual(base);
    expect(applyChairWritToDocket(base, pool, [])).toEqual(base);
  });

  it('the writ budget is small relative to a term — the Chair cannot reprice the world', () => {
    // ~40 accord quarters per real month at 6 real hours/game-month.
    const quartersPerTerm = (30 * 24) / (6 * 3);
    expect(CHAIR_WRITS_PER_TERM / quartersPerTerm).toBeLessThan(0.15);
  });

  it('nextAmendableQuarterIndex always lands on a future quarter boundary', () => {
    for (let m = 0; m < 40; m++) {
      const q = nextAmendableQuarterIndex(m);
      expect(q % 3).toBe(0);
      expect(q).toBeGreaterThan(m);
    }
  });
});

describe('accord-senate — the DEFAULT docket path is unchanged by E1', () => {
  // This is the guard behind the "no sim movement" claim: realignment.ts (and
  // therefore every runner that walks its posture math) calls
  // pickDocketMeasures with no writs, and must get the pre-E1 answer.
  it('pickDocketMeasures without writs equals the bare shuffle slice', () => {
    for (const q of [0, 3, 42, 300, 1203]) {
      expect(pickDocketMeasures(q)).toEqual(shuffleMeasurePool(q).slice(0, DOCKET_SIZE));
      expect(pickDocketMeasures(q, DOCKET_SIZE, [])).toEqual(pickDocketMeasures(q));
      expect(pickDocketMeasures(q, DOCKET_SIZE, undefined)).toEqual(pickDocketMeasures(q));
    }
  });

  it('the shuffle itself is stable for a given quarter', () => {
    expect(shuffleMeasurePool(777)).toEqual(shuffleMeasurePool(777));
    expect(shuffleMeasurePool(777)).not.toEqual(shuffleMeasurePool(778));
  });
});

// ─── Fracture ───────────────────────────────────────────────────────────────

describe('accord-chair — Fracture (LORE.md, the Treaty Fracture of 2143)', () => {
  it('shifts standing AGAINST the signatories and TOWARD those who already left', () => {
    expect(FRACTURE_REP_SHIFTS['the-dominion']).toBeLessThan(0);
    expect(FRACTURE_REP_SHIFTS['echo-remnants']).toBeLessThan(0);
    expect(FRACTURE_REP_SHIFTS['nebula-reavers']).toBeLessThan(0);
    expect(FRACTURE_REP_SHIFTS['the-syndicate']).toBeGreaterThan(0);
    expect(FRACTURE_REP_SHIFTS['void-corsairs']).toBeGreaterThan(0);
    expect(FRACTURE_REP_SHIFTS['hive-collective']).toBeGreaterThan(0);
    // Every signatory is penalised; every non-signatory is rewarded.
    for (const f of ACCORD_SIGNATORY_FACTIONS) expect(FRACTURE_REP_SHIFTS[f]).toBeLessThan(0);
  });

  it('the modifier is DERIVED, clamped, and reverses exactly on re-accession', () => {
    expect(applyFractureRepModifier(30, 'the-dominion', false)).toBe(30);
    expect(applyFractureRepModifier(30, 'the-dominion', true)).toBe(-10);
    // Clamps at both ends rather than escaping the -100..100 band.
    expect(applyFractureRepModifier(-95, 'the-dominion', true)).toBe(-100);
    expect(applyFractureRepModifier(95, 'the-syndicate', true)).toBe(100);
  });

  it('getFactionRep returns EFFECTIVE standing while fractured; the raw value is untouched', () => {
    const fractured = baseState({
      factionReputation: { 'the-dominion': 30, 'the-syndicate': 0 },
      accordChair: { fractured: true } as unknown as ChairSnapshot,
    });
    expect(getRawFactionRep(fractured, 'the-dominion')).toBe(30);
    expect(getFactionRep(fractured, 'the-dominion')).toBe(-10);
    expect(getFactionRep(fractured, 'the-syndicate')).toBe(25);

    const intact = baseState({ factionReputation: { 'the-dominion': 30 } });
    expect(getFactionRep(intact, 'the-dominion')).toBe(30);
  });

  it('flows through the EXISTING standing systems rather than a new channel', () => {
    // Dominion standing collapses a full two tiers — via getStanding, which
    // this wave did not touch. Neutral becomes Unfriendly; a corporation
    // already cool with the enforcer becomes Hostile, and is embargoed out of
    // Dominion licences entirely (factions.ts::isEmbargoed).
    expect(getStanding(applyFractureRepModifier(0, 'the-dominion', true))).toBe('unfriendly');
    expect(getStanding(applyFractureRepModifier(-15, 'the-dominion', true))).toBe('hostile');
    expect(getStanding(applyFractureRepModifier(60, 'the-dominion', true))).toBe('friendly');
    expect(getStanding(applyFractureRepModifier(30, 'the-syndicate', true))).toBe('allied');
  });

  it('a fractured corporation cannot lobby the Council', () => {
    const docket = { quarterIndex: 300, measureIds: pickDocketMeasures(300), resolved: false };
    const intact = baseState({ accordDocket: docket, accordLobbying: [] });
    const lobbied = commitLobbying(intact, docket.measureIds[0], 'support', 100_000_000);
    expect(lobbied.accordLobbying).toHaveLength(1);

    const fractured = baseState({
      accordDocket: docket,
      accordLobbying: [],
      accordChair: { fractured: true } as unknown as ChairSnapshot,
    });
    const refused = commitLobbying(fractured, docket.measureIds[0], 'support', 100_000_000);
    expect(refused).toBe(fractured); // same reference — a true no-op
    expect(refused.money).toBe(fractured.money);
  });

  it('is EXEMPT from measure effects — the subsidies as well as the tariffs', () => {
    // Q300 docket resolves at month 303. Build a state sitting on it.
    const docket = { quarterIndex: 300, measureIds: pickDocketMeasures(300), resolved: false };
    const money = 5_000_000_000;
    const intact = advanceAccordSenate(
      baseState({ accordDocket: { ...docket }, accordLobbying: [], money }), 303,
    );
    const fractured = advanceAccordSenate(
      baseState({
        accordDocket: { ...docket },
        accordLobbying: [],
        money,
        accordChair: { fractured: true } as unknown as ChairSnapshot,
      }),
      303,
    );

    // Both see the identical PUBLIC record — the vote happened either way.
    expect(fractured.state.accordVoteHistory?.map(h => h.passed))
      .toEqual(intact.state.accordVoteHistory?.map(h => h.passed));
    // But nothing applied: no activeEffects, no faction-rep movement, no money.
    expect(fractured.state.money).toBe(money);
    expect(fractured.state.activeEffects ?? []).toEqual([]);
    expect(fractured.state.factionReputation ?? {}).toEqual({});
    // ...and the record says so, honestly.
    for (const h of fractured.state.accordVoteHistory ?? []) {
      expect(h.effectLabel).toMatch(/not applicable outside Accord jurisdiction/i);
    }
  });

  it('the re-accession bond scales with published book value and is banded + burned', () => {
    expect(fractureReaccessionBond(0)).toBe(100_000_000);
    expect(fractureReaccessionBond(1e15)).toBe(5_000_000_000);
    expect(fractureReaccessionBond(50_000_000_000)).toBe(500_000_000);
  });

  it('re-accession is barred until the minimum term has elapsed, and needs the bond', () => {
    const base = { fractured: true, declaredTermIndex: 10, currentTermIndex: 10, money: 1e12, publishedNetWorth: 1e10 };
    expect(checkReaccession(base).ok).toBe(false);
    expect(checkReaccession({ ...base, currentTermIndex: 10 + FRACTURE_MIN_TERMS }).ok).toBe(true);
    expect(checkReaccession({ ...base, currentTermIndex: 11, money: 0 }).ok).toBe(false);
    expect(checkReaccession({ ...base, fractured: false }).ok).toBe(false);
  });
});

// ─── Snapshot hygiene ───────────────────────────────────────────────────────

describe('accord-chair — snapshot clamping (defence in depth)', () => {
  function snapshot(overrides: Partial<ChairSnapshot> = {}): ChairSnapshot {
    return {
      enabled: true, reason: 'ok', electorate: 20, requiredElectorate: CHAIR_MIN_ELECTORATE,
      phase: 'nominations', seatedTermIndex: 8, contestedTermIndex: 9, phaseEndsMs: NOW,
      seat: null, vacancyReason: null,
      myWeight: computeChairVoteWeight(record(), NOW), myEffectiveVotes: 3,
      myCandidacyId: null, myBallotCandidacyId: null, myFilingFee: 50_000_000,
      candidates: [], npcBloc: [], totalPlayerVotes: 0, totalNpcVotes: 0,
      activeWrits: [], fractured: false, fracturedSinceTermIndex: null,
      reaccessionBond: 100_000_000, fractureRoster: [], roll: [], asOf: NOW,
      ...overrides,
    };
  }

  it('clamps absurd vote figures rather than rendering them', () => {
    const out = clampChairSnapshot(snapshot({
      totalPlayerVotes: Number.POSITIVE_INFINITY as unknown as number,
      myEffectiveVotes: -50,
      candidates: [{
        candidacyId: 'a', corpName: 'A', isMe: false,
        platform: { measureId: MEASURE_CATALOG[0].id, mode: 'seat', patronFactionId: 'the-dominion' },
        filedAtMs: 0, playerVotes: -9, npcVotes: 1e15, totalVotes: NaN,
      }],
    }));
    expect(Number.isFinite(out.totalPlayerVotes)).toBe(true);
    expect(out.myEffectiveVotes).toBe(0);
    expect(out.candidates[0].playerVotes).toBe(0);
    expect(out.candidates[0].npcVotes).toBeLessThanOrEqual(100_000_000);
    expect(out.candidates[0].totalVotes).toBe(0);
  });

  it('bounds every list so a malformed payload cannot blow up the panel', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ corpName: `C${i}`, sinceTermIndex: 0 }));
    const out = clampChairSnapshot(snapshot({ fractureRoster: many }));
    expect(out.fractureRoster.length).toBeLessThanOrEqual(100);
  });
});
