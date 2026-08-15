/**
 * @jest-environment node
 */
import type { GameState } from '../types';
import {
  generateContract,
  ensureFreshDeliveryPool,
  acceptDelivery,
  canDeliver,
  deliverContract,
  processContractDeadlines,
  formatDeadline,
  getDeliveryPool,
  getActiveDeliveries,
  getCompletedDeliveries,
  getDailyDeliveryCap,
  getRecentDeliveryCompletions,
  getDeliveryCapStatus,
  DELIVERY_CAP_BASE,
  DELIVERY_CAP_WINDOW_MS,
  DELIVERY_CAP_RESEARCH_BONUS_ID,
  DELIVERY_CAP_RESEARCH_BONUS,
  DELIVERY_CAP_TIER_THRESHOLD,
  DELIVERY_CAP_TIER_BONUS,
  POOL_SIZE,
} from '../delivery-contracts';
import type { DeliveryContract } from '../delivery-contracts';
import { RESOURCE_MAP, type ResourceId } from '../resources';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1, createdAt: 0, lastTickAt: 0,
    money: 0, totalEarned: 0, totalSpent: 0,
    gameDate: { year: 2150, month: 1 }, tickSpeed: 1,
    buildings: [], completedResearch: [], activeResearch: null, activeServices: [],
    unlockedLocations: ['earth_surface'], resources: {}, eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    ...overrides,
  };
}

describe('delivery-contracts — contract generation', () => {
  it('produces well-formed contracts', () => {
    const c = generateContract('the-dominion', 42, 1_000_000);
    expect(c.id).toBeTruthy();
    expect(c.issuerKind).toBe('faction');
    expect(c.issuerFactionId).toBe('the-dominion');
    expect(c.title).toBeTruthy();
    expect(c.resourceId).toBeTruthy();
    expect(c.quantity).toBeGreaterThan(0);
    expect(c.paymentMoney).toBeGreaterThan(0);
    expect(c.deadlineAtMs).toBeGreaterThan(1_000_000);
    expect(c.reputationOnComplete).toBeGreaterThan(0);
    expect(c.reputationOnDefault).toBeLessThan(0);
    expect(c.status).toBe('open');
  });

  it('is deterministic for the same seed', () => {
    const a = generateContract('the-dominion', 99, 1000);
    const b = generateContract('the-dominion', 99, 1000);
    expect(a.resourceId).toBe(b.resourceId);
    expect(a.quantity).toBe(b.quantity);
    expect(a.paymentMoney).toBe(b.paymentMoney);
  });

  it('Hive Collective pays a premium vs Dominion', () => {
    const dominion = generateContract('the-dominion', 5, 0);
    const hive = generateContract('hive-collective', 5, 0);
    // Same seed; Hive's multiplier is 1.5 vs Dominion's 1.0
    // Not a perfect test (different resource pools) but relative magnitudes should favour Hive
    expect(hive.reputationOnComplete).toBeGreaterThan(dominion.reputationOnComplete);
  });
});

describe('delivery-contracts — pool refresh', () => {
  it('populates empty pool on first tick', () => {
    const s = baseState();
    const after = ensureFreshDeliveryPool(s, 1000);
    expect(after.availableDeliveries).toHaveLength(POOL_SIZE);
    expect(after.deliveryPoolRefreshedAtMs).toBe(1000);
  });

  it('does not refresh within the 4-hour window', () => {
    const now = 1_000_000_000;
    const existing = [
      { ...generateContract('the-dominion', 1, now), deadlineAtMs: now + 3600_000 },
      { ...generateContract('the-dominion', 2, now), deadlineAtMs: now + 3600_000 },
      { ...generateContract('the-dominion', 3, now), deadlineAtMs: now + 3600_000 },
      { ...generateContract('the-dominion', 4, now), deadlineAtMs: now + 3600_000 },
      { ...generateContract('the-dominion', 5, now), deadlineAtMs: now + 3600_000 },
    ];
    const s = baseState({ availableDeliveries: existing, deliveryPoolRefreshedAtMs: now });
    const after = ensureFreshDeliveryPool(s, now + 1_000);
    // Pool is untouched — same contracts survive the filter, refresh marker unchanged
    expect(after.availableDeliveries).toEqual(existing);
    expect(after.deliveryPoolRefreshedAtMs).toBe(now);
  });

  it('refreshes when pool has dropped below half and 4h elapsed', () => {
    const now = 1_000_000_000;
    const s = baseState({
      availableDeliveries: [],
      deliveryPoolRefreshedAtMs: now - 5 * 60 * 60 * 1000,  // 5h ago
    });
    const after = ensureFreshDeliveryPool(s, now);
    expect(after.availableDeliveries!.length).toBe(POOL_SIZE);
    expect(after.deliveryPoolRefreshedAtMs).toBe(now);
  });

  it('removes expired open contracts on refresh', () => {
    const now = 1_000_000_000;
    const expired = { ...generateContract('the-dominion', 1, now - 10_000), deadlineAtMs: now - 1000 };
    const s = baseState({
      availableDeliveries: [expired],
      deliveryPoolRefreshedAtMs: now - 10 * 60 * 60 * 1000,
    });
    const after = ensureFreshDeliveryPool(s, now);
    expect(after.availableDeliveries!.some(c => c.id === expired.id)).toBe(false);
  });
});

describe('delivery-contracts — accept flow', () => {
  it('moves contract from available to active and marks accepted', () => {
    const c = generateContract('the-dominion', 10, 1000);
    const s = baseState({ availableDeliveries: [c] });
    const after = acceptDelivery(s, c.id, 2000);
    expect(after.availableDeliveries).toHaveLength(0);
    expect(after.activeDeliveries).toHaveLength(1);
    expect(after.activeDeliveries![0].status).toBe('accepted');
    expect(after.activeDeliveries![0].acceptedAtMs).toBe(2000);
  });

  it('is no-op for unknown contract IDs', () => {
    const s = baseState({ availableDeliveries: [] });
    const after = acceptDelivery(s, 'ghost');
    expect(after).toBe(s);
  });
});

describe('delivery-contracts — canDeliver / deliverContract', () => {
  it('canDeliver true only when inventory meets quantity', () => {
    const c = generateContract('the-dominion', 20, 1000);
    const sWithInventory = baseState({
      activeDeliveries: [{ ...c, status: 'accepted' }],
      resources: { [c.resourceId]: c.quantity + 10 },
    });
    expect(canDeliver(sWithInventory, c.id)).toBe(true);

    const sWithoutInventory = baseState({
      activeDeliveries: [{ ...c, status: 'accepted' }],
      resources: { [c.resourceId]: c.quantity - 1 },
    });
    expect(canDeliver(sWithoutInventory, c.id)).toBe(false);
  });

  it('deliverContract pays the full contract price (no E1 haircut), deducts resources, records completion', () => {
    // Wave E2 supersedes E1's flat 15% haircut: contracts are the no-fee
    // channel (BALANCE.md) and the arbitrage is closed by spot-at-acceptance
    // (below), not by friction. This player accepted with no snapshot (base
    // pricing) and has no Frontier / rep / workforce bonuses (all default
    // multipliers 1), so the payout is exactly the contract price.
    const c = { ...generateContract('the-dominion', 20, 1000), status: 'accepted' as const };
    const s = baseState({
      activeDeliveries: [c],
      resources: { [c.resourceId]: c.quantity + 50 },
      money: 100,
    });
    const after = deliverContract(s, c.id, 5000);
    expect(after.money).toBe(100 + c.paymentMoney);
    expect(after.resources[c.resourceId]).toBe(50);
    expect(after.activeDeliveries).toHaveLength(0);
    expect(after.completedDeliveries).toHaveLength(1);
    expect(after.completedDeliveries![0].status).toBe('completed');
  });

  it('E2 spot-lock: accepting on a crashed market reprices the payout down, closing the static-price flip', () => {
    // Regression for docs/ECONOMY_PVP_2026-08.md §2.3 / §1e-4. Before E2 a
    // player could crash a resource's live price, buy it back cheap, and
    // deliver at the FULL static base price. Now acceptDelivery locks the live
    // spot: with the market crashed to 40% of base, the accepted payout is
    // ~40% of the base-priced preview — there is no static-vs-live gap to flip.
    for (let seed = 1; seed <= 8; seed++) {
      const open = generateContract('the-syndicate', seed, 1000);
      const base = RESOURCE_MAP.get(open.resourceId as ResourceId)!.baseMarketPrice;
      const crashedSpot = Math.round(base * 0.4);
      const s = baseState({
        availableDeliveries: [open],
        marketSnapshot: { prices: { [open.resourceId]: crashedSpot }, asOf: 1000 },
      });
      const accepted = acceptDelivery(s, open.id, 2000);
      const active = accepted.activeDeliveries![0];
      expect(active.spotUnitAtAcceptance).toBe(crashedSpot);
      // Payout rescaled by spot/base (~0.4×) — strictly below the static preview.
      expect(active.paymentMoney).toBeLessThan(open.paymentMoney);
      expect(active.paymentMoney).toBe(Math.round(open.paymentMoney * (crashedSpot / base)));
    }
  });

  it('E2 spot-lock: accepting during a rally locks the higher spot (forward hedging)', () => {
    const open = generateContract('hive-collective', 7, 1000);
    const base = RESOURCE_MAP.get(open.resourceId as ResourceId)!.baseMarketPrice;
    const rallySpot = Math.round(base * 2.2);
    const s = baseState({
      availableDeliveries: [open],
      marketSnapshot: { prices: { [open.resourceId]: rallySpot }, asOf: 1000 },
    });
    const accepted = acceptDelivery(s, open.id, 2000);
    const active = accepted.activeDeliveries![0];
    expect(active.spotUnitAtAcceptance).toBe(rallySpot);
    expect(active.paymentMoney).toBe(Math.round(open.paymentMoney * (rallySpot / base)));
    // Delivering later pays the locked (higher) price in full — a forward.
    const delivered = deliverContract(
      { ...accepted, resources: { [open.resourceId]: active.quantity } },
      active.id,
      5000,
    );
    expect(delivered.money).toBe(active.paymentMoney);
  });

  it('deliverContract shifts faction reputation on complete', () => {
    const c = { ...generateContract('the-dominion', 20, 1000), status: 'accepted' as const };
    const s = baseState({
      activeDeliveries: [c],
      resources: { [c.resourceId]: c.quantity },
    });
    const after = deliverContract(s, c.id, 5000);
    expect(after.factionReputation!['the-dominion']).toBe(c.reputationOnComplete);
  });

  it('deliverContract is no-op when inventory insufficient', () => {
    const c = { ...generateContract('the-dominion', 20, 1000), status: 'accepted' as const };
    const s = baseState({
      activeDeliveries: [c],
      resources: {},
    });
    const after = deliverContract(s, c.id);
    expect(after).toBe(s);
  });
});

describe('delivery-contracts — deadline processing', () => {
  it('moves overdue contracts to defaulted and penalizes reputation', () => {
    const now = 10_000;
    const c = { ...generateContract('the-dominion', 1, 1000), status: 'accepted' as const, deadlineAtMs: 5000 };
    const s = baseState({ activeDeliveries: [c] });
    const after = processContractDeadlines(s, now);
    expect(after.activeDeliveries).toHaveLength(0);
    expect(after.completedDeliveries![0].status).toBe('defaulted');
    expect(after.completedDeliveries![0].defaultedAtMs).toBe(now);
    expect(after.factionReputation!['the-dominion']).toBe(c.reputationOnDefault);
  });

  it('leaves not-yet-expired contracts alone', () => {
    const now = 1000;
    const c = { ...generateContract('the-dominion', 1, 500), status: 'accepted' as const, deadlineAtMs: 2000 };
    const s = baseState({ activeDeliveries: [c] });
    const after = processContractDeadlines(s, now);
    expect(after.activeDeliveries).toHaveLength(1);
  });
});

describe('delivery-contracts — formatting', () => {
  it('formatDeadline handles overdue / minutes / hours / days', () => {
    const now = 1000;
    expect(formatDeadline(500, now)).toBe('OVERDUE');
    expect(formatDeadline(now + 30 * 60 * 1000, now)).toMatch(/^\d+m$/);
    expect(formatDeadline(now + 3 * 60 * 60 * 1000, now)).toMatch(/^\d+h \d+m$/);
    expect(formatDeadline(now + 2 * 24 * 60 * 60 * 1000, now)).toMatch(/^\d+d \d+h$/);
  });
});

describe('delivery-contracts — accessors', () => {
  it('getters handle missing arrays gracefully', () => {
    const s = baseState();
    expect(getDeliveryPool(s)).toEqual([]);
    expect(getActiveDeliveries(s)).toEqual([]);
    expect(getCompletedDeliveries(s)).toEqual([]);
  });
});

// ─── Daily completion cap (founder directive) ──────────────────────────────

/** Build a fake completed-delivery history entry at a given completion time. */
function completedAt(ms: number, overrides: Partial<DeliveryContract> = {}): DeliveryContract {
  return {
    ...generateContract('the-dominion', ms, ms),
    status: 'completed',
    completedAtMs: ms,
    ...overrides,
  };
}

describe('delivery-contracts — daily cap derivation', () => {
  it('base cap is 4 with no research/tier bonuses', () => {
    expect(getDailyDeliveryCap(baseState())).toBe(DELIVERY_CAP_BASE);
    expect(DELIVERY_CAP_BASE).toBe(4);
  });

  it('+1 for the Space Logistics Network research', () => {
    const s = baseState({ completedResearch: [DELIVERY_CAP_RESEARCH_BONUS_ID] });
    expect(getDailyDeliveryCap(s)).toBe(DELIVERY_CAP_BASE + DELIVERY_CAP_RESEARCH_BONUS);
  });

  it('+1 at Corporation Tier 5 (Conglomerate)', () => {
    const s = baseState({ corporationTier: DELIVERY_CAP_TIER_THRESHOLD });
    expect(getDailyDeliveryCap(s)).toBe(DELIVERY_CAP_BASE + DELIVERY_CAP_TIER_BONUS);
  });

  it('does not grant the tier bonus below the threshold', () => {
    const s = baseState({ corporationTier: DELIVERY_CAP_TIER_THRESHOLD - 1 });
    expect(getDailyDeliveryCap(s)).toBe(DELIVERY_CAP_BASE);
  });

  it('research + tier bonuses stack to the max of 6', () => {
    const s = baseState({
      completedResearch: [DELIVERY_CAP_RESEARCH_BONUS_ID],
      corporationTier: DELIVERY_CAP_TIER_THRESHOLD,
    });
    expect(getDailyDeliveryCap(s)).toBe(6);
  });

  it('the bonus is earned, never purchasable — no money-gated path exists in getDailyDeliveryCap', () => {
    // Sanity check on the function's inputs: only completedResearch and
    // corporationTier are read, never money/totalEarned/subscription state.
    const s = baseState({ money: 999_999_999_999 });
    expect(getDailyDeliveryCap(s)).toBe(DELIVERY_CAP_BASE);
  });
});

describe('delivery-contracts — rolling 24h window math', () => {
  it('counts only completions inside the window', () => {
    const now = 10 * DELIVERY_CAP_WINDOW_MS;
    const s = baseState({
      completedDeliveries: [
        completedAt(now - 1000),                       // just now — in window
        completedAt(now - DELIVERY_CAP_WINDOW_MS + 1),  // just inside — in window
        completedAt(now - DELIVERY_CAP_WINDOW_MS),      // exactly at the edge — excluded (strict <)
        completedAt(now - DELIVERY_CAP_WINDOW_MS - 1),  // just outside — excluded
      ],
    });
    expect(getRecentDeliveryCompletions(s, now)).toHaveLength(2);
  });

  it('excludes defaulted contracts from the count', () => {
    const now = 10_000;
    const s = baseState({
      completedDeliveries: [
        completedAt(now - 1000, { status: 'defaulted', defaultedAtMs: now - 1000 }),
      ],
    });
    expect(getRecentDeliveryCompletions(s, now)).toHaveLength(0);
  });

  it('the window rolls forward as time passes — a completion frees its slot 24h later', () => {
    const t0 = 1_000_000;
    const s = baseState({
      completedDeliveries: Array.from({ length: DELIVERY_CAP_BASE }, (_, i) => completedAt(t0 + i)),
    });
    // Immediately after: all 4 count, at cap.
    expect(getDeliveryCapStatus(s, t0 + DELIVERY_CAP_BASE).atCap).toBe(true);
    // Just before the oldest rolls off: still at cap.
    const justBefore = t0 + DELIVERY_CAP_WINDOW_MS - 1;
    expect(getDeliveryCapStatus(s, justBefore).atCap).toBe(true);
    // The moment the oldest completion (t0) is >= 24h old: it drops out, freeing a slot.
    const justAfter = t0 + DELIVERY_CAP_WINDOW_MS;
    expect(getDeliveryCapStatus(s, justAfter).atCap).toBe(false);
    expect(getDeliveryCapStatus(s, justAfter).completed).toBe(DELIVERY_CAP_BASE - 1);
  });

  it('resetInMs counts down to when the oldest counted completion rolls off', () => {
    const now = 5_000_000;
    const s = baseState({
      completedDeliveries: [
        completedAt(now - 1000),
        completedAt(now - 500),
        completedAt(now - 200),
        completedAt(now - 100), // oldest of these 4 is (now - 1000)
      ],
    });
    const status = getDeliveryCapStatus(s, now);
    expect(status.atCap).toBe(true);
    expect(status.resetInMs).toBe(DELIVERY_CAP_WINDOW_MS - 1000);
  });

  it('resetInMs is 0 when not at cap', () => {
    const s = baseState({ completedDeliveries: [completedAt(1000)] });
    expect(getDeliveryCapStatus(s, 2000).resetInMs).toBe(0);
    expect(getDeliveryCapStatus(s, 2000).atCap).toBe(false);
  });
});

describe('delivery-contracts — cap enforcement in deliverContract', () => {
  function stateAtCap(now: number, extra: Partial<GameState> = {}): GameState {
    return baseState({
      completedDeliveries: Array.from({ length: DELIVERY_CAP_BASE }, (_, i) => completedAt(now - 1000 - i)),
      ...extra,
    });
  }

  it('blocks completion once the cap is hit, even with sufficient inventory', () => {
    const now = 10_000_000;
    const c = { ...generateContract('the-dominion', 20, now - 500), status: 'accepted' as const };
    const s = stateAtCap(now, {
      activeDeliveries: [c],
      resources: { [c.resourceId]: c.quantity + 50 },
      money: 100,
    });
    const after = deliverContract(s, c.id, now);
    expect(after).toBe(s); // unchanged — quiet no-op, matching the existing early-return shape
    expect(after.activeDeliveries).toHaveLength(1);
  });

  it('allows completion again once a slot rolls off the 24h window', () => {
    const now = 10_000_000;
    const c = { ...generateContract('the-dominion', 20, now - 500), status: 'accepted' as const };
    const s = stateAtCap(now, {
      activeDeliveries: [c],
      resources: { [c.resourceId]: c.quantity + 50 },
      money: 100,
    });
    const later = now + DELIVERY_CAP_WINDOW_MS + 1;
    const after = deliverContract(s, c.id, later);
    expect(after.activeDeliveries).toHaveLength(0);
    expect(after.completedDeliveries!.some(d => d.id === c.id && d.status === 'completed')).toBe(true);
  });

  it('a research/tier bonus slot lets one more completion through at the base cap', () => {
    const now = 10_000_000;
    const c = { ...generateContract('the-dominion', 20, now - 500), status: 'accepted' as const };
    const s = stateAtCap(now, {
      activeDeliveries: [c],
      resources: { [c.resourceId]: c.quantity + 50 },
      money: 100,
      completedResearch: [DELIVERY_CAP_RESEARCH_BONUS_ID],
    });
    const after = deliverContract(s, c.id, now);
    expect(after.activeDeliveries).toHaveLength(0);
    expect(after.money).toBe(100 + c.paymentMoney);
  });

  it('does not block accepting new contracts or normal deadline processing while at cap', () => {
    const now = 10_000_000;
    const open = generateContract('the-syndicate', 1, now);
    const s = stateAtCap(now, { availableDeliveries: [open] });
    const afterAccept = acceptDelivery(s, open.id, now);
    expect(afterAccept.activeDeliveries).toHaveLength(1);

    const overdue = { ...generateContract('the-dominion', 2, now - 5000), status: 'accepted' as const, deadlineAtMs: now - 1 };
    const s2 = stateAtCap(now, { activeDeliveries: [overdue] });
    const afterDeadline = processContractDeadlines(s2, now);
    expect(afterDeadline.completedDeliveries![0].status).toBe('defaulted');
  });
});
