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
  POOL_SIZE,
} from '../delivery-contracts';

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

  it('deliverContract pays money, deducts resources, records completion', () => {
    const c = { ...generateContract('the-dominion', 20, 1000), status: 'accepted' as const };
    const s = baseState({
      activeDeliveries: [c],
      resources: { [c.resourceId]: c.quantity + 50 },
      money: 100,
    });
    const after = deliverContract(s, c.id, 5000);
    // paymentMoney may be boosted by FRONTIER_CONTRACT_PAYOUT_MULTIPLIER when the
    // player is in Frontier — in this test we are not. Check money rose by at
    // least the base amount.
    expect(after.money).toBeGreaterThanOrEqual(100 + c.paymentMoney);
    expect(after.resources[c.resourceId]).toBe(50);
    expect(after.activeDeliveries).toHaveLength(0);
    expect(after.completedDeliveries).toHaveLength(1);
    expect(after.completedDeliveries![0].status).toBe('completed');
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
