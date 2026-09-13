/**
 * @jest-environment node
 */
// ─── CC-3: the outer headquarters rungs ─────────────────────────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2-3 / docs/BALANCE.md Pass 13.
// Covers the six things CC-3 added and the one invariant it must not break:
//   1. the ladder's requirements and costs, Mars through interstellar;
//   2. sealed-bid seat auctions — minimum bid, soft close, resolution and
//      refunds;
//   3. server-side seat upkeep — the monthly charge, the grace period, the
//      lapse that sends the headquarters home;
//   4. the one-seat invariant (a corporation never holds two);
//   5. the manifest fallback rule (bundled → runtime → labelled Earth plate);
//   6. BONUS PARITY: for every new stage the client tick's service revenue
//      and the SERVER's monthly-gross ceiling apply the identical HQ term.
//      This is the one that cost the founder real money twice — a ceiling
//      below the tick rejects income the player legitimately earned.

import {
  HQ_AUCTION_STAGES, HQ_RELOCATION, HQ_SEAT_BASE_PRICE, HQ_SEAT_COUNTS, HQ_SEAT_UPKEEP_GRACE_MONTHS,
  HQ_STAGES, HQ_UPKEEP_MONTHLY, NEUTRAL_HQ_BONUSES, getHqBonuses, hqSeatIsAuctioned,
  hqServiceCostMult, hqServiceRevenueMult, isHqColonyLocation, isHqOuterLocation,
  maxHqBonusesForCeiling, type HqBonuses, type HqStageId,
} from '../headquarters';
import {
  HQ_STAGE_REQUIREMENTS, checkHqRelocationRequest, evaluateHqRequirementsFrom, hqRequirementLines,
  hqUpkeepAfterMissedMonth, hqUpkeepStatus, quoteHqRelocation, type HqRequirementView,
} from '../hq-relocation';
import {
  HQ_SEAT_AUCTION_WINDOW_MS, HQ_SEAT_BID_INCREMENT, hqAuctionReserve, hqAuctionSoftClose,
  hqMinimumBid, hqSeatConflict, isAdmissibleHqBid, resolveHqSeatAuction,
} from '../hq-seat-auctions';
import { REAL_MS_PER_GAME_MONTH } from '../server-time';
import { parseHqManifest, resolveHqManifest, hqPlateBaseUrl, setRuntimeHqManifest } from '../hq-manifest';
import { SERVICE_MAP } from '../services';
import type { GameState } from '../types';
import { getNewGameState } from '../save-load';
import { getGlobalGameDate } from '../server-time';
import { processTick } from '../game-engine';
import { computeEconomyReport } from '../economy-report';
import { buildServerFlowState, computeServerMonthlyGrossDetailed } from '../resource-plausibility';
import { getHqStage } from '../headquarters';

const OUTER: HqStageId[] = ['mars_hq', 'jovian_hq', 'saturnian_hq', 'deep_space_hq', 'interstellar_hq'];

// ─── 1. Ladder: requirements and costs ──────────────────────────────────────

describe('CC-3 ladder — requirements', () => {
  it('every outer rung is reachable and carries its tier from the design table', () => {
    const tiers: Record<HqStageId, number> = {
      earth_ops: 1, orbital_deck: 2, lunar_hq: 3, mars_hq: 4,
      jovian_hq: 5, saturnian_hq: 5, deep_space_hq: 6, interstellar_hq: 7,
    };
    for (const s of HQ_STAGES) {
      expect(s.comingSoon).toBeFalsy();
      expect(s.tier).toBe(tiers[s.id]);
    }
  });

  it('Mars needs a Mars station; the outer rungs need their own; deep space and interstellar add hull and research gates', () => {
    expect(HQ_STAGE_REQUIREMENTS.mars_hq.building?.locations).toEqual(['mars_orbit', 'mars_surface']);
    expect(HQ_STAGE_REQUIREMENTS.jovian_hq.building?.locations).toEqual(['jupiter_system']);
    expect(HQ_STAGE_REQUIREMENTS.saturnian_hq.building?.locations).toEqual(['saturn_system']);
    // Deep space: the nearest REAL signal for "mothership-class flagship
    // docked" is an interstellar-capable hull.
    expect(HQ_STAGE_REQUIREMENTS.deep_space_hq.ship?.definitionIds).toEqual(['starfarer_explorer', 'colony_ark']);
    expect(HQ_STAGE_REQUIREMENTS.deep_space_hq.research).toBeUndefined();
    // Interstellar: the colony CHARTER half of the design sentence, which is
    // server-verifiable, standing in for the expedition half, which is not.
    expect(HQ_STAGE_REQUIREMENTS.interstellar_hq.research?.researchIds).toEqual(['interstellar_colonization']);
    expect(HQ_STAGE_REQUIREMENTS.interstellar_hq.ship?.definitionIds).toEqual(['colony_ark']);
  });

  it('the deep-space gate refuses a corporation with the station but no hull, and passes with one', () => {
    const base: HqRequirementView = {
      tier: 7,
      buildings: [{ definitionId: 'deep_space_station', locationId: 'outer_system', isComplete: true }],
      research: ['interstellar_colonization'],
      ships: [],
    };
    // A real outer_system space_station from buildings.ts.
    const station = { definitionId: 'outpost_kuiper', locationId: 'outer_system', isComplete: true };
    const withStation: HqRequirementView = { ...base, buildings: [station] };
    const noHull = evaluateHqRequirementsFrom(withStation, 'deep_space_hq');
    expect(noHull.ship?.met).toBe(false);
    expect(noHull.met).toBe(false);
    const withHull = evaluateHqRequirementsFrom({ ...withStation, ships: ['starfarer_explorer'] }, 'deep_space_hq');
    expect(withHull.ship?.met).toBe(true);
    // An explorer is NOT a colony charter — the interstellar rung still refuses.
    expect(evaluateHqRequirementsFrom({ ...withStation, ships: ['starfarer_explorer'] }, 'interstellar_hq').ship?.met).toBe(false);
    expect(evaluateHqRequirementsFrom({ ...withStation, ships: ['colony_ark'] }, 'interstellar_hq').ship?.met).toBe(true);
    // …and without the research either.
    expect(evaluateHqRequirementsFrom({ ...withStation, ships: ['colony_ark'], research: [] }, 'interstellar_hq').research?.met).toBe(false);
  });

  it('hqRequirementLines lists the tier gate first and then every named gate', () => {
    const check = evaluateHqRequirementsFrom({ tier: 1, buildings: [], research: [], ships: [] }, 'interstellar_hq');
    const labels = hqRequirementLines(check).map(l => l.label);
    expect(labels[0]).toBe('tier 7');
    expect(labels.length).toBe(4); // tier + station + research + hull
    expect(hqRequirementLines(check).every(l => !l.met)).toBe(true);
  });
});

describe('CC-3 ladder — costs, seats and durations', () => {
  it('seat pools shrink with distance and every outer rung has one', () => {
    expect(HQ_SEAT_COUNTS.mars_hq).toBe(8);
    expect(HQ_SEAT_COUNTS.jovian_hq).toBe(4);
    expect(HQ_SEAT_COUNTS.saturnian_hq).toBe(4);
    expect(HQ_SEAT_COUNTS.deep_space_hq).toBe(2);
    expect(HQ_SEAT_COUNTS.interstellar_hq).toBe(2);
    for (const stage of OUTER) expect(HQ_SEAT_BASE_PRICE[stage]).toBeGreaterThan(0);
  });

  it('relocation projects lengthen monotonically with distance and quote their durations', () => {
    const months = HQ_STAGES.filter(s => s.id !== 'earth_ops').map(s => HQ_RELOCATION[s.id].months);
    for (let i = 1; i < months.length; i++) expect(months[i]).toBeGreaterThanOrEqual(months[i - 1]);
    expect(HQ_RELOCATION.mars_hq.months).toBe(6);
    expect(HQ_RELOCATION.jovian_hq.months).toBe(8);
    expect(HQ_RELOCATION.saturnian_hq.months).toBe(8);
    expect(HQ_RELOCATION.deep_space_hq.months).toBe(12);
    expect(HQ_RELOCATION.interstellar_hq.months).toBe(18);
    const q = quoteHqRelocation('earth_ops', 'deep_space_hq');
    expect(q.durationMs).toBe(12 * REAL_MS_PER_GAME_MONTH);
    expect(q.cost).toBe(HQ_RELOCATION.deep_space_hq.cost);
    expect(q.seatNeeded).toBe(true);
  });

  it('every seat with rent has a pool to carry the cursor, and Earth is free', () => {
    expect(HQ_UPKEEP_MONTHLY.earth_ops).toBe(0);
    for (const s of HQ_STAGES) {
      if (HQ_UPKEEP_MONTHLY[s.id] > 0) expect(HQ_SEAT_COUNTS[s.id]).toBeGreaterThan(0);
    }
  });
});

// ─── 2. Auctions ────────────────────────────────────────────────────────────

describe('CC-3 seat auctions', () => {
  it('Mars and outward are auctioned; LEO and Luna keep the first-come lease', () => {
    expect(hqSeatIsAuctioned('orbital_deck')).toBe(false);
    expect(hqSeatIsAuctioned('lunar_hq')).toBe(false);
    expect(hqSeatIsAuctioned('earth_ops')).toBe(false);
    for (const stage of OUTER) expect(hqSeatIsAuctioned(stage)).toBe(true);
    expect([...HQ_AUCTION_STAGES].sort()).toEqual([...OUTER].sort());
  });

  it('the reserve is the pool posted price at the current occupancy', () => {
    expect(hqAuctionReserve('mars_hq', 0)).toBe(HQ_SEAT_BASE_PRICE.mars_hq);
    expect(hqAuctionReserve('mars_hq', 8)).toBe(HQ_SEAT_BASE_PRICE.mars_hq * 3);
    expect(hqAuctionReserve('mars_hq', 4)).toBeGreaterThan(hqAuctionReserve('mars_hq', 0));
  });

  it('the minimum bid is the reserve, then the standing high plus the increment, rounded up to $0.1M', () => {
    const reserve = hqAuctionReserve('jovian_hq', 0);
    expect(hqMinimumBid(reserve, 0)).toBe(reserve);
    const raised = hqMinimumBid(reserve, reserve);
    expect(raised).toBeGreaterThanOrEqual(reserve * (1 + HQ_SEAT_BID_INCREMENT));
    expect(raised % 100_000).toBe(0);
    expect(isAdmissibleHqBid(reserve - 1, reserve, 0)).toBe(false);
    expect(isAdmissibleHqBid(reserve, reserve, 0)).toBe(true);
    expect(isAdmissibleHqBid(reserve, reserve, reserve)).toBe(false); // must out-bid, not match
  });

  it('a bid inside the last ten minutes extends the close; an earlier one does not; the extension is capped', () => {
    const opened = 1_800_000_000_000;
    const closes = opened + HQ_SEAT_AUCTION_WINDOW_MS;
    expect(hqAuctionSoftClose(closes, opened, closes - 60 * 60_000)).toBe(closes); // an hour out: unchanged
    const bumped = hqAuctionSoftClose(closes, opened, closes - 60_000); // one minute out
    expect(bumped).toBeGreaterThan(closes);
    // Repeated last-second bids cannot push it past the documented cap.
    let c = closes;
    for (let i = 0; i < 50; i++) c = hqAuctionSoftClose(c, opened, c - 1_000);
    expect(c).toBeLessThanOrEqual(opened + HQ_SEAT_AUCTION_WINDOW_MS + 60 * 60_000);
    // A bid after the close never moves it (the resolver owns that instant).
    expect(hqAuctionSoftClose(closes, opened, closes + 1)).toBe(closes);
  });

  it('resolution: the highest qualifying bid wins, ties go to the earliest, everyone else is refunded', () => {
    const reserve = 1_000_000_000;
    const bids = [
      { bidId: 'a', profileId: 'p1', amount: 1_200_000_000, createdAt: 10 },
      { bidId: 'b', profileId: 'p2', amount: 1_500_000_000, createdAt: 20 },
      { bidId: 'c', profileId: 'p3', amount: 900_000_000, createdAt: 5 },
    ];
    const out = resolveHqSeatAuction(bids, reserve);
    expect(out.winnerBidId).toBe('b');
    expect(out.winnerProfileId).toBe('p2');
    expect(out.winningAmount).toBe(1_500_000_000);
    expect(out.losingBidIds.sort()).toEqual(['a', 'c']);
  });

  it('a tie is broken by the earlier bid, and nothing at the reserve means no winner and a full refund', () => {
    const tied = resolveHqSeatAuction([
      { bidId: 'late', profileId: 'p2', amount: 500, createdAt: 99 },
      { bidId: 'early', profileId: 'p1', amount: 500, createdAt: 1 },
    ], 100);
    expect(tied.winnerBidId).toBe('early');
    expect(tied.losingBidIds).toEqual(['late']);

    const none = resolveHqSeatAuction([{ bidId: 'x', profileId: 'p', amount: 10, createdAt: 1 }], 100);
    expect(none.winnerBidId).toBeNull();
    expect(none.winnerProfileId).toBeNull();
    expect(none.losingBidIds).toEqual(['x']); // refunded in full
    expect(resolveHqSeatAuction([], 100).losingBidIds).toEqual([]);
  });
});

// ─── 3 + 4. Upkeep, grace, lapse and the one-seat invariant ─────────────────

describe('CC-3 seat upkeep', () => {
  const T0 = 1_800_000_000_000;

  it('nothing is due before the cursor; one month is due a month later', () => {
    const fresh = hqUpkeepStatus({ stage: 'mars_hq', upkeepPaidThroughMs: T0, missedMonths: 0, seatSinceMs: T0 }, T0);
    expect(fresh.monthsDue).toBe(0);
    expect(fresh.amountDue).toBe(0);
    expect(fresh.monthly).toBe(HQ_UPKEEP_MONTHLY.mars_hq);
    const due = hqUpkeepStatus({ stage: 'mars_hq', upkeepPaidThroughMs: T0, missedMonths: 0, seatSinceMs: T0 }, T0 + 2 * REAL_MS_PER_GAME_MONTH);
    expect(due.monthsDue).toBe(2);
    expect(due.amountDue).toBe(2 * HQ_UPKEEP_MONTHLY.mars_hq);
  });

  it('an absent cursor falls back to the lease start rather than billing from the epoch', () => {
    const s = hqUpkeepStatus({ stage: 'jovian_hq', upkeepPaidThroughMs: null, missedMonths: 0, seatSinceMs: T0 }, T0 + REAL_MS_PER_GAME_MONTH);
    expect(s.paidThroughMs).toBe(T0);
    expect(s.monthsDue).toBe(1);
  });

  it('the grace period is two documented months and the seat lapses on the second miss', () => {
    expect(HQ_SEAT_UPKEEP_GRACE_MONTHS).toBe(2);
    const first = hqUpkeepAfterMissedMonth(0);
    expect(first).toEqual({ missedMonths: 1, lapsed: false });
    const second = hqUpkeepAfterMissedMonth(first.missedMonths);
    expect(second).toEqual({ missedMonths: 2, lapsed: true });
    const view = hqUpkeepStatus({ stage: 'mars_hq', upkeepPaidThroughMs: T0, missedMonths: 1, seatSinceMs: T0 }, T0);
    expect(view.graceRemaining).toBe(1);
    expect(view.lapsed).toBe(false);
    expect(hqUpkeepStatus({ stage: 'mars_hq', upkeepPaidThroughMs: T0, missedMonths: 2, seatSinceMs: T0 }, T0).lapsed).toBe(true);
  });

  it('Earth pays nothing, so an Earth-seated corporation can never lapse', () => {
    const s = hqUpkeepStatus({ stage: 'earth_ops', upkeepPaidThroughMs: T0, missedMonths: 0, seatSinceMs: T0 }, T0 + 99 * REAL_MS_PER_GAME_MONTH);
    expect(s.monthly).toBe(0);
    expect(s.amountDue).toBe(0);
  });
});

describe('CC-3 one-seat invariant', () => {
  it('holding a seat anywhere but the target is a conflict the award path must clear', () => {
    expect(hqSeatConflict([], 'mars_hq')).toEqual({ conflict: false, heldAt: null });
    expect(hqSeatConflict(['mars_hq'], 'mars_hq')).toEqual({ conflict: false, heldAt: null });
    expect(hqSeatConflict(['jovian_hq'], 'mars_hq')).toEqual({ conflict: true, heldAt: 'jovian_hq' });
  });

  it('an auction stage refuses the relocation charter until the seat is actually held', () => {
    const view: HqRequirementView = {
      tier: 7,
      buildings: [{ definitionId: 'habitat_mars', locationId: 'mars_surface', isComplete: true }],
      research: [], ships: [],
    };
    const earth = { stage: 'earth_ops' as const, locationId: 'earth_surface', movedAtMs: 0 };
    expect(checkHqRelocationRequest(earth, view, 'mars_hq')).toMatchObject({ ok: false, error: 'seat_auction' });
    const won = checkHqRelocationRequest(earth, view, 'mars_hq', { heldSeatAtTarget: true });
    expect(won.ok).toBe(true);
    // A first-come stage is unaffected by the flag.
    const leoView: HqRequirementView = { tier: 2, buildings: [{ definitionId: 'space_station_small', locationId: 'leo', isComplete: true }] };
    expect(checkHqRelocationRequest(earth, leoView, 'orbital_deck').ok).toBe(true);
  });
});

// ─── 5. Manifest fallback selection ─────────────────────────────────────────

describe('CC-3 window plates — manifest selection', () => {
  const minimalManifest = (stage: string) => parseHqManifest({
    stage,
    aspect: [21, 9],
    widths: [640],
    layers: [{ name: 'far', order: 0, parallax: 0, alpha: false }],
    variants: { day: { lights: 0, layers: { far: { files: { 640: { file: 'day-far-640.webp' } } } } } },
    actors: {},
  }, `/game/hq/${stage}/`);

  afterEach(() => {
    for (const s of HQ_STAGES) setRuntimeHqManifest(s.id, null);
  });

  it('a stage whose plates shipped with the build draws its OWN manifest, never the fallback', () => {
    for (const stage of ['earth_ops', 'orbital_deck', 'lunar_hq'] as HqStageId[]) {
      const r = resolveHqManifest(stage);
      expect(r).not.toBeNull();
      expect(r!.fallback).toBe(false);
    }
  });

  it('a stage with no plates falls back to the Earth plate and is FLAGGED so the label shows', () => {
    for (const stage of OUTER) {
      const r = resolveHqManifest(stage, null);
      expect(r).not.toBeNull();
      expect(r!.fallback).toBe(true);
      expect(r!.manifest.baseUrl).toBe('/game/hq/earth/');
    }
  });

  it('plates published after the build are used the moment the runtime manifest arrives', () => {
    const mars = minimalManifest('mars_hq');
    expect(mars).not.toBeNull();
    const r = resolveHqManifest('mars_hq', mars);
    expect(r!.fallback).toBe(false);
    expect(r!.manifest.baseUrl).toBe('/game/hq/mars_hq/');
  });

  it('the plate directory is the stage id, with Earth keeping its historical folder', () => {
    expect(hqPlateBaseUrl('earth_ops')).toBe('/game/hq/earth/');
    expect(hqPlateBaseUrl('mars_hq')).toBe('/game/hq/mars_hq/');
    expect(hqPlateBaseUrl('orbital_deck')).toBe('/game/hq/orbital_deck/');
  });
});

// ─── 6. Bonus band + client/server parity ───────────────────────────────────

describe('CC-3 bonus profiles', () => {
  it('every term on every stage stays inside the founder-approved ±10-15% band', () => {
    for (const s of HQ_STAGES) {
      const b = getHqBonuses(s.id);
      for (const [field, value] of Object.entries(b) as Array<[keyof HqBonuses, number]>) {
        if (value === 1) continue;
        const swing = Math.abs(value - 1);
        expect(swing).toBeGreaterThanOrEqual(0.10 - 1e-9);
        expect(swing).toBeLessThanOrEqual(0.15 + 1e-9);
        expect(NEUTRAL_HQ_BONUSES[field]).toBe(1);
      }
    }
  });

  it('no stage can ever multiply two revenue terms on the SAME service (the band would break)', () => {
    // Exercise every (service type, location) pair the game can produce.
    const locations = new Set<string>(['earth_surface', 'leo', 'geo', 'lunar_orbit', 'lunar_surface',
      'mars_orbit', 'mars_surface', 'asteroid_belt', 'jupiter_system', 'saturn_system', 'outer_system',
      'ceres_surface', 'europa_surface', 'titan_surface', 'pluto_surface', 'triton_surface', 'venus_orbit']);
    for (const s of HQ_STAGES) {
      const b = getHqBonuses(s.id);
      for (const def of SERVICE_MAP.values()) {
        for (const loc of locations) {
          const m = hqServiceRevenueMult(b, { definitionId: def.id, locationId: loc, type: def.type });
          expect(m).toBeLessThanOrEqual(1.15 + 1e-9);
          expect(m).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('the two tier-5 seats are a real choice: Jupiter leans extraction, Saturn leans science', () => {
    const j = getHqBonuses('jovian_hq');
    const s = getHqBonuses('saturnian_hq');
    expect(j.outerExtractionMult).toBeGreaterThan(s.outerExtractionMult);
    expect(s.scienceMult).toBeGreaterThan(j.scienceMult);
  });

  it('the region sets are disjoint where they must be, and derived from the location data', () => {
    expect(isHqColonyLocation('mars_surface')).toBe(true);
    expect(isHqColonyLocation('mars_orbit')).toBe(false); // the Mars seat's two terms never stack
    expect(isHqColonyLocation('europa_surface')).toBe(true);
    expect(isHqOuterLocation('jupiter_system')).toBe(true);
    expect(isHqOuterLocation('saturn_system')).toBe(true);
    expect(isHqOuterLocation('outer_system')).toBe(true);
    expect(isHqOuterLocation('leo')).toBe(false);
  });

  it('the cost term only ever touches satellite ops, and only from the LEO deck', () => {
    const leo = getHqBonuses('orbital_deck');
    const sat = [...SERVICE_MAP.values()].find(d => hqServiceCostMult(leo, d.id) !== 1);
    expect(sat).toBeTruthy();
    for (const stage of OUTER) {
      const b = getHqBonuses(stage);
      for (const def of SERVICE_MAP.values()) expect(hqServiceCostMult(b, def.id)).toBe(1);
    }
  });
});

// One building + its service per stage, chosen so the stage's own revenue
// term actually fires: the pair below is the smallest corporation for which
// the seat is worth anything at all.
// `power` is the location's generator: an unpowered location runs its
// services at zero in the engine, which would make the comparison vacuous.
const PARITY_FIXTURES: Array<{ stage: HqStageId; building: string; service: string; location: string; power?: string; expect: number }> = [
  { stage: 'mars_hq', building: 'habitat_mars', service: 'svc_tourism_mars', location: 'mars_surface', power: 'nuclear_reactor_mars_surface', expect: 1.12 },
  { stage: 'mars_hq', building: 'space_station_mars', service: 'svc_mars_station_ops', location: 'mars_orbit', power: 'nuclear_reactor_mars_orbit', expect: 1.10 },
  { stage: 'jovian_hq', building: 'mining_europa', service: 'svc_mining_europa', location: 'jupiter_system', power: 'nuclear_reactor_jupiter', expect: 1.12 },
  { stage: 'jovian_hq', building: 'ocean_lab', service: 'svc_europa_biolab', location: 'europa_surface', expect: 1.10 },
  { stage: 'saturnian_hq', building: 'bio_lab_enceladus', service: 'svc_enceladus_biolab', location: 'enceladus_surface', expect: 1.12 },
  { stage: 'saturnian_hq', building: 'mining_titan', service: 'svc_mining_titan', location: 'saturn_system', power: 'nuclear_reactor_saturn', expect: 1.10 },
  { stage: 'deep_space_hq', building: 'mining_kuiper', service: 'svc_mining_kuiper', location: 'outer_system', expect: 1.15 },
  { stage: 'interstellar_hq', building: 'colony_pluto', service: 'svc_pluto_habitation', location: 'pluto_surface', expect: 1.15 },
];

const DAY = 24 * 60 * 60 * 1000;

/** A veteran corporation (Frontier off) with exactly one building + service,
 *  seated at `stage`. */
function stateAt(stage: HqStageId, building: string, service: string, location: string, power?: string): GameState {
  const g = getGlobalGameDate();
  const now = Date.now();
  const def = getHqStage(stage);
  const base = getNewGameState();
  return {
    ...base,
    money: 100_000_000_000,
    resources: {},
    gameDate: { year: g.year, month: g.month },
    lastTickAt: now,
    workforce: { engineers: 1, scientists: 0, miners: 0, operators: 1 },
    activeServices: [
      { definitionId: service, locationId: location, linkedBuildingIds: ['b1'], startDate: { year: g.year, month: g.month }, revenueMultiplier: 1 },
    ],
    buildings: [
      { instanceId: 'b1', definitionId: building, locationId: location, buildStartDate: { year: g.year, month: g.month }, completionDate: { year: g.year, month: g.month }, isComplete: true, startedAtMs: now - 10_000_000, realDurationSeconds: 1 },
      ...(power ? [{ instanceId: 'p1', definitionId: power, locationId: location, buildStartDate: { year: g.year, month: g.month }, completionDate: { year: g.year, month: g.month }, isComplete: true, startedAtMs: now - 10_000_000, realDurationSeconds: 1 }] : []),
    ],
    createdAt: now - 400 * DAY,
    frontierStatus: 'none',
    headquarters: { stage: def.id, locationId: def.locationId, movedAtMs: now - DAY },
  } as GameState;
}

describe('CC-3 client / server parity on the monthly-gross ceiling', () => {
  // The failure this guards against is the one that cost the founder real
  // money twice in CC-2's week: a server ceiling computed with a SMALLER HQ
  // term than the client tick paid rejects income the player legitimately
  // earned. Every case below runs the REAL tick, the REAL P&L and the REAL
  // ceiling for one seat and asserts they carry the same multiplier.
  it.each(PARITY_FIXTURES)('$stage · $service: tick, P&L and server ceiling agree', ({ stage, building, service, location, power, expect: mult }) => {
    const earthState = stateAt('earth_ops', building, service, location, power);
    const seatedState = stateAt(stage, building, service, location, power);

    // 1. The live tick.
    const earthEarned = processTick(earthState).totalEarned - earthState.totalEarned;
    const seatedEarned = processTick(seatedState).totalEarned - seatedState.totalEarned;
    expect(earthEarned).toBeGreaterThan(0);
    expect(seatedEarned / earthEarned).toBeCloseTo(mult, 2);

    // 2. The P&L.
    const earthLine = computeEconomyReport(earthState, Date.now()).revenueLines.find(l => l.serviceId === service)!;
    const seatedLine = computeEconomyReport(seatedState, Date.now()).revenueLines.find(l => l.serviceId === service)!;
    expect(seatedLine.baseRevenuePerMonth / earthLine.baseRevenuePerMonth).toBeCloseTo(mult, 2);

    // 3. The server's monthly-gross ceiling, from the persisted row.
    const row = buildServerFlowState({
      prevResources: {},
      prevBuildingsData: [
        { instanceId: 'b1', definitionId: building, locationId: location, isComplete: true },
        ...(power ? [{ instanceId: 'p1', definitionId: power, locationId: location, isComplete: true }] : []),
      ],
      prevShipsData: [],
      prevActiveServices: [{ definitionId: service, locationId: location, linkedBuildingIds: ['b1'], revenueMultiplier: 1 }],
      prevResearch: [],
    });
    const wf = { engineers: 1, scientists: 0, miners: 0, operators: 1 };
    const opts = { totalEarned: 0, workforceData: wf, createdAtMs: Date.now() - 400 * DAY };
    const earthCeil = computeServerMonthlyGrossDetailed(row, { ...opts, hqStage: 'earth_ops' });
    const seatedCeil = computeServerMonthlyGrossDetailed(row, { ...opts, hqStage: stage });
    expect(earthCeil.services).toBeGreaterThan(0);
    expect(seatedCeil.services / earthCeil.services).toBeCloseTo(mult, 2);
    // The ceiling must never be BELOW what the tick paid.
    expect(seatedCeil.services / earthCeil.services).toBeGreaterThanOrEqual(seatedEarned / earthEarned - 1e-3);
  });

  it("an UNKNOWN seat widens the ceiling to the ladder's best value per term, never narrows it", () => {
    const max = maxHqBonusesForCeiling();
    const sample = [...SERVICE_MAP.values()];
    const locations = ['earth_surface', 'leo', 'mars_orbit', 'mars_surface', 'jupiter_system', 'saturn_system', 'outer_system', 'europa_surface', 'pluto_surface'];
    for (const stage of HQ_STAGES) {
      const b = getHqBonuses(stage.id);
      for (const def of sample) {
        for (const loc of locations) {
          const svc = { definitionId: def.id, locationId: loc, type: def.type };
          expect(hqServiceRevenueMult(max, svc, 1)).toBeGreaterThanOrEqual(hqServiceRevenueMult(b, svc, 1) - 1e-9);
        }
      }
    }
  });

  it('the upkeep line is flat on the P&L overhead for every rung (rent is rent — no maintenance stack)', () => {
    for (const stage of OUTER) {
      const f = PARITY_FIXTURES.find(x => x.stage === stage)!;
      const earthRep = computeEconomyReport(stateAt('earth_ops', f.building, f.service, f.location, f.power), Date.now());
      const seatedRep = computeEconomyReport(stateAt(stage, f.building, f.service, f.location, f.power), Date.now());
      expect(seatedRep.costs.corporateOverhead - earthRep.costs.corporateOverhead).toBe(HQ_UPKEEP_MONTHLY[stage]);
    }
  });

  it('the Frontier stacking cap is applied by the helper itself, so every caller inherits it', () => {
    const best = maxHqBonusesForCeiling();
    const svc = { definitionId: 'x', locationId: 'pluto_surface', type: 'tourism' };
    expect(hqServiceRevenueMult(best, svc, 1)).toBeCloseTo(1.15, 6);
    expect(hqServiceRevenueMult(best, svc, 2.0) * 2.0).toBeLessThanOrEqual(2.3 + 1e-9);
  });
});
