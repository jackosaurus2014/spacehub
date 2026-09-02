/**
 * @jest-environment jsdom
 *
 * PvP Discoverability pass (2026-08) — competitive-posture.ts.
 *
 * The two properties this suite exists to protect, in priority order:
 *
 *  1. A SIGNAL MUST NOT FIRE WHEN THE UNDERLYING STATE DOES NOT WARRANT IT.
 *     This module's whole justification is that its prompts are honest. A
 *     false-positive here is worse than showing nothing, so the negative
 *     cases below outnumber the positive ones deliberately, and each one
 *     isolates a single gate.
 *
 *  2. ONCE-ONLY ANNOUNCEMENT SEMANTICS. A tool announces exactly once per
 *     save, ever — including across the "absent field" case that every
 *     existing save will hit the first time it loads this build.
 */
import { getNewGameState } from '../save-load';
import { ONBOARDING_DONE_STEP } from '../onboarding';
import { FRONTIER_DURATION_MS } from '../frontier';
import { PRICE_CAMPAIGN_MIN_NET_WORTH } from '../price-campaigns';
import { WAGE_INDEX_MAX } from '../labor-market';
import { SATURATED_OCCUPANCY_PCT } from '../spatial-strategy';
import type { GameState, ServiceInstance } from '../types';
import type { OffenseSnapshot } from '../offense';
import {
  COMPETITIVE_TOOLS,
  COMPETITIVE_TOOL_MAP,
  MAX_COMPETITIVE_SIGNALS,
  CONCENTRATION_SHARE_THRESHOLD,
  LABOR_TIGHT_INDEX,
  SPOT_DISLOCATION_THRESHOLD,
  deriveAvailableTools,
  reconcileToolAnnouncements,
  deriveCompetitiveSignals,
  deriveIncomingAttacks,
  deriveCompetitivePosture,
  isCompetitiveSurfaceEligible,
  type CompetitiveToolId,
} from '../competitive-posture';
import {
  requestSubView,
  consumeSubViewRequest,
  subViewTab,
  subViewName,
  SUB_VIEW_REQUEST_TTL_MS,
  __clearSubViewRequests,
} from '../sub-view';

const NOW = 1_800_000_000_000;

/**
 * A corporation that is OUT of the Protected Frontier, past the FTUE chain,
 * and rich/large enough to reach the offense tools. Everything else is left
 * at the fresh-game defaults so each test can enable exactly one thing.
 */
function veteran(over: Partial<GameState> = {}): GameState {
  const base = getNewGameState();
  return {
    ...base,
    tutorialStep: ONBOARDING_DONE_STEP,
    tutorialDismissed: true,
    frontierStatus: 'graduated',
    frontierEnteredAtMs: NOW - FRONTIER_DURATION_MS * 3,
    frontierGraduatedAtMs: NOW - FRONTIER_DURATION_MS * 2,
    createdAt: NOW - FRONTIER_DURATION_MS * 3,
    corporationTier: 5,
    // Book net worth is cash + depreciated assets + inventory, so plain cash
    // above the offense floor is sufficient and keeps the fixture minimal.
    money: PRICE_CAMPAIGN_MIN_NET_WORTH * 10,
    ...over,
  };
}

function service(definitionId: string, locationId: string): ServiceInstance {
  return {
    definitionId,
    locationId,
    linkedBuildingIds: [],
    startDate: { year: 2100, month: 1 },
    revenueMultiplier: 1,
  };
}

function offense(over: Partial<OffenseSnapshot> = {}): OffenseSnapshot {
  return {
    campaigns: [], poachIncoming: [], poachOutcomes: [],
    laneTolls: [], corneringAlerts: [], asOf: NOW, ...over,
  };
}

// A demand pool this player supplies: one telecom service in LEO.
const LEO_TELECOM_SERVICE = 'svc_telecom_leo';

function poolState(entryOver: Record<string, unknown>, over: Partial<GameState> = {}): GameState {
  return veteran({
    activeServices: [service(LEO_TELECOM_SERVICE, 'leo')],
    demandPools: {
      asOf: NOW,
      pools: {
        'leo:telecom': {
          locationId: 'leo',
          category: 'telecom',
          mult: 0.8,
          dTotal: 100_000_000,
          dNpc: 40_000_000,
          cSupply: 120_000_000,
          playerShare: 0.10,
          topShares: [0.55, 0.20, 0.10],
          supplierCount: 4,
          ...entryOver,
        },
      },
    } as GameState['demandPools'],
    ...over,
  });
}

// ─── Eligibility gates ──────────────────────────────────────────────────────

describe('eligibility — who may be shown competitive prompts at all', () => {
  it('a Protected Frontier corporation is never eligible (it cannot be attacked and cannot attack)', () => {
    const state = veteran({
      frontierStatus: 'active',
      frontierEnteredAtMs: NOW - 1000,
      createdAt: NOW - 1000,
      money: 1_000_000,
    });
    expect(isCompetitiveSurfaceEligible(state, NOW)).toBe(false);
    expect(deriveCompetitiveSignals(state, { nowMs: NOW })).toEqual([]);
  });

  it('a corporation mid-FTUE is never eligible, no matter how rich', () => {
    const state = poolState({}, { tutorialStep: 3, tutorialDismissed: false });
    expect(isCompetitiveSurfaceEligible(state, NOW)).toBe(false);
    expect(deriveCompetitiveSignals(state, { nowMs: NOW })).toEqual([]);
  });

  it('a graduated corporation past the chain IS eligible', () => {
    expect(isCompetitiveSurfaceEligible(veteran(), NOW)).toBe(true);
  });
});

// ─── Once-only announcement semantics ───────────────────────────────────────

describe('tool announcements — exactly once per save, ever', () => {
  it('an ABSENT seenCompetitiveTools field BASELINES silently: nothing is announced', () => {
    const state = veteran();
    expect(state.seenCompetitiveTools).toBeUndefined();
    const result = reconcileToolAnnouncements(state, NOW);
    expect(result.baselined).toBe(true);
    expect(result.announce).toEqual([]);
    // …and everything currently available is banked so it can never announce.
    expect(result.nextSeen.sort()).toEqual(deriveAvailableTools(state, NOW).sort());
    expect(result.nextSeen.length).toBeGreaterThan(0);
  });

  it('a FRESH Frontier save baselines to the empty set, so later unlocks still announce', () => {
    const fresh = getNewGameState();
    const result = reconcileToolAnnouncements(fresh, NOW);
    expect(result.baselined).toBe(true);
    // A tier-1 corporation inside the Frontier qualifies for none of the
    // offense tools — that is the property that makes the baseline safe.
    expect(result.nextSeen).not.toContain('price_campaign');
    expect(result.nextSeen).not.toContain('talent_poaching');
  });

  it('a newly available tool announces once, and never again', () => {
    const before = veteran({ seenCompetitiveTools: [] });
    const first = reconcileToolAnnouncements(before, NOW);
    const firstIds = first.announce.map(t => t.id);
    expect(first.baselined).toBe(false);

    // Feed the result back in exactly as the page does.
    const after = veteran({ seenCompetitiveTools: first.nextSeen });
    const second = reconcileToolAnnouncements(after, NOW);
    expect(second.announce).toEqual([]);
    expect(second.nextSeen.sort()).toEqual(first.nextSeen.sort());
    // Sanity: the first pass really did have something to say.
    expect(firstIds.length).toBeGreaterThan(0);
  });

  it('a tool that lapses (net worth falls back below the floor) is still never re-announced', () => {
    const rich = veteran({ seenCompetitiveTools: [] });
    const announced = reconcileToolAnnouncements(rich, NOW);
    expect(announced.announce.map(t => t.id)).toContain('price_campaign');

    const poor = veteran({ seenCompetitiveTools: announced.nextSeen, money: 1_000 });
    expect(deriveAvailableTools(poor, NOW)).not.toContain('price_campaign');

    const richAgain = veteran({ seenCompetitiveTools: announced.nextSeen });
    expect(reconcileToolAnnouncements(richAgain, NOW).announce).toEqual([]);
  });

  it('nothing announces during the FTUE chain — and the announcement is NOT consumed', () => {
    const midChain = veteran({ seenCompetitiveTools: [], tutorialStep: 4, tutorialDismissed: false });
    const held = reconcileToolAnnouncements(midChain, NOW);
    expect(held.announce).toEqual([]);
    expect(held.nextSeen).toEqual([]); // unchanged — nothing was banked

    const graduated = veteran({ seenCompetitiveTools: held.nextSeen });
    expect(reconcileToolAnnouncements(graduated, NOW).announce.length).toBeGreaterThan(0);
  });

  it('every catalogue entry has non-empty cost / rationale / counterplay copy', () => {
    for (const tool of COMPETITIVE_TOOLS) {
      expect(tool.what.length).toBeGreaterThan(20);
      expect(tool.cost.length).toBeGreaterThan(20);
      expect(tool.whenRational.length).toBeGreaterThan(20);
      expect(tool.counterplay.length).toBeGreaterThan(20);
    }
  });

  it('catalogue ids are unique and the map agrees with the array', () => {
    const ids = COMPETITIVE_TOOLS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(COMPETITIVE_TOOL_MAP.get(id as CompetitiveToolId)).toBeDefined();
  });

  it('a malformed availability predicate cannot crash the announcer', () => {
    const broken = { ...veteran(), buildings: null } as unknown as GameState;
    expect(() => deriveAvailableTools(broken, NOW)).not.toThrow();
  });
});

// ─── S1 · rival concentration ───────────────────────────────────────────────

describe('signal: rival concentration in a demand pool', () => {
  it('fires when one anonymous supplier leads a pool this player supplies', () => {
    const sigs = deriveCompetitiveSignals(poolState({}), { nowMs: NOW });
    const sig = sigs.find(s => s.kind === 'rival_concentration');
    expect(sig).toBeDefined();
    expect(sig!.label).toContain('55%');
    expect(sig!.tab).toBe('market');
    expect(sig!.subView).toBe('market:analytics');
    // The honesty rule: aggregate only, never an identity.
    expect(sig!.detail).toContain('never names who');
  });

  it('does NOT fire when the leader is below the concentration threshold', () => {
    const belowThreshold = CONCENTRATION_SHARE_THRESHOLD - 0.05;
    const sigs = deriveCompetitiveSignals(
      poolState({ topShares: [belowThreshold, 0.2, 0.1] }), { nowMs: NOW },
    );
    expect(sigs.find(s => s.kind === 'rival_concentration')).toBeUndefined();
  });

  it('does NOT fire when the player is themselves the leader', () => {
    const sigs = deriveCompetitiveSignals(
      poolState({ playerShare: 0.55, topShares: [0.55, 0.2, 0.1] }), { nowMs: NOW },
    );
    expect(sigs.find(s => s.kind === 'rival_concentration')).toBeUndefined();
  });

  it('does NOT fire for a pool this player does not supply', () => {
    const state = poolState({}, { activeServices: [] });
    expect(deriveCompetitiveSignals(state, { nowMs: NOW }).find(s => s.kind === 'rival_concentration'))
      .toBeUndefined();
  });

  it('does NOT fire on a stale snapshot', () => {
    const state = poolState({});
    const sigs = deriveCompetitiveSignals(state, { nowMs: NOW + 60_000, demandStaleMs: 1_000 });
    expect(sigs.find(s => s.kind === 'rival_concentration')).toBeUndefined();
  });

  it('does NOT fire when the player is the only supplier', () => {
    const sigs = deriveCompetitiveSignals(
      poolState({ supplierCount: 1, topShares: [1] }), { nowMs: NOW },
    );
    expect(sigs.find(s => s.kind === 'rival_concentration')).toBeUndefined();
  });
});

// ─── S2 · labor squeeze ─────────────────────────────────────────────────────

describe('signal: tight crew market', () => {
  function laborState(index: number, engineers: number, over: Partial<GameState> = {}): GameState {
    return veteran({
      laborMarket: { index: { engineer: index }, asOf: NOW },
      workforce: { engineers, scientists: 0, miners: 0, operators: 0 },
      ...over,
    });
  }

  it('fires above the tightness threshold and prices BOTH options honestly', () => {
    const sigs = deriveCompetitiveSignals(laborState(WAGE_INDEX_MAX, 20), { nowMs: NOW });
    const sig = sigs.find(s => s.kind === 'labor_squeeze');
    expect(sig).toBeDefined();
    expect(sig!.detail).toContain('Hiring one costs');
    expect(sig!.detail).toContain('poaching one from a rival costs');
    // It must say outright that poaching is the more expensive option.
    expect(sig!.detail).toContain('denial, not headcount');
    expect(sig!.subView).toBe('workforce:poach');
  });

  it('does NOT fire below the tightness threshold', () => {
    const sigs = deriveCompetitiveSignals(laborState(LABOR_TIGHT_INDEX - 0.1, 20), { nowMs: NOW });
    expect(sigs.find(s => s.kind === 'labor_squeeze')).toBeUndefined();
  });

  it('does NOT fire for a crew type the player barely staffs', () => {
    const sigs = deriveCompetitiveSignals(laborState(WAGE_INDEX_MAX, 1), { nowMs: NOW });
    expect(sigs.find(s => s.kind === 'labor_squeeze')).toBeUndefined();
  });

  it('does NOT fire below the $200M offense net-worth floor', () => {
    const sigs = deriveCompetitiveSignals(laborState(WAGE_INDEX_MAX, 20, { money: 1_000 }), { nowMs: NOW });
    expect(sigs.find(s => s.kind === 'labor_squeeze')).toBeUndefined();
  });
});

// ─── S3/S4 · orbital slots ──────────────────────────────────────────────────

describe('signal: contested and idle orbital slots', () => {
  // GEO carries 180 slots (spatial-strategy.ORBITAL_SLOT_POOLS).
  const GEO_TOTAL = 180;
  const saturatedCount = Math.ceil((SATURATED_OCCUPANCY_PCT / 100) * GEO_TOTAL);

  function slotState(occupiedCount: number, over: Partial<GameState> = {}): GameState {
    return veteran({
      unlockedLocations: ['earth_surface', 'leo', 'geo'],
      orbitalSlotOccupancy: { geo: { occupiedCount, bucket: 'saturated' } },
      ...over,
    });
  }

  it('fires when a pool the player has unlocked is saturated and they hold no lease', () => {
    const sig = deriveCompetitiveSignals(slotState(saturatedCount), { nowMs: NOW })
      .find(s => s.kind === 'slot_contested');
    expect(sig).toBeDefined();
    expect(sig!.subView).toBe('map:slots');
    expect(sig!.label).toContain(`/${GEO_TOTAL}`);
  });

  it('does NOT fire for a pool the server has not marked contested (D6: keys off the stored bucket, like the build gate)', () => {
    const sigs = deriveCompetitiveSignals(
      slotState(10, { orbitalSlotOccupancy: { geo: { occupiedCount: 10, bucket: 'low' } } }),
      { nowMs: NOW },
    );
    expect(sigs.find(s => s.kind === 'slot_contested')).toBeUndefined();
  });

  it('D6: fires for a RELATIVELY contested pool (bucket saturated well below 85%) — same signal the gate enforces', () => {
    const sig = deriveCompetitiveSignals(
      slotState(80, { orbitalSlotOccupancy: { geo: { occupiedCount: 80, bucket: 'saturated' } } }),
      { nowMs: NOW },
    ).find(s => s.kind === 'slot_contested');
    expect(sig).toBeDefined();
    expect(sig!.weight).toBeGreaterThanOrEqual(30);
  });

  it('does NOT fire when the player already holds an active lease there', () => {
    const state = slotState(saturatedCount, {
      orbitalSlotLeases: [{ locationId: 'geo', expiresAtMs: NOW + 86_400_000 }],
    });
    expect(deriveCompetitiveSignals(state, { nowMs: NOW }).find(s => s.kind === 'slot_contested'))
      .toBeUndefined();
  });

  it('does NOT fire for a pool the player has not unlocked', () => {
    const state = slotState(saturatedCount, { unlockedLocations: ['earth_surface'] });
    expect(deriveCompetitiveSignals(state, { nowMs: NOW }).find(s => s.kind === 'slot_contested'))
      .toBeUndefined();
  });

  it('an UNBUILT lease surfaces the idle-fee rule; a built one does not', () => {
    const unbuilt = veteran({
      orbitalSlotLeases: [{ locationId: 'geo', expiresAtMs: NOW + 86_400_000 }],
      buildings: [],
    });
    expect(deriveCompetitiveSignals(unbuilt, { nowMs: NOW }).find(s => s.kind === 'slot_idle_lease'))
      .toBeDefined();

    const built = veteran({
      orbitalSlotLeases: [{ locationId: 'geo', expiresAtMs: NOW + 86_400_000 }],
      buildings: [{
        instanceId: 'b1', definitionId: 'geo_telecom_satellite', locationId: 'geo',
        buildStartDate: { year: 2100, month: 1 }, completionDate: { year: 2100, month: 2 },
        isComplete: true, startedAtMs: NOW - 1000, realDurationSeconds: 1,
      }],
    });
    expect(deriveCompetitiveSignals(built, { nowMs: NOW }).find(s => s.kind === 'slot_idle_lease'))
      .toBeUndefined();
  });

  it('an EXPIRED lease surfaces nothing', () => {
    const state = veteran({
      orbitalSlotLeases: [{ locationId: 'geo', expiresAtMs: NOW - 1 }],
      buildings: [],
    });
    expect(deriveCompetitiveSignals(state, { nowMs: NOW }).find(s => s.kind === 'slot_idle_lease'))
      .toBeUndefined();
  });
});

// ─── S5 · spot dislocation ──────────────────────────────────────────────────

describe('signal: spot dislocation', () => {
  function spotState(spot: number, base: number, resources: Record<string, number>): GameState {
    return veteran({
      marketSnapshot: { prices: { iron: spot }, base: { iron: base }, asOf: NOW },
      resources: resources as GameState['resources'],
    });
  }

  it('fires on a large deviation in a resource the player actually holds', () => {
    const sig = deriveCompetitiveSignals(spotState(200_000, 100_000, { iron: 5_000 }), { nowMs: NOW })
      .find(s => s.kind === 'spot_dislocation');
    expect(sig).toBeDefined();
    expect(sig!.label).toContain('above base');
    expect(sig!.detail).toContain('You hold');
  });

  it('does NOT fire inside the deviation threshold', () => {
    const smallDev = 1 + (SPOT_DISLOCATION_THRESHOLD / 2);
    const sigs = deriveCompetitiveSignals(
      spotState(Math.round(100_000 * smallDev), 100_000, { iron: 5_000 }), { nowMs: NOW },
    );
    expect(sigs.find(s => s.kind === 'spot_dislocation')).toBeUndefined();
  });

  it('does NOT fire for a dislocated resource the player has no exposure to', () => {
    const state = veteran({
      marketSnapshot: { prices: { iron: 300_000 }, base: { iron: 100_000 }, asOf: NOW },
      resources: {} as GameState['resources'],
      activeServices: [],
      buildings: [],
    });
    expect(deriveCompetitiveSignals(state, { nowMs: NOW }).find(s => s.kind === 'spot_dislocation'))
      .toBeUndefined();
  });

  it('does NOT fire on a position too small to matter', () => {
    const state = veteran({
      marketSnapshot: { prices: { iron: 300_000 }, base: { iron: 100_000 }, asOf: NOW },
      resources: { iron: 1 } as GameState['resources'],
      activeServices: [],
      buildings: [],
    });
    expect(deriveCompetitiveSignals(state, { nowMs: NOW }).find(s => s.kind === 'spot_dislocation'))
      .toBeUndefined();
  });

  it('never fires without a market snapshot at all (solo / never synced)', () => {
    const state = veteran({ marketSnapshot: null, resources: { iron: 100_000 } as GameState['resources'] });
    expect(deriveCompetitiveSignals(state, { nowMs: NOW }).find(s => s.kind === 'spot_dislocation'))
      .toBeUndefined();
  });
});

// ─── Volume discipline ──────────────────────────────────────────────────────

describe('signals are capped and ranked — never a wall of prompts', () => {
  it('returns at most MAX_COMPETITIVE_SIGNALS even when many conditions hold', () => {
    const state = poolState({}, {
      laborMarket: { index: { engineer: WAGE_INDEX_MAX, miner: WAGE_INDEX_MAX }, asOf: NOW },
      workforce: { engineers: 30, scientists: 0, miners: 30, operators: 0 },
      unlockedLocations: ['earth_surface', 'leo', 'geo'],
      orbitalSlotOccupancy: { geo: { occupiedCount: 179, bucket: 'saturated' } },
      marketSnapshot: {
        prices: { iron: 400_000, aluminum: 400_000 },
        base: { iron: 100_000, aluminum: 100_000 },
        asOf: NOW,
      },
      resources: { iron: 100_000, aluminum: 100_000 } as GameState['resources'],
    });
    const sigs = deriveCompetitiveSignals(state, { nowMs: NOW });
    expect(sigs.length).toBeLessThanOrEqual(MAX_COMPETITIVE_SIGNALS);
    // Deterministic: the same state twice gives the same list.
    expect(deriveCompetitiveSignals(state, { nowMs: NOW }).map(s => s.id)).toEqual(sigs.map(s => s.id));
  });

  it('no signal is ever labelled as an emergency', () => {
    const sigs = deriveCompetitiveSignals(poolState({}), { nowMs: NOW });
    for (const s of sigs) expect(['Opportunity', 'Watch']).toContain(s.statusLabel);
  });
});

// ─── Incoming attacks ───────────────────────────────────────────────────────

describe('incoming attacks — the victim lens', () => {
  it('a live poach offer is an ACT-urgency attack routed to the defence view', () => {
    const state = veteran({
      offense: offense({
        poachIncoming: [{
          id: 'o1', crewType: 'engineer', count: 3, retentionCost: 12_000_000,
          respondByMs: NOW + 3_600_000, attackerName: 'Kestrel Orbital', freeRetentionAvailable: false,
        }],
      }),
    });
    const attacks = deriveIncomingAttacks(state, NOW);
    expect(attacks).toHaveLength(1);
    expect(attacks[0].urgency).toBe('act');
    expect(attacks[0].byName).toBe('Kestrel Orbital');
    expect(attacks[0].subView).toBe('workforce:poach-defend');
    expect(attacks[0].detail).toContain('Doing nothing is the same as letting them walk');
  });

  it('an EXPIRED poach window is not an attack — the decision is over', () => {
    const state = veteran({
      offense: offense({
        poachIncoming: [{
          id: 'o1', crewType: 'engineer', count: 3, retentionCost: 12_000_000,
          respondByMs: NOW - 1, attackerName: null, freeRetentionAvailable: false,
        }],
      }),
    });
    expect(deriveIncomingAttacks(state, NOW)).toEqual([]);
  });

  it('a Frontier-protected corporation is never told it is under attack', () => {
    const state = veteran({
      frontierStatus: 'active',
      frontierEnteredAtMs: NOW - 1000,
      createdAt: NOW - 1000,
      money: 1_000_000,
      offense: offense({
        poachIncoming: [{
          id: 'o1', crewType: 'engineer', count: 3, retentionCost: 1,
          respondByMs: NOW + 3_600_000, attackerName: null, freeRetentionAvailable: false,
        }],
      }),
    });
    expect(deriveIncomingAttacks(state, NOW)).toEqual([]);
  });

  it('a price campaign on a resource the player has NO exposure to is not an attack', () => {
    const state = veteran({
      resources: {} as GameState['resources'],
      activeServices: [],
      offense: offense({
        campaigns: [{ resourceSlug: 'iron', byCompanyName: 'Rival Ltd', declaredAtMs: NOW, endsAtMs: NOW + 86_400_000 }],
      }),
    });
    expect(deriveIncomingAttacks(state, NOW)).toEqual([]);
  });

  it('a price campaign on a resource the player HOLDS carries the MEASURED counterplay', () => {
    const state = veteran({
      resources: { iron: 500 } as GameState['resources'],
      offense: offense({
        campaigns: [{ resourceSlug: 'iron', byCompanyName: 'Rival Ltd', declaredAtMs: NOW, endsAtMs: NOW + 86_400_000 }],
      }),
    });
    const attacks = deriveIncomingAttacks(state, NOW);
    expect(attacks).toHaveLength(1);
    // Balance Pass 8 Q3/Q5: spreading beat everything; mothballing was a
    // −19% trap; retaliation cost the defender more than the aggressor.
    expect(attacks[0].detail).toContain('spread into an uncrowded market');
    expect(attacks[0].detail).toContain('trap');
    expect(attacks[0].detail).toContain('cost the defender more than the aggressor');
  });

  it('the player\'s OWN campaign is never reported as an attack on them', () => {
    const state = veteran({
      resources: { iron: 500 } as GameState['resources'],
      offense: offense({
        campaigns: [{ resourceSlug: 'iron', byCompanyName: 'Me', declaredAtMs: NOW, endsAtMs: NOW + 86_400_000, own: true }],
      }),
    });
    expect(deriveIncomingAttacks(state, NOW)).toEqual([]);
  });
});

// ─── Posture summary ────────────────────────────────────────────────────────

describe('posture summary', () => {
  it('reports the honest QUIET state rather than manufacturing something', () => {
    const posture = deriveCompetitivePosture(veteran(), { nowMs: NOW });
    expect(posture.eligible).toBe(true);
    expect(posture.quiet).toBe(true);
    expect(posture.signals).toEqual([]);
    expect(posture.incoming).toEqual([]);
  });

  it('is not eligible — and lists nothing — for a Frontier corporation', () => {
    const posture = deriveCompetitivePosture(getNewGameState(), { nowMs: NOW });
    expect(posture.eligible).toBe(false);
    expect(posture.availableTools).toEqual([]);
    expect(posture.quiet).toBe(false);
  });
});

// ─── Sub-view request bus ───────────────────────────────────────────────────

describe('sub-view request bus', () => {
  beforeEach(() => __clearSubViewRequests());

  it('parses token halves', () => {
    expect(subViewTab('market:analytics')).toBe('market');
    expect(subViewName('market:analytics')).toBe('analytics');
    expect(subViewName('market')).toBe('');
  });

  it('a parked request is consumed exactly once', () => {
    requestSubView('market:analytics', NOW);
    expect(consumeSubViewRequest('market', NOW)).toBe('analytics');
    expect(consumeSubViewRequest('market', NOW)).toBeNull();
  });

  it('a request addressed elsewhere is left alone', () => {
    requestSubView('map:slots', NOW);
    expect(consumeSubViewRequest('market', NOW)).toBeNull();
    expect(consumeSubViewRequest('map', NOW)).toBe('slots');
  });

  it('a stale request expires rather than firing late', () => {
    requestSubView('market:analytics', NOW);
    expect(consumeSubViewRequest('market', NOW + SUB_VIEW_REQUEST_TTL_MS + 1)).toBeNull();
  });

  it('the newest request wins (single slot)', () => {
    requestSubView('market:analytics', NOW);
    requestSubView('map:slots', NOW);
    expect(consumeSubViewRequest('market', NOW)).toBeNull();
    expect(consumeSubViewRequest('map', NOW)).toBe('slots');
  });

  it('a throwing listener cannot break navigation', () => {
    const off = (() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { onSubViewRequest } = require('../sub-view');
      return onSubViewRequest(() => { throw new Error('boom'); });
    })();
    expect(() => requestSubView('market:analytics', NOW)).not.toThrow();
    off();
  });
});
